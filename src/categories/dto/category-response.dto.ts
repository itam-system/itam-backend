import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  id!: string;

  @ApiProperty({ example: 'IT Equipment' })
  name!: string;

  @ApiProperty({ example: 'IT-EQP' })
  code!: string;

  @ApiProperty({ example: 'it-equipment' })
  slug!: string;

  @ApiPropertyOptional({ example: 'Computers, laptops, and peripherals' })
  description?: string | null;

  @ApiProperty({ example: 'monitor', default: 'folder' })
  icon!: string;

  @ApiProperty({ example: '#6366f1', default: '#6366f1' })
  color!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 0, description: 'Count of active assets in this category' })
  assetCount!: number;

  @ApiProperty({ example: false })
  isDeleted!: boolean;

  @ApiProperty({ example: '2025-01-01T00:00:00+07:00' })
  createdAt!: string;

  @ApiProperty({ example: '2025-01-01T00:00:00+07:00' })
  updatedAt!: string;
}
