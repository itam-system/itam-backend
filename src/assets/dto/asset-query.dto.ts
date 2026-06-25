import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { AssetStatus } from '../../common/enums/asset-status.enum.js';

export enum AssetSortField {
  ASSET_CODE = 'assetCode',
  NAME = 'name',
  BRAND = 'brand',
  MODEL = 'model',
  PURCHASE_DATE = 'purchaseDate',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class AssetQueryDto {
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
    example: 'macbook',
    description: 'Search across name, assetCode, serialNumber, brand, model',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '6651abc123def456ghi789jk', description: 'Filter by category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'IT Department', description: 'Filter by department' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ example: '6651abc123def456ghi789jk', description: 'Filter by assigned user ID' })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({ enum: AssetStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional({
    enum: AssetSortField,
    example: AssetSortField.CREATED_AT,
    description: 'Sort field',
  })
  @IsOptional()
  @IsEnum(AssetSortField)
  sortBy?: AssetSortField = AssetSortField.CREATED_AT;

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    example: 'desc',
    description: 'Sort direction',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
