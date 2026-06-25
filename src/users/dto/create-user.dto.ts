import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'EMP-20250001', description: 'Free-form employee identifier (must be unique)' })
  @IsString()
  @IsNotEmpty({ message: 'Employee ID is required' })
  @MaxLength(50)
  employeeId!: string;

  @ApiProperty({ example: 'Sokha', description: 'First name' })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Chan', description: 'Last name' })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: 'sokha.chan@itam.local', description: 'Unique email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    example: 'P@ssword123',
    description: 'Initial password (min 8 chars, must contain 1 uppercase and 1 number)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @ApiPropertyOptional({ example: '+855 12 345 678', description: 'Phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'IT Department', description: 'Department name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ example: 'IT Manager', description: 'Job title / position' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.itam.local/avatars/user-001.png',
    description: 'Avatar image URL',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Avatar must be a valid URL' })
  @MaxLength(500)
  avatar?: string;

  @ApiProperty({
    example: '6651abc123def456ghi789jk',
    description: 'ObjectId of the role to assign',
  })
  @IsMongoId({ message: 'roleId must be a valid MongoDB ObjectId' })
  @IsNotEmpty({ message: 'Role ID is required' })
  roleId!: string;

  @ApiPropertyOptional({ example: true, description: 'Account active status (default: true)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
