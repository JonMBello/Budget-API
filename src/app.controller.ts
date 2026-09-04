import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Verificar estado de salud y versión de la API' })
  @ApiResponse({
    status: 200,
    description: 'Estado operativo del servicio',
    schema: {
      example: {
        status: 'ok',
        service: 'budget-api',
        version: '1.0.0',
        timestamp: '2026-09-03T23:59:00.000Z',
      },
    },
  })
  getHealth() {
    return this.appService.getHealth();
  }
}
