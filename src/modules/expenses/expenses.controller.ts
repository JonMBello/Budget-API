import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseResponseDto, ExpenseSplitResponseDto } from './dto/expense-response.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExpenseCategory, ExpenseDocument, ExpenseSplit } from './schemas/expense.schema';

@ApiTags('Expenses')
@Auth()
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({
    summary: 'Record a new expense, automatically calculating credit card due date and split debts',
  })
  @ApiResponse({
    status: 201,
    description: 'Expense created successfully',
    type: ExpenseResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    const expense = await this.expensesService.create(userId, dto);
    return this.toResponse(expense);
  }

  @Get()
  @ApiOperation({ summary: 'List expenses for authenticated user, with optional filters' })
  @ApiQuery({
    name: 'periodId',
    required: false,
    description: 'Filter expenses by BudgetPeriod ID',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ExpenseCategory,
    description: 'Filter expenses by category',
  })
  @ApiResponse({
    status: 200,
    description: 'List of expense records',
    type: [ExpenseResponseDto],
  })
  async findAll(
    @CurrentUser('userId') userId: string,
    @Query('periodId') periodId?: string,
    @Query('category') category?: ExpenseCategory,
  ): Promise<ExpenseResponseDto[]> {
    const expenses = await this.expensesService.findAllByPeriod(userId, periodId, category);
    return expenses.map((e) => this.toResponse(e));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific expense record' })
  @ApiResponse({
    status: 200,
    description: 'Expense record details',
    type: ExpenseResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  async findOne(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<ExpenseResponseDto> {
    const expense = await this.expensesService.findOne(userId, id);
    return this.toResponse(expense);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing expense record and synchronize associated splits' })
  @ApiResponse({
    status: 200,
    description: 'Expense record updated successfully',
    type: ExpenseResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  async update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    const updated = await this.expensesService.update(userId, id, dto);
    return this.toResponse(updated);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an expense record and remove linked uncollected split incomes' })
  @ApiResponse({
    status: 200,
    description: 'Expense record deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  async remove(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.expensesService.remove(userId, id);
  }

  private toResponse(expense: ExpenseDocument): ExpenseResponseDto {
    return {
      id: expense._id.toString(),
      userId: expense.userId.toString(),
      periodId: expense.periodId.toString(),
      templateId: expense.templateId ? expense.templateId.toString() : null,
      cardId: expense.cardId ? expense.cardId.toString() : null,
      title: expense.title,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      paymentDueDate: expense.paymentDueDate ?? null,
      isPaid: expense.isPaid,
      split: this.toSplitResponse(expense.split),
      notes: expense.notes ?? null,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }

  private toSplitResponse(split?: ExpenseSplit | null): ExpenseSplitResponseDto | null {
    if (!split) return null;
    return {
      personId: split.personId.toString(),
      splitType: split.splitType,
      splitValue: split.splitValue,
      splitAmount: split.splitAmount,
      isDebtActive: split.isDebtActive,
      linkedIncomeId: split.linkedIncomeId ? split.linkedIncomeId.toString() : null,
    };
  }
}
