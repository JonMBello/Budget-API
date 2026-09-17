import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PeopleService } from './people.service';
import { DebtSummaryV2ResponseDto } from './dto/debt-summary-v2.dto';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('People')
@Auth()
@Controller('v2/people')
export class PeopleV2Controller {
  constructor(private readonly peopleService: PeopleService) {}

  @Get(':id/debts')
  @ApiOperation({
    summary:
      'Get aggregated debt summary for a person grouped by period (MSI, recurring, single expenses)',
    description:
      'Returns the total outstanding debt across all concepts and a breakdown of debts grouped by budget period (e.g. September, October), including informative projections of future MSI installments.',
  })
  @ApiResponse({
    status: 200,
    description: 'Aggregated debt summary and breakdown by period',
    type: DebtSummaryV2ResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Person not found' })
  async getDebtsSummaryV2(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<DebtSummaryV2ResponseDto> {
    return this.peopleService.getDebtsSummaryV2(userId, id);
  }
}
