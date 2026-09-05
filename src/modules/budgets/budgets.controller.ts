import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { InitializeBudgetDto } from './dto/initialize-budget.dto';
import { UpdateSavingsDto } from './dto/update-savings.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { BudgetResponseDto } from './dto/budget-response.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BudgetPeriodDocument } from './schemas/budget-period.schema';

@ApiTags('Budgets')
@Auth()
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post('initialize')
  @ApiOperation({
    summary: 'Initialize a new monthly budget period with automatic carried savings calculation',
  })
  @ApiResponse({
    status: 201,
    description: 'Budget period successfully initialized',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Budget period for this year/month already exists' })
  async initialize(
    @CurrentUser('userId') userId: string,
    @Body() dto: InitializeBudgetDto,
  ): Promise<BudgetResponseDto> {
    const period = await this.budgetsService.initializePeriod(userId, dto);
    return this.toResponse(period);
  }

  @Get()
  @ApiOperation({
    summary: 'List all budget periods for the authenticated user in reverse chronological order',
  })
  @ApiResponse({
    status: 200,
    description: 'List of budget periods',
    type: [BudgetResponseDto],
  })
  async findAll(@CurrentUser('userId') userId: string): Promise<BudgetResponseDto[]> {
    const periods = await this.budgetsService.findAllByUser(userId);
    return periods.map((p) => this.toResponse(p));
  }

  @Get('current')
  @ApiOperation({
    summary: 'Get current calendar month budget period or the most recent active period',
  })
  @ApiResponse({
    status: 200,
    description: 'Current or most recent budget period',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No budget periods found' })
  async getCurrent(@CurrentUser('userId') userId: string): Promise<BudgetResponseDto> {
    const period = await this.budgetsService.getCurrentPeriod(userId);
    return this.toResponse(period);
  }

  @Get(':year/:month')
  @ApiOperation({ summary: 'Get details of a specific budget period by year and month' })
  @ApiResponse({
    status: 200,
    description: 'Budget period details',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Budget period not found' })
  async findOne(
    @CurrentUser('userId') userId: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ): Promise<BudgetResponseDto> {
    const period = await this.budgetsService.findByYearAndMonth(userId, year, month);
    return this.toResponse(period);
  }

  @Patch(':year/:month/savings')
  @ApiOperation({ summary: 'Update manual carried savings amount for a specific budget period' })
  @ApiResponse({
    status: 200,
    description: 'Budget period updated with new carried savings',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Budget period not found' })
  async updateSavings(
    @CurrentUser('userId') userId: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Body() dto: UpdateSavingsDto,
  ): Promise<BudgetResponseDto> {
    const updated = await this.budgetsService.updateSavings(userId, year, month, dto);
    return this.toResponse(updated);
  }

  @Patch(':year/:month/status')
  @ApiOperation({ summary: 'Update lifecycle status of a budget period (OPEN or CLOSED)' })
  @ApiResponse({
    status: 200,
    description: 'Budget period status updated successfully',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Budget period not found' })
  async updateStatus(
    @CurrentUser('userId') userId: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Body() dto: UpdateStatusDto,
  ): Promise<BudgetResponseDto> {
    const updated = await this.budgetsService.updateStatus(userId, year, month, dto);
    return this.toResponse(updated);
  }

  private toResponse(period: BudgetPeriodDocument): BudgetResponseDto {
    return {
      id: period._id.toString(),
      userId: period.userId.toString(),
      year: period.year,
      month: period.month,
      status: period.status,
      carriedSavings: period.carriedSavings,
      totalIncome: period.totalIncome,
      totalExpenses: period.totalExpenses,
      netBalance: period.carriedSavings + period.totalIncome - period.totalExpenses,
      notes: period.notes ?? null,
      createdAt: period.createdAt,
      updatedAt: period.updatedAt,
    };
  }
}
