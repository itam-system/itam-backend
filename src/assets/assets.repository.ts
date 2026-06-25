import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service.js';
import type { Prisma, Asset } from '@prisma/client';

@Injectable()
export class AssetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AssetCreateInput): Promise<Asset> {
    return this.prisma.asset.create({ data });
  }

  async findAll(params: {
    where?: Prisma.AssetWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.AssetOrderByWithRelationInput | Prisma.AssetOrderByWithRelationInput[];
  }): Promise<Asset[]> {
    const { where, skip, take, orderBy } = params;
    return this.prisma.asset.findMany({
      where: { isDeleted: false, ...where },
      skip,
      take,
      orderBy: orderBy ?? { createdAt: 'desc' },
    });
  }

  async count(where?: Prisma.AssetWhereInput): Promise<number> {
    return this.prisma.asset.count({
      where: { isDeleted: false, ...where },
    });
  }

  async findById(id: string): Promise<Asset | null> {
    return this.prisma.asset.findFirst({
      where: { id, isDeleted: false },
    });
  }

  async findByAssetCode(assetCode: string): Promise<Asset | null> {
    return this.prisma.asset.findFirst({
      where: { assetCode, isDeleted: false },
    });
  }

  async findBySerialNumber(serialNumber: string): Promise<Asset | null> {
    return this.prisma.asset.findFirst({
      where: { serialNumber, isDeleted: false },
    });
  }

  async update(id: string, data: Prisma.AssetUpdateInput): Promise<Asset> {
    return this.prisma.asset.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string, deletedBy: string): Promise<Asset> {
    return this.prisma.asset.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }

  async restore(id: string): Promise<Asset> {
    return this.prisma.asset.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      },
    });
  }

  // Get total assets count including deleted (for code generation logic)
  async countAll(): Promise<number> {
    return this.prisma.asset.count();
  }
}
