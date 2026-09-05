import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RecurringService } from './recurring.service';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';
import { AdvanceMsiDto } from './dto/advance-msi.dto';
import { InstantiateRecurringDto } from './dto/instantiate-recurring.dto';
import {
  InstantiateResultDto,
  RecurringResponseDto,
  SplitResponseDto,
} from './dto/recurring-response.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  RecurringCategory,
  RecurringTemplateDocument,
  SplitInfo,
} from './schemas/recurring-template.schema';

@ApiTags('Recurring')
@Auth()
@Controller('recurring')
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new recurring template or interest-free installments (MSI) plan',
  })
  @ApiResponse({
    status: 201,
    description: 'Recurring template created successfully',
    type: RecurringResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error or invalid MSI parameters' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateRecurringDto,
  ): Promise<RecurringResponseDto> {
    const template = await this.recurringService.create(userId, dto);
    return this.toResponse(template);
  }

  @Get()
  @ApiOperation({ summary: 'List all recurring templates for the authenticated user' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Set to true to include deactivated or completed templates',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: RecurringCategory,
    description: 'Filter by category (SERVICE, SUBSCRIPTION, MSI, OTHER_RECURRING)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of recurring templates',
    type: [RecurringResponseDto],
  })
  async findAll(
    @CurrentUser('userId') userId: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('category') category?: RecurringCategory,
  ): Promise<RecurringResponseDto[]> {
    const shouldInclude = includeInactive === 'true' || includeInactive === '1';
    const templates = await this.recurringService.findAllByUser(userId, shouldInclude, category);
    return templates.map((t) => this.toResponse(t));
  }

  @Post('instantiate')
  @ApiOperation({
    summary: 'Instantiate recurring charges and advance MSI installments for a given budget month',
  })
  @ApiResponse({
    status: 200,
    description: 'Generated recurring charges and advanced installments summary',
    type: InstantiateResultDto,
  })
  async instantiate(
    @CurrentUser('userId') userId: string,
    @Body() dto: InstantiateRecurringDto,
  ): Promise<InstantiateResultDto> {
    return this.recurringService.instantiateForMonth(userId, dto.year, dto.month);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a recurring template by ID' })
  @ApiResponse({
    status: 200,
    description: 'Recurring template details',
    type: RecurringResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Recurring template not found' })
  async findOne(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<RecurringResponseDto> {
    const template = await this.recurringService.findOne(userId, id);
    return this.toResponse(template);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing recurring template' })
  @ApiResponse({
    status: 200,
    description: 'Recurring template updated successfully',
    type: RecurringResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Recurring template not found' })
  async update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringDto,
  ): Promise<RecurringResponseDto> {
    const updated = await this.recurringService.update(userId, id, dto);
    return this.toResponse(updated);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a recurring template (soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'Recurring template deactivated successfully',
  })
  @ApiResponse({ status: 404, description: 'Recurring template not found' })
  async remove(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.recurringService.remove(userId, id);
  }

  @Post(':id/advance')
  @ApiOperation({ summary: 'Advance installments or pay off remaining balance of an MSI plan' })
  @ApiResponse({
    status: 200,
    description: 'MSI plan advanced successfully',
    type: RecurringResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Not an MSI plan or already completed' })
  @ApiResponse({ status: 404, description: 'Recurring template not found' })
  async advanceMsi(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: AdvanceMsiDto,
  ): Promise<RecurringResponseDto> {
    const updated = await this.recurringService.advanceMsi(userId, id, dto);
    return this.toResponse(updated);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel/deactivate a recurring template or MSI plan immediately' })
  @ApiResponse({
    status: 200,
    description: 'Recurring template cancelled successfully',
    type: RecurringResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Recurring template not found' })
  async cancel(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<RecurringResponseDto> {
    const updated = await this.recurringService.cancel(userId, id);
    return this.toResponse(updated);
  }

  private toResponse(template: RecurringTemplateDocument): RecurringResponseDto {
    return {
      id: template._id.toString(),
      userId: template.userId.toString(),
      title: template.title,
      category: template.category,
      cardId: template.cardId ? template.cardId.toString() : null,
      amount: template.amount,
      currency: template.currency,
      exchangeRate: template.exchangeRate,
      totalAmount: template.totalAmount ?? null,
      totalInstallments: template.totalInstallments ?? null,
      currentInstallment: template.currentInstallment ?? null,
      startDate: template.startDate ?? null,
      split: this.toSplitResponse(template.split),
      isActive: template.isActive,
      isCompleted: template.isCompleted,
      notes: template.notes ?? null,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
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
