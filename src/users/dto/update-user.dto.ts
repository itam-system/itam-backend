import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsMongoId,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'EMP-20250001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeId?: string;

  @ApiPropertyOptional({ example: 'Sokha' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Chan' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: 'sokha.chan@itam.local' })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+855 12 345 678' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'IT Department' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ example: 'IT Manager' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

  @ApiPropertyOptional({ example: 'https://cdn.itam.local/avatars/user-001.png' })
  @IsOptional()
  @IsUrl({}, { message: 'Avatar must be a valid URL' })
  @MaxLength(500)
  avatar?: string;

  @ApiPropertyOptional({ example: '6651abc123def456ghi789jk' })
  @IsOptional()
  @IsMongoId({ message: 'roleId must be a valid MongoDB ObjectId' })
  roleId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
