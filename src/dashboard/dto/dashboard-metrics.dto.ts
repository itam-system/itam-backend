import { ApiProperty } from '@nestjs/swagger';

class RecentActivityDto {
  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  id!: string;

  @ApiProperty({ example: 'CREATE' })
  action!: string;

  @ApiProperty({ example: 'assets' })
  module!: string;

  @ApiProperty({ example: 'AST-000001' })
  entityName!: string | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: string;
}

class RecentAssignmentDto {
  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  id!: string;

  @ApiProperty({ example: 'ASSIGN' })
  action!: string;

  @ApiProperty({ example: 'MacBook Pro M3' })
  assetName!: string | null;

  @ApiProperty({ example: 'Sokha Chan' })
  assigneeName!: string | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  assignedAt!: string;
}

class AssetByCategoryDto {
  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  categoryId!: string;

  @ApiProperty({ example: 'Laptops' })
  categoryName!: string;

  @ApiProperty({ example: 45 })
  count!: number;
}

export class DashboardMetricsDto {
  @ApiProperty({ example: 150 })
  totalUsers!: number;

  @ApiProperty({ example: 1200 })
  totalAssets!: number;

  @ApiProperty({ example: 850 })
  assignedAssets!: number;

  @ApiProperty({ example: 250 })
  availableAssets!: number;

  @ApiProperty({ example: 50 })
  repairAssets!: number;

  @ApiProperty({ example: 50 })
  disposedAssets!: number;

  @ApiProperty({ type: [RecentActivityDto] })
  recentActivities!: RecentActivityDto[];

  @ApiProperty({ type: [RecentAssignmentDto] })
  recentAssignments!: RecentAssignmentDto[];

  @ApiProperty({ type: [AssetByCategoryDto] })
  assetsByCategory!: AssetByCategoryDto[];
}
