import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BudgetPeriod, BudgetPeriodSchema } from './schemas/budget-period.schema';
import { BudgetsService } from './budgets.service';
import { BudgetMetricsService } from './services/budget-metrics.service';
import { BudgetsController } from './budgets.controller';
import { Expense, ExpenseSchema } from '../expenses/schemas/expense.schema';
import { Income, IncomeSchema } from '../incomes/schemas/income.schema';
import { Person, PersonSchema } from '../people/schemas/person.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: BudgetPeriod.name,
        schema: BudgetPeriodSchema,
      },
      {
        name: Expense.name,
        schema: ExpenseSchema,
      },
      {
        name: Income.name,
        schema: IncomeSchema,
      },
      {
        name: Person.name,
        schema: PersonSchema,
      },
    ]),
  ],
  controllers: [BudgetsController],
  providers: [BudgetsService, BudgetMetricsService],
  exports: [BudgetsService, BudgetMetricsService],
})
export class BudgetsModule {}
