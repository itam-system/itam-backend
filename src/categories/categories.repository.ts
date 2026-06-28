import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service.js';
import type { Category, Prisma } from '@prisma/client';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return this.prisma.category.create({ data });
  }

  async findAll(params: {
    where?: Prisma.CategoryWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.CategoryOrderByWithRelationInput;
  }): Promise<Category[]> {
    const { where, skip, take, orderBy } = params;
    return this.prisma.category.findMany({
      where: { isDeleted: false, ...where },
      skip,
      take,
      orderBy: orderBy ?? { name: 'asc' },
    });
  }

  async count(where?: Prisma.CategoryWhereInput): Promise<number> {
    return this.prisma.category.count({
      where: { isDeleted: false, ...where },
    });
  }

  async findById(id: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { id, isDeleted: false },
    });
  }

  async findByIdIncludingDeleted(id: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { id },
    });
  }

  async findByName(name: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { name, isDeleted: false },
    });
  }

  async findByCode(code: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { code, isDeleted: false },
    });
  }

  async findAllIncludingDeleted(): Promise<Category[]> {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data });
  }

  async softDelete(id: string, deletedBy: string): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data: {
        isDeleted: true,
        isActive: false,
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }

  async restore(id: string): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        isActive: true,
      },
    });
  }

  async countAssetsWithCategory(categoryId: string): Promise<number> {
    return this.prisma.asset.count({
      where: { categoryId, isDeleted: false },
    });
  }
}
