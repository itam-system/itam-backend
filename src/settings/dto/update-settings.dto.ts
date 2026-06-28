import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSettingItem {
  @ApiProperty({ example: 'company_name', description: 'Setting key' })
  @IsString()
  @MaxLength(100)
  key!: string;

  @ApiProperty({ example: 'ITAM System', description: 'Setting value (stored as string)' })
  @IsString()
  value!: string;
}

export class UpdateSettingsDto {
  @ApiProperty({
    type: [UpdateSettingItem],
    example: [{ key: 'company_name', value: 'ITAM System' }],
    description: 'Array of settings to upsert',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSettingItem)
  settings!: UpdateSettingItem[];
}

export class ImportSettingsDto {
  @ApiProperty({
    type: [UpdateSettingItem],
    description: 'Array of setting entries to import',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSettingItem)
  settings!: UpdateSettingItem[];
}
