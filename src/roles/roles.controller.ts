import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RolesService } from './roles.service.js';
import { CreateRoleDto, UpdateRoleDto, RoleResponseDto } from './dto/index.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { MongoIdValidationPipe } from '../common/pipes/mongo-id-validation.pipe.js';
import type { ActiveUser } from '../common/interfaces/active-user.interface.js';
import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class AssignPermissionsDto {
  @ApiProperty({ type: [String], example: ['6651abc123def456ghi789jk'] })
  @IsArray()
  @IsString({ each: true })
  permissionIds!: string[];
}

@ApiTags('Roles')
@ApiBearerAuth('JWT-Auth')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // ─────────────────────────────────────────────
  // POST /roles
  // ─────────────────────────────────────────────
  @Post()
  @Permissions('roles.create')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiCreatedResponse({ type: RoleResponseDto })
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  // ─────────────────────────────────────────────
  // GET /roles
  // ─────────────────────────────────────────────
  @Get()
  @Permissions('roles.view')
  @ApiOperation({ summary: 'List all roles (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiOkResponse({
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/RoleResponseDto' } },
        meta: {
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.rolesService.findAll({ page, limit, search });
  }

  // ─────────────────────────────────────────────
  // GET /roles/:id
  // ─────────────────────────────────────────────
  @Get(':id')
  @Permissions('roles.view')
  @ApiOperation({
    summary: 'Get a role by ID',
    description: 'Returns the role with its fully populated permissions array.',
  })
  @ApiOkResponse({ type: RoleResponseDto })
  findOne(@Param('id', MongoIdValidationPipe) id: string) {
    return this.rolesService.findOne(id);
  }

  // ─────────────────────────────────────────────
  // PATCH /roles/:id
  // ─────────────────────────────────────────────
  @Patch(':id')
  @Permissions('roles.edit')
  @ApiOperation({
    summary: 'Update a role',
    description:
      'System roles (Admin, User) cannot have their name changed. `permissionIds` replaces the full list.',
  })
  @ApiOkResponse({ type: RoleResponseDto })
  update(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(id, dto);
  }

  // ─────────────────────────────────────────────
  // DELETE /roles/:id
  // ─────────────────────────────────────────────
  @Delete(':id')
  @Permissions('roles.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft delete a role',
    description: 'System roles and roles with active users cannot be deleted.',
  })
  @ApiNoContentResponse({ description: 'Role soft-deleted' })
  async remove(
    @Param('id', MongoIdValidationPipe) id: string,
    @CurrentUser() currentUser: ActiveUser,
  ) {
    await this.rolesService.remove(id, currentUser.userId);
  }

  // ─────────────────────────────────────────────
  // PATCH /roles/:id/restore
  // ─────────────────────────────────────────────
  @Patch(':id/restore')
  @Permissions('roles.edit')
  @ApiOperation({ summary: 'Restore a soft-deleted role' })
  @ApiOkResponse({ type: RoleResponseDto })
  restore(@Param('id', MongoIdValidationPipe) id: string) {
    return this.rolesService.restore(id);
  }

  // ─────────────────────────────────────────────
  // POST /roles/:id/permissions/assign
  // ─────────────────────────────────────────────
  @Post(':id/permissions/assign')
  @Permissions('roles.edit')
  @ApiOperation({
    summary: 'Assign permissions to a role (additive)',
    description: 'Adds the given permission IDs to the role without removing existing ones.',
  })
  @ApiBody({ type: AssignPermissionsDto })
  @ApiOkResponse({ type: RoleResponseDto })
  assignPermissions(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.rolesService.assignPermissions(id, dto.permissionIds);
  }

  // ─────────────────────────────────────────────
  // POST /roles/:id/permissions/revoke
  // ─────────────────────────────────────────────
  @Post(':id/permissions/revoke')
  @Permissions('roles.edit')
  @ApiOperation({
    summary: 'Revoke permissions from a role',
    description: 'Removes the given permission IDs from the role.',
  })
  @ApiBody({ type: AssignPermissionsDto })
  @ApiOkResponse({ type: RoleResponseDto })
  revokePermissions(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.rolesService.revokePermissions(id, dto.permissionIds);
  }
}
