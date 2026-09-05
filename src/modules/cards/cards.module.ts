import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountCard, AccountCardSchema } from './schemas/account-card.schema';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: AccountCard.name,
        schema: AccountCardSchema,
      },
    ]),
  ],
  controllers: [CardsController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}
