import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  RecurringCategory,
  RecurringTemplate,
  RecurringTemplateDocument,
  SplitInfo,
  SplitType,
} from './schemas/recurring-template.schema';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';
import { AdvanceMsiDto } from './dto/advance-msi.dto';
import {
  InstantiatedItemDto,
  InstantiateResultDto,
  SplitResponseDto,
} from './dto/recurring-response.dto';

@Injectable()
export class RecurringService {
  constructor(
    @InjectModel(RecurringTemplate.name)
    private readonly recurringModel: Model<RecurringTemplateDocument>,
  ) {}

  async create(userId: string, dto: CreateRecurringDto): Promise<RecurringTemplateDocument> {
    const userObjectId = new Types.ObjectId(userId);

    let amount = dto.amount;
    let totalAmount = dto.totalAmount ?? null;
    let totalInstallments = dto.totalInstallments ?? null;
    let currentInstallment = dto.currentInstallment ?? null;

    if (dto.category === RecurringCategory.MSI) {
      if (!totalInstallments || totalInstallments < 2) {
        throw new BadRequestException('MSI plans require at least 2 installments');
      }

      if (!totalAmount && !amount) {
        throw new BadRequestException(
          'Either totalAmount or monthly amount is required for MSI plans',
        );
      }

      if (!totalAmount && amount) {
        totalAmount = Math.round(amount * totalInstallments * 100) / 100;
      } else if (totalAmount && !amount) {
        amount = Math.round((totalAmount / totalInstallments) * 100) / 100;
      }

      currentInstallment = currentInstallment ?? 1;
    } else {
      if (!amount) {
        throw new BadRequestException(
          'Monthly amount is required for recurring services and subscriptions',
        );
      }
      totalAmount = null;
      totalInstallments = null;
      currentInstallment = null;
    }

    let splitInfo: SplitInfo | null = null;
    if (dto.split) {
      const splitAmount =
        dto.split.splitType === SplitType.PERCENTAGE
          ? Math.round(amount! * (dto.split.splitValue / 100) * 100) / 100
          : dto.split.splitValue;

      splitInfo = {
        personId: new Types.ObjectId(dto.split.personId),
        splitType: dto.split.splitType,
        splitValue: dto.split.splitValue,
        splitAmount,
      };
    }

    const template = new this.recurringModel({
      userId: userObjectId,
      title: dto.title,
      category: dto.category,
      cardId: dto.cardId ? new Types.ObjectId(dto.cardId) : null,
      amount,
      currency: dto.currency,
      exchangeRate: dto.exchangeRate ?? 1.0,
      totalAmount,
      totalInstallments,
      currentInstallment,
      startDate: dto.startDate ?? null,
      split: splitInfo,
      isActive: true,
      isCompleted: false,
      notes: dto.notes ?? null,
    });

    return template.save();
  }

  async findAllByUser(
    userId: string,
    includeInactive = false,
    category?: RecurringCategory,
  ): Promise<RecurringTemplateDocument[]> {
    const filter: Record<string, any> = {
      userId: new Types.ObjectId(userId),
    };

    if (!includeInactive) {
      filter.isActive = true;
    }

    if (category) {
      filter.category = category;
    }

    return this.recurringModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(userId: string, id: string): Promise<RecurringTemplateDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Recurring template not found');
    }

