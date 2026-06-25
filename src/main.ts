import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import { PrismaService } from './common/database/prisma.service.js';
import { API_PREFIX } from './common/constants/app.constant.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ─── Security ────────────────────────────────
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    credentials: true,
  });

  // ─── Global Prefix ───────────────────────────
  app.setGlobalPrefix(API_PREFIX);

  // ─── Global Pipes ────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,             // Strip unknown properties
      forbidNonWhitelisted: true,  // Throw on unknown properties
      transform: true,             // Auto-transform to DTO class instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Global Filters ──────────────────────────
  // PrismaExceptionFilter must be first (higher priority)
  app.useGlobalFilters(
    new PrismaExceptionFilter(),
    new GlobalExceptionFilter(),
  );

  // ─── Global Guards ───────────────────────────
  // PermissionsGuard is applied globally after JwtAuthGuard (registered in AppModule)
  const reflector = app.get(Reflector);
  const prisma = app.get(PrismaService);
  app.useGlobalGuards(new PermissionsGuard(reflector, prisma));

  // ─── Swagger Documentation ───────────────────
  const config = new DocumentBuilder()
    .setTitle('ITAM API')
    .setDescription(
      'Enterprise IT Asset Management System — REST API Documentation',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT-Auth',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Dashboard', 'Dashboard KPIs')
    .addTag('Users', 'User management')
    .addTag('Roles', 'Role management')
    .addTag('Permissions', 'Permission management')
    .addTag('Assets', 'Asset lifecycle management')
    .addTag('Categories', 'Asset categories')
    .addTag('Assignments', 'Asset assignments')
    .addTag('Reports', 'Reporting and exports')
    .addTag('Activity Logs', 'Immutable audit trail')
    .addTag('Settings', 'System settings')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // ─── Start Server ────────────────────────────
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`\n🚀 ITAM API running on: http://localhost:${port}/${API_PREFIX}`);
  console.log(`📚 Swagger UI available at: http://localhost:${port}/api/docs\n`);
}

bootstrap();
