import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches } from 'class-validator';

export const REPORT_TYPES = ['GANHO', 'GASTO', 'AMBOS'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const DATE_MESSAGE = 'Formato de data inválido (YYYY-MM-DD)';

export class TransactionsReportQueryDto {
  @ApiProperty({ example: '2026-01-01', description: 'Data inicial (YYYY-MM-DD), inclusiva' })
  @Matches(DATE_REGEX, { message: DATE_MESSAGE })
  from!: string;

  @ApiProperty({ example: '2026-12-31', description: 'Data final (YYYY-MM-DD), inclusiva' })
  @Matches(DATE_REGEX, { message: DATE_MESSAGE })
  to!: string;

  @ApiPropertyOptional({
    enum: REPORT_TYPES,
    default: 'AMBOS',
    description: 'GANHO = só entradas, GASTO = só saídas, AMBOS = entradas e saídas',
  })
  @IsOptional()
  @IsIn(REPORT_TYPES, { message: 'Tipo inválido (GANHO, GASTO ou AMBOS)' })
  type?: ReportType;
}
