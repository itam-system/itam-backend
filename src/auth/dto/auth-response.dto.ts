import { ApiProperty } from '@nestjs/swagger';

class AuthUserResponse {
  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  id!: string;

  @ApiProperty({ example: 'admin@itam.local' })
  email!: string;

  @ApiProperty({ example: 'System' })
  firstName!: string;

  @ApiProperty({ example: 'Admin' })
  lastName!: string;

  @ApiProperty({ example: 'ADMIN-001' })
  employeeId!: string;

  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  roleId!: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken!: string;

  @ApiProperty({ type: AuthUserResponse })
  user!: AuthUserResponse;
}
