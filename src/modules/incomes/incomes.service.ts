import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Income, IncomeDocument, IncomeSource } from './schemas/income.schema';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { CopyIncomesDto } from './dto/copy-incomes.dto';

@Injectable()
export class IncomesService {
  constructor(
    @InjectModel(Income.name)
    private readonly incomeModel: Model<IncomeDocument>,
  ) {}

  async create(userId: string, dto: CreateIncomeDto): Promise<IncomeDocument> {
    const newIncome = new this.incomeModel({
      ...dto,
      userId: new Types.ObjectId(userId),
      periodId: new Types.ObjectId(dto.periodId),
      debtorPersonId: dto.debtorPersonId ? new Types.ObjectId(dto.debtorPersonId) : null,
      isReceived: dto.isReceived ?? false,
    });

    return newIncome.save();
  }

  async findAllByPeriod(userId: string, periodId?: string): Promise<IncomeDocument[]> {
    const filter: Record<string, any> = {
      userId: new Types.ObjectId(userId),
    };

    if (periodId) {
      filter.periodId = new Types.ObjectId(periodId);
    }

    return this.incomeModel.find(filter).sort({ date: -1, createdAt: -1 }).exec();
  }

  async findOne(userId: string, id: string): Promise<IncomeDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Income not found');
    }

    const income = await this.incomeModel
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!income) {
      throw new NotFoundException('Income not found');
    }

    return income;
  }

  async update(userId: string, id: string, dto: UpdateIncomeDto): Promise<IncomeDocument> {
    await this.findOne(userId, id);

    const updateFields: Record<string, any> = { ...dto };
    if (dto.periodId) {
      updateFields.periodId = new Types.ObjectId(dto.periodId);
    }
    if (dto.debtorPersonId !== undefined) {
      updateFields.debtorPersonId = dto.debtorPersonId
        ? new Types.ObjectId(dto.debtorPersonId)
        : null;
    }

    const updated = await this.incomeModel
      .findByIdAndUpdate(id, { $set: updateFields }, { new: true, runValidators: true })
      .exec();

    return updated!;
  }

  async remove(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    await this.findOne(userId, id);

    await this.incomeModel.findByIdAndDelete(id).exec();

    return {
      success: true,
      message: 'Income deleted successfully',
    };
  }

  async markAsReceived(userId: string, id: string, isReceived = true): Promise<IncomeDocument> {
    await this.findOne(userId, id);

    const updated = await this.incomeModel
      .findByIdAndUpdate(id, { $set: { isReceived } }, { new: true })
      .exec();

    return updated!;
  }

  async copyFromPreviousMonth(userId: string, dto: CopyIncomesDto): Promise<IncomeDocument[]> {
    const sourceIncomes = await this.incomeModel
      .find({
        userId: new Types.ObjectId(userId),
        periodId: new Types.ObjectId(dto.fromPeriodId),
        source: { $ne: IncomeSource.DEBT_COLLECTION },
      })
      .exec();

    const createdIncomes: IncomeDocument[] = [];

    for (const item of sourceIncomes) {
      const cloned = new this.incomeModel({
        userId: new Types.ObjectId(userId),
        periodId: new Types.ObjectId(dto.toPeriodId),
        title: item.title,
        amount: item.amount,
        date: item.date,
        source: item.source,
        isReceived: false,
        dueDate: item.dueDate ?? null,
        debtorPersonId: item.debtorPersonId ?? null,
        notes: item.notes
          ? `Cloned from previous month: ${item.notes}`
          : 'Cloned from previous month',
      });

      const saved = await cloned.save();
      createdIncomes.push(saved);
    }

    return createdIncomes;
  }

  async calculateTotalIncomeByPeriod(userId: string, periodId: string): Promise<number> {
    const incomes = await this.incomeModel
      .find({
        userId: new Types.ObjectId(userId),
        periodId: new Types.ObjectId(periodId),
      })
      .exec();

    const sum = incomes.reduce((acc, curr) => acc + curr.amount, 0);
    return Math.round(sum * 100) / 100;
  }
}
