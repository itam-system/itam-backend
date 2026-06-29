import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ActivityLogsService } from './activity-logs.service.js';
import {
  ActivityLogQueryDto,
  ActivityLogResponseDto,
  ActivityLogListResponseDto,
} from './dto/index.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';
import { MongoIdValidationPipe } from '../common/pipes/mongo-id-validation.pipe.js';

@ApiTags('Activity Logs')
@ApiBearerAuth('JWT-Auth')
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  @Permissions('activity-logs.view')
  @ApiOperation({ summary: 'List activity logs with pagination and filtering' })
  @ApiOkResponse({ type: ActivityLogListResponseDto })
  findAll(@Query() query: ActivityLogQueryDto) {
    return this.activityLogsService.findAll(query);
  }

  @Get('modules')
  @Permissions('activity-logs.view')
  @ApiOperation({ summary: 'Get distinct module names for filter dropdown' })
  @ApiOkResponse({ schema: { type: 'array', items: { type: 'string' } } })
  getModules() {
    return this.activityLogsService.getDistinctModules();
  }

  @Get('actions')
  @Permissions('activity-logs.view')
  @ApiOperation({ summary: 'Get distinct action names for filter dropdown' })
  @ApiOkResponse({ schema: { type: 'array', items: { type: 'string' } } })
  getActions() {
    return this.activityLogsService.getDistinctActions();
  }

  @Get(':id')
  @Permissions('activity-logs.view')
  @ApiOperation({ summary: 'Get a single activity log by ID' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId' })
  @ApiOkResponse({ type: ActivityLogResponseDto })
  findOne(@Param('id', MongoIdValidationPipe) id: string) {
    return this.activityLogsService.findOne(id);
  }
}
