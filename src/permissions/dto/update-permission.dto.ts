import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdatePermissionDto {
  @ApiPropertyOptional({ example: 'assets', description: 'Module name (lowercase)' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z][a-z0-9-]*$/, {
    message: 'Module must be lowercase letters, numbers, or hyphens',
  })
  module?: string;

  @ApiPropertyOptional({ example: 'create', description: 'Action name (lowercase)' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z][a-z0-9-]*$/, {
    message: 'Action must be lowercase letters, numbers, or hyphens',
  })
  action?: string;

  @ApiPropertyOptional({ example: 'Allows creating assets' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
