import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { ErrorCodes } from '../common/constants/error-codes.constant.js';
import { RolesRepository } from './roles.repository.js';
import { PermissionsRepository } from '../permissions/permissions.repository.js';
import type { CreateRoleDto } from './dto/create-role.dto.js';
import type { UpdateRoleDto } from './dto/update-role.dto.js';
import type { Role, Permission } from '@prisma/client';

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export interface RolesPage {
  data: Role[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly permissionsRepository: PermissionsRepository,
  ) {}

  // ─────────────────────────────────────────────
  // Create
  // ─────────────────────────────────────────────
  async create(dto: CreateRoleDto): Promise<Role> {
    // Unique name check
    const existing = await this.rolesRepository.findByName(dto.name);
    if (existing) {
      throw new BusinessException(
        ErrorCodes.VALIDATION_ERROR,
        `Role "${dto.name}" already exists`,
        HttpStatus.CONFLICT,
      );
    }

    // Validate all permission IDs exist
    await this.validatePermissionIds(dto.permissionIds);

    return this.rolesRepository.create({
      name: dto.name,
      description: dto.description,
      permissionIds: dto.permissionIds,
    });
  }

  // ─────────────────────────────────────────────
  // Find all (paginated)
  // ─────────────────────────────────────────────
  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<RolesPage> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.rolesRepository.findAll({ where, skip, take: limit }),
      this.rolesRepository.count(where),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─────────────────────────────────────────────
  // Find one (with populated permissions)
  // ─────────────────────────────────────────────
  async findOne(id: string): Promise<RoleWithPermissions> {
    const role = await this.rolesRepository.findById(id);
    if (!role) {
      throw new BusinessException(
        ErrorCodes.ROLE_NOT_FOUND,
        `Role with id "${id}" not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Populate permissions
    const permissions = role.permissionIds.length
      ? await this.permissionsRepository.findByIds(role.permissionIds)
      : [];

    return { ...role, permissions };
  }

  // ─────────────────────────────────────────────
  // Update
  // ─────────────────────────────────────────────
  async update(id: string, dto: UpdateRoleDto): Promise<RoleWithPermissions> {
    const role = await this.findOne(id);

    // Block editing system roles' name
    if (role.isSystem && dto.name && dto.name !== role.name) {
      throw new BusinessException(
        ErrorCodes.SYSTEM_ROLE_PROTECTED,
        `Cannot rename system role "${role.name}"`,
        HttpStatus.FORBIDDEN,
      );
    }

    // Unique name check if name is changing
    if (dto.name && dto.name !== role.name) {
      const conflict = await this.rolesRepository.findByName(dto.name);
      if (conflict) {
        throw new BusinessException(
          ErrorCodes.VALIDATION_ERROR,
          `Role "${dto.name}" already exists`,
          HttpStatus.CONFLICT,
        );
      }
    }

    // Validate permission IDs if updating
    if (dto.permissionIds !== undefined) {
      await this.validatePermissionIds(dto.permissionIds);
    }

    await this.rolesRepository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.permissionIds !== undefined && { permissionIds: dto.permissionIds }),
    });

    return this.findOne(id);
  }

  // ─────────────────────────────────────────────
  // Soft Delete
  // ─────────────────────────────────────────────
  async remove(id: string, deletedBy: string): Promise<void> {
    const role = await this.findOne(id);

    if (role.isSystem) {
      throw new BusinessException(
        ErrorCodes.SYSTEM_ROLE_PROTECTED,
        `System role "${role.name}" cannot be deleted`,
        HttpStatus.FORBIDDEN,
      );
    }

    // Prevent deleting a role that has active users
    const userCount = await this.rolesRepository.countUsersWithRole(id);
    if (userCount > 0) {
      throw new BusinessException(
        ErrorCodes.ROLE_HAS_USERS,
        `Cannot delete role "${role.name}" — ${userCount} user(s) are assigned to it`,
        HttpStatus.CONFLICT,
      );
    }

    await this.rolesRepository.softDelete(id, deletedBy);
  }

  // ─────────────────────────────────────────────
  // Restore
  // ─────────────────────────────────────────────
  async restore(id: string): Promise<RoleWithPermissions> {
    const all = await this.rolesRepository.findAllIncludingDeleted();
    const found = all.find((r) => r.id === id);

    if (!found) {
      throw new BusinessException(
        ErrorCodes.ROLE_NOT_FOUND,
        `Role with id "${id}" not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    if (!found.isDeleted) {
      throw new BusinessException(
        ErrorCodes.VALIDATION_ERROR,
        'Role is not deleted',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.rolesRepository.restore(id);
    return this.findOne(id);
  }

  // ─────────────────────────────────────────────
  // Assign permissions to a role (additive)
  // ─────────────────────────────────────────────
  async assignPermissions(id: string, permissionIds: string[]): Promise<RoleWithPermissions> {
    const role = await this.findOne(id);
    await this.validatePermissionIds(permissionIds);

    // Merge without duplicates
    const merged = [...new Set([...role.permissionIds, ...permissionIds])];
    await this.rolesRepository.update(id, { permissionIds: merged });

    return this.findOne(id);
  }

  // ─────────────────────────────────────────────
  // Revoke permissions from a role
  // ─────────────────────────────────────────────
  async revokePermissions(id: string, permissionIds: string[]): Promise<RoleWithPermissions> {
    const role = await this.findOne(id);
    const filtered = role.permissionIds.filter((pid) => !permissionIds.includes(pid));
    await this.rolesRepository.update(id, { permissionIds: filtered });
    return this.findOne(id);
  }

  // ─────────────────────────────────────────────
  // Helper
  // ─────────────────────────────────────────────
  private async validatePermissionIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const found = await this.permissionsRepository.findByIds(ids);
    if (found.length !== ids.length) {
      const foundIds = found.map((p) => p.id);
      const missing = ids.filter((id) => !foundIds.includes(id));
      throw new BusinessException(
        ErrorCodes.PERMISSION_NOT_FOUND,
        `Permission(s) not found: ${missing.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
