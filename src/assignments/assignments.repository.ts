import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service.js';
import type { Prisma, Assignment } from '@prisma/client';

@Injectable()
export class AssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AssignmentCreateInput): Promise<Assignment> {
    return this.prisma.assignment.create({ data });
  }

  async findAll(params: {
    where?: Prisma.AssignmentWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.AssignmentOrderByWithRelationInput | Prisma.AssignmentOrderByWithRelationInput[];
  }): Promise<Assignment[]> {
    const { where, skip, take, orderBy } = params;
    return this.prisma.assignment.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { assignedAt: 'desc' },
    });
  }

  async count(where?: Prisma.AssignmentWhereInput): Promise<number> {
    return this.prisma.assignment.count({
      where,
    });
  }

  async findById(id: string): Promise<Assignment | null> {
    return this.prisma.assignment.findUnique({
      where: { id },
    });
  }

  // Find the active assignment for an asset (not returned yet)
  async findActiveAssignmentByAssetId(assetId: string): Promise<Assignment | null> {
    return this.prisma.assignment.findFirst({
      where: {
        assetId,
        returnedAt: null,
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async update(id: string, data: Prisma.AssignmentUpdateInput): Promise<Assignment> {
    return this.prisma.assignment.update({
      where: { id },
      data,
    });
  }
}
