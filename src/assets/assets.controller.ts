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
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AssetsService } from './assets.service.js';
import {
  CreateAssetDto,
  UpdateAssetDto,
  AssetQueryDto,
  AssetResponseDto,
  AssetListResponseDto,
} from './dto/index.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { MongoIdValidationPipe } from '../common/pipes/mongo-id-validation.pipe.js';
import type { ActiveUser } from '../common/interfaces/active-user.interface.js';

@ApiTags('Assets')
@ApiBearerAuth('JWT-Auth')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @Permissions('assets.create')
  @ApiOperation({ summary: 'Create a new asset' })
  @ApiCreatedResponse({ type: AssetResponseDto })
  create(@Body() dto: CreateAssetDto, @CurrentUser() currentUser: ActiveUser) {
    return this.assetsService.create(dto, currentUser.userId);
  }

  @Get()
  @Permissions('assets.view')
  @ApiOperation({ summary: 'List all assets with filtering and pagination' })
  @ApiOkResponse({ type: AssetListResponseDto })
  findAll(@Query() query: AssetQueryDto) {
    return this.assetsService.findAll(query);
  }

  @Get(':id')
  @Permissions('assets.view')
  @ApiOperation({ summary: 'Get an asset by ID' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId' })
  @ApiOkResponse({ type: AssetResponseDto })
  findOne(@Param('id', MongoIdValidationPipe) id: string) {
    return this.assetsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('assets.edit')
  @ApiOperation({ summary: 'Update an asset' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId' })
  @ApiOkResponse({ type: AssetResponseDto })
  update(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() dto: UpdateAssetDto,
    @CurrentUser() currentUser: ActiveUser,
  ) {
    return this.assetsService.update(id, dto, currentUser.userId);
  }

  @Delete(':id')
  @Permissions('assets.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an asset' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId' })
  @ApiNoContentResponse({ description: 'Asset soft-deleted' })
  async remove(
    @Param('id', MongoIdValidationPipe) id: string,
    @CurrentUser() currentUser: ActiveUser,
  ) {
    await this.assetsService.remove(id, currentUser.userId);
  }
}
