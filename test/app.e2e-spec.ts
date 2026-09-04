import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { ApiKeyGuard } from '../src/common/guards/api-key.guard';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  const validApiKey = 'test_secret_api_key';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              BUDGET_API_PORT: 3000,
              BUDGET_API_NODE_ENV: 'test',
              BUDGET_API_KEY: validApiKey,
              BUDGET_API_JWT_SECRET: 'test',
              BUDGET_API_JWT_REFRESH_SECRET: 'test',
              BUDGET_API_REGISTRATION_INVITE_CODE: 'test',
              BUDGET_API_MONGO_URI: 'mongodb://localhost:27017/test',
            }),
          ],
        }),
      ],
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: APP_GUARD,
          useClass: ApiKeyGuard,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/health (GET) -> should fail with 401 if x-api-key is missing', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(401)
      .expect((res: request.Response) => {
        expect(res.body).toHaveProperty('statusCode', 401);
        expect(res.body.message).toBe('Unauthorized request');
      });
  });

  it('/api/health (GET) -> should succeed with 200 when valid x-api-key is sent', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .set('x-api-key', validApiKey)
      .expect(200)
      .expect((res: request.Response) => {
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('service', 'budget-api');
        expect(res.body).toHaveProperty('version', '1.0.0');
        expect(res.body).toHaveProperty('timestamp');
      });
  });

  it('/api/non-existent (GET) -> should return standard 404 with valid x-api-key', () => {
    return request(app.getHttpServer())
      .get('/api/non-existent')
      .set('x-api-key', validApiKey)
      .expect(404)
      .expect((res: request.Response) => {
        expect(res.body).toHaveProperty('statusCode', 404);
        expect(res.body).toHaveProperty('path', '/api/non-existent');
        expect(res.body).toHaveProperty('error');
      });
  });
});
