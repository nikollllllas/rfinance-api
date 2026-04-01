import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOkResponse({
    schema: {
      example: {
        summary: {
          income: { amount: 0, change: 0 },
          expenses: { amount: 0, change: 0 },
          savings: { amount: 0, change: 0 },
          balance: 0,
        },
        expensesByCategory: [],
        recentTransactions: [],
        budgets: [],
        monthlyData: [],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 400, description: 'Formato de mês inválido (YYYY-MM)' })
  getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardQueryDto,
  ): Promise<Record<string, unknown>> {
    return this.dashboardService.getSummary(user.userId, query.month);
  }
}
