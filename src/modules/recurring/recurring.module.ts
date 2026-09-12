import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecurringTemplate, RecurringTemplateSchema } from './schemas/recurring-template.schema';
import { RecurringService } from './recurring.service';
import { RecurringController } from './recurring.controller';
import { Expense, ExpenseSchema } from '../expenses/schemas/expense.schema';
import { Income, IncomeSchema } from '../incomes/schemas/income.schema';
import { BudgetPeriod, BudgetPeriodSchema } from '../budgets/schemas/budget-period.schema';
import { Person, PersonSchema } from '../people/schemas/person.schema';
import { AccountCard, AccountCardSchema } from '../cards/schemas/account-card.schema';
import { BudgetsModule } from '../budgets/budgets.module';
import { CardsModule } from '../cards/cards.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: RecurringTemplate.name,
        schema: RecurringTemplateSchema,
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
        name: BudgetPeriod.name,
        schema: BudgetPeriodSchema,
      },
      {
        name: Person.name,
        schema: PersonSchema,
      },
      {
        name: AccountCard.name,
        schema: AccountCardSchema,
      },
    ]),
    BudgetsModule,
    CardsModule,
  ],
  controllers: [RecurringController],
  providers: [RecurringService],
  exports: [RecurringService],
})
export class RecurringModule {}
