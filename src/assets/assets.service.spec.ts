import { Test, type TestingModule } from '@nestjs/testing';
import { AssetsService } from './assets.service.js';
import { AssetsRepository } from './assets.repository.js';
import { PrismaService } from '../common/database/prisma.service.js';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { ErrorCodes } from '../common/constants/error-codes.constant.js';
import { createMockPrisma, mockAsset, type MockPrisma } from '../test-utils/prisma-mock.js';
import type { Asset } from '@prisma/client';
import type { CreateAssetDto } from './dto/create-asset.dto.js';
import type { AssetQueryDto } from './dto/asset-query.dto.js';

describe('AssetsService', () => {
  let service: AssetsService;
  let mockPrisma: MockPrisma;
  let repo: Record<string, jest.Mock>;

  const baseAsset: Asset = mockAsset();
  const mockCategory = { id: 'cat-1', name: 'Laptops' };
  const mockUser = { id: 'user-1', firstName: 'John', lastName: 'Doe', employeeId: 'EMP-001' };

  beforeEach(async () => {
    const { mockPrisma: mp } = createMockPrisma();
    mockPrisma = mp;

    repo = {
      findAll: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      countAll: jest.fn(),
      findBySerialNumber: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: AssetsRepository, useValue: repo },
        { provide: PrismaService, useValue: mockPrisma as any },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────
  describe('create', () => {
    it('should generate AST-000001 for the first asset', async () => {
      repo.countAll.mockResolvedValue(0);
      repo.findBySerialNumber.mockResolvedValue(null);
      repo.create.mockResolvedValue({ ...baseAsset, assetCode: 'AST-000001' });
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);

      const dto: CreateAssetDto = {
        name: 'MacBook Pro',
        categoryId: 'cat-1',
        serialNumber: 'SN-001',
        brand: 'Apple',
        model: 'M3 Pro',
      };

      const result = await service.create(dto, 'user-1');

      expect(repo.countAll).toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          assetCode: 'AST-000001',
          name: 'MacBook Pro',
          serialNumber: 'SN-001',
          category: { connect: { id: 'cat-1' } },
          createdBy: 'user-1',
        }),
      );
      expect(result.assetCode).toBe('AST-000001');
    });

    it('should generate AST-000002 for the second asset', async () => {
      repo.countAll.mockResolvedValue(1);
      repo.findBySerialNumber.mockResolvedValue(null);
      repo.create.mockResolvedValue({ ...baseAsset, assetCode: 'AST-000002' });
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.create(
        { name: 'Monitor', categoryId: 'cat-1', serialNumber: 'SN-002' },
        'user-1',
      );

      expect(repo.countAll).toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ assetCode: 'AST-000002' }),
      );
      expect(result.assetCode).toBe('AST-000002');
    });

    it('should throw DUPLICATE_SERIAL_NUMBER when serial already exists', async () => {
      repo.countAll.mockResolvedValue(0);
      repo.findBySerialNumber.mockResolvedValue(baseAsset);

      const dto: CreateAssetDto = { name: 'MacBook Pro', categoryId: 'cat-1', serialNumber: 'SN-001' };

      await expect(service.create(dto, 'user-1')).rejects.toThrow(BusinessException);
      await expect(service.create(dto, 'user-1')).rejects.toMatchObject({
        errorCode: ErrorCodes.DUPLICATE_SERIAL_NUMBER,
      });
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('should return asset with populated category', async () => {
      repo.countAll.mockResolvedValue(0);
      repo.findBySerialNumber.mockResolvedValue(null);
      repo.create.mockResolvedValue(baseAsset);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.create(
        { name: 'MacBook Pro', categoryId: 'cat-1' },
        'user-1',
      );

      expect(result.category).toEqual({ id: 'cat-1', name: 'Laptops' });
      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
    });
  });

  // ─────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────
  describe('findAll', () => {
    it('should return paginated results with default sorting', async () => {
      const assets = [mockAsset({ id: 'asset-1' }), mockAsset({ id: 'asset-2' })];
      repo.findAll.mockResolvedValue(assets);
      repo.count.mockResolvedValue(2);
      mockPrisma.category.findMany.mockResolvedValue([mockCategory]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.findAll({});

      expect(repo.findAll).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      expect(repo.count).toHaveBeenCalledWith({});
      expect(result.meta).toEqual({ total: 2, page: 1, limit: 20, totalPages: 1 });
      expect(result.data).toHaveLength(2);
    });

    it('should filter by search query', async () => {
      repo.findAll.mockResolvedValue([baseAsset]);
      repo.count.mockResolvedValue(1);
      mockPrisma.category.findMany.mockResolvedValue([mockCategory]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const query: AssetQueryDto = { search: 'macbook' };
      await service.findAll(query);

      expect(repo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'macbook', mode: 'insensitive' } },
              { assetCode: { contains: 'macbook', mode: 'insensitive' } },
              { serialNumber: { contains: 'macbook', mode: 'insensitive' } },
              { brand: { contains: 'macbook', mode: 'insensitive' } },
              { model: { contains: 'macbook', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('should filter by categoryId, department, status, and assignedTo', async () => {
      repo.findAll.mockResolvedValue([baseAsset]);
      repo.count.mockResolvedValue(1);
      mockPrisma.category.findMany.mockResolvedValue([mockCategory]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.findAll({
        categoryId: 'cat-2',
        department: 'Engineering',
        status: 'AVAILABLE' as any,
        assignedTo: 'user-2',
      });

      expect(repo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            categoryId: 'cat-2',
            department: { contains: 'Engineering', mode: 'insensitive' },
            status: 'AVAILABLE',
            assignedTo: 'user-2',
          },
        }),
      );
    });

    it('should cap limit at 100 and calculate skip correctly', async () => {
      repo.findAll.mockResolvedValue([]);
      repo.count.mockResolvedValue(0);
      mockPrisma.category.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.findAll({ page: 3, limit: 999 });

      expect(repo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 200, take: 100 }),
      );
    });

    it('should apply custom sorting', async () => {
      repo.findAll.mockResolvedValue([]);
      repo.count.mockResolvedValue(0);
      mockPrisma.category.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.findAll({ sortBy: 'name' as any, sortOrder: 'asc' });

      expect(repo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
    });

    it('should populate relations in batch', async () => {
      const asset1 = mockAsset({ id: 'a1', categoryId: 'cat-1', assignedTo: null });
      const asset2 = mockAsset({ id: 'a2', categoryId: 'cat-2', assignedTo: 'user-2' });
      repo.findAll.mockResolvedValue([asset1, asset2]);
      repo.count.mockResolvedValue(2);
      mockPrisma.category.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Laptops' },
        { id: 'cat-2', name: 'Monitors' },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-2', firstName: 'Jane', lastName: 'Smith', employeeId: 'EMP-002' },
      ]);

      const result = await service.findAll({});

      expect(result.data[0].category).toEqual({ id: 'cat-1', name: 'Laptops' });
      expect(result.data[1].category).toEqual({ id: 'cat-2', name: 'Monitors' });
      expect(result.data[1].assignee).toEqual({
        id: 'user-2',
        name: 'Jane Smith',
        employeeId: 'EMP-002',
      });
    });
  });

  // ─────────────────────────────────────────────
  // findOne
  // ─────────────────────────────────────────────
  describe('findOne', () => {
    it('should return asset when found', async () => {
      repo.findById.mockResolvedValue(baseAsset);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.findOne('asset-1');

      expect(repo.findById).toHaveBeenCalledWith('asset-1');
      expect(result.id).toBe('asset-1');
      expect(result.category).toEqual(mockCategory);
    });

    it('should throw ASSET_NOT_FOUND when asset is missing', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(BusinessException);
      await expect(service.findOne('nonexistent')).rejects.toMatchObject({
        errorCode: ErrorCodes.ASSET_NOT_FOUND,
      });
    });
  });

  // ─────────────────────────────────────────────
  // update
  // ─────────────────────────────────────────────
  describe('update', () => {
    it('should update asset fields', async () => {
      repo.findById.mockResolvedValue(baseAsset);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      const updated = { ...baseAsset, name: 'Updated Name' };
      repo.update.mockResolvedValue(updated);

      const result = await service.update('asset-1', { name: 'Updated Name' }, 'user-2');

      expect(repo.update).toHaveBeenCalledWith(
        'asset-1',
        expect.objectContaining({ name: 'Updated Name', updatedBy: 'user-2' }),
      );
      expect(result.name).toBe('Updated Name');
    });

    it('should throw DUPLICATE_SERIAL_NUMBER when changing to an existing serial', async () => {
      repo.findById.mockResolvedValue(baseAsset);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      repo.findBySerialNumber.mockResolvedValue(mockAsset({ id: 'asset-2' }));

      await expect(
        service.update('asset-1', { serialNumber: 'SN-002' }, 'user-2'),
      ).rejects.toMatchObject({ errorCode: ErrorCodes.DUPLICATE_SERIAL_NUMBER });
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('should skip serial uniqueness check when serial is not provided', async () => {
      repo.findById.mockResolvedValue(baseAsset);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      repo.update.mockResolvedValue(baseAsset);

      await service.update('asset-1', { name: 'Updated Name' }, 'user-2');

      expect(repo.findBySerialNumber).not.toHaveBeenCalled();
    });

    it('should skip serial uniqueness check when serial is unchanged', async () => {
      repo.findById.mockResolvedValue(baseAsset);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      repo.update.mockResolvedValue(baseAsset);

      await service.update('asset-1', { serialNumber: 'SN-001' }, 'user-2');

      expect(repo.findBySerialNumber).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // remove
  // ─────────────────────────────────────────────
  describe('remove', () => {
    it('should soft-delete an unassigned asset', async () => {
      repo.findById.mockResolvedValue(baseAsset);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      repo.softDelete.mockResolvedValue(baseAsset);

      await service.remove('asset-1', 'user-2');

      expect(repo.softDelete).toHaveBeenCalledWith('asset-1', 'user-2');
    });

    it('should throw CANNOT_DELETE_ASSIGNED_ASSET when asset is assigned', async () => {
      const assignedAsset = mockAsset({ assignedTo: 'user-2' });
      repo.findById.mockResolvedValue(assignedAsset);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.remove('asset-1', 'user-2')).rejects.toThrow(BusinessException);
      await expect(service.remove('asset-1', 'user-2')).rejects.toMatchObject({
        errorCode: ErrorCodes.CANNOT_DELETE_ASSIGNED_ASSET,
      });
      expect(repo.softDelete).not.toHaveBeenCalled();
    });
  });
});
