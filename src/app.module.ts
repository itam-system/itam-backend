import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppConfigModule } from './common/config/config.module.js';
import { DatabaseModule } from './common/database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { PermissionsModule } from './permissions/permissions.module.js';
import { RolesModule } from './roles/roles.module.js';
import { UsersModule } from './users/users.module.js';
import { AssetsModule } from './assets/assets.module.js';
import { AssignmentsModule } from './assignments/assignments.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { ActivityLogsModule } from './activity-logs/activity-logs.module.js';
import { HealthModule } from './health/health.module.js';
import { RequestLoggerMiddleware } from './common/middlewares/request-logger.middleware.js';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor.js';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor.js';
import { RequestIdMiddleware } from './common/middlewares/request-id.middleware.js';

@Module({
  imports: [
    // Global config (loads .env, registers namespaced configs)
    AppConfigModule,

    // Global database (PrismaService available everywhere)
    DatabaseModule,

    // Rate limiting — 30 requests per 60 seconds by default
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 30,
    }]),

    // Feature modules
    AuthModule,
    PermissionsModule,
    RolesModule,
    UsersModule,
    AssetsModule,
    AssignmentsModule,
    CategoriesModule,
    DashboardModule,
    ReportsModule,
    SettingsModule,
    ActivityLogsModule,
    HealthModule,
  ],
  providers: [
    // Apply JwtAuthGuard globally — @Public() bypasses it
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Apply ThrottlerGuard globally — @SkipThrottle() bypasses it
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Wrap all success responses in { success, data, timestamp }
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
    // 30-second request timeout
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware, RequestLoggerMiddleware)
      .forRoutes('*');
  }
}
