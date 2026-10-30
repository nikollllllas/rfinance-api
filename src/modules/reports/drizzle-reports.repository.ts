import { Injectable } from '@nestjs/common';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { DrizzleService } from '../../infrastructure/drizzle/drizzle.service';
import { categories, transactions } from '../../infrastructure/drizzle/schema';
import { ReportsRepository, ReportTransactionRow } from './reports.repository';

@Injectable()
export class DrizzleReportsRepository extends ReportsRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  // Uses the existing transactions_userId_date_idx index.
  async findTransactionsInPeriod(
    userId: string,
    start: Date,
    end: Date,
    type?: 'GANHO' | 'GASTO',
  ): Promise<ReportTransactionRow[]> {
    const rows = await this.drizzle.db
      .select({
        transaction: transactions,
        category: { id: categories.id, name: categories.name, color: categories.color },
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, start),
          lte(transactions.date, end),
          type ? eq(transactions.type, type) : undefined,
        ),
      )
      .orderBy(asc(transactions.date), asc(transactions.createdAt));
    return rows.map(({ transaction, category }) => ({ ...transaction, category }));
  }
}
