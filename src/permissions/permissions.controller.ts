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
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionsService } from './permissions.service.js';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  PermissionResponseDto,
} from './dto/index.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { MongoIdValidationPipe } from '../common/pipes/mongo-id-validation.pipe.js';
import type { ActiveUser } from '../common/interfaces/active-user.interface.js';

@ApiTags('Permissions')
@ApiBearerAuth('JWT-Auth')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // ─────────────────────────────────────────────
  // POST /permissions
  // ─────────────────────────────────────────────
  @Post()
  @Permissions('permissions.create')
  @ApiOperation({
    summary: 'Create a new permission',
    description: 'Slug is auto-generated as `module.action`. Requires `permissions.create`.',
  })
  @ApiCreatedResponse({ type: PermissionResponseDto })
  create(@Body() dto: CreatePermissionDto) {
    return this.permissionsService.create(dto);
  }

  // ─────────────────────────────────────────────
  // GET /permissions
  // ─────────────────────────────────────────────
  @Get()
  @Permissions('permissions.view')
  @ApiOperation({ summary: 'List all permissions (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'module', required: false, type: String, example: 'assets' })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'create' })
  @ApiOkResponse({
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/PermissionResponseDto' } },
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
    @Query('module') module?: string,
    @Query('search') search?: string,
  ) {
    return this.permissionsService.findAll({ page, limit, module, search });
  }

  // ─────────────────────────────────────────────
  // GET /permissions/grouped
  // ─────────────────────────────────────────────
  @Get('grouped')
  @Permissions('permissions.view')
  @ApiOperation({
    summary: 'List permissions grouped by module',
    description: 'Returns a map of { module: Permission[] } for building role assignment UIs.',
  })
  @ApiOkResponse({
    schema: {
      additionalProperties: {
        type: 'array',
        items: { $ref: '#/components/schemas/PermissionResponseDto' },
      },
    },
  })
  findGrouped() {
    return this.permissionsService.findGroupedByModule();
  }

  // ─────────────────────────────────────────────
  // GET /permissions/:id
  // ─────────────────────────────────────────────
  @Get(':id')
  @Permissions('permissions.view')
  @ApiOperation({ summary: 'Get a permission by ID' })
  @ApiOkResponse({ type: PermissionResponseDto })
  findOne(@Param('id', MongoIdValidationPipe) id: string) {
    return this.permissionsService.findOne(id);
  }

  // ─────────────────────────────────────────────
  // PATCH /permissions/:id
  // ─────────────────────────────────────────────
  @Patch(':id')
  @Permissions('permissions.edit')
  @ApiOperation({
    summary: 'Update a permission',
    description: 'Slug is recomputed if module or action changes.',
  })
  @ApiOkResponse({ type: PermissionResponseDto })
  update(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() dto: UpdatePermissionDto,
  ) {
    return this.permissionsService.update(id, dto);
  }

  // ─────────────────────────────────────────────
  // DELETE /permissions/:id
  // ─────────────────────────────────────────────
  @Delete(':id')
  @Permissions('permissions.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a permission' })
  @ApiNoContentResponse({ description: 'Permission soft-deleted' })
  async remove(
    @Param('id', MongoIdValidationPipe) id: string,
    @CurrentUser() currentUser: ActiveUser,
  ) {
    await this.permissionsService.remove(id, currentUser.userId);
  }

  // ─────────────────────────────────────────────
  // PATCH /permissions/:id/restore
  // ─────────────────────────────────────────────
  @Patch(':id/restore')
  @Permissions('permissions.edit')
  @ApiOperation({ summary: 'Restore a soft-deleted permission' })
  @ApiOkResponse({ type: PermissionResponseDto })
  restore(@Param('id', MongoIdValidationPipe) id: string) {
    return this.permissionsService.restore(id);
  }
}
