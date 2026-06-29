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
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto, CategoryQueryDto } from './dto/index.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { MongoIdValidationPipe } from '../common/pipes/mongo-id-validation.pipe.js';
import type { ActiveUser } from '../common/interfaces/active-user.interface.js';

@ApiTags('Categories')
@ApiBearerAuth('JWT-Auth')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ─────────────────────────────────────────────
  // POST /categories
  // ─────────────────────────────────────────────
  @Post()
  @Permissions('categories.create')
  @ApiOperation({ summary: 'Create a new category' })
  @ApiCreatedResponse({ type: CategoryResponseDto })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  // ─────────────────────────────────────────────
  // GET /categories
  // ─────────────────────────────────────────────
  @Get()
  @Permissions('categories.view')
  @ApiOperation({ summary: 'List all categories (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiOkResponse({
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/CategoryResponseDto' } },
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
  findAll(@Query() query: CategoryQueryDto) {
    return this.categoriesService.findAll(query);
  }

  // ─────────────────────────────────────────────
  // GET /categories/:id
  // ─────────────────────────────────────────────
  @Get(':id')
  @Permissions('categories.view')
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiOkResponse({ type: CategoryResponseDto })
  findOne(@Param('id', MongoIdValidationPipe) id: string) {
    return this.categoriesService.findOne(id);
  }

  // ─────────────────────────────────────────────
  // PATCH /categories/:id
  // ─────────────────────────────────────────────
  @Patch(':id')
  @Permissions('categories.edit')
  @ApiOperation({ summary: 'Update a category' })
  @ApiOkResponse({ type: CategoryResponseDto })
  update(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  // ─────────────────────────────────────────────
  // DELETE /categories/:id
  // ─────────────────────────────────────────────
  @Delete(':id')
  @Permissions('categories.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft delete a category',
    description: 'Categories with active assets cannot be deleted.',
  })
  @ApiNoContentResponse({ description: 'Category soft-deleted' })
  async remove(
    @Param('id', MongoIdValidationPipe) id: string,
    @CurrentUser() currentUser: ActiveUser,
  ) {
    await this.categoriesService.remove(id, currentUser.userId);
  }

  // ─────────────────────────────────────────────
  // PATCH /categories/:id/restore
  // ─────────────────────────────────────────────
  @Patch(':id/restore')
  @Permissions('categories.edit')
  @ApiOperation({ summary: 'Restore a soft-deleted category' })
  @ApiOkResponse({ type: CategoryResponseDto })
  restore(@Param('id', MongoIdValidationPipe) id: string) {
    return this.categoriesService.restore(id);
  }
}
