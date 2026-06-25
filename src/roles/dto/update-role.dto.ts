import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Senior IT Manager' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['6651abc123def456ghi789jk'],
    description: 'Full replacement list of permission ObjectIds',
  })
  @IsOptional()
  @IsArray({ message: 'permissionIds must be an array' })
  @IsString({ each: true, message: 'Each permissionId must be a string' })
  @ArrayUnique({ message: 'permissionIds must not contain duplicates' })
  permissionIds?: string[];
}
