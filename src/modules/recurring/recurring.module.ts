import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecurringTemplate, RecurringTemplateSchema } from './schemas/recurring-template.schema';
import { RecurringService } from './recurring.service';
import { RecurringController } from './recurring.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: RecurringTemplate.name,
        schema: RecurringTemplateSchema,
      },
    ]),
  ],
  controllers: [RecurringController],
  providers: [RecurringService],
  exports: [RecurringService],
})
export class RecurringModule {}
