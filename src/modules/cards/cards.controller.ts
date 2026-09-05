import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { CardResponseDto } from './dto/card-response.dto';
import { PreviewStatementQueryDto, StatementPreviewResponseDto } from './dto/preview-statement.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccountCardDocument } from './schemas/account-card.schema';

@ApiTags('Cards')
@Auth()
@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new card or account' })
  @ApiResponse({
    status: 201,
    description: 'Card or account created successfully',
    type: CardResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() createCardDto: CreateCardDto,
  ): Promise<CardResponseDto> {
    const card = await this.cardsService.create(userId, createCardDto);
    return this.toResponse(card);
  }

  @Get()
  @ApiOperation({ summary: 'List all cards and accounts for the authenticated user' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Set to true to include deactivated cards',
  })
  @ApiResponse({
    status: 200,
    description: 'List of cards and accounts',
    type: [CardResponseDto],
  })
  async findAll(
    @CurrentUser('userId') userId: string,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<CardResponseDto[]> {
    const shouldInclude = includeInactive === 'true' || includeInactive === '1';
    const cards = await this.cardsService.findAllByUser(userId, shouldInclude);
    return cards.map((c) => this.toResponse(c));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get card or account details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Card details',
    type: CardResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Card or account not found' })
  async findOne(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<CardResponseDto> {
    const card = await this.cardsService.findOne(userId, id);
    return this.toResponse(card);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing card or account' })
  @ApiResponse({
    status: 200,
    description: 'Card updated successfully',
    type: CardResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Card or account not found' })
  async update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() updateCardDto: UpdateCardDto,
  ): Promise<CardResponseDto> {
    const updated = await this.cardsService.update(userId, id, updateCardDto);
    return this.toResponse(updated);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a card or account (soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'Card or account deactivated successfully',
  })
  @ApiResponse({ status: 404, description: 'Card or account not found' })
  async remove(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.cardsService.remove(userId, id);
  }

  @Get(':id/preview-statement')
  @ApiOperation({
    summary: 'Preview statement cutoff date, payment due date and cashflow impact period',
  })
  @ApiResponse({
    status: 200,
    description: 'Statement cycle preview calculations',
    type: StatementPreviewResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Card or account not found' })
  async previewStatement(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Query() query: PreviewStatementQueryDto,
  ): Promise<StatementPreviewResponseDto> {
    return this.cardsService.previewStatement(userId, id, query.date);
  }

  private toResponse(card: AccountCardDocument): CardResponseDto {
    return {
      id: card._id.toString(),
      name: card.name,
      type: card.type,
      cutoffDay: card.cutoffDay,
      paymentDueDay: card.paymentDueDay,
      color: card.color,
      last4Digits: card.last4Digits,
      creditLimit: card.creditLimit,
      isActive: card.isActive,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    };
  }
}