    const template = await this.recurringModel
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!template) {
      throw new NotFoundException('Recurring template not found');
    }

    return template;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateRecurringDto,
  ): Promise<RecurringTemplateDocument> {
    const existing = await this.findOne(userId, id);

    const updateFields: Record<string, any> = {};

    if (dto.title !== undefined) updateFields.title = dto.title;
    if (dto.notes !== undefined) updateFields.notes = dto.notes;
    if (dto.cardId !== undefined) {
      updateFields.cardId = dto.cardId ? new Types.ObjectId(dto.cardId) : null;
    }
    if (dto.isActive !== undefined) updateFields.isActive = dto.isActive;
    if (dto.isCompleted !== undefined) updateFields.isCompleted = dto.isCompleted;
    if (dto.currency !== undefined) updateFields.currency = dto.currency;
    if (dto.exchangeRate !== undefined) updateFields.exchangeRate = dto.exchangeRate;

    const resultingCategory = dto.category ?? existing.category;
    updateFields.category = resultingCategory;

    let amount = dto.amount ?? existing.amount;
    const totalInstallments = dto.totalInstallments ?? existing.totalInstallments;
    let totalAmount = dto.totalAmount ?? existing.totalAmount;

    if (resultingCategory === RecurringCategory.MSI) {
      if (totalInstallments && totalInstallments < 2) {
        throw new BadRequestException('MSI plans require at least 2 installments');
      }

      if (dto.amount && !dto.totalAmount && totalInstallments) {
        totalAmount = Math.round(dto.amount * totalInstallments * 100) / 100;
      } else if (dto.totalAmount && !dto.amount && totalInstallments) {
        amount = Math.round((dto.totalAmount / totalInstallments) * 100) / 100;
      }

      updateFields.amount = amount;
      updateFields.totalAmount = totalAmount;
      updateFields.totalInstallments = totalInstallments;
      if (dto.currentInstallment !== undefined) {
        updateFields.currentInstallment = dto.currentInstallment;
      }
    } else {
      updateFields.amount = amount;
    }

    if (dto.split !== undefined) {
      if (dto.split === null) {
        updateFields.split = null;
      } else {
        const splitAmount =
          dto.split.splitType === SplitType.PERCENTAGE
            ? Math.round(amount * (dto.split.splitValue / 100) * 100) / 100
            : dto.split.splitValue;

        updateFields.split = {
          personId: new Types.ObjectId(dto.split.personId),
          splitType: dto.split.splitType,
          splitValue: dto.split.splitValue,
          splitAmount,
        };
      }
    }

    const updated = await this.recurringModel
      .findByIdAndUpdate(id, { $set: updateFields }, { new: true, runValidators: true })
      .exec();

    return updated!;
  }

  async remove(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    await this.findOne(userId, id);

    await this.recurringModel.findByIdAndUpdate(id, { $set: { isActive: false } }).exec();

    return {
      success: true,
      message: 'Recurring template deactivated successfully',
    };
  }

  async advanceMsi(
    userId: string,
    id: string,
    dto: AdvanceMsiDto,
  ): Promise<RecurringTemplateDocument> {
    const template = await this.findOne(userId, id);

    if (template.category !== RecurringCategory.MSI) {
      throw new BadRequestException('Only MSI plans can be advanced or liquidated');
    }

    if (template.isCompleted) {
      throw new BadRequestException('This MSI plan is already completed');
    }

    const total = template.totalInstallments || 2;
    if (dto.payAll) {
      template.currentInstallment = total;
      template.isCompleted = true;
      template.isActive = false;
    } else {
      const advance = dto.installmentsCount ?? 1;
      const next = (template.currentInstallment || 1) + advance;
      if (next >= total) {
        template.currentInstallment = total;
        template.isCompleted = true;
        template.isActive = false;
      } else {
        template.currentInstallment = next;
      }
    }

    return template.save();
  }

  async cancel(userId: string, id: string): Promise<RecurringTemplateDocument> {
    const template = await this.findOne(userId, id);
    template.isActive = false;
    return template.save();
  }

  async instantiateForMonth(
    userId: string,
    year: number,
    month: number,
  ): Promise<InstantiateResultDto> {
    const templates = await this.recurringModel
      .find({
        userId: new Types.ObjectId(userId),
        isActive: true,
      })
      .exec();

    const items: InstantiatedItemDto[] = [];

    for (const template of templates) {
      let title = template.title;
      let isFinal = false;

      if (template.category === RecurringCategory.MSI) {
        if (template.isCompleted) continue;

        const current = template.currentInstallment || 1;
        const total = template.totalInstallments || current;
        isFinal = current >= total;

        title = `${template.title} (Cuota ${current}/${total})`;

        if (isFinal) {
          template.isCompleted = true;
          template.isActive = false;
        } else {
          template.currentInstallment = current + 1;
        }

        await template.save();

        items.push({
          templateId: template._id.toString(),
          title,
          category: template.category,
          amount: template.amount,
          cardId: template.cardId ? template.cardId.toString() : null,
          currentInstallment: current,
          totalInstallments: total,
          isFinalInstallment: isFinal,
          split: this.toSplitResponse(template.split),
        });
      } else {
        items.push({
          templateId: template._id.toString(),
          title,
          category: template.category,
          amount: template.amount,
          cardId: template.cardId ? template.cardId.toString() : null,
          currentInstallment: null,
          totalInstallments: null,
          isFinalInstallment: false,
          split: this.toSplitResponse(template.split),
        });
      }
    }

    const totalAmount = Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;

    return {
      year,
      month,
      totalCount: items.length,
      totalAmount,
      items,
    };
  }

  async findActiveDebtsByPerson(
    userId: string,
    personId: string,
  ): Promise<RecurringTemplateDocument[]> {
    return this.recurringModel
      .find({
        userId: new Types.ObjectId(userId),
        isActive: true,
        'split.personId': new Types.ObjectId(personId),
      })
      .exec();
  }

  private toSplitResponse(split?: SplitInfo | null): SplitResponseDto | null {
    if (!split) return null;
    return {
      personId: split.personId.toString(),
      splitType: split.splitType,
      splitValue: split.splitValue,
      splitAmount: split.splitAmount,
    };
  }
}
