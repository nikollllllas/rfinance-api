import { Injectable } from '@nestjs/common';
import { budgets, categories, transactions } from '../../infrastructure/drizzle/schema';

export type Category = typeof categories.$inferSelect;
export type TransactionWithCategory = typeof transactions.$inferSelect & { category: Category };
export type BudgetWithCategory = typeof budgets.$inferSelect & { category: Category };

@Injectable()
export class DashboardRepository {
  expensesByCategory(
    _userId: string,
    _start: Date,
    _end: Date,
  ): Promise<Array<{ name: string; color: string; total: string | null }>> {
    throw new Error('Not implemented');
  }

  monthlyTotals(
    _userId: string,
    _start: Date,
    _end: Date,
  ): Promise<Array<{ month: string; type: string; total: string | null }>> {
    throw new Error('Not implemented');
  }

  findRecentTransactions(_userId: string): Promise<TransactionWithCategory[]> {
    throw new Error('Not implemented');
  }

  findBudgetsWithCategory(_userId: string, _budgetMonth: string): Promise<BudgetWithCategory[]> {
    throw new Error('Not implemented');
  }

  categoryExpenseTotals(
    _userId: string,
    _start: Date,
    _end: Date,
  ): Promise<Array<{ categoryId: string; total: string | null }>> {
    throw new Error('Not implemented');
  }
}
