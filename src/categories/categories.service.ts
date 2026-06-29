import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { ErrorCodes } from '../common/constants/error-codes.constant.js';
import { CategoriesRepository } from './categories.repository.js';
import type { CreateCategoryDto } from './dto/create-category.dto.js';
import type { UpdateCategoryDto } from './dto/update-category.dto.js';
import type { Category } from '@prisma/client';

export interface CategoryWithAssetCount extends Category {
  assetCount: number;
}

export interface CategoriesPage {
  data: CategoryWithAssetCount[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
  ) {}

  // ─────────────────────────────────────────────
  // Create
  // ─────────────────────────────────────────────
  async create(dto: CreateCategoryDto): Promise<CategoryWithAssetCount> {
    // Unique name check
    const existingName = await this.categoriesRepository.findByName(dto.name);
    if (existingName) {
      throw new BusinessException(
        ErrorCodes.VALIDATION_ERROR,
        `Category "${dto.name}" already exists`,
        HttpStatus.CONFLICT,
      );
    }

    // Unique code check
    const existingCode = await this.categoriesRepository.findByCode(dto.code);
    if (existingCode) {
      throw new BusinessException(
        ErrorCodes.VALIDATION_ERROR,
        `Category code "${dto.code}" already exists`,
        HttpStatus.CONFLICT,
      );
    }

    const slug = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const category = await this.categoriesRepository.create({
      name: dto.name,
      code: dto.code.toUpperCase(),
      slug,
      description: dto.description,
      icon: dto.icon ?? 'folder',
      color: dto.color ?? '#6366f1',
      isActive: dto.isActive ?? true,
    });

    return { ...category, assetCount: 0 };
  }

  // ─────────────────────────────────────────────
  // Find all (paginated)
  // ─────────────────────────────────────────────
  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<CategoriesPage> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    const [data, total] = await Promise.all([
      this.categoriesRepository.findAll({ where, skip, take: limit }),
      this.categoriesRepository.count(where),
    ]);

    // Enrich with asset count
    const dataWithCounts = await Promise.all(
      data.map(async (category) => ({
        ...category,
        assetCount: await this.categoriesRepository.countAssetsWithCategory(category.id),
      })),
    );

    return {
      data: dataWithCounts,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─────────────────────────────────────────────
  // Find one (with asset count)
  // ─────────────────────────────────────────────
  async findOne(id: string): Promise<CategoryWithAssetCount> {
    const category = await this.categoriesRepository.findById(id);
    if (!category) {
      throw new BusinessException(
        ErrorCodes.CATEGORY_NOT_FOUND,
        `Category with id "${id}" not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const assetCount = await this.categoriesRepository.countAssetsWithCategory(id);
    return { ...category, assetCount };
  }

  // ─────────────────────────────────────────────
  // Update
  // ─────────────────────────────────────────────
  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryWithAssetCount> {
    const category = await this.findOne(id);

    // Unique name check if name is changing
    if (dto.name && dto.name !== category.name) {
      const conflict = await this.categoriesRepository.findByName(dto.name);
      if (conflict) {
        throw new BusinessException(
          ErrorCodes.VALIDATION_ERROR,
          `Category "${dto.name}" already exists`,
          HttpStatus.CONFLICT,
        );
      }
    }

    // Unique code check if code is changing
    if (dto.code && dto.code.toUpperCase() !== category.code) {
      const conflict = await this.categoriesRepository.findByCode(dto.code);
      if (conflict) {
        throw new BusinessException(
          ErrorCodes.VALIDATION_ERROR,
          `Category code "${dto.code}" already exists`,
          HttpStatus.CONFLICT,
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      updateData.name = dto.name;
      updateData.slug = dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
    if (dto.code !== undefined) {
      updateData.code = dto.code.toUpperCase();
    }
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.icon !== undefined) updateData.icon = dto.icon;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    await this.categoriesRepository.update(id, updateData);
    return this.findOne(id);
  }

  // ─────────────────────────────────────────────
  // Soft Delete
  // ─────────────────────────────────────────────
  async remove(id: string, deletedBy: string): Promise<void> {
    const category = await this.findOne(id);

    // Prevent deleting a category that has active assets
    const assetCount = await this.categoriesRepository.countAssetsWithCategory(id);
    if (assetCount > 0) {
      throw new BusinessException(
        ErrorCodes.CATEGORY_HAS_ASSETS,
        `Cannot delete category "${category.name}" — ${assetCount} asset(s) are assigned to it`,
        HttpStatus.CONFLICT,
      );
    }

    await this.categoriesRepository.softDelete(id, deletedBy);
  }

  // ─────────────────────────────────────────────
  // Restore
  // ─────────────────────────────────────────────
  async restore(id: string): Promise<CategoryWithAssetCount> {
    const all = await this.categoriesRepository.findAllIncludingDeleted();
    const found = all.find((c) => c.id === id);

    if (!found) {
      throw new BusinessException(
        ErrorCodes.CATEGORY_NOT_FOUND,
        `Category with id "${id}" not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    if (!found.isDeleted) {
      throw new BusinessException(
        ErrorCodes.VALIDATION_ERROR,
        'Category is not deleted',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.categoriesRepository.restore(id);
    return this.findOne(id);
  }
}
