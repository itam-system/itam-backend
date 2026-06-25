import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PermissionSummary {
  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  id!: string;

  @ApiProperty({ example: 'assets.create' })
  slug!: string;

  @ApiProperty({ example: 'assets' })
  module!: string;

  @ApiProperty({ example: 'create' })
  action!: string;
}

export class RoleResponseDto {
  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  id!: string;

  @ApiProperty({ example: 'IT Manager' })
  name!: string;

  @ApiPropertyOptional({ example: 'Manages IT assets' })
  description?: string | null;

  @ApiProperty({ type: [String], example: ['6651abc123def456ghi789jk'] })
  permissionIds!: string[];

  @ApiPropertyOptional({ type: [PermissionSummary], description: 'Populated permissions (when requested)' })
  permissions?: PermissionSummary[];

  @ApiProperty({ example: false })
  isSystem!: boolean;

  @ApiProperty({ example: false })
  isDeleted!: boolean;

  @ApiProperty({ example: '2025-01-01T00:00:00+07:00' })
  createdAt!: string;

  @ApiProperty({ example: '2025-01-01T00:00:00+07:00' })
  updatedAt!: string;
}
