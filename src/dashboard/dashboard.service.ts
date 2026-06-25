import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service.js';
import { AssetStatus } from '../common/enums/asset-status.enum.js';
import type { DashboardMetricsDto } from './dto/dashboard-metrics.dto.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(): Promise<DashboardMetricsDto> {
    // 1. Run independent aggregation queries concurrently
    const [
      totalUsers,
      totalAssets,
      assetStatusCounts,
      rawRecentActivities,
      rawRecentAssignments,
    ] = await Promise.all([
      // Users count
      this.prisma.user.count({ where: { isDeleted: false } }),
      
      // Total assets count
      this.prisma.asset.count({ where: { isDeleted: false } }),
      
      // Asset statuses count grouped by status (optimized aggregation)
      this.prisma.asset.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { isDeleted: false },
      }),

      // Recent activities (top 10)
      this.prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          module: true,
          entityName: true,
          createdAt: true,
        },
      }),

      // Recent assignments (top 10)
      this.prisma.assignment.findMany({
        take: 10,
        orderBy: { assignedAt: 'desc' },
        select: {
          id: true,
          action: true,
          assignedAt: true,
          assetId: true,
          assignedTo: true,
        },
      }),
    ]);

    // 2. Map asset status counts
    let assignedAssets = 0;
    let availableAssets = 0;
    let repairAssets = 0;
    let disposedAssets = 0;

    for (const group of assetStatusCounts) {
      if (group.status === AssetStatus.ASSIGNED) assignedAssets = group._count.status;
      if (group.status === AssetStatus.AVAILABLE) availableAssets = group._count.status;
      if (group.status === AssetStatus.REPAIR) repairAssets = group._count.status;
      if (group.status === AssetStatus.DISPOSED) disposedAssets = group._count.status;
    }

    // 3. Populate names for recent assignments efficiently
    const assetIds = [...new Set(rawRecentAssignments.map((a) => a.assetId))];
    const userIds = [...new Set(rawRecentAssignments.map((a) => a.assignedTo))];

    const [assets, users] = await Promise.all([
      this.prisma.asset.findMany({
        where: { id: { in: assetIds } },
        select: { id: true, name: true },
      }),
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true },
      }),
    ]);

    const assetMap = new Map(assets.map((a) => [a.id, a.name]));
    const userMap = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

    const recentAssignments = rawRecentAssignments.map((a) => ({
      id: a.id,
      action: a.action,
      assetName: assetMap.get(a.assetId) || null,
      assigneeName: userMap.get(a.assignedTo) || null,
      assignedAt: a.assignedAt.toISOString(),
    }));

    const recentActivities = rawRecentActivities.map((a) => ({
      id: a.id,
      action: a.action,
      module: a.module,
      entityName: a.entityName,
      createdAt: a.createdAt.toISOString(),
    }));

    return {
      totalUsers,
      totalAssets,
      assignedAssets,
      availableAssets,
      repairAssets,
      disposedAssets,
      recentActivities,
      recentAssignments,
    };
  }
}
