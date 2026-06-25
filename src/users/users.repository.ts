import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service.js';
import type { Prisma, User } from '@prisma/client';

export type UserWithoutPassword = Omit<User, 'password'>;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ───────────────────────────────────
  async create(data: Prisma.UserCreateInput): Promise<UserWithoutPassword> {
    return this.prisma.user.create({
      data,
      omit: { password: true },
    });
  }

  // ─── Find many (filtered + paginated + sorted) ─
  async findAll(params: {
    where?: Prisma.UserWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.UserOrderByWithRelationInput | Prisma.UserOrderByWithRelationInput[];
  }): Promise<UserWithoutPassword[]> {
    const { where, skip, take, orderBy } = params;
    return this.prisma.user.findMany({
      where: { isDeleted: false, ...where },
      skip,
      take,
      orderBy: orderBy ?? { createdAt: 'desc' },
      omit: { password: true },
    });
  }

  // ─── Count ────────────────────────────────────
  async count(where?: Prisma.UserWhereInput): Promise<number> {
    return this.prisma.user.count({
      where: { isDeleted: false, ...where },
    });
  }

  // ─── Find by ID (no password) ────────────────
  async findById(id: string): Promise<UserWithoutPassword | null> {
    return this.prisma.user.findFirst({
      where: { id, isDeleted: false },
      omit: { password: true },
    });
  }

  // ─── Find by ID (with password — for auth only) ─
  async findByIdWithPassword(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { id, isDeleted: false },
    });
  }

  // ─── Find by email (with password — for auth) ─
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email, isDeleted: false },
    });
  }

  // ─── Find by email (no password) ─────────────
  async findByEmail(email: string): Promise<UserWithoutPassword | null> {
    return this.prisma.user.findFirst({
      where: { email, isDeleted: false },
      omit: { password: true },
    });
  }

  // ─── Find by employeeId ───────────────────────
  async findByEmployeeId(employeeId: string): Promise<UserWithoutPassword | null> {
    return this.prisma.user.findFirst({
      where: { employeeId, isDeleted: false },
      omit: { password: true },
    });
  }

  // ─── Update ───────────────────────────────────
  async update(id: string, data: Prisma.UserUpdateInput): Promise<UserWithoutPassword> {
    return this.prisma.user.update({
      where: { id },
      data,
      omit: { password: true },
    });
  }

  // ─── Soft delete ─────────────────────────────
  async softDelete(id: string, deletedBy: string): Promise<UserWithoutPassword> {
    return this.prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
        isActive: false,
      },
      omit: { password: true },
    });
  }

  // ─── Restore ─────────────────────────────────
  async restore(id: string): Promise<UserWithoutPassword> {
    return this.prisma.user.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        isActive: true,
      },
      omit: { password: true },
    });
  }

  // ─── Toggle active status ────────────────────
  async setActiveStatus(id: string, isActive: boolean, updatedBy: string): Promise<UserWithoutPassword> {
    return this.prisma.user.update({
      where: { id },
      data: { isActive, updatedBy },
      omit: { password: true },
    });
  }

  // ─── Find all including deleted (admin) ──────
  async findAllIncludingDeleted(): Promise<UserWithoutPassword[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      omit: { password: true },
    });
  }

  // ─── Get distinct departments ─────────────────
  async findDistinctDepartments(): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { isDeleted: false, department: { not: null } },
      select: { department: true },
      distinct: ['department'],
      orderBy: { department: 'asc' },
    });
    return users.map((u) => u.department as string).filter(Boolean);
  }
}
