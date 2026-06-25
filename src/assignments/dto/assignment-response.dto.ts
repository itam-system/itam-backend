import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UserSummary {
  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  id!: string;

  @ApiProperty({ example: 'Sokha Chan' })
  name!: string;

  @ApiProperty({ example: 'EMP-20250001' })
  employeeId!: string;
}

class AssetSummary {
  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  id!: string;

  @ApiProperty({ example: 'AST-000001' })
  assetCode!: string;

  @ApiProperty({ example: 'MacBook Pro M3' })
  name!: string;
}

export class AssignmentResponseDto {
  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  id!: string;

  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  assetId!: string;

  @ApiPropertyOptional({ type: AssetSummary })
  asset?: AssetSummary | null;

  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  assignedTo!: string;

  @ApiPropertyOptional({ type: UserSummary })
  assignee?: UserSummary | null;

  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  assignedBy!: string;

  @ApiPropertyOptional({ type: UserSummary })
  assignedByUser?: UserSummary | null;

  @ApiProperty({ example: 'ASSIGN' })
  action!: string;

  @ApiPropertyOptional({ example: '6651abc123def456ghi789jk' })
  transferredFrom?: string | null;

  @ApiPropertyOptional({ type: UserSummary })
  transferredFromUser?: UserSummary | null;

  @ApiPropertyOptional({ example: 'New laptop for dev' })
  notes?: string | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  assignedAt!: string;

  @ApiPropertyOptional({ example: '2025-06-01T00:00:00.000Z' })
  returnedAt?: string | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt!: string;
}

export class AssignmentListResponseDto {
  @ApiProperty({ type: [AssignmentResponseDto] })
  data!: AssignmentResponseDto[];

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
