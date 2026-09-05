import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Person, PersonDocument } from './schemas/person.schema';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { DebtSummaryResponseDto } from './dto/debt-summary.dto';
import { SettleDebtDto, SettleDebtResponseDto } from './dto/settle-debt.dto';
import { RecurringService } from '../recurring/recurring.service';
import { RecurringCategory } from '../recurring/schemas/recurring-template.schema';
import { ExpensesService } from '../expenses/expenses.service';

@Injectable()
export class PeopleService {
  constructor(
    @InjectModel(Person.name)
    private readonly personModel: Model<PersonDocument>,
    private readonly recurringService: RecurringService,
    private readonly expensesService: ExpensesService,
  ) {}

  async create(userId: string, createPersonDto: CreatePersonDto): Promise<PersonDocument> {
    const newPerson = new this.personModel({
      ...createPersonDto,
      userId: new Types.ObjectId(userId),
    });

    return newPerson.save();
  }

  async findAllByUser(userId: string, includeInactive = false): Promise<PersonDocument[]> {
    const filter: Record<string, any> = {
      userId: new Types.ObjectId(userId),
    };

    if (!includeInactive) {
      filter.isActive = true;
    }

    return this.personModel.find(filter).sort({ name: 1 }).exec();
  }

  async findOne(userId: string, personId: string): Promise<PersonDocument> {
    if (!Types.ObjectId.isValid(personId)) {
      throw new NotFoundException('Person not found');
    }

    const person = await this.personModel
      .findOne({
        _id: new Types.ObjectId(personId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    return person;
  }

  async update(
    userId: string,
    personId: string,
    updatePersonDto: UpdatePersonDto,
  ): Promise<PersonDocument> {
    await this.findOne(userId, personId);

    const updated = await this.personModel
      .findByIdAndUpdate(personId, { $set: updatePersonDto }, { new: true, runValidators: true })
      .exec();

    return updated!;
  }

  async remove(userId: string, personId: string): Promise<{ success: boolean; message: string }> {
    await this.findOne(userId, personId);

    await this.personModel.findByIdAndUpdate(personId, { $set: { isActive: false } }).exec();

    return {
      success: true,
      message: 'Person deactivated successfully',
    };
  }

  async getDebtsSummary(userId: string, personId: string): Promise<DebtSummaryResponseDto> {
    const person = await this.findOne(userId, personId);

    const activeRecurringDebts = await this.recurringService.findActiveDebtsByPerson(
      userId,
      personId,
    );

    const msiInstallments = [];
    const recurringServices = [];

    let totalDebt = 0;
    let immediateDueAmount = 0;

    for (const t of activeRecurringDebts) {
      if (t.category === RecurringCategory.MSI) {
        const current = t.currentInstallment || 1;
        const total = t.totalInstallments || current;
        const installmentAmount = t.split?.splitAmount ?? t.amount;
        const remainingInstallments = Math.max(0, total - current + 1);
        const remainingAmount = Math.round(remainingInstallments * installmentAmount * 100) / 100;

        totalDebt += remainingAmount;
        immediateDueAmount += installmentAmount;

        msiInstallments.push({
          id: t._id.toString(),
          title: t.title,
          cardName: 'Credit Card',
          currentInstallment: current,
          totalInstallments: total,
          installmentAmount,
          remainingAmount,
          nextDueDate: null,
        });
      } else {
        const amount = t.split?.splitAmount ?? t.amount;
        totalDebt += amount;
        immediateDueAmount += amount;

        recurringServices.push({
          id: t._id.toString(),
          title: t.title,
          cardName: 'Payment Method',
          amount,
          nextDueDate: null,
        });
      }
    }

    const pendingExpenses = await this.expensesService.findPendingDebtsByPerson(userId, personId);

    const singleExpenses = [];
    const dueDates: string[] = [];

    for (const exp of pendingExpenses) {
      const amount = exp.split?.splitAmount ?? exp.amount;
      totalDebt += amount;
      immediateDueAmount += amount;

      const cardName = (exp.cardId as any)?.name ?? 'Sin tarjeta';
      const dueDateStr = exp.paymentDueDate
        ? new Date(exp.paymentDueDate).toISOString().split('T')[0]
        : null;

      if (dueDateStr) {
        dueDates.push(dueDateStr);
      }

      const dateStr = new Date(exp.date).toISOString().split('T')[0];

      singleExpenses.push({
        id: exp._id.toString(),
        title: exp.title,
        cardName,
        amount,
        date: dateStr,
        paymentDueDate: dueDateStr,
        isPaid: !(exp.split?.isDebtActive ?? true),
      });
    }

    dueDates.sort();
    const nextPaymentDueDate = dueDates.length > 0 ? dueDates[0] : null;

    return {
      personId: person._id.toString(),
      name: person.name,
      phoneCode: person.phoneCode ?? null,
      phone: person.phone ?? null,
      email: person.email ?? null,
      totalDebt: Math.round(totalDebt * 100) / 100,
      immediateDueAmount: Math.round(immediateDueAmount * 100) / 100,
      nextPaymentDueDate,
      msiInstallments,
      recurringServices,
      singleExpenses,
    };
  }

  async settleDebt(
    userId: string,
    personId: string,
    settleDebtDto: SettleDebtDto,
  ): Promise<SettleDebtResponseDto> {
    const person = await this.findOne(userId, personId);

    let settledAmount = settleDebtDto.amount ?? 0;

    if (settleDebtDto.expenseId) {
      const expense = await this.expensesService.markSplitAsPaid(userId, settleDebtDto.expenseId);
      if (settleDebtDto.amount === undefined && expense.split?.splitAmount) {
        settledAmount = expense.split.splitAmount;
      }
    }

    return {
      success: true,
      message: 'Debt settled successfully',
      personId: person._id.toString(),
      amount: settledAmount,
      settledAt: new Date(),
    };
  }
}
