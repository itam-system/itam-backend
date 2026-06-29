import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service.js';
import type { Prisma, ActivityLog } from '@prisma/client';

@Injectable()
export class ActivityLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ActivityLogCreateInput): Promise<ActivityLog> {
    return this.prisma.activityLog.create({ data });
  }

  async findAll(params: {
    where?: Prisma.ActivityLogWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.ActivityLogOrderByWithRelationInput | Prisma.ActivityLogOrderByWithRelationInput[];
  }): Promise<ActivityLog[]> {
    const { where, skip, take, orderBy } = params;
    return this.prisma.activityLog.findMany({
      where,
      skip,
      take,
      orderBy: orderBy ?? { createdAt: 'desc' },
    });
  }

  async count(where?: Prisma.ActivityLogWhereInput): Promise<number> {
    return this.prisma.activityLog.count({ where });
  }

  async findById(id: string): Promise<ActivityLog | null> {
    return this.prisma.activityLog.findUnique({ where: { id } });
  }

  async findDistinctModules(): Promise<string[]> {
    const result = await this.prisma.activityLog.findMany({
      select: { module: true },
      distinct: ['module'],
      orderBy: { module: 'asc' },
    });
    return result.map((r) => r.module);
  }

  async findDistinctActions(): Promise<string[]> {
    const result = await this.prisma.activityLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    });
    return result.map((r) => r.action);
  }
}
