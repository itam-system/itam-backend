import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { AssetStatus } from '../../common/enums/asset-status.enum.js';

export class CreateAssetDto {
  @ApiProperty({ example: 'MacBook Pro M3', description: 'Name of the asset' })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: '6651abc123def456ghi789jk', description: 'Category ID' })
  @IsMongoId({ message: 'categoryId must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Category ID is required' })
  categoryId!: string;

  @ApiPropertyOptional({ example: 'Apple' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ example: '14-inch, 2023' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ example: 'C02ABCDEF123' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({ example: 1999.99 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  purchasePrice?: number;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  warrantyExpiry?: string;

  @ApiPropertyOptional({ example: 'HQ Office - Floor 2' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: 'IT Department' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ example: '6651abc123def456ghi789jk', description: 'Assigned User ID' })
  @IsOptional()
  @IsMongoId({ message: 'assignedTo must be a valid MongoDB ObjectId' })
  assignedTo?: string;

  @ApiPropertyOptional({ enum: AssetStatus, default: AssetStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional({ example: 'Used by engineering team' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
