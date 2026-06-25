import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service.js';
import type { Permission, Prisma } from '@prisma/client';

@Injectable()
export class PermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.PermissionCreateInput): Promise<Permission> {
    return this.prisma.permission.create({ data });
  }

  async findAll(params: {
    where?: Prisma.PermissionWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.PermissionOrderByWithRelationInput;
  }): Promise<Permission[]> {
    const { where, skip, take, orderBy } = params;
    return this.prisma.permission.findMany({
      where: { isDeleted: false, ...where },
      skip,
      take,
      orderBy: orderBy ?? { module: 'asc' },
    });
  }

  async count(where?: Prisma.PermissionWhereInput): Promise<number> {
    return this.prisma.permission.count({
      where: { isDeleted: false, ...where },
    });
  }

  async findById(id: string): Promise<Permission | null> {
    return this.prisma.permission.findFirst({
      where: { id, isDeleted: false },
    });
  }

  async findBySlug(slug: string): Promise<Permission | null> {
    return this.prisma.permission.findFirst({
      where: { slug, isDeleted: false },
    });
  }

  async findByModule(module: string): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: { module, isDeleted: false },
      orderBy: { action: 'asc' },
    });
  }

  async findByIds(ids: string[]): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: { id: { in: ids }, isDeleted: false },
      orderBy: { slug: 'asc' },
    });
  }

  async update(id: string, data: Prisma.PermissionUpdateInput): Promise<Permission> {
    return this.prisma.permission.update({ where: { id }, data });
  }

  async softDelete(id: string, deletedBy: string): Promise<Permission> {
    return this.prisma.permission.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }

  async restore(id: string): Promise<Permission> {
    return this.prisma.permission.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      },
    });
  }

  async findAllIncludingDeleted(): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      orderBy: { module: 'asc' },
    });
  }
}
