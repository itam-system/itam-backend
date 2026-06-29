import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { HealthController } from '../src/health/health.controller.js';
import { PrismaService } from '../src/common/database/prisma.service.js';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  const mockPrisma = {
    $runCommandRaw: jest.fn().mockResolvedValue({ ok: 1 }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health returns healthy status when DB is connected', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('healthy');
        expect(res.body.checks.database).toBe('connected');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('uptime');
      });
  });

  it('GET /health returns unhealthy status when DB is disconnected', async () => {
    mockPrisma.$runCommandRaw.mockRejectedValueOnce(new Error('DB connection lost'));

    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('unhealthy');
        expect(res.body.checks.database).toBe('disconnected');
      });
  });
});
