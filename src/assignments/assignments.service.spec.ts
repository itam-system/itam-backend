import { Test, TestingModule } from '@nestjs/testing';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { ErrorCodes } from '../common/constants/error-codes.constant.js';
import { AssignmentsService } from './assignments.service.js';
import { AssignmentsRepository } from './assignments.repository.js';
import { AssetsRepository } from '../assets/assets.repository.js';
import { UsersRepository } from '../users/users.repository.js';
import { PrismaService } from '../common/database/prisma.service.js';
import { AssignmentAction } from '../common/enums/assignment-action.enum.js';
import { AssetStatus } from '../common/enums/asset-status.enum.js';
import { createMockPrisma, mockUser, mockAsset, mockAssignment, mockRole } from '../test-utils/prisma-mock.js';
import type { MockTx, MockPrisma } from '../test-utils/prisma-mock.js';

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let mockAssignmentsRepository: Record<string, jest.Mock>;
  let mockAssetsRepository: Record<string, jest.Mock>;
  let mockUsersRepository: Record<string, jest.Mock>;
  let mockPrisma: MockPrisma;
  let mockTx: MockTx;

  const assetId = 'asset-1';
  const userId1 = 'user-1';
  const userId2 = 'user-2';
  const userId3 = 'user-3';

  const availableAsset = mockAsset();
  const assignedAsset = mockAsset({ status: 'ASSIGNED' as const, assignedTo: userId2 });
  const user1 = mockUser({ id: userId1 });
  const user2 = mockUser({ id: userId2 });
  const user3 = mockUser({ id: userId3 });
  const activeAssignment = mockAssignment({ id: 'active-1', returnedAt: null });

  beforeEach(async () => {
    const prismaMocks = createMockPrisma();
    mockPrisma = prismaMocks.mockPrisma;
    mockTx = prismaMocks.mockTx;

    mockAssignmentsRepository = {
      findActiveAssignmentByAssetId: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
    };

    mockAssetsRepository = {
      findById: jest.fn(),
    };

    mockUsersRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: AssignmentsRepository, useValue: mockAssignmentsRepository },
        { provide: AssetsRepository, useValue: mockAssetsRepository },
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // assignAsset
  // ─────────────────────────────────────────────
  describe('assignAsset', () => {
    const dto = { assetId, assignedTo: userId2, notes: 'assigning laptop' };
    const assignedBy = userId1;

    it('should successfully assign an asset', async () => {
      mockAssetsRepository.findById.mockResolvedValue(availableAsset);
      mockUsersRepository.findById.mockResolvedValue(user2);
      const created = mockAssignment();
      mockTx.assignment.create.mockResolvedValue(created);
      mockTx.asset.update.mockResolvedValue(availableAsset);
      mockPrisma.asset.findUnique.mockResolvedValue(availableAsset);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(user2)
        .mockResolvedValueOnce(user1);

      const result = await service.assignAsset(dto, assignedBy);

      expect(mockAssetsRepository.findById).toHaveBeenCalledWith(assetId);
      expect(mockUsersRepository.findById).toHaveBeenCalledWith(userId2);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.assignment.create).toHaveBeenCalledWith({
        data: {
          assetId,
          assignedTo: userId2,
          assignedBy: userId1,
          action: AssignmentAction.ASSIGN,
          notes: 'assigning laptop',
          returnedAt: null,
        },
      });
      expect(mockTx.asset.update).toHaveBeenCalledWith({
        where: { id: assetId },
        data: {
          assignedTo: userId2,
          status: AssetStatus.ASSIGNED,
          updatedBy: userId1,
        },
      });
      expect(mockPrisma.asset.findUnique).toHaveBeenCalledWith({ where: { id: assetId } });
      expect(result).toMatchObject({
        ...created,
        asset: { id: assetId, assetCode: 'AST-000001', name: 'MacBook Pro' },
        assignee: { id: userId2, name: 'John Doe', employeeId: 'EMP-001' },
        assignedByUser: { id: userId1, name: 'John Doe', employeeId: 'EMP-001' },
        transferredFromUser: null,
      });
    });

    it('should throw ASSET_NOT_FOUND when asset does not exist', async () => {
      mockAssetsRepository.findById.mockResolvedValue(null);

      await expect(service.assignAsset(dto, assignedBy)).rejects.toThrow(
        new BusinessException(ErrorCodes.ASSET_NOT_FOUND, 'Asset not found', 404),
      );
      expect(mockUsersRepository.findById).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw INVALID_STATUS_TRANSITION when asset is not AVAILABLE', async () => {
      const nonAvailable = mockAsset({ status: 'ASSIGNED' as const });
      mockAssetsRepository.findById.mockResolvedValue(nonAvailable);

      await expect(service.assignAsset(dto, assignedBy)).rejects.toThrow(
        new BusinessException(ErrorCodes.INVALID_STATUS_TRANSITION, expect.any(String), 409),
      );
      expect(mockUsersRepository.findById).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw ASSET_ALREADY_ASSIGNED when asset already has an assignee', async () => {
      const alreadyAssigned = mockAsset({ assignedTo: userId2 });
      mockAssetsRepository.findById.mockResolvedValue(alreadyAssigned);

      await expect(service.assignAsset(dto, assignedBy)).rejects.toThrow(
        new BusinessException(ErrorCodes.ASSET_ALREADY_ASSIGNED, expect.any(String), 409),
      );
      expect(mockUsersRepository.findById).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw USER_NOT_FOUND when assignee does not exist', async () => {
      mockAssetsRepository.findById.mockResolvedValue(availableAsset);
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(service.assignAsset(dto, assignedBy)).rejects.toThrow(
        new BusinessException(ErrorCodes.USER_NOT_FOUND, 'Assignee not found', 404),
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // returnAsset
  // ─────────────────────────────────────────────
  describe('returnAsset', () => {
    const dto = { assetId, notes: 'returned in good condition' };
    const returnedBy = userId1;

    it('should successfully return an asset', async () => {
      mockAssetsRepository.findById.mockResolvedValue(assignedAsset);
      mockAssignmentsRepository.findActiveAssignmentByAssetId.mockResolvedValue(activeAssignment);
      const returnAssignment = mockAssignment({ action: 'RETURN' as const, returnedAt: new Date() });
      mockTx.assignment.update.mockResolvedValue(activeAssignment);
      mockTx.assignment.create.mockResolvedValue(returnAssignment);
      mockTx.asset.update.mockResolvedValue(assignedAsset);
      mockPrisma.asset.findUnique.mockResolvedValue(assignedAsset);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(user2)
        .mockResolvedValueOnce(user1);

      const result = await service.returnAsset(dto, returnedBy);

      expect(mockAssetsRepository.findById).toHaveBeenCalledWith(assetId);
      expect(mockAssignmentsRepository.findActiveAssignmentByAssetId).toHaveBeenCalledWith(assetId);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.assignment.update).toHaveBeenCalledWith({
        where: { id: 'active-1' },
        data: { returnedAt: expect.any(Date) },
      });
      expect(mockTx.assignment.create).toHaveBeenCalledWith({
        data: {
          assetId,
          assignedTo: userId2,
          assignedBy: userId1,
          action: AssignmentAction.RETURN,
          notes: 'returned in good condition',
          returnedAt: expect.any(Date),
        },
      });
      expect(mockTx.asset.update).toHaveBeenCalledWith({
        where: { id: assetId },
        data: {
          assignedTo: null,
          status: AssetStatus.AVAILABLE,
          updatedBy: userId1,
        },
      });
      expect(result).toMatchObject({
        ...returnAssignment,
        asset: { id: assetId, assetCode: 'AST-000001', name: 'MacBook Pro' },
        assignee: { id: userId2, name: 'John Doe', employeeId: 'EMP-001' },
        assignedByUser: { id: userId1, name: 'John Doe', employeeId: 'EMP-001' },
        transferredFromUser: null,
      });
    });

    it('should throw ASSET_NOT_FOUND when asset does not exist', async () => {
      mockAssetsRepository.findById.mockResolvedValue(null);

      await expect(service.returnAsset(dto, returnedBy)).rejects.toThrow(
        new BusinessException(ErrorCodes.ASSET_NOT_FOUND, 'Asset not found', 404),
      );
      expect(mockAssignmentsRepository.findActiveAssignmentByAssetId).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw INVALID_STATUS_TRANSITION when asset is not ASSIGNED', async () => {
      mockAssetsRepository.findById.mockResolvedValue(availableAsset);

      await expect(service.returnAsset(dto, returnedBy)).rejects.toThrow(
        new BusinessException(ErrorCodes.INVALID_STATUS_TRANSITION, expect.any(String), 409),
      );
      expect(mockAssignmentsRepository.findActiveAssignmentByAssetId).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw ASSIGNMENT_NOT_FOUND when no active assignment exists', async () => {
      mockAssetsRepository.findById.mockResolvedValue(assignedAsset);
      mockAssignmentsRepository.findActiveAssignmentByAssetId.mockResolvedValue(null);

      await expect(service.returnAsset(dto, returnedBy)).rejects.toThrow(
        new BusinessException(ErrorCodes.ASSIGNMENT_NOT_FOUND, 'No active assignment found for this asset', 404),
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // transferAsset
  // ─────────────────────────────────────────────
  describe('transferAsset', () => {
    const dto = { assetId, newAssignedTo: userId3, notes: 'transfer due to role change' };
    const transferredBy = userId1;

    it('should successfully transfer an asset', async () => {
      mockAssetsRepository.findById.mockResolvedValue(assignedAsset);
      mockUsersRepository.findById.mockResolvedValue(user3);
      mockAssignmentsRepository.findActiveAssignmentByAssetId.mockResolvedValue(activeAssignment);
      const transferAssignment = mockAssignment({
        action: 'TRANSFER' as const,
        assignedTo: userId3,
        transferredFrom: userId2,
      });
      mockTx.assignment.update.mockResolvedValue(activeAssignment);
      mockTx.assignment.create.mockResolvedValue(transferAssignment);
      mockTx.asset.update.mockResolvedValue(assignedAsset);
      mockPrisma.asset.findUnique.mockResolvedValue(assignedAsset);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(user3)
        .mockResolvedValueOnce(user1)
        .mockResolvedValueOnce(user2);

      const result = await service.transferAsset(dto, transferredBy);

      expect(mockAssetsRepository.findById).toHaveBeenCalledWith(assetId);
      expect(mockUsersRepository.findById).toHaveBeenCalledWith(userId3);
      expect(mockAssignmentsRepository.findActiveAssignmentByAssetId).toHaveBeenCalledWith(assetId);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.assignment.update).toHaveBeenCalledWith({
        where: { id: 'active-1' },
        data: { returnedAt: expect.any(Date) },
      });
      expect(mockTx.assignment.create).toHaveBeenCalledWith({
        data: {
          assetId,
          assignedTo: userId3,
          assignedBy: userId1,
          action: AssignmentAction.TRANSFER,
          transferredFrom: userId2,
          notes: 'transfer due to role change',
          returnedAt: null,
        },
      });
      expect(mockTx.asset.update).toHaveBeenCalledWith({
        where: { id: assetId },
        data: {
          assignedTo: userId3,
          updatedBy: userId1,
        },
      });
      expect(result).toMatchObject({
        ...transferAssignment,
        asset: { id: assetId, assetCode: 'AST-000001', name: 'MacBook Pro' },
        assignee: { id: userId3, name: 'John Doe', employeeId: 'EMP-001' },
        assignedByUser: { id: userId1, name: 'John Doe', employeeId: 'EMP-001' },
        transferredFromUser: { id: userId2, name: 'John Doe', employeeId: 'EMP-001' },
      });
    });

    it('should throw ASSET_NOT_FOUND when asset does not exist', async () => {
      mockAssetsRepository.findById.mockResolvedValue(null);

      await expect(service.transferAsset(dto, transferredBy)).rejects.toThrow(
        new BusinessException(ErrorCodes.ASSET_NOT_FOUND, 'Asset not found', 404),
      );
      expect(mockUsersRepository.findById).not.toHaveBeenCalled();
      expect(mockAssignmentsRepository.findActiveAssignmentByAssetId).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw INVALID_STATUS_TRANSITION when asset is not ASSIGNED', async () => {
      mockAssetsRepository.findById.mockResolvedValue(availableAsset);

      await expect(service.transferAsset(dto, transferredBy)).rejects.toThrow(
        new BusinessException(ErrorCodes.INVALID_STATUS_TRANSITION, expect.any(String), 409),
      );
      expect(mockUsersRepository.findById).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw VALIDATION_ERROR when transferring to the same user', async () => {
      const sameUserAsset = mockAsset({ status: 'ASSIGNED' as const, assignedTo: userId3 });
      const sameUserDto = { assetId, newAssignedTo: userId3, notes: '' };
      mockAssetsRepository.findById.mockResolvedValue(sameUserAsset);

      await expect(service.transferAsset(sameUserDto, transferredBy)).rejects.toThrow(
        new BusinessException(ErrorCodes.VALIDATION_ERROR, expect.any(String), 400),
      );
      expect(mockUsersRepository.findById).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw USER_NOT_FOUND when new assignee does not exist', async () => {
      mockAssetsRepository.findById.mockResolvedValue(assignedAsset);
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(service.transferAsset(dto, transferredBy)).rejects.toThrow(
        new BusinessException(ErrorCodes.USER_NOT_FOUND, 'New assignee not found', 404),
      );
      expect(mockAssignmentsRepository.findActiveAssignmentByAssetId).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw ASSIGNMENT_NOT_FOUND when no active assignment exists', async () => {
      mockAssetsRepository.findById.mockResolvedValue(assignedAsset);
      mockUsersRepository.findById.mockResolvedValue(user3);
      mockAssignmentsRepository.findActiveAssignmentByAssetId.mockResolvedValue(null);

      await expect(service.transferAsset(dto, transferredBy)).rejects.toThrow(
        new BusinessException(ErrorCodes.ASSIGNMENT_NOT_FOUND, 'No active assignment found for this asset', 404),
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────
  describe('findAll', () => {
    it('should return paginated results with default pagination', async () => {
      const assignments = [mockAssignment()];
      const total = 5;
      mockAssignmentsRepository.findAll.mockResolvedValue(assignments);
      mockAssignmentsRepository.count.mockResolvedValue(total);
      mockPrisma.asset.findMany.mockResolvedValue([mockAsset()]);
      mockPrisma.user.findMany.mockResolvedValue([user1, user2]);

      const result = await service.findAll({});

      expect(mockAssignmentsRepository.findAll).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { assignedAt: 'desc' },
      });
      expect(mockAssignmentsRepository.count).toHaveBeenCalledWith({});
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith({
        where: { id: { in: [assetId] } },
        select: { id: true, assetCode: true, name: true },
      });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: [userId2, userId1] } },
        select: { id: true, firstName: true, lastName: true, employeeId: true },
      });
      expect(result.meta).toEqual({ total, page: 1, limit: 20, totalPages: 1 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        ...assignments[0],
        asset: { id: assetId, assetCode: 'AST-000001', name: 'MacBook Pro' },
        assignee: { id: userId2, name: 'John Doe', employeeId: 'EMP-001' },
        assignedByUser: { id: userId1, name: 'John Doe', employeeId: 'EMP-001' },
        transferredFromUser: null,
      });
    });

    it('should return paginated results with custom pagination', async () => {
      const assignments = [mockAssignment()];
      const total = 25;
      mockAssignmentsRepository.findAll.mockResolvedValue(assignments);
      mockAssignmentsRepository.count.mockResolvedValue(total);
      mockPrisma.asset.findMany.mockResolvedValue([mockAsset()]);
      mockPrisma.user.findMany.mockResolvedValue([user1, user2]);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(mockAssignmentsRepository.findAll).toHaveBeenCalledWith({
        where: {},
        skip: 10,
        take: 10,
        orderBy: { assignedAt: 'desc' },
      });
      expect(mockAssignmentsRepository.count).toHaveBeenCalledWith({});
      expect(result.meta).toEqual({ total: 25, page: 2, limit: 10, totalPages: 3 });
    });

    it('should filter results by assetId', async () => {
      const assignments = [mockAssignment()];
      const total = 1;
      mockAssignmentsRepository.findAll.mockResolvedValue(assignments);
      mockAssignmentsRepository.count.mockResolvedValue(total);
      mockPrisma.asset.findMany.mockResolvedValue([mockAsset()]);
      mockPrisma.user.findMany.mockResolvedValue([user1, user2]);

      const result = await service.findAll({ assetId });

      expect(mockAssignmentsRepository.findAll).toHaveBeenCalledWith({
        where: { assetId },
        skip: 0,
        take: 20,
        orderBy: { assignedAt: 'desc' },
      });
      expect(mockAssignmentsRepository.count).toHaveBeenCalledWith({ assetId });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });
});
