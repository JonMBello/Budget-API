import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AccountCard, AccountCardDocument } from './schemas/account-card.schema';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import {
  AccountCardType,
  calculateStatementCycle,
  StatementCycleResult,
} from '../../common/utils/card-cycle.util';

@Injectable()
export class CardsService {
  constructor(
    @InjectModel(AccountCard.name)
    private readonly cardModel: Model<AccountCardDocument>,
  ) {}

  async create(userId: string, createCardDto: CreateCardDto): Promise<AccountCardDocument> {
    if (createCardDto.type === AccountCardType.CREDIT) {
      if (!createCardDto.cutoffDay || !createCardDto.paymentDueDay) {
        throw new BadRequestException(
          'Cutoff day and payment due day are required for CREDIT cards',
        );
      }
    }

    const newCard = new this.cardModel({
      ...createCardDto,
      userId: new Types.ObjectId(userId),
    });

    return newCard.save();
  }

  async findAllByUser(userId: string, includeInactive = false): Promise<AccountCardDocument[]> {
    const filter: Record<string, any> = {
      userId: new Types.ObjectId(userId),
    };

    if (!includeInactive) {
      filter.isActive = true;
    }

    return this.cardModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(userId: string, cardId: string): Promise<AccountCardDocument> {
    if (!Types.ObjectId.isValid(cardId)) {
      throw new NotFoundException('Card or account not found');
    }

    const card = await this.cardModel
      .findOne({
        _id: new Types.ObjectId(cardId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!card) {
      throw new NotFoundException('Card or account not found');
    }

    return card;
  }

  async update(
    userId: string,
    cardId: string,
    updateCardDto: UpdateCardDto,
  ): Promise<AccountCardDocument> {
    const existingCard = await this.findOne(userId, cardId);

    const resultingType = updateCardDto.type || existingCard.type;
    const resultingCutoff =
      updateCardDto.cutoffDay !== undefined ? updateCardDto.cutoffDay : existingCard.cutoffDay;
    const resultingPaymentDue =
      updateCardDto.paymentDueDay !== undefined
        ? updateCardDto.paymentDueDay
        : existingCard.paymentDueDay;

    if (resultingType === AccountCardType.CREDIT) {
      if (!resultingCutoff || !resultingPaymentDue) {
        throw new BadRequestException(
          'Cutoff day and payment due day are required for CREDIT cards',
        );
      }
    }

    const updated = await this.cardModel
      .findByIdAndUpdate(cardId, { $set: updateCardDto }, { new: true, runValidators: true })
      .exec();

    return updated!;
  }

  async remove(userId: string, cardId: string): Promise<{ success: boolean; message: string }> {
    await this.findOne(userId, cardId);

    await this.cardModel.findByIdAndUpdate(cardId, { $set: { isActive: false } }).exec();

    return {
      success: true,
      message: 'Card or account deactivated successfully',
    };
  }

  async previewStatement(
    userId: string,
    cardId: string,
    dateString?: string,
  ): Promise<StatementCycleResult> {
    const card = await this.findOne(userId, cardId);
    const purchaseDate = dateString || new Date().toISOString().slice(0, 10);

    return calculateStatementCycle({
      purchaseDate,
      cutoffDay: card.cutoffDay,
      paymentDueDay: card.paymentDueDay,
      type: card.type,
    });
  }
}
