import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { ErrorCodes } from '../common/constants/error-codes.constant.js';
import { AssignmentsRepository } from './assignments.repository.js';
import { AssetsRepository } from '../assets/assets.repository.js';
import { UsersRepository } from '../users/users.repository.js';
import { PrismaService } from '../common/database/prisma.service.js';
import { AssignmentAction } from '../common/enums/assignment-action.enum.js';
import { AssetStatus } from '../common/enums/asset-status.enum.js';
import type { AssignAssetDto } from './dto/assign-asset.dto.js';
import type { ReturnAssetDto } from './dto/return-asset.dto.js';
import type { TransferAssetDto } from './dto/transfer-asset.dto.js';
import type { AssignmentQueryDto } from './dto/assignment-query.dto.js';
import type { Assignment } from '@prisma/client';

export interface AssignmentWithRelations extends Assignment {
  asset?: { id: string; assetCode: string; name: string } | null;
  assignee?: { id: string; name: string; employeeId: string } | null;
  assignedByUser?: { id: string; name: string; employeeId: string } | null;
  transferredFromUser?: { id: string; name: string; employeeId: string } | null;
}

export interface AssignmentsPage {
  data: AssignmentWithRelations[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly assignmentsRepository: AssignmentsRepository,
    private readonly assetsRepository: AssetsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ─────────────────────────────────────────────
  // Assign Asset
  // ─────────────────────────────────────────────
  async assignAsset(dto: AssignAssetDto, assignedBy: string): Promise<AssignmentWithRelations> {
    const asset = await this.assetsRepository.findById(dto.assetId);
    if (!asset) {
      throw new BusinessException(ErrorCodes.ASSET_NOT_FOUND, 'Asset not found', HttpStatus.NOT_FOUND);
    }
    
    if (asset.status !== AssetStatus.AVAILABLE) {
      throw new BusinessException(ErrorCodes.INVALID_STATUS_TRANSITION, `Cannot assign asset with status ${asset.status}`, HttpStatus.CONFLICT);
    }

    if (asset.assignedTo) {
      throw new BusinessException(ErrorCodes.ASSET_ALREADY_ASSIGNED, 'Asset is already assigned', HttpStatus.CONFLICT);
    }

    const assignee = await this.usersRepository.findById(dto.assignedTo);
    if (!assignee) {
      throw new BusinessException(ErrorCodes.USER_NOT_FOUND, 'Assignee not found', HttpStatus.NOT_FOUND);
    }

    // Use transaction to ensure consistency
    const assignment = await this.prisma.$transaction(async (tx) => {
      // 1. Create Assignment History
      const newAssignment = await tx.assignment.create({
        data: {
          assetId: dto.assetId,
          assignedTo: dto.assignedTo,
          assignedBy,
          action: AssignmentAction.ASSIGN,
          notes: dto.notes,
          returnedAt: null,
        },
      });

      // 2. Update Asset
      await tx.asset.update({
        where: { id: dto.assetId },
        data: {
          assignedTo: dto.assignedTo,
          status: AssetStatus.ASSIGNED,
          updatedBy: assignedBy,
        },
      });

      return newAssignment;
    });

    return this.populateRelations(assignment);
  }

  // ─────────────────────────────────────────────
  // Return Asset
  // ─────────────────────────────────────────────
  async returnAsset(dto: ReturnAssetDto, returnedBy: string): Promise<AssignmentWithRelations> {
    const asset = await this.assetsRepository.findById(dto.assetId);
    if (!asset) {
      throw new BusinessException(ErrorCodes.ASSET_NOT_FOUND, 'Asset not found', HttpStatus.NOT_FOUND);
    }
    
    if (asset.status !== AssetStatus.ASSIGNED || !asset.assignedTo) {
      throw new BusinessException(ErrorCodes.INVALID_STATUS_TRANSITION, 'Asset is not currently assigned', HttpStatus.CONFLICT);
    }

    const activeAssignment = await this.assignmentsRepository.findActiveAssignmentByAssetId(dto.assetId);
    if (!activeAssignment) {
      throw new BusinessException(ErrorCodes.ASSIGNMENT_NOT_FOUND, 'No active assignment found for this asset', HttpStatus.NOT_FOUND);
    }

    const currentAssigneeId = asset.assignedTo;

    // Use transaction
    const assignment = await this.prisma.$transaction(async (tx) => {
      // 1. Close active assignment
      await tx.assignment.update({
        where: { id: activeAssignment.id },
        data: { returnedAt: new Date() },
      });

      // 2. Create new Return Assignment record for history
      const returnAssignment = await tx.assignment.create({
        data: {
          assetId: dto.assetId,
          assignedTo: currentAssigneeId, // Person who had it
          assignedBy: returnedBy, // Person processing the return
          action: AssignmentAction.RETURN,
          notes: dto.notes,
          returnedAt: new Date(), // Immediate close
        },
      });

      // 3. Update Asset
      await tx.asset.update({
        where: { id: dto.assetId },
        data: {
          assignedTo: null,
          status: dto.status || AssetStatus.AVAILABLE,
          updatedBy: returnedBy,
        },
      });

      return returnAssignment;
    });

    return this.populateRelations(assignment);
  }

  // ─────────────────────────────────────────────
  // Transfer Asset
  // ─────────────────────────────────────────────
  async transferAsset(dto: TransferAssetDto, transferredBy: string): Promise<AssignmentWithRelations> {
    const asset = await this.assetsRepository.findById(dto.assetId);
    if (!asset) {
      throw new BusinessException(ErrorCodes.ASSET_NOT_FOUND, 'Asset not found', HttpStatus.NOT_FOUND);
    }

    if (asset.status !== AssetStatus.ASSIGNED || !asset.assignedTo) {
      throw new BusinessException(ErrorCodes.INVALID_STATUS_TRANSITION, 'Asset must be assigned to transfer', HttpStatus.CONFLICT);
    }

    if (asset.assignedTo === dto.newAssignedTo) {
      throw new BusinessException(ErrorCodes.VALIDATION_ERROR, 'Cannot transfer asset to the same user', HttpStatus.BAD_REQUEST);
    }

    const newAssignee = await this.usersRepository.findById(dto.newAssignedTo);
    if (!newAssignee) {
      throw new BusinessException(ErrorCodes.USER_NOT_FOUND, 'New assignee not found', HttpStatus.NOT_FOUND);
    }

    const activeAssignment = await this.assignmentsRepository.findActiveAssignmentByAssetId(dto.assetId);
    if (!activeAssignment) {
      throw new BusinessException(ErrorCodes.ASSIGNMENT_NOT_FOUND, 'No active assignment found for this asset', HttpStatus.NOT_FOUND);
    }

    const previousAssigneeId = asset.assignedTo;

    // Use transaction
    const assignment = await this.prisma.$transaction(async (tx) => {
      // 1. Close active assignment
      await tx.assignment.update({
        where: { id: activeAssignment.id },
        data: { returnedAt: new Date() },
      });

      // 2. Create new Transfer Assignment record
      const transferAssignment = await tx.assignment.create({
        data: {
          assetId: dto.assetId,
          assignedTo: dto.newAssignedTo,
          assignedBy: transferredBy,
          action: AssignmentAction.TRANSFER,
          transferredFrom: previousAssigneeId,
          notes: dto.notes,
          returnedAt: null,
        },
      });

      // 3. Update Asset
      await tx.asset.update({
        where: { id: dto.assetId },
        data: {
          assignedTo: dto.newAssignedTo,
          updatedBy: transferredBy,
        },
      });

      return transferAssignment;
    });

    return this.populateRelations(assignment);
  }

  // ─────────────────────────────────────────────
  // Find all (History)
  // ─────────────────────────────────────────────
  async findAll(query: AssignmentQueryDto): Promise<AssignmentsPage> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.assetId) where.assetId = query.assetId;
    if (query.assignedTo) where.assignedTo = query.assignedTo;
    if (query.assignedBy) where.assignedBy = query.assignedBy;
    if (query.action) where.action = query.action;

