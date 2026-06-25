import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { ErrorCodes } from '../common/constants/error-codes.constant.js';
import { AssetsRepository } from './assets.repository.js';
import { PrismaService } from '../common/database/prisma.service.js';
import type { CreateAssetDto } from './dto/create-asset.dto.js';
import type { UpdateAssetDto } from './dto/update-asset.dto.js';
import type { AssetQueryDto } from './dto/asset-query.dto.js';
import type { Asset } from '@prisma/client';

export interface AssetWithRelations extends Asset {
  category?: { id: string; name: string } | null;
  assignee?: { id: string; name: string; employeeId: string } | null;
}

export interface AssetsPage {
  data: AssetWithRelations[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class AssetsService {
  constructor(
    private readonly assetsRepository: AssetsRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ─────────────────────────────────────────────
  // Create
  // ─────────────────────────────────────────────
  async create(dto: CreateAssetDto, createdBy: string): Promise<AssetWithRelations> {
    // Generate 6-length asset code: AST-000001
    const totalAssets = await this.assetsRepository.countAll();
    const nextNumber = totalAssets + 1;
    const assetCode = `AST-${nextNumber.toString().padStart(6, '0')}`;

    if (dto.serialNumber) {
      const existingSerial = await this.assetsRepository.findBySerialNumber(dto.serialNumber);
      if (existingSerial) {
        throw new BusinessException(
          ErrorCodes.DUPLICATE_SERIAL_NUMBER,
          `Serial number "${dto.serialNumber}" is already in use`,
          HttpStatus.CONFLICT,
        );
      }
    }

    const asset = await this.assetsRepository.create({
      assetCode,
      name: dto.name,
      categoryId: dto.categoryId,
      brand: dto.brand,
      model: dto.model,
      serialNumber: dto.serialNumber,
      purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
      purchasePrice: dto.purchasePrice,
      warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : null,
      location: dto.location,
      department: dto.department,
      assignedTo: dto.assignedTo,
      status: dto.status || 'AVAILABLE',
      description: dto.description,
      createdBy,
    });

    return this.populateRelations(asset);
  }

  // ─────────────────────────────────────────────
  // Find all (paginated, filtered, sorted)
  // ─────────────────────────────────────────────
  async findAll(query: AssetQueryDto): Promise<AssetsPage> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { assetCode: { contains: query.search, mode: 'insensitive' } },
        { serialNumber: { contains: query.search, mode: 'insensitive' } },
        { brand: { contains: query.search, mode: 'insensitive' } },
        { model: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.department) {
      where.department = { contains: query.department, mode: 'insensitive' };
    }

    if (query.assignedTo) {
      where.assignedTo = query.assignedTo;
    }

    if (query.status) {
      where.status = query.status;
    }

    const sortField = query.sortBy ?? 'createdAt';
    const sortDir = query.sortOrder ?? 'desc';
    const orderBy = { [sortField]: sortDir };

    const [assets, total] = await Promise.all([
      this.assetsRepository.findAll({ where, skip, take: limit, orderBy }),
      this.assetsRepository.count(where),
    ]);

    const data = await this.populateRelationsBatch(assets);

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
  // Find one
  // ─────────────────────────────────────────────
  async findOne(id: string): Promise<AssetWithRelations> {
    const asset = await this.assetsRepository.findById(id);
    if (!asset) {
      throw new BusinessException(
        ErrorCodes.ASSET_NOT_FOUND,
        `Asset with id "${id}" not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    return this.populateRelations(asset);
  }

  // ─────────────────────────────────────────────
  // Update
  // ─────────────────────────────────────────────
  async update(id: string, dto: UpdateAssetDto, updatedBy: string): Promise<AssetWithRelations> {
    const asset = await this.findOne(id);

    if (dto.serialNumber && dto.serialNumber !== asset.serialNumber) {
      const taken = await this.assetsRepository.findBySerialNumber(dto.serialNumber);
      if (taken) {
        throw new BusinessException(
          ErrorCodes.DUPLICATE_SERIAL_NUMBER,
          `Serial number "${dto.serialNumber}" is already in use`,
          HttpStatus.CONFLICT,
        );
      }
    }

    const updated = await this.assetsRepository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
      ...(dto.brand !== undefined && { brand: dto.brand }),
      ...(dto.model !== undefined && { model: dto.model }),
      ...(dto.serialNumber !== undefined && { serialNumber: dto.serialNumber }),
      ...(dto.purchaseDate !== undefined && { purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null }),
      ...(dto.purchasePrice !== undefined && { purchasePrice: dto.purchasePrice }),
      ...(dto.warrantyExpiry !== undefined && { warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : null }),
      ...(dto.location !== undefined && { location: dto.location }),
      ...(dto.department !== undefined && { department: dto.department }),
      ...(dto.assignedTo !== undefined && { assignedTo: dto.assignedTo }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.description !== undefined && { description: dto.description }),
      updatedBy,
    });

    return this.populateRelations(updated);
  }

  // ─────────────────────────────────────────────
  // Soft Delete
  // ─────────────────────────────────────────────
  async remove(id: string, deletedBy: string): Promise<void> {
    const asset = await this.findOne(id);
    if (asset.assignedTo) {
      throw new BusinessException(
        ErrorCodes.CANNOT_DELETE_ASSIGNED_ASSET,
        `Cannot delete asset "${asset.assetCode}" because it is currently assigned`,
        HttpStatus.CONFLICT,
      );
    }
    await this.assetsRepository.softDelete(id, deletedBy);
  }

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  private async populateRelations(asset: Asset): Promise<AssetWithRelations> {
    let category = null;
    let assignee = null;

    if (asset.categoryId) {
      const cat = await this.prisma.category.findUnique({ where: { id: asset.categoryId } });
      if (cat) category = { id: cat.id, name: cat.name };
    }

    if (asset.assignedTo) {
      const user = await this.prisma.user.findUnique({ where: { id: asset.assignedTo } });
      if (user) assignee = { id: user.id, name: `${user.firstName} ${user.lastName}`, employeeId: user.employeeId };
    }

    return { ...asset, category, assignee };
  }

  private async populateRelationsBatch(assets: Asset[]): Promise<AssetWithRelations[]> {
    if (assets.length === 0) return [];

    const categoryIds = [...new Set(assets.map((a) => a.categoryId).filter(Boolean))];
    const assigneeIds = [...new Set(assets.map((a) => a.assignedTo).filter(Boolean))] as string[];

    const [categories, users] = await Promise.all([
      this.prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } }),
      this.prisma.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, firstName: true, lastName: true, employeeId: true } }),
    ]);

    const catMap = new Map(categories.map((c) => [c.id, c]));
    const userMap = new Map(users.map((u) => [u.id, { id: u.id, name: `${u.firstName} ${u.lastName}`, employeeId: u.employeeId }]));

    return assets.map((asset) => ({
      ...asset,
      category: catMap.get(asset.categoryId) ?? null,
      assignee: asset.assignedTo ? userMap.get(asset.assignedTo) ?? null : null,
    }));
  }
}
