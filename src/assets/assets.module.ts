import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller.js';
import { AssetsService } from './assets.service.js';
import { AssetsRepository } from './assets.repository.js';

@Module({
  controllers: [AssetsController],
  providers: [AssetsService, AssetsRepository],
  exports: [AssetsService, AssetsRepository],
})
export class AssetsModule {}
