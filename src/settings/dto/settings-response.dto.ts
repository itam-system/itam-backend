import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SettingResponseDto {
  @ApiProperty({ example: '6651abc123def456ghi789jk' })
  id!: string;

  @ApiProperty({ example: 'company_name' })
  key!: string;

  @ApiProperty({ example: 'ITAM System' })
  value!: string;

  @ApiPropertyOptional({ example: 'company' })
  group?: string | null;

  @ApiPropertyOptional({ example: 'Company display name' })
  description?: string | null;

  @ApiProperty({ example: '2025-06-28T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-06-28T12:00:00.000Z' })
  updatedAt!: Date;
}

export class SettingsListResponseDto {
  @ApiProperty({ type: [SettingResponseDto] })
  data!: SettingResponseDto[];

  @ApiProperty({ example: 10 })
  total!: number;
}

export class SystemInfoResponseDto {
  @ApiProperty({ example: '1.0.0' })
  applicationVersion!: string;

  @ApiProperty({ example: 'v1' })
  apiVersion!: string;

  @ApiProperty({ example: '20.11.0' })
  nodeVersion!: string;

  @ApiProperty({ example: 'development' })
  environment!: string;

  @ApiProperty({ example: '7.0.0' })
  databaseVersion!: string;
}
