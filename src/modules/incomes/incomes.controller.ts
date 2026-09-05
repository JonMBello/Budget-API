import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IncomesService } from './incomes.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { CopyIncomesDto } from './dto/copy-incomes.dto';
import { IncomeResponseDto } from './dto/income-response.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IncomeDocument } from './schemas/income.schema';

@ApiTags('Incomes')
@Auth()
@Controller('incomes')
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  @Post()
  @ApiOperation({ summary: 'Record a new income entry' })
  @ApiResponse({
    status: 201,
    description: 'Income recorded successfully',
    type: IncomeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateIncomeDto,
  ): Promise<IncomeResponseDto> {
    const income = await this.incomesService.create(userId, dto);
    return this.toResponse(income);
  }

  @Get()
  @ApiOperation({
    summary: 'List incomes for authenticated user, optionally filtered by budget period',
  })
  @ApiQuery({
    name: 'periodId',
    required: false,
    description: 'Filter incomes by BudgetPeriod ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of income records',
    type: [IncomeResponseDto],
  })
  async findAll(
    @CurrentUser('userId') userId: string,
    @Query('periodId') periodId?: string,
  ): Promise<IncomeResponseDto[]> {
    const incomes = await this.incomesService.findAllByPeriod(userId, periodId);
    return incomes.map((i) => this.toResponse(i));
  }

  @Post('copy-from-previous-month')
  @ApiOperation({
    summary:
      'Copy recurring payroll and regular incomes from a previous budget period into a new one',
  })
  @ApiResponse({
    status: 201,
    description: 'Incomes cloned successfully',
    type: [IncomeResponseDto],
  })
  async copyFromPreviousMonth(
    @CurrentUser('userId') userId: string,
    @Body() dto: CopyIncomesDto,
  ): Promise<IncomeResponseDto[]> {
    const incomes = await this.incomesService.copyFromPreviousMonth(userId, dto);
    return incomes.map((i) => this.toResponse(i));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific income record' })
  @ApiResponse({
    status: 200,
    description: 'Income record details',
    type: IncomeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Income not found' })
  async findOne(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<IncomeResponseDto> {
    const income = await this.incomesService.findOne(userId, id);
    return this.toResponse(income);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing income record' })
  @ApiResponse({
    status: 200,
    description: 'Income record updated successfully',
    type: IncomeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Income not found' })
  async update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateIncomeDto,
  ): Promise<IncomeResponseDto> {
    const updated = await this.incomesService.update(userId, id, dto);
    return this.toResponse(updated);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an income record' })
  @ApiResponse({
    status: 200,
    description: 'Income record deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Income not found' })
  async remove(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.incomesService.remove(userId, id);
  }

  private toResponse(income: IncomeDocument): IncomeResponseDto {
    return {
      id: income._id.toString(),
      userId: income.userId.toString(),
      periodId: income.periodId.toString(),
      title: income.title,
      amount: income.amount,
      date: income.date,
      source: income.source,
      isReceived: income.isReceived,
      dueDate: income.dueDate ?? null,
      linkedExpenseId: income.linkedExpenseId ? income.linkedExpenseId.toString() : null,
      debtorPersonId: income.debtorPersonId ? income.debtorPersonId.toString() : null,
      notes: income.notes ?? null,
      createdAt: income.createdAt,
      updatedAt: income.updatedAt,
    };
  }
}
