import { Module } from '@nestjs/common';
import { ActivityLogsController } from './activity-logs.controller.js';
import { ActivityLogsService } from './activity-logs.service.js';
import { ActivityLogsRepository } from './activity-logs.repository.js';

@Module({
  controllers: [ActivityLogsController],
  providers: [ActivityLogsService, ActivityLogsRepository],
  exports: [ActivityLogsService, ActivityLogsRepository],
})
export class ActivityLogsModule {}
