import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsHexColor,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'IT Equipment', description: 'Unique category display name' })
  @IsString()
  @IsNotEmpty({ message: 'Category name is required' })
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'IT-EQP', description: 'Unique category code (uppercase)' })
  @IsString()
  @IsNotEmpty({ message: 'Category code is required' })
  @MinLength(2)
  @MaxLength(50)
  code!: string;

  @ApiPropertyOptional({ example: 'Computers, laptops, and peripherals' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'monitor', description: 'Lucide icon name', default: 'folder' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ example: '#6366f1', description: 'Hex color code', default: '#6366f1' })
  @IsOptional()
  @IsString()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
