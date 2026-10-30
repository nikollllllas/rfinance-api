import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { TransactionsReportQueryDto } from './dto/transactions-report-query.dto';
import { TransactionsReportResponseDto } from './dto/transactions-report-response.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('transactions')
  @ApiOkResponse({ type: TransactionsReportResponseDto })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({
    status: 400,
    description: 'Datas inválidas, período invertido ou maior que 12 meses',
  })
  getTransactionsReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TransactionsReportQueryDto,
  ): Promise<TransactionsReportResponseDto> {
    return this.reportsService.getTransactionsReport(
      user.userId,
      query.from,
      query.to,
      query.type,
    );
  }
}
