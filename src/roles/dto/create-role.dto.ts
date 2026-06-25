import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'IT Manager', description: 'Unique role display name' })
  @IsString()
  @IsNotEmpty({ message: 'Role name is required' })
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'Manages IT assets and assignments' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    type: [String],
    example: ['6651abc123def456ghi789jk', '6651abc123def456ghi789jl'],
    description: 'Array of permission ObjectIds to assign to this role',
  })
  @IsArray({ message: 'permissionIds must be an array' })
  @IsString({ each: true, message: 'Each permissionId must be a string' })
  @ArrayUnique({ message: 'permissionIds must not contain duplicates' })
  permissionIds!: string[];
}
