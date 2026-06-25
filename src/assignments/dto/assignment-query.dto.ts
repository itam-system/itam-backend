import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AssignmentAction } from '../../common/enums/assignment-action.enum.js';

export enum AssignmentSortField {
  ASSIGNED_AT = 'assignedAt',
  RETURNED_AT = 'returnedAt',
  ACTION = 'action',
}

export class AssignmentQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: '6651abc123def456ghi789jk' })
  @IsOptional()
  @IsString()
  assetId?: string;

  @ApiPropertyOptional({ example: '6651abc123def456ghi789jk' })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({ example: '6651abc123def456ghi789jk' })
  @IsOptional()
  @IsString()
  assignedBy?: string;

  @ApiPropertyOptional({ enum: AssignmentAction })
  @IsOptional()
  @IsEnum(AssignmentAction)
  action?: AssignmentAction;

  @ApiPropertyOptional({ enum: AssignmentSortField, example: AssignmentSortField.ASSIGNED_AT })
  @IsOptional()
  @IsEnum(AssignmentSortField)
  sortBy?: AssignmentSortField = AssignmentSortField.ASSIGNED_AT;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], example: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
