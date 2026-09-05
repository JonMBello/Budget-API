import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Expense, ExpenseSchema } from './schemas/expense.schema';
import { Person, PersonSchema } from '../people/schemas/person.schema';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { IncomesModule } from '../incomes/incomes.module';
import { CardsModule } from '../cards/cards.module';
import { BudgetsModule } from '../budgets/budgets.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Expense.name,
        schema: ExpenseSchema,
      },
      {
        name: Person.name,
        schema: PersonSchema,
      },
    ]),
    IncomesModule,
    CardsModule,
    BudgetsModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
