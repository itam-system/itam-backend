import { Injectable } from '@nestjs/common';
import { ActivityLogsRepository } from './activity-logs.repository.js';
import { PrismaService } from '../common/database/prisma.service.js';
import type { ActivityLogQueryDto } from './dto/activity-log-query.dto.js';
import type { ActivityLog } from '@prisma/client';

export interface ActivityLogWithUser extends ActivityLog {
  user?: { id: string; name: string; email: string } | null;
}

export interface ActivityLogsPage {
  data: ActivityLogWithUser[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class ActivityLogsService {
  constructor(
    private readonly activityLogsRepository: ActivityLogsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(query: ActivityLogQueryDto): Promise<ActivityLogsPage> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { module: { contains: query.search, mode: 'insensitive' } },
        { entityName: { contains: query.search, mode: 'insensitive' } },
        { ipAddress: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.module) {
      where.module = query.module;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(query.startDate);
      }
      if (query.endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(query.endDate);
      }
    }

    const sortField = query.sortBy ?? 'createdAt';
    const sortDir = query.sortOrder ?? 'desc';
    const orderBy = { [sortField]: sortDir };

    const [logs, total] = await Promise.all([
      this.activityLogsRepository.findAll({ where, skip, take: limit, orderBy }),
      this.activityLogsRepository.count(where),
    ]);

    const data = await this.populateUsersBatch(logs);

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

  async findOne(id: string): Promise<ActivityLogWithUser> {
    const log = await this.activityLogsRepository.findById(id);
    return this.populateUser(log);
  }

  async getDistinctModules(): Promise<string[]> {
    return this.activityLogsRepository.findDistinctModules();
  }

  async getDistinctActions(): Promise<string[]> {
    return this.activityLogsRepository.findDistinctActions();
  }

  private async populateUser(log: ActivityLog | null): Promise<ActivityLogWithUser> {
    if (!log) {
      return log as unknown as ActivityLogWithUser;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: log.userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    return {
      ...log,
      user: user
        ? { id: user.id, name: `${user.firstName} ${user.lastName}`, email: user.email }
        : null,
    };
  }

  private async populateUsersBatch(logs: ActivityLog[]): Promise<ActivityLogWithUser[]> {
    if (logs.length === 0) return [];

    const userIds = [...new Set(logs.map((l) => l.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const userMap = new Map(
      users.map((u) => [
        u.id,
        { id: u.id, name: `${u.firstName} ${u.lastName}`, email: u.email },
      ]),
    );

    return logs.map((log) => ({
      ...log,
      user: userMap.get(log.userId) ?? null,
    }));
  }
}
