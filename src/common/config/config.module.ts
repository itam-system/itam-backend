import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import appConfig from './app.config.js';
import jwtConfig from './jwt.config.js';
import databaseConfig from './database.config.js';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, jwtConfig, databaseConfig],
    }),
  ],
})
export class AppConfigModule {}
