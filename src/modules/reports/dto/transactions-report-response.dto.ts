import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PaymentMethod,
  TransactionTag,
  TransactionType,
} from '../../../infrastructure/drizzle/schema';
import { REPORT_TYPES, type ReportType } from './transactions-report-query.dto';

export class ReportTotalsDto {
  @ApiProperty({ example: 5200 })
  income!: number;

  @ApiProperty({ example: 3150.4 })
  expense!: number;

  @ApiProperty({ example: 2049.6, description: 'income - expense' })
  balance!: number;

  @ApiProperty({ example: 42 })
  count!: number;
}

export class ReportCategoryDto {
  @ApiProperty({ example: 'uuid-category' })
  id!: string;

  @ApiProperty({ example: 'Alimentação' })
  name!: string;

  @ApiProperty({ example: '#22c55e' })
  color!: string;
}

export class ReportTransactionDto {
  @ApiProperty({ example: 'uuid-transaction' })
  id!: string;

  @ApiProperty({ example: '2026-01-05', description: 'YYYY-MM-DD' })
  date!: string;

  @ApiProperty({ example: 'Supermercado' })
  description!: string;

  @ApiProperty({ enum: TransactionType, example: 'GASTO' })
  type!: TransactionType;

  @ApiProperty({ example: 145.9 })
  amount!: number;

  @ApiProperty({ type: () => ReportCategoryDto })
  category!: ReportCategoryDto;

  @ApiPropertyOptional({ enum: PaymentMethod, nullable: true })
  paymentMethod!: PaymentMethod | null;

  @ApiPropertyOptional({ enum: TransactionTag, nullable: true })
  tag!: TransactionTag | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  notes!: string | null;
}

export class ReportMonthDto {
  @ApiProperty({ example: '2026-01', description: 'YYYY-MM' })
  month!: string;

  @ApiProperty({ type: () => ReportTotalsDto })
  totals!: ReportTotalsDto;

  @ApiProperty({ type: () => [ReportTransactionDto] })
  transactions!: ReportTransactionDto[];
}

export class ReportPeriodDto {
  @ApiProperty({ example: '2026-01-01' })
  from!: string;

  @ApiProperty({ example: '2026-12-31' })
  to!: string;
}

export class TransactionsReportResponseDto {
  @ApiProperty({ type: () => ReportPeriodDto })
  period!: ReportPeriodDto;

  @ApiProperty({ enum: REPORT_TYPES, example: 'AMBOS' })
  type!: ReportType;

  @ApiProperty({ type: () => ReportTotalsDto })
  totals!: ReportTotalsDto;

  @ApiProperty({
    type: () => [ReportMonthDto],
    description: 'Um item por mês do período, em ordem, inclusive meses sem transações',
  })
  months!: ReportMonthDto[];
}
