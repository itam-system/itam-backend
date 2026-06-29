import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UserSummary {
  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  id!: string;

  @ApiProperty({ example: 'John Smith' })
  name!: string;

  @ApiProperty({ example: 'john.smith@example.com' })
  email!: string;
}

export class ActivityLogResponseDto {
  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  id!: string;

  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  userId!: string;

  @ApiPropertyOptional({ type: UserSummary })
  user?: UserSummary | null;

  @ApiProperty({ example: 'CREATE' })
  action!: string;

  @ApiProperty({ example: 'USERS' })
  module!: string;

  @ApiPropertyOptional({ example: '6651abc123def456ghi789jk' })
  entityId?: string | null;

  @ApiPropertyOptional({ example: 'John Smith' })
  entityName?: string | null;

  @ApiPropertyOptional({
    example: { name: 'Old Name', newName: 'New Name' },
  })
  changes?: Record<string, unknown> | null;

  @ApiPropertyOptional({ example: '192.168.1.45' })
  ipAddress?: string | null;

  @ApiPropertyOptional({
    example: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  })
  userAgent?: string | null;

  @ApiProperty({ example: '2025-01-01T00:00:00+07:00' })
  createdAt!: string;
}

export class ActivityLogListResponseDto {
  @ApiProperty({ type: [ActivityLogResponseDto] })
  data!: ActivityLogResponseDto[];

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

export class ModuleSummaryDto {
  @ApiProperty({ example: 'AUTH' })
  name!: string;

  @ApiProperty({ example: 15 })
  count!: number;
}
