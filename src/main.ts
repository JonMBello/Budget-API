import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('BUDGET_API_PORT', 3000);
  const nodeEnv = configService.get<string>('BUDGET_API_NODE_ENV', 'development');

  // Prefijo global
  app.setGlobalPrefix('api');

  // Filtros globales y validación
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Configuración de Swagger OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Budget API')
    .setDescription(
      'API REST para gestión financiera personal, presupuestos mensuales, seguimiento de MSI, división de cuentas compartidas y recordatorios de pago.',
    )
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'API Key requerida para todas las peticiones a la API',
      },
      'api-key',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingrese su token JWT de autenticación',
        in: 'header',
      },
      'JWT-auth',
    )
    .addSecurityRequirements('api-key')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Budget API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  logger.log(`🚀 Budget-API iniciada con éxito en el puerto ${port} [Entorno: ${nodeEnv}]`);
  logger.log(`📄 Documentación Swagger disponible en: http://localhost:${port}/api/docs`);
}

bootstrap();
