import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';
import { DashboardMetricsDto } from './dto/dashboard-metrics.dto.js';
import { Permissions } from '../common/decorators/permissions.decorator.js';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-Auth')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @Permissions('dashboard.view')
  @ApiOperation({ summary: 'Get overall system metrics for the dashboard' })
  @ApiOkResponse({ type: DashboardMetricsDto })
  getMetrics() {
    return this.dashboardService.getMetrics();
  }
}
