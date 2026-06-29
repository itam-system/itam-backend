import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ActivityLogQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (default: 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Items per page (max: 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'john',
    description: 'Search across user name, email, action, module',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'AUTH',
    description: 'Filter by module name',
  })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({
    example: 'CREATE',
    description: 'Filter by action name',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    example: '6651abc123def456ghi789jk',
    description: 'Filter by user ID',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    example: 'success',
    description: 'Filter by status (success/failure)',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    example: '2025-01-01T00:00:00.000Z',
    description: 'Start date filter',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2025-12-31T23:59:59.000Z',
    description: 'End date filter',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: ['createdAt', 'action', 'module'],
    example: 'createdAt',
    description: 'Sort field',
  })
  @IsOptional()
  @IsIn(['createdAt', 'action', 'module'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    example: 'desc',
    description: 'Sort direction',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
