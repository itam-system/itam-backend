import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetStatus } from '../../common/enums/asset-status.enum.js';

class CategorySummary {
  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  id!: string;

  @ApiProperty({ example: 'Laptops' })
  name!: string;
}

class UserSummary {
  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  id!: string;

  @ApiProperty({ example: 'Sokha Chan' })
  name!: string;

  @ApiProperty({ example: 'EMP-20250001' })
  employeeId!: string;
}

export class AssetResponseDto {
  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  id!: string;

  @ApiProperty({ example: 'AST-000001' })
  assetCode!: string;

  @ApiProperty({ example: 'MacBook Pro M3' })
  name!: string;

  @ApiPropertyOptional({ example: 'Used by engineering team' })
  description?: string | null;

  @ApiPropertyOptional({ example: 'C02ABCDEF123' })
  serialNumber?: string | null;

  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  categoryId!: string;

  @ApiPropertyOptional({ type: CategorySummary })
  category?: CategorySummary | null;

  @ApiPropertyOptional({ example: 'Apple' })
  brand?: string | null;

  @ApiPropertyOptional({ example: '14-inch, 2023' })
  model?: string | null;

  @ApiProperty({ enum: AssetStatus, example: AssetStatus.AVAILABLE })
  status!: string;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00.000Z' })
  purchaseDate?: string | null;

  @ApiPropertyOptional({ example: 1999.99 })
  purchasePrice?: number | null;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  warrantyExpiry?: string | null;

  @ApiPropertyOptional({ example: 'HQ Office - Floor 2' })
  location?: string | null;

  @ApiPropertyOptional({ example: 'IT Department' })
  department?: string | null;

  @ApiPropertyOptional({ example: '6651abc123def456ghi789jk' })
  assignedTo?: string | null;

  @ApiPropertyOptional({ type: UserSummary })
  assignee?: UserSummary | null;

  @ApiProperty({ example: false })
  isDeleted!: boolean;

  @ApiPropertyOptional({ example: '6651abc123def456ghi789jk' })
  createdBy?: string | null;

  @ApiPropertyOptional({ example: '6651abc123def456ghi789jk' })
  updatedBy?: string | null;

  @ApiProperty({ example: '2025-01-01T00:00:00+07:00' })
  createdAt!: string;

  @ApiProperty({ example: '2025-01-01T00:00:00+07:00' })
  updatedAt!: string;
}

export class AssetListResponseDto {
  @ApiProperty({ type: [AssetResponseDto] })
  data!: AssetResponseDto[];

  @ApiProperty({
    example: { total: 50, page: 1, limit: 20, totalPages: 3 },
  })
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
