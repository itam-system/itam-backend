import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller.js';
import { RolesService } from './roles.service.js';
import { RolesRepository } from './roles.repository.js';
import { PermissionsModule } from '../permissions/permissions.module.js';

@Module({
  imports: [PermissionsModule],  // for PermissionsRepository injection
  controllers: [RolesController],
  providers: [RolesService, RolesRepository],
  exports: [RolesService, RolesRepository],
})
export class RolesModule {}
