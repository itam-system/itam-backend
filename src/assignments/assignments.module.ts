import { Module } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller.js';
import { AssignmentsService } from './assignments.service.js';
import { AssignmentsRepository } from './assignments.repository.js';
import { AssetsModule } from '../assets/assets.module.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [AssetsModule, UsersModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService, AssignmentsRepository],
  exports: [AssignmentsService, AssignmentsRepository],
})
export class AssignmentsModule {}
