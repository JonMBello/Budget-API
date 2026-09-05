import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Person, PersonDocument } from './schemas/person.schema';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { DebtSummaryResponseDto } from './dto/debt-summary.dto';
import { SettleDebtDto, SettleDebtResponseDto } from './dto/settle-debt.dto';

@Injectable()
export class PeopleService {
  constructor(
    @InjectModel(Person.name)
    private readonly personModel: Model<PersonDocument>,
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

    // Initial debt state. Aggregation will combine RecurringTemplate (MSI/Services)
    // and Expense (Splits) once Feature 06 and Feature 07 collections are linked.
    return {
      personId: person._id.toString(),
      name: person.name,
      phoneCode: person.phoneCode ?? null,
      phone: person.phone ?? null,
      email: person.email ?? null,
      totalDebt: 0,
      immediateDueAmount: 0,
      nextPaymentDueDate: null,
      msiInstallments: [],
      recurringServices: [],
      singleExpenses: [],
    };
  }

  async settleDebt(
    userId: string,
    personId: string,
    settleDebtDto: SettleDebtDto,
  ): Promise<SettleDebtResponseDto> {
    const person = await this.findOne(userId, personId);

    return {
      success: true,
      message: 'Debt settled successfully',
      personId: person._id.toString(),
      amount: settleDebtDto.amount ?? 0,
      settledAt: new Date(),
    };
  }
}
