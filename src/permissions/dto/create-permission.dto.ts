import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsOptional,
} from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({
    example: 'assets',
    description: 'Module name (lowercase, no spaces)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Module is required' })
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z][a-z0-9-]*$/, {
    message: 'Module must be lowercase letters, numbers, or hyphens',
  })
  module!: string;

  @ApiProperty({
    example: 'create',
    description: 'Action name (lowercase)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Action is required' })
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z][a-z0-9-]*$/, {
    message: 'Action must be lowercase letters, numbers, or hyphens',
  })
  action!: string;

  @ApiPropertyOptional({
    example: 'Allows creating new assets',
    description: 'Human-readable description of this permission',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
