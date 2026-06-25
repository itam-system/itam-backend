import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { ErrorCodes } from '../common/constants/error-codes.constant.js';
import { PermissionsRepository } from './permissions.repository.js';
import type { CreatePermissionDto } from './dto/create-permission.dto.js';
import type { UpdatePermissionDto } from './dto/update-permission.dto.js';
import type { Permission } from '@prisma/client';

export interface PermissionsPage {
  data: Permission[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class PermissionsService {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  // ─────────────────────────────────────────────
  // Create
  // ─────────────────────────────────────────────
  async create(dto: CreatePermissionDto): Promise<Permission> {
    const slug = `${dto.module}.${dto.action}`;

    // Enforce slug uniqueness
    const existing = await this.permissionsRepository.findBySlug(slug);
    if (existing) {
      throw new BusinessException(
        ErrorCodes.VALIDATION_ERROR,
        `Permission "${slug}" already exists`,
        HttpStatus.CONFLICT,
      );
    }

    return this.permissionsRepository.create({
      module: dto.module,
      action: dto.action,
      slug,
      description: dto.description,
    });
  }

  // ─────────────────────────────────────────────
  // Find all (paginated)
  // ─────────────────────────────────────────────
  async findAll(params: {
    page?: number;
    limit?: number;
    module?: string;
    search?: string;
  }): Promise<PermissionsPage> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.module) where.module = params.module;
    if (params.search) {
      where.OR = [
        { slug: { contains: params.search, mode: 'insensitive' } },
        { module: { contains: params.search, mode: 'insensitive' } },
        { action: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.permissionsRepository.findAll({ where, skip, take: limit }),
      this.permissionsRepository.count(where),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─────────────────────────────────────────────
  // Find all grouped by module
  // ─────────────────────────────────────────────
  async findGroupedByModule(): Promise<Record<string, Permission[]>> {
    const all = await this.permissionsRepository.findAll({});
    const grouped: Record<string, Permission[]> = {};
    for (const perm of all) {
      if (!grouped[perm.module]) grouped[perm.module] = [];
      grouped[perm.module].push(perm);
    }
    return grouped;
  }

  // ─────────────────────────────────────────────
  // Find one
  // ─────────────────────────────────────────────
  async findOne(id: string): Promise<Permission> {
    const permission = await this.permissionsRepository.findById(id);
    if (!permission) {
      throw new BusinessException(
        ErrorCodes.PERMISSION_NOT_FOUND,
        `Permission with id "${id}" not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    return permission;
  }

  // ─────────────────────────────────────────────
  // Update
  // ─────────────────────────────────────────────
  async update(id: string, dto: UpdatePermissionDto): Promise<Permission> {
    const permission = await this.findOne(id);

    const newModule = dto.module ?? permission.module;
    const newAction = dto.action ?? permission.action;
    const newSlug = `${newModule}.${newAction}`;

    // Check slug uniqueness if changed
    if (newSlug !== permission.slug) {
      const conflict = await this.permissionsRepository.findBySlug(newSlug);
      if (conflict) {
        throw new BusinessException(
          ErrorCodes.VALIDATION_ERROR,
          `Permission "${newSlug}" already exists`,
          HttpStatus.CONFLICT,
        );
      }
    }

    return this.permissionsRepository.update(id, {
      module: newModule,
      action: newAction,
      slug: newSlug,
      ...(dto.description !== undefined && { description: dto.description }),
    });
  }

  // ─────────────────────────────────────────────
  // Soft Delete
  // ─────────────────────────────────────────────
  async remove(id: string, deletedBy: string): Promise<void> {
    await this.findOne(id); // Ensures it exists
    await this.permissionsRepository.softDelete(id, deletedBy);
  }

  // ─────────────────────────────────────────────
  // Restore
  // ─────────────────────────────────────────────
  async restore(id: string): Promise<Permission> {
    const permission = await this.permissionsRepository.findById(id);
    // Check in deleted too
    const all = await this.permissionsRepository.findAllIncludingDeleted();
    const found = all.find((p) => p.id === id);
    if (!found) {
      throw new BusinessException(
        ErrorCodes.PERMISSION_NOT_FOUND,
        `Permission with id "${id}" not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    if (!found.isDeleted) {
      throw new BusinessException(
        ErrorCodes.VALIDATION_ERROR,
        'Permission is not deleted',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.permissionsRepository.restore(id);
  }

  // ─────────────────────────────────────────────
  // Helper: validate ids exist (used by RolesService)
  // ─────────────────────────────────────────────
  async validatePermissionIds(ids: string[]): Promise<void> {
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
