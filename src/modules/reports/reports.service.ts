import { BadRequestException, Injectable } from '@nestjs/common';
import { ReportType } from './dto/transactions-report-query.dto';
import {
  ReportMonthDto,
  ReportTotalsDto,
  TransactionsReportResponseDto,
} from './dto/transactions-report-response.dto';
import { ReportsRepository, ReportTransactionRow } from './reports.repository';

export const MAX_REPORT_MONTHS = 12;

// Transaction dates are stored as UTC timestamps (see TransactionsService.list),
// so period bounds and month keys are computed in UTC as well.
const parseDay = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new BadRequestException(`Data inexistente: ${value}`);
  }
  return date;
};

const monthKey = (date: Date) => date.toISOString().slice(0, 7);

const monthsBetween = (start: Date, end: Date): string[] => {
  const keys: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor <= end) {
    keys.push(monthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
};

const round = (value: number) => Math.round(value * 100) / 100;

const totalsOf = (rows: ReportTransactionRow[]): ReportTotalsDto => {
  let income = 0;
  let expense = 0;
  for (const row of rows) {
    const amount = Number(row.amount);
    if (row.type === 'GANHO') income += amount;
    else expense += amount;
  }
  return {
    income: round(income),
    expense: round(expense),
    balance: round(income - expense),
    count: rows.length,
  };
};

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async getTransactionsReport(
    userId: string,
    from: string,
    to: string,
    type: ReportType = 'AMBOS',
  ): Promise<TransactionsReportResponseDto> {
    const start = parseDay(from);
    const toDay = parseDay(to);
    if (start > toDay) {
      throw new BadRequestException('A data inicial deve ser anterior ou igual à data final');
    }
    const end = new Date(toDay.getTime() + 24 * 60 * 60 * 1000 - 1);
    const monthKeys = monthsBetween(start, end);
    if (monthKeys.length > MAX_REPORT_MONTHS) {
      throw new BadRequestException(`O período pode ter no máximo ${MAX_REPORT_MONTHS} meses`);
    }

    const rows = await this.reportsRepository.findTransactionsInPeriod(
      userId,
      start,
      end,
      type === 'AMBOS' ? undefined : type,
    );

    const byMonth = new Map<string, ReportTransactionRow[]>(monthKeys.map((key) => [key, []]));
    for (const row of rows) {
      byMonth.get(monthKey(row.date))?.push(row);
    }

    const months: ReportMonthDto[] = monthKeys.map((key) => {
      const monthRows = byMonth.get(key) ?? [];
      return {
        month: key,
        totals: totalsOf(monthRows),
        transactions: monthRows.map((row) => ({
          id: row.id,
          date: row.date.toISOString().slice(0, 10),
          description: row.description,
          type: row.type,
          amount: Number(row.amount),
          category: row.category,
          paymentMethod: row.paymentMethod ?? null,
          tag: row.tag ?? null,
          notes: row.notes ?? null,
        })),
      };
    });

    return {
      period: { from, to },
      type,
      totals: totalsOf(rows),
      months,
    };
  }
}
