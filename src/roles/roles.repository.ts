import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service.js';
import type { Role, Prisma } from '@prisma/client';

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.RoleCreateInput): Promise<Role> {
    return this.prisma.role.create({ data });
  }

  async findAll(params: {
    where?: Prisma.RoleWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.RoleOrderByWithRelationInput;
  }): Promise<Role[]> {
    const { where, skip, take, orderBy } = params;
    return this.prisma.role.findMany({
      where: { isDeleted: false, ...where },
      skip,
      take,
      orderBy: orderBy ?? { name: 'asc' },
    });
  }

  async count(where?: Prisma.RoleWhereInput): Promise<number> {
    return this.prisma.role.count({
      where: { isDeleted: false, ...where },
    });
  }

  async findById(id: string): Promise<Role | null> {
    return this.prisma.role.findFirst({
      where: { id, isDeleted: false },
    });
  }

  async findByName(name: string): Promise<Role | null> {
    return this.prisma.role.findFirst({
      where: { name, isDeleted: false },
    });
  }

  async findAllIncludingDeleted(): Promise<Role[]> {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }

  async update(id: string, data: Prisma.RoleUpdateInput): Promise<Role> {
    return this.prisma.role.update({ where: { id }, data });
  }

  async softDelete(id: string, deletedBy: string): Promise<Role> {
    return this.prisma.role.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }

  async restore(id: string): Promise<Role> {
    return this.prisma.role.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      },
    });
  }

  async countUsersWithRole(roleId: string): Promise<number> {
    return this.prisma.user.count({
      where: { roleId, isDeleted: false },
    });
  }
}
