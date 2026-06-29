import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service.js';
import { ReportQueryDto } from './dto/index.js';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('inventory')
  @ApiOperation({ summary: 'Full asset inventory report' })
  inventory(@Query() query: ReportQueryDto) {
    return this.reportsService.getInventoryReport(query);
  }

  @Get('assignments')
  @ApiOperation({ summary: 'Assignment history report' })
  assignments(@Query() query: ReportQueryDto) {
    return this.reportsService.getAssignmentReport(query);
  }

  @Get('status')
  @ApiOperation({ summary: 'Asset status distribution report' })
  status(@Query() query: ReportQueryDto) {
    return this.reportsService.getStatusReport(query);
  }

  @Get('warranty')
  @ApiOperation({ summary: 'Warranty status report' })
  warranty(@Query() query: ReportQueryDto) {
    return this.reportsService.getWarrantyReport(query);
  }

  @Get('users')
  @ApiOperation({ summary: 'Asset distribution by user report' })
  users(@Query() query: ReportQueryDto) {
    return this.reportsService.getUserReport(query);
  }

  @Get('activity')
  @ApiOperation({ summary: 'System activity report' })
  activity(@Query() query: ReportQueryDto) {
    return this.reportsService.getActivityReport(query);
  }
}
