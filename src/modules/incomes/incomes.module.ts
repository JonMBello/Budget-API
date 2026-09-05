import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Income, IncomeSchema } from './schemas/income.schema';
import { IncomesService } from './incomes.service';
import { IncomesController } from './incomes.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Income.name,
        schema: IncomeSchema,
      },
    ]),
  ],
  controllers: [IncomesController],
  providers: [IncomesService],
  exports: [IncomesService, MongooseModule],
})
export class IncomesModule {}
