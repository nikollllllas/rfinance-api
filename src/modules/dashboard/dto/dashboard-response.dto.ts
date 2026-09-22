import { ApiProperty } from '@nestjs/swagger';
import { TransactionResponseDto } from '../../transactions/dto/transaction-response.dto';

export class DashboardStatDto {
  @ApiProperty({ example: 4200.5 })
  amount!: number;

  @ApiProperty({ example: 12.4, description: 'Variação percentual vs. mês anterior' })
  change!: number;
}

export class DashboardSummaryDto {
  @ApiProperty({ type: () => DashboardStatDto })
  income!: DashboardStatDto;

  @ApiProperty({ type: () => DashboardStatDto })
  expenses!: DashboardStatDto;

  @ApiProperty({ type: () => DashboardStatDto })
  savings!: DashboardStatDto;

  @ApiProperty({ example: 1800.25 })
  balance!: number;
}

export class DashboardExpenseByCategoryDto {
  @ApiProperty({ example: 'Alimentação' })
  name!: string;

  @ApiProperty({ example: 540.9 })
  value!: number;

  @ApiProperty({ example: '#22C55E' })
  color!: string;
}

export class DashboardBudgetProgressDto {
  @ApiProperty({ example: 'uuid-budget' })
  id!: string;

  @ApiProperty({ example: 'Alimentação', description: 'Nome da categoria' })
  category!: string;

  @ApiProperty({ example: 320.5 })
  current!: number;

  @ApiProperty({ example: 500 })
  max!: number;

  @ApiProperty({ example: '#22C55E' })
  color!: string;
}

export class DashboardMonthlyDataDto {
  @ApiProperty({ example: 'mar' })
  month!: string;

  @ApiProperty({ example: 4200.5 })
  income!: number;

  @ApiProperty({ example: 2600.25 })
  expenses!: number;

  @ApiProperty({ example: 1600.25 })
  savings!: number;
}

export class DashboardResponseDto {
  @ApiProperty({ type: () => DashboardSummaryDto })
  summary!: DashboardSummaryDto;

  @ApiProperty({ type: () => [DashboardExpenseByCategoryDto] })
  expensesByCategory!: DashboardExpenseByCategoryDto[];

  @ApiProperty({ type: () => [TransactionResponseDto] })
  recentTransactions!: TransactionResponseDto[];

  @ApiProperty({ type: () => [DashboardBudgetProgressDto] })
  budgets!: DashboardBudgetProgressDto[];

  @ApiProperty({ type: () => [DashboardMonthlyDataDto], description: 'Últimos 6 meses' })
  monthlyData!: DashboardMonthlyDataDto[];
}