    const sortField = query.sortBy ?? 'assignedAt';
    const sortDir = query.sortOrder ?? 'desc';
    const orderBy = { [sortField]: sortDir };

    const [assignments, total] = await Promise.all([
      this.assignmentsRepository.findAll({ where, skip, take: limit, orderBy }),
      this.assignmentsRepository.count(where),
    ]);

    const data = await this.populateRelationsBatch(assignments);

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
  // Helpers
  // ─────────────────────────────────────────────
  private async populateRelations(assignment: Assignment): Promise<AssignmentWithRelations> {
    let asset = null;
    let assignee = null;
    let assignedByUser = null;
    let transferredFromUser = null;

    if (assignment.assetId) {
      const a = await this.prisma.asset.findUnique({ where: { id: assignment.assetId } });
      if (a) asset = { id: a.id, assetCode: a.assetCode, name: a.name };
    }

    if (assignment.assignedTo) {
      const u = await this.prisma.user.findUnique({ where: { id: assignment.assignedTo } });
      if (u) assignee = { id: u.id, name: `${u.firstName} ${u.lastName}`, employeeId: u.employeeId };
    }

    if (assignment.assignedBy) {
      const u = await this.prisma.user.findUnique({ where: { id: assignment.assignedBy } });
      if (u) assignedByUser = { id: u.id, name: `${u.firstName} ${u.lastName}`, employeeId: u.employeeId };
    }

    if (assignment.transferredFrom) {
      const u = await this.prisma.user.findUnique({ where: { id: assignment.transferredFrom } });
      if (u) transferredFromUser = { id: u.id, name: `${u.firstName} ${u.lastName}`, employeeId: u.employeeId };
    }

    return { ...assignment, asset, assignee, assignedByUser, transferredFromUser };
  }

  private async populateRelationsBatch(assignments: Assignment[]): Promise<AssignmentWithRelations[]> {
    if (assignments.length === 0) return [];

    const assetIds = [...new Set(assignments.map((a) => a.assetId))];
    const userIds = [...new Set(assignments.flatMap((a) => [a.assignedTo, a.assignedBy, a.transferredFrom]).filter(Boolean))] as string[];

    const [assets, users] = await Promise.all([
      this.prisma.asset.findMany({ where: { id: { in: assetIds } }, select: { id: true, assetCode: true, name: true } }),
      this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true, employeeId: true } }),
    ]);

    const assetMap = new Map(assets.map((a) => [a.id, a]));
    const userMap = new Map(users.map((u) => [u.id, { id: u.id, name: `${u.firstName} ${u.lastName}`, employeeId: u.employeeId }]));

    return assignments.map((a) => ({
      ...a,
      asset: assetMap.get(a.assetId) ?? null,
      assignee: userMap.get(a.assignedTo) ?? null,
      assignedByUser: userMap.get(a.assignedBy) ?? null,
      transferredFromUser: a.transferredFrom ? userMap.get(a.transferredFrom) ?? null : null,
    }));
  }
}
