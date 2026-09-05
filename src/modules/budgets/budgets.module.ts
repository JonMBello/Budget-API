import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BudgetPeriod, BudgetPeriodSchema } from './schemas/budget-period.schema';
import { BudgetsService } from './budgets.service';
import { BudgetsController } from './budgets.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: BudgetPeriod.name,
        schema: BudgetPeriodSchema,
      },
    ]),
  ],
  controllers: [BudgetsController],
  providers: [BudgetsService],
  exports: [BudgetsService],
})
export class BudgetsModule {}
