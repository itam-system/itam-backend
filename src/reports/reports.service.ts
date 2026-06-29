import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service.js';
import { AssetStatus } from '../common/enums/asset-status.enum.js';
import type { ReportFilter } from './dto/index.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private dateFilter(dateFrom?: string, dateTo?: string) {
    const filter: Record<string, Date> = {};
    if (dateFrom) filter.gte = new Date(dateFrom);
    if (dateTo) filter.lte = new Date(dateTo);
    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  async getInventoryReport(filters?: ReportFilter) {
    const where: Record<string, unknown> = { isDeleted: false };
    if (filters?.department) where.department = filters.department;
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.status) where.status = filters.status;

    const assets = await this.prisma.asset.findMany({ where, orderBy: { assetCode: 'asc' } });
    if (assets.length === 0) return [];

    const categoryIds = [...new Set(assets.map((a) => a.categoryId).filter(Boolean))];
    const assigneeIds = [...new Set(assets.map((a) => a.assignedTo).filter(Boolean))] as string[];

    const [categories, users] = await Promise.all([
      this.prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } }),
      this.prisma.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, firstName: true, lastName: true } }),
    ]);

    const catMap = new Map(categories.map((c) => [c.id, c.name]));
    const userMap = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

    return assets.map((a) => ({
      id: a.id,
      name: a.name,
      assetCode: a.assetCode,
      category: catMap.get(a.categoryId) ?? '',
      status: a.status,
      department: a.department,
      location: a.location,
      assignedTo: a.assignedTo ? userMap.get(a.assignedTo) ?? null : null,
      purchaseDate: a.purchaseDate?.toISOString() ?? null,
      purchasePrice: a.purchasePrice,
      warrantyExpiry: a.warrantyExpiry?.toISOString() ?? null,
    }));
  }

  async getAssignmentReport(filters?: ReportFilter) {
    const where: Record<string, unknown> = {};
    const dateFilter = this.dateFilter(filters?.dateFrom, filters?.dateTo);
    if (dateFilter) where.assignedAt = dateFilter;

    const assignments = await this.prisma.assignment.findMany({
      where,
      orderBy: { assignedAt: 'desc' },
      take: 1000,
    });
    if (assignments.length === 0) return [];

    const assetIds = [...new Set(assignments.map((a) => a.assetId))];
    const userIds = [...new Set(assignments.flatMap((a) => [a.assignedTo, a.assignedBy]).filter(Boolean))] as string[];

    const [assets, users] = await Promise.all([
      this.prisma.asset.findMany({ where: { id: { in: assetIds } }, select: { id: true, name: true, assetCode: true, department: true } }),
      this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true, employeeId: true } }),
    ]);

    const assetMap = new Map(assets.map((a) => [a.id, a]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    return assignments.map((a) => {
      const asset = assetMap.get(a.assetId);
      const assignee = userMap.get(a.assignedTo);
      const assignedByUser = userMap.get(a.assignedBy);
      return {
        id: a.id,
        assetName: asset?.name ?? '',
        assetCode: asset?.assetCode ?? '',
        assigneeName: assignee ? `${assignee.firstName} ${assignee.lastName}` : '',
        assigneeEmployeeId: assignee?.employeeId ?? '',
        assignedBy: assignedByUser ? `${assignedByUser.firstName} ${assignedByUser.lastName}` : '',
        action: a.action,
        assignedAt: a.assignedAt.toISOString(),
        returnedAt: a.returnedAt?.toISOString() ?? null,
        department: asset?.department ?? null,
      };
    });
  }

  async getStatusReport(filters?: ReportFilter) {
    const where: Record<string, unknown> = { isDeleted: false };
    if (filters?.department) where.department = filters.department;
    if (filters?.categoryId) where.categoryId = filters.categoryId;

    const statuses = [AssetStatus.AVAILABLE, AssetStatus.ASSIGNED, AssetStatus.REPAIR, AssetStatus.LOST, AssetStatus.DISPOSED];
    const colorMap: Record<string, string> = {
      [AssetStatus.AVAILABLE]: '#22c55e',
      [AssetStatus.ASSIGNED]: '#3b82f6',
      [AssetStatus.REPAIR]: '#f59e0b',
      [AssetStatus.LOST]: '#ef4444',
      [AssetStatus.DISPOSED]: '#6b7280',
    };

    const counts = await Promise.all(
      statuses.map(async (status) => {
        const count = await this.prisma.asset.count({ where: { ...where, status } });
        return { status, count };
      }),
    );

    const total = counts.reduce((sum, c) => sum + c.count, 0);

    return counts.map((c) => ({
      status: c.status,
      count: c.count,
      percentage: total > 0 ? Math.round((c.count / total) * 10000) / 100 : 0,
      color: colorMap[c.status] ?? '#6b7280',
    }));
  }

  async getWarrantyReport(filters?: ReportFilter) {
    const where: Record<string, unknown> = {
      isDeleted: false,
      warrantyExpiry: { not: null },
    };
    if (filters?.department) where.department = filters.department;
    if (filters?.categoryId) where.categoryId = filters.categoryId;

    const assets = await this.prisma.asset.findMany({ where, orderBy: { warrantyExpiry: 'asc' } });
    if (assets.length === 0) return [];

    const assigneeIds = [...new Set(assets.map((a) => a.assignedTo).filter(Boolean))] as string[];
    const users = assigneeIds.length > 0
      ? await this.prisma.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

    const now = new Date();
    return assets.map((a) => ({
      id: a.id,
      name: a.name,
      assetCode: a.assetCode,
      warrantyExpiry: a.warrantyExpiry?.toISOString() ?? null,
      status: a.status,
      daysRemaining: a.warrantyExpiry ? Math.ceil((a.warrantyExpiry.getTime() - now.getTime()) / 86400000) : null,
      assignedTo: a.assignedTo ? userMap.get(a.assignedTo) ?? null : null,
    }));
  }

  async getUserReport(filters?: ReportFilter) {
    const userWhere: Record<string, unknown> = { isDeleted: false, isActive: true };
    if (filters?.department) userWhere.department = filters.department;

    const users = await this.prisma.user.findMany({
      where: userWhere,
      select: { id: true, firstName: true, lastName: true, employeeId: true, department: true },
      orderBy: { firstName: 'asc' },
    });
    if (users.length === 0) return [];

    const userIds = users.map((u) => u.id);
    const assetWhere: Record<string, unknown> = { isDeleted: false, assignedTo: { in: userIds } };
    if (filters?.status) assetWhere.status = filters.status;

    const [allAssignments, activeAssignments] = await Promise.all([
      this.prisma.asset.groupBy({
        by: ['assignedTo'],
        _count: { id: true },
        where: assetWhere,
      }),
      this.prisma.asset.groupBy({
        by: ['assignedTo'],
        _count: { id: true },
        where: { ...assetWhere, status: AssetStatus.ASSIGNED },
      }),
    ]);

    const assignedMap = new Map(allAssignments.map((a) => [a.assignedTo, a._count.id]));
    const activeMap = new Map(activeAssignments.map((a) => [a.assignedTo, a._count.id]));

    return users.map((u) => ({
      userId: u.id,
      name: `${u.firstName} ${u.lastName}`,
      employeeId: u.employeeId,
      department: u.department,
      assignedAssets: assignedMap.get(u.id) ?? 0,
      activeAssignments: activeMap.get(u.id) ?? 0,
    }));
  }

  async getActivityReport(filters?: ReportFilter) {
    const where: Record<string, unknown> = {};
    const dateFilter = this.dateFilter(filters?.dateFrom, filters?.dateTo);
    if (dateFilter) where.createdAt = dateFilter;

    const logs = await this.prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    if (logs.length === 0) return [];

    const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
    const users = userIds.length > 0
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

    return logs.map((l) => ({
      id: l.id,
      user: userMap.get(l.userId) ?? 'System',
      action: l.action,
      module: l.module,
      description: `${l.action} ${l.entityName ?? ''}`,
      timestamp: l.createdAt.toISOString(),
    }));
  }
}
