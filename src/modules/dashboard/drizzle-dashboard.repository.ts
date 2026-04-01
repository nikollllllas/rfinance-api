import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { DrizzleService } from '../../infrastructure/drizzle/drizzle.service';
import { budgets, categories, transactions } from '../../infrastructure/drizzle/schema';
import { DashboardRepository } from './dashboard.repository';

@Injectable()
export class DrizzleDashboardRepository extends DashboardRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  findTransactionsByRange(
    userId: string,
    start: Date,
    end: Date,
    includeCategory = false,
  ) {
    if (!includeCategory) {
      return this.drizzle.db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            gte(transactions.date, start),
            lte(transactions.date, end),
          ),
        );
    }
    return this.drizzle.db
      .select({ transaction: transactions, category: categories })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, start),
          lte(transactions.date, end),
        ),
      );
  }

  findRecentTransactions(userId: string) {
    return this.drizzle.db
      .select({ transaction: transactions, category: categories })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date))
      .limit(5);
  }

  findBudgetsWithCategory(userId: string, budgetMonth: string) {
    return this.drizzle.db
      .select({ budget: budgets, category: categories })
      .from(budgets)
      .innerJoin(categories, eq(budgets.categoryId, categories.id))
      .where(and(eq(budgets.userId, userId), eq(budgets.budgetMonth, budgetMonth)));
  }

  async aggregateCategoryExpenses(
    userId: string,
    categoryId: string,
    start: Date,
    end: Date,
  ) {
    const rows = await this.drizzle.db
      .select({
        amount: sql<string | null>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.categoryId, categoryId),
          eq(transactions.type, 'GASTO'),
          gte(transactions.date, start),
          lte(transactions.date, end),
        ),
      );
    return { _sum: { amount: rows[0]?.amount ?? null } };
  }
}
