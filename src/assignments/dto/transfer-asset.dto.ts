import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class TransferAssetDto {
  @ApiProperty({ example: '6651abc123def456ghi789jk', description: 'ID of the asset to transfer' })
  @IsMongoId()
  @IsNotEmpty()
  assetId!: string;

  @ApiProperty({ example: '6651abc123def456ghi789jl', description: 'ID of the new user receiving the asset' })
  @IsMongoId()
  @IsNotEmpty()
  newAssignedTo!: string;

  @ApiPropertyOptional({ example: 'Transferred due to role change' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
