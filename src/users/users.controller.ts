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
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import {
  CreateUserDto,
  UpdateUserDto,
  UserQueryDto,
  UserResponseDto,
  UserListResponseDto,
  UserSortField,
} from './dto/index.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { MongoIdValidationPipe } from '../common/pipes/mongo-id-validation.pipe.js';
import type { ActiveUser } from '../common/interfaces/active-user.interface.js';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

class SetActiveStatusDto {
  @ApiProperty({ example: true })
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  isActive!: boolean;
}

@ApiTags('Users')
@ApiBearerAuth('JWT-Auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─────────────────────────────────────────────
  // POST /users
  // ─────────────────────────────────────────────
  @Post()
  @Permissions('users.create')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiCreatedResponse({ type: UserResponseDto })
  create(@Body() dto: CreateUserDto, @CurrentUser() currentUser: ActiveUser) {
    return this.usersService.create(dto, currentUser.userId);
  }

  // ─────────────────────────────────────────────
  // GET /users
  // ─────────────────────────────────────────────
  @Get()
  @Permissions('users.view')
  @ApiOperation({
    summary: 'List all users',
    description:
      'Supports pagination, multi-field search, filtering by department/role/status, and sorting.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in name, email, employeeId, department, position' })
  @ApiQuery({ name: 'department', required: false, type: String })
  @ApiQuery({ name: 'roleId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'sortBy', required: false, enum: UserSortField, example: UserSortField.CREATED_AT })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc' })
  @ApiOkResponse({ type: UserListResponseDto })
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  // ─────────────────────────────────────────────
  // GET /users/departments
  // ─────────────────────────────────────────────
  @Get('departments')
  @Permissions('users.view')
  @ApiOperation({
    summary: 'Get distinct department list',
    description: 'Returns all unique department names for use in filter dropdowns.',
  })
  @ApiOkResponse({ schema: { type: 'array', items: { type: 'string' } } })
  getDepartments() {
    return this.usersService.getDepartments();
  }

  // ─────────────────────────────────────────────
  // GET /users/:id
  // ─────────────────────────────────────────────
  @Get(':id')
  @Permissions('users.view')
  @ApiOperation({ summary: 'Get a user by ID (with populated role)' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId' })
  @ApiOkResponse({ type: UserResponseDto })
  findOne(@Param('id', MongoIdValidationPipe) id: string) {
    return this.usersService.findOne(id);
  }

  // ─────────────────────────────────────────────
  // PATCH /users/:id
  // ─────────────────────────────────────────────
  @Patch(':id')
  @Permissions('users.edit')
  @ApiOperation({
    summary: 'Update a user',
    description: 'Password changes must use `PATCH /auth/change-password`.',
  })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId' })
  @ApiOkResponse({ type: UserResponseDto })
  update(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: ActiveUser,
  ) {
    return this.usersService.update(id, dto, currentUser.userId);
  }

  // ─────────────────────────────────────────────
  // DELETE /users/:id
  // ─────────────────────────────────────────────
  @Delete(':id')
  @Permissions('users.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft delete a user',
    description: 'User is marked as deleted and deactivated. Cannot delete your own account.',
  })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId' })
  @ApiNoContentResponse({ description: 'User soft-deleted' })
  async remove(
    @Param('id', MongoIdValidationPipe) id: string,
    @CurrentUser() currentUser: ActiveUser,
  ) {
    await this.usersService.remove(id, currentUser.userId);
  }

  // ─────────────────────────────────────────────
  // PATCH /users/:id/restore
  // ─────────────────────────────────────────────
  @Patch(':id/restore')
  @Permissions('users.edit')
  @ApiOperation({ summary: 'Restore a soft-deleted user' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId' })
  @ApiOkResponse({ type: UserResponseDto })
  restore(@Param('id', MongoIdValidationPipe) id: string) {
    return this.usersService.restore(id);
  }

  // ─────────────────────────────────────────────
  // PATCH /users/:id/status
  // ─────────────────────────────────────────────
  @Patch(':id/status')
  @Permissions('users.edit')
  @ApiOperation({
    summary: 'Activate or deactivate a user account',
    description: 'Cannot change your own account status.',
  })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId' })
  @ApiBody({ type: SetActiveStatusDto })
  @ApiOkResponse({ type: UserResponseDto })
  setStatus(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() dto: SetActiveStatusDto,
    @CurrentUser() currentUser: ActiveUser,
  ) {
    return this.usersService.setActiveStatus(id, dto.isActive, currentUser.userId);
  }
}
