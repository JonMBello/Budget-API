import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PeopleService } from './people.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PersonResponseDto } from './dto/person-response.dto';
import { DebtSummaryResponseDto } from './dto/debt-summary.dto';
import { SettleDebtDto, SettleDebtResponseDto } from './dto/settle-debt.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PersonDocument } from './schemas/person.schema';

@ApiTags('People')
@Auth()
@Controller('people')
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new person in the directory' })
  @ApiResponse({
    status: 201,
    description: 'Person created successfully',
    type: PersonResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() createPersonDto: CreatePersonDto,
  ): Promise<PersonResponseDto> {
    const person = await this.peopleService.create(userId, createPersonDto);
    return this.toResponse(person);
  }

  @Get()
  @ApiOperation({ summary: 'List all people for the authenticated user' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Set to true to include deactivated people',
  })
  @ApiResponse({
    status: 200,
    description: 'List of people in directory',
    type: [PersonResponseDto],
  })
  async findAll(
    @CurrentUser('userId') userId: string,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<PersonResponseDto[]> {
    const shouldInclude = includeInactive === 'true' || includeInactive === '1';
    const people = await this.peopleService.findAllByUser(userId, shouldInclude);
    return people.map((p) => this.toResponse(p));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get person details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Person details',
    type: PersonResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Person not found' })
  async findOne(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<PersonResponseDto> {
    const person = await this.peopleService.findOne(userId, id);
    return this.toResponse(person);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing person in the directory' })
  @ApiResponse({
    status: 200,
    description: 'Person updated successfully',
    type: PersonResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Person not found' })
  async update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() updatePersonDto: UpdatePersonDto,
  ): Promise<PersonResponseDto> {
    const updated = await this.peopleService.update(userId, id, updatePersonDto);
    return this.toResponse(updated);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a person (soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'Person deactivated successfully',
  })
  @ApiResponse({ status: 404, description: 'Person not found' })
  async remove(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.peopleService.remove(userId, id);
  }

  @Get(':id/debts')
  @ApiOperation({
    summary:
      'Get aggregated debt summary for a person (MSI, recurring services, and single expenses)',
  })
  @ApiResponse({
    status: 200,
    description: 'Aggregated debt summary and breakdown',
    type: DebtSummaryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Person not found' })
  async getDebtsSummary(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<DebtSummaryResponseDto> {
    return this.peopleService.getDebtsSummary(userId, id);
  }

  @Post(':id/settle')
  @ApiOperation({
    summary: 'Record a debt settlement or payment from a person',
  })
  @ApiResponse({
    status: 200,
    description: 'Debt settled successfully',
    type: SettleDebtResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Person not found' })
  async settleDebt(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() settleDebtDto: SettleDebtDto,
  ): Promise<SettleDebtResponseDto> {
    return this.peopleService.settleDebt(userId, id, settleDebtDto);
  }

  private toResponse(person: PersonDocument): PersonResponseDto {
    return {
      id: person._id.toString(),
      name: person.name,
      phoneCode: person.phoneCode ?? null,
      phone: person.phone ?? null,
      email: person.email ?? null,
      notes: person.notes ?? null,
      isActive: person.isActive,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    };
  }
}
