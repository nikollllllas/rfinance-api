import { Injectable } from '@nestjs/common';

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

  findRecentTransactions(_userId: string): Promise<any[]> {
    throw new Error('Not implemented');
  }

  findBudgetsWithCategory(_userId: string, _budgetMonth: string): Promise<any[]> {
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
