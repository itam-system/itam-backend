import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum UserSortField {
  FIRST_NAME = 'firstName',
  LAST_NAME = 'lastName',
  EMAIL = 'email',
  EMPLOYEE_ID = 'employeeId',
  DEPARTMENT = 'department',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class UserQueryDto {
  // ─── Pagination ─────────────────────────────────
  @ApiPropertyOptional({ example: 1, description: 'Page number (default: 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Items per page (max: 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  // ─── Search ─────────────────────────────────────
  @ApiPropertyOptional({
    example: 'sokha',
    description: 'Full-text search across firstName, lastName, email, employeeId',
  })
  @IsOptional()
  @IsString()
  search?: string;

  // ─── Filters ─────────────────────────────────────
  @ApiPropertyOptional({ example: 'IT Department', description: 'Filter by department' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ example: '6651abc123def456ghi789jk', description: 'Filter by roleId' })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiPropertyOptional({ example: true, description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }: { value: string }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  // ─── Sort ─────────────────────────────────────
  @ApiPropertyOptional({
    enum: UserSortField,
    example: UserSortField.CREATED_AT,
    description: 'Sort field',
  })
  @IsOptional()
  @IsEnum(UserSortField)
  sortBy?: UserSortField = UserSortField.CREATED_AT;

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    example: 'desc',
    description: 'Sort direction',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
