import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BudgetPeriod,
  BudgetPeriodDocument,
  BudgetPeriodStatus,
} from './schemas/budget-period.schema';
import { InitializeBudgetDto } from './dto/initialize-budget.dto';
import { UpdateSavingsDto } from './dto/update-savings.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectModel(BudgetPeriod.name)
    private readonly budgetPeriodModel: Model<BudgetPeriodDocument>,
  ) {}

  async initializePeriod(
    userId: string,
    dto: InitializeBudgetDto = {},
  ): Promise<BudgetPeriodDocument> {
    const userObjectId = new Types.ObjectId(userId);

    let targetYear = dto.year;
    let targetMonth = dto.month;

    // If year or month are missing, calculate based on the latest recorded period or current date
    if (!targetYear || !targetMonth) {
      const latest = await this.budgetPeriodModel
        .findOne({ userId: userObjectId })
        .sort({ year: -1, month: -1 })
        .exec();

      if (latest) {
        targetYear = targetYear ?? (latest.month === 12 ? latest.year + 1 : latest.year);
        targetMonth = targetMonth ?? (latest.month === 12 ? 1 : latest.month + 1);
      } else {
        const now = new Date();
        targetYear = targetYear ?? now.getFullYear();
        targetMonth = targetMonth ?? now.getMonth() + 1;
      }
    }

    if (targetMonth < 1 || targetMonth > 12) {
      throw new BadRequestException('Month must be between 1 and 12');
    }

    // Check if period already exists
    const existing = await this.budgetPeriodModel
      .findOne({
        userId: userObjectId,
        year: targetYear,
        month: targetMonth,
      })
      .exec();

    if (existing) {
      const formattedMonth = String(targetMonth).padStart(2, '0');
      throw new ConflictException(
        `Budget period for ${targetYear}-${formattedMonth} already exists`,
      );
    }

    // Calculate carried savings from previous month if not explicitly provided
    let carriedSavings = dto.carriedSavings;
    if (carriedSavings === undefined) {
      const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;
      const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;

      const prevPeriod = await this.budgetPeriodModel
        .findOne({
          userId: userObjectId,
          year: prevYear,
          month: prevMonth,
        })
        .exec();

      if (prevPeriod) {
        carriedSavings =
          prevPeriod.carriedSavings + prevPeriod.totalIncome - prevPeriod.totalExpenses;
      } else {
        carriedSavings = 0;
      }
    }

    const newPeriod = new this.budgetPeriodModel({
      userId: userObjectId,
      year: targetYear,
      month: targetMonth,
      status: BudgetPeriodStatus.OPEN,
      carriedSavings,
      totalIncome: dto.totalIncome ?? 0,
      totalExpenses: dto.totalExpenses ?? 0,
      notes: dto.notes ?? null,
    });

    return newPeriod.save();
  }

  async findAllByUser(userId: string): Promise<BudgetPeriodDocument[]> {
    return this.budgetPeriodModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ year: -1, month: -1 })
      .exec();
  }

  async findByYearAndMonth(
    userId: string,
    year: number,
    month: number,
  ): Promise<BudgetPeriodDocument> {
    if (month < 1 || month > 12) {
      throw new BadRequestException('Month must be between 1 and 12');
    }

    const period = await this.budgetPeriodModel
      .findOne({
        userId: new Types.ObjectId(userId),
        year,
        month,
      })
      .exec();

    if (!period) {
      const formattedMonth = String(month).padStart(2, '0');
      throw new NotFoundException(`Budget period for ${year}-${formattedMonth} not found`);
    }

    return period;
  }

  async getCurrentPeriod(userId: string): Promise<BudgetPeriodDocument> {
    const userObjectId = new Types.ObjectId(userId);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Check if period for current calendar month exists
    const current = await this.budgetPeriodModel
      .findOne({
        userId: userObjectId,
        year: currentYear,
        month: currentMonth,
      })
      .exec();

    if (current) {
      return current;
    }

    // Fallback to most recent open or latest period
    const latest = await this.budgetPeriodModel
      .findOne({ userId: userObjectId })
      .sort({ year: -1, month: -1 })
      .exec();

    if (!latest) {
      throw new NotFoundException('No budget periods found for user');
    }

    return latest;
  }

  async updateSavings(
    userId: string,
    year: number,
    month: number,
    dto: UpdateSavingsDto,
  ): Promise<BudgetPeriodDocument> {
    await this.findByYearAndMonth(userId, year, month);

    const updated = await this.budgetPeriodModel
      .findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          year,
          month,
        },
        { $set: { carriedSavings: dto.carriedSavings } },
        { new: true, runValidators: true },
      )
      .exec();

    return updated!;
  }

  async updateStatus(
    userId: string,
    year: number,
    month: number,
    dto: UpdateStatusDto,
  ): Promise<BudgetPeriodDocument> {
    await this.findByYearAndMonth(userId, year, month);

    const updated = await this.budgetPeriodModel
      .findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          year,
          month,
        },
        { $set: { status: dto.status } },
        { new: true, runValidators: true },
      )
      .exec();

    return updated!;
  }

  async updateIncome(
    userId: string,
    year: number,
    month: number,
    dto: UpdateIncomeDto,
  ): Promise<BudgetPeriodDocument> {
    await this.findByYearAndMonth(userId, year, month);

    const updated = await this.budgetPeriodModel
      .findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          year,
          month,
        },
        { $set: { totalIncome: dto.totalIncome } },
        { new: true, runValidators: true },
      )
      .exec();

    return updated!;
  }

  async update(
    userId: string,
    year: number,
    month: number,
    dto: UpdateBudgetDto,
  ): Promise<BudgetPeriodDocument> {
    await this.findByYearAndMonth(userId, year, month);

    const updateFields: Record<string, any> = {};
    if (dto.totalIncome !== undefined) updateFields.totalIncome = dto.totalIncome;
    if (dto.carriedSavings !== undefined) updateFields.carriedSavings = dto.carriedSavings;
    if (dto.totalExpenses !== undefined) updateFields.totalExpenses = dto.totalExpenses;
    if (dto.notes !== undefined) updateFields.notes = dto.notes;

    const updated = await this.budgetPeriodModel
      .findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          year,
          month,
        },
        { $set: updateFields },
        { new: true, runValidators: true },
      )
      .exec();

    return updated!;
  }

  async syncTotals(
    userId: string,
    periodId: string,
    totalIncome?: number,
    totalExpenses?: number,
  ): Promise<BudgetPeriodDocument | null> {
    const updateFields: Record<string, any> = {};
    if (totalIncome !== undefined) updateFields.totalIncome = totalIncome;
    if (totalExpenses !== undefined) updateFields.totalExpenses = totalExpenses;

    if (Object.keys(updateFields).length === 0) return null;

    return this.budgetPeriodModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(periodId),
          userId: new Types.ObjectId(userId),
        },
        { $set: updateFields },
        { new: true },
      )
      .exec();
  }
}
