import { Injectable } from '@nestjs/common';
import { categories, transactions } from '../../infrastructure/drizzle/schema';

export type ReportTransactionRow = typeof transactions.$inferSelect & {
  category: Pick<typeof categories.$inferSelect, 'id' | 'name' | 'color'>;
};

@Injectable()
export class ReportsRepository {
  findTransactionsInPeriod(
    _userId: string,
    _start: Date,
    _end: Date,
    _type?: 'GANHO' | 'GASTO',
  ): Promise<ReportTransactionRow[]> {
    throw new Error('Not implemented');
  }
}
