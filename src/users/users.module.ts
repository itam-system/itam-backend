import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { RolesModule } from '../roles/roles.module.js';

@Module({
  imports: [RolesModule], // for RolesRepository injection (role validation + population)
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
