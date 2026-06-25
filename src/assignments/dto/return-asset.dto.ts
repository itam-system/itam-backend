import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength, IsEnum } from 'class-validator';
import { AssetStatus } from '../../common/enums/asset-status.enum.js';

export class ReturnAssetDto {
  @ApiProperty({ example: '6651abc123def456ghi789jk', description: 'ID of the asset being returned' })
  @IsMongoId()
  @IsNotEmpty()
  assetId!: string;

  @ApiPropertyOptional({ 
    enum: AssetStatus, 
    example: AssetStatus.AVAILABLE,
    description: 'Status to set the asset to after return (defaults to AVAILABLE)' 
  })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus = AssetStatus.AVAILABLE;

  @ApiPropertyOptional({ example: 'Returned in good condition' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
