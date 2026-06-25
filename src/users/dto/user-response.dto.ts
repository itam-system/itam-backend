import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class RoleSummary {
  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  id!: string;

  @ApiProperty({ example: 'IT Manager' })
  name!: string;
}

export class UserResponseDto {
  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  id!: string;

  @ApiProperty({ example: 'EMP-20250001' })
  employeeId!: string;

  @ApiProperty({ example: 'Sokha' })
  firstName!: string;

  @ApiProperty({ example: 'Chan' })
  lastName!: string;

  @ApiProperty({ example: 'sokha.chan@itam.local' })
  email!: string;

  @ApiPropertyOptional({ example: '+855 12 345 678' })
  phone?: string | null;

  @ApiPropertyOptional({ example: 'IT Department' })
  department?: string | null;

  @ApiPropertyOptional({ example: 'IT Manager' })
  position?: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.itam.local/avatars/user-001.png' })
  avatar?: string | null;

  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  roleId!: string;

  @ApiPropertyOptional({ type: RoleSummary, description: 'Populated role (when included)' })
  role?: RoleSummary | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: false })
  isDeleted!: boolean;

  @ApiPropertyOptional({ example: '6651abc123def456ghi789jk' })
  createdBy?: string | null;

  @ApiPropertyOptional({ example: '6651abc123def456ghi789jk' })
  updatedBy?: string | null;

  @ApiProperty({ example: '2025-01-01T00:00:00+07:00' })
  createdAt!: string;

  @ApiProperty({ example: '2025-01-01T00:00:00+07:00' })
  updatedAt!: string;
}

export class UserListResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data!: UserResponseDto[];

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
