import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service.js';
import {
  AssignAssetDto,
  ReturnAssetDto,
  TransferAssetDto,
  AssignmentQueryDto,
  AssignmentResponseDto,
  AssignmentListResponseDto,
} from './dto/index.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { ActiveUser } from '../common/interfaces/active-user.interface.js';

@ApiTags('Assignments')
@ApiBearerAuth('JWT-Auth')
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post('assign')
  @Permissions('assets.assign')
  @ApiOperation({ summary: 'Assign an asset to a user' })
  @ApiCreatedResponse({ type: AssignmentResponseDto })
  assignAsset(@Body() dto: AssignAssetDto, @CurrentUser() currentUser: ActiveUser) {
    return this.assignmentsService.assignAsset(dto, currentUser.userId);
  }

  @Post('return')
  @Permissions('assets.assign')
  @ApiOperation({ summary: 'Return an assigned asset' })
  @ApiCreatedResponse({ type: AssignmentResponseDto })
  returnAsset(@Body() dto: ReturnAssetDto, @CurrentUser() currentUser: ActiveUser) {
    return this.assignmentsService.returnAsset(dto, currentUser.userId);
  }

  @Post('transfer')
  @Permissions('assets.assign')
  @ApiOperation({ summary: 'Transfer an asset to a different user' })
  @ApiCreatedResponse({ type: AssignmentResponseDto })
  transferAsset(@Body() dto: TransferAssetDto, @CurrentUser() currentUser: ActiveUser) {
    return this.assignmentsService.transferAsset(dto, currentUser.userId);
  }

  @Get('history')
  @Permissions('assets.view')
  @ApiOperation({ summary: 'Get assignment history (paginated, filterable)' })
  @ApiOkResponse({ type: AssignmentListResponseDto })
  getHistory(@Query() query: AssignmentQueryDto) {
    return this.assignmentsService.findAll(query);
  }
}
