import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { ErrorCodes } from '../common/constants/error-codes.constant.js';
import { hashPassword } from '../common/utils/hash.util.js';
import { UsersRepository, type UserWithoutPassword } from './users.repository.js';
import { RolesRepository } from '../roles/roles.repository.js';
import { PrismaService } from '../common/database/prisma.service.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import type { UserQueryDto } from './dto/user-query.dto.js';

export interface UserWithRole extends UserWithoutPassword {
  role?: { id: string; name: string } | null;
}

export interface UsersPage {
  data: UserWithRole[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ─────────────────────────────────────────────
  // Create
  // ─────────────────────────────────────────────
  async create(dto: CreateUserDto, createdBy: string): Promise<UserWithRole> {
    // Validate role exists
    await this.ensureRoleExists(dto.roleId);

    // Check unique email
    const emailTaken = await this.usersRepository.findByEmail(dto.email);
    if (emailTaken) {
      throw new BusinessException(
        ErrorCodes.DUPLICATE_EMAIL,
        `Email "${dto.email}" is already in use`,
        HttpStatus.CONFLICT,
      );
    }

    // Check unique employeeId
    const empIdTaken = await this.usersRepository.findByEmployeeId(dto.employeeId);
    if (empIdTaken) {
      throw new BusinessException(
        ErrorCodes.DUPLICATE_EMPLOYEE_ID,
        `Employee ID "${dto.employeeId}" is already in use`,
        HttpStatus.CONFLICT,
      );
    }

    const hashed = await hashPassword(dto.password);

    const user = await this.usersRepository.create({
      employeeId: dto.employeeId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashed,
      phone: dto.phone,
      department: dto.department,
      position: dto.position,
      avatar: dto.avatar,
      roleId: dto.roleId,
      isActive: dto.isActive ?? true,
      createdBy,
    });

    return this.populateRole(user);
  }

  // ─────────────────────────────────────────────
  // Find all (paginated, filtered, sorted)
  // ─────────────────────────────────────────────
  async findAll(query: UserQueryDto): Promise<UsersPage> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    // ── Build where clause ──────────────────────
    const where: Record<string, unknown> = {};

    // Search: firstName, lastName, email, employeeId
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { employeeId: { contains: query.search, mode: 'insensitive' } },
        { department: { contains: query.search, mode: 'insensitive' } },
        { position: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Filter: department
    if (query.department) {
      where.department = { contains: query.department, mode: 'insensitive' };
    }

    // Filter: roleId
    if (query.roleId) {
      where.roleId = query.roleId;
    }

    // Filter: isActive
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    // ── Sort ────────────────────────────────────
    const sortField = query.sortBy ?? 'createdAt';
    const sortDir = query.sortOrder ?? 'desc';
    const orderBy = { [sortField]: sortDir };

    const [users, total] = await Promise.all([
      this.usersRepository.findAll({ where, skip, take: limit, orderBy }),
      this.usersRepository.count(where),
    ]);

    // Populate roles in batch
    const data = await this.populateRolesBatch(users);

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
  // Find one (with role)
  // ─────────────────────────────────────────────
  async findOne(id: string): Promise<UserWithRole> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new BusinessException(
        ErrorCodes.USER_NOT_FOUND,
        `User with id "${id}" not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    return this.populateRole(user);
  }

  // ─────────────────────────────────────────────
  // Update
  // ─────────────────────────────────────────────
  async update(id: string, dto: UpdateUserDto, updatedBy: string): Promise<UserWithRole> {
    const user = await this.findOne(id);

    // Validate new roleId
    if (dto.roleId) {
      await this.ensureRoleExists(dto.roleId);
    }

    // Check email uniqueness if changing
    if (dto.email && dto.email !== user.email) {
      const taken = await this.usersRepository.findByEmail(dto.email);
      if (taken) {
        throw new BusinessException(
          ErrorCodes.DUPLICATE_EMAIL,
          `Email "${dto.email}" is already in use`,
          HttpStatus.CONFLICT,
        );
      }
    }

    // Check employeeId uniqueness if changing
    if (dto.employeeId && dto.employeeId !== user.employeeId) {
      const taken = await this.usersRepository.findByEmployeeId(dto.employeeId);
      if (taken) {
        throw new BusinessException(
          ErrorCodes.DUPLICATE_EMPLOYEE_ID,
          `Employee ID "${dto.employeeId}" is already in use`,
          HttpStatus.CONFLICT,
        );
      }
    }

    const updated = await this.usersRepository.update(id, {
      ...(dto.employeeId !== undefined && { employeeId: dto.employeeId }),
      ...(dto.firstName !== undefined && { firstName: dto.firstName }),
      ...(dto.lastName !== undefined && { lastName: dto.lastName }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.department !== undefined && { department: dto.department }),
      ...(dto.position !== undefined && { position: dto.position }),
      ...(dto.avatar !== undefined && { avatar: dto.avatar }),
      ...(dto.roleId !== undefined && { roleId: dto.roleId }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      updatedBy,
    });

    return this.populateRole(updated);
  }

  // ─────────────────────────────────────────────
  // Soft Delete
  // ─────────────────────────────────────────────
  async remove(id: string, deletedBy: string): Promise<void> {
    const user = await this.findOne(id);

    // Prevent self-deletion
    if (user.id === deletedBy) {
      throw new BusinessException(
        ErrorCodes.VALIDATION_ERROR,
        'You cannot delete your own account',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.usersRepository.softDelete(id, deletedBy);
  }

  // ─────────────────────────────────────────────
  // Restore
  // ─────────────────────────────────────────────
  async restore(id: string): Promise<UserWithRole> {
    const all = await this.usersRepository.findAllIncludingDeleted();
    const found = all.find((u) => u.id === id);

    if (!found) {
      throw new BusinessException(
        ErrorCodes.USER_NOT_FOUND,
        `User with id "${id}" not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!found.isDeleted) {
      throw new BusinessException(
        ErrorCodes.VALIDATION_ERROR,
        'User is not deleted',
        HttpStatus.BAD_REQUEST,
      );
    }

    const restored = await this.usersRepository.restore(id);
    return this.populateRole(restored);
  }

  // ─────────────────────────────────────────────
  // Toggle active/inactive
  // ─────────────────────────────────────────────
  async setActiveStatus(id: string, isActive: boolean, updatedBy: string): Promise<UserWithRole> {
    if (id === updatedBy) {
      throw new BusinessException(
        ErrorCodes.VALIDATION_ERROR,
        'You cannot change your own active status',
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.findOne(id); // Ensures exists
    const updated = await this.usersRepository.setActiveStatus(id, isActive, updatedBy);
    return this.populateRole(updated);
  }

  // ─────────────────────────────────────────────
  // Get distinct departments (for filter dropdowns)
  // ─────────────────────────────────────────────
  async getDepartments(): Promise<string[]> {
    return this.usersRepository.findDistinctDepartments();
  }

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  private async ensureRoleExists(roleId: string): Promise<void> {
    const role = await this.rolesRepository.findById(roleId);
    if (!role) {
      throw new BusinessException(
        ErrorCodes.ROLE_NOT_FOUND,
        `Role with id "${roleId}" not found`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async populateRole(user: UserWithoutPassword): Promise<UserWithRole> {
    const role = await this.rolesRepository.findById(user.roleId);
    return {
      ...user,
      role: role ? { id: role.id, name: role.name } : null,
    };
  }

  private async populateRolesBatch(users: UserWithoutPassword[]): Promise<UserWithRole[]> {
    if (users.length === 0) return [];

    // Collect unique role IDs, fetch in one query
    const roleIds = [...new Set(users.map((u) => u.roleId))];
    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, name: true },
    });
    const roleMap = new Map(roles.map((r) => [r.id, r]));

    return users.map((user) => ({
      ...user,
      role: roleMap.get(user.roleId) ?? null,
    }));
  }
}
