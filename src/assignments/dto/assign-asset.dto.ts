import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AssignAssetDto {
  @ApiProperty({ example: '6651abc123def456ghi789jk', description: 'ID of the asset to assign' })
  @IsMongoId()
  @IsNotEmpty()
  assetId!: string;

  @ApiProperty({ example: '6651abc123def456ghi789jl', description: 'ID of the user receiving the asset' })
  @IsMongoId()
  @IsNotEmpty()
  assignedTo!: string;

  @ApiPropertyOptional({ example: 'New laptop for development' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
