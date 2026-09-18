import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { DrizzleService } from '../../infrastructure/drizzle/drizzle.service';
import { budgets, categories, transactions } from '../../infrastructure/drizzle/schema';
import {
  BudgetWithCategory,
  DashboardRepository,
  TransactionWithCategory,
} from './dashboard.repository';

@Injectable()
export class DrizzleDashboardRepository extends DashboardRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  expensesByCategory(userId: string, start: Date, end: Date) {
    return this.drizzle.db
      .select({
        name: categories.name,
        color: sql<string>`max(${categories.color})`,
        total: sql<string | null>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'GASTO'),
          gte(transactions.date, start),
          lte(transactions.date, end),
        ),
      )
      .groupBy(categories.name);
  }

  monthlyTotals(userId: string, start: Date, end: Date) {
    const month = sql<string>`to_char(date_trunc('month', ${transactions.date}), 'YYYY-MM')`;
    return this.drizzle.db
      .select({
        month,
        type: transactions.type,
        total: sql<string | null>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, start),
          lte(transactions.date, end),
        ),
      )
      .groupBy(month, transactions.type);
  }

  async findRecentTransactions(userId: string): Promise<TransactionWithCategory[]> {
    const rows = await this.drizzle.db
      .select({ transaction: transactions, category: categories })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(5);
    return rows.map(({ transaction, category }) => ({ ...transaction, category }));
  }

  async findBudgetsWithCategory(
    userId: string,
    budgetMonth: string,
  ): Promise<BudgetWithCategory[]> {
    const rows = await this.drizzle.db
      .select({ budget: budgets, category: categories })
      .from(budgets)
      .innerJoin(categories, eq(budgets.categoryId, categories.id))
      .where(and(eq(budgets.userId, userId), eq(budgets.budgetMonth, budgetMonth)));
    return rows.map(({ budget, category }) => ({ ...budget, category }));
  }

  categoryExpenseTotals(userId: string, start: Date, end: Date) {
    return this.drizzle.db
      .select({
        categoryId: transactions.categoryId,
        total: sql<string | null>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'GASTO'),
          gte(transactions.date, start),
          lte(transactions.date, end),
        ),
      )
      .groupBy(transactions.categoryId);
  }
}
