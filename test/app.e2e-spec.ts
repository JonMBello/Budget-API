import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              PORT: 3000,
              NODE_ENV: 'test',
              JWT_SECRET: 'test',
              JWT_REFRESH_SECRET: 'test',
              REGISTRATION_INVITE_CODE: 'test',
              MONGO_URI: 'mongodb://localhost:27017/test',
            }),
          ],
        }),
      ],
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('service', 'budget-api');
        expect(res.body).toHaveProperty('version', '1.0.0');
        expect(res.body).toHaveProperty('timestamp');
      });
  });

  it('/api/non-existent (GET) -> should return standard 404 via AllExceptionsFilter', () => {
    return request(app.getHttpServer())
      .get('/api/non-existent')
      .expect(404)
      .expect((res) => {
        expect(res.body).toHaveProperty('statusCode', 404);
        expect(res.body).toHaveProperty('path', '/api/non-existent');
        expect(res.body).toHaveProperty('error');
      });
  });
});
