import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  id!: string;

  @ApiProperty({ example: 'assets' })
  module!: string;

  @ApiProperty({ example: 'create' })
  action!: string;

  @ApiProperty({ example: 'assets.create' })
  slug!: string;

  @ApiPropertyOptional({ example: 'Allows creating new assets' })
  description?: string | null;

  @ApiProperty({ example: false })
  isDeleted!: boolean;

  @ApiProperty({ example: '2025-01-01T00:00:00+07:00' })
  createdAt!: string;

  @ApiProperty({ example: '2025-01-01T00:00:00+07:00' })
  updatedAt!: string;
}
