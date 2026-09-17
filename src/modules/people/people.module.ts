import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Person, PersonSchema } from './schemas/person.schema';
import { PeopleService } from './people.service';
import { PeopleController } from './people.controller';
import { PeopleV2Controller } from './people-v2.controller';
import { RecurringModule } from '../recurring/recurring.module';
import { ExpensesModule } from '../expenses/expenses.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Person.name,
        schema: PersonSchema,
      },
    ]),
    RecurringModule,
    ExpensesModule,
  ],
  controllers: [PeopleController, PeopleV2Controller],
  providers: [PeopleService],
  exports: [PeopleService],
})
export class PeopleModule {}
