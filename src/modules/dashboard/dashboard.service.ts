import { Injectable } from '@nestjs/common';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { DashboardRepository } from './dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async getSummary(userId: string, month?: string) {
    const targetDate = month
      ? new Date(Number(month.split('-')[0]), Number(month.split('-')[1]) - 1, 1)
      : new Date();
    const currentMonthStart = startOfMonth(targetDate);
    const currentMonthEnd = endOfMonth(targetDate);
    const previousMonthStart = startOfMonth(subMonths(targetDate, 1));
    const previousMonthEnd = endOfMonth(subMonths(targetDate, 1));

    const [currentTransactions, previousTransactions] = await Promise.all([
      this.dashboardRepository.findTransactionsByRange(
        userId,
        currentMonthStart,
        currentMonthEnd,
        true,
      ),
      this.dashboardRepository.findTransactionsByRange(
        userId,
        previousMonthStart,
        previousMonthEnd,
      ),
    ]);
    const normalizedCurrentTransactions = currentTransactions.map((tx: any) =>
      tx.transaction ? { ...tx.transaction, category: tx.category } : tx,
    );
    const normalizedPreviousTransactions = previousTransactions.map((tx: any) =>
      tx.transaction ? { ...tx.transaction, category: tx.category } : tx,
    );

    const sumByType = (
      transactions: Array<{ type: string; amount: { toString(): string } }>,
      type: 'GANHO' | 'GASTO',
    ) =>
      transactions
        .filter((tx) => tx.type === type)
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const currentIncome = sumByType(normalizedCurrentTransactions, 'GANHO');
    const currentExpenses = sumByType(normalizedCurrentTransactions, 'GASTO');
    const previousIncome = sumByType(normalizedPreviousTransactions, 'GANHO');
    const previousExpenses = sumByType(normalizedPreviousTransactions, 'GASTO');

    const currentSavings = currentIncome - currentExpenses;
    const previousSavings = previousIncome - previousExpenses;
    const incomeChange =
      previousIncome === 0 ? 100 : ((currentIncome - previousIncome) / previousIncome) * 100;
    const expensesChange =
      previousExpenses === 0 ? 0 : ((currentExpenses - previousExpenses) / previousExpenses) * 100;
    const savingsChange =
      previousSavings === 0
        ? 100
        : ((currentSavings - previousSavings) / Math.abs(previousSavings)) * 100;

    const expensesByCategoryMap = normalizedCurrentTransactions
      .filter((tx) => tx.type === 'GASTO')
      .reduce(
        (
          acc: Record<string, { name: string; value: number; color: string }>,
          tx: { amount: { toString(): string }; category?: { name: string; color: string } },
        ) => {
          if (!tx.category) return acc;
          if (!acc[tx.category.name]) {
            acc[tx.category.name] = { name: tx.category.name, value: 0, color: tx.category.color };
          }
          acc[tx.category.name].value += Number(tx.amount);
          return acc;
        },
        {},
      );

    const recentTransactionsRaw =
      await this.dashboardRepository.findRecentTransactions(userId);
    const recentTransactions = recentTransactionsRaw.map((tx: any) =>
      tx.transaction ? { ...tx.transaction, category: tx.category } : tx,
    );
    const currentMonthString = format(targetDate, 'yyyy-MM');
    const budgetsRaw = await this.dashboardRepository.findBudgetsWithCategory(
      userId,
      currentMonthString,
    );
    const budgets = budgetsRaw.map((budget: any) =>
      budget.budget ? { ...budget.budget, category: budget.category } : budget,
    );
    const budgetsWithProgress = await Promise.all(
      budgets.map(async (budget) => {
        const aggregate = await this.dashboardRepository.aggregateCategoryExpenses(
          userId,
          budget.categoryId,
          currentMonthStart,
          currentMonthEnd,
        );
        const current = Number(aggregate._sum.amount ?? 0);
        return {
          id: budget.id,
          category: budget.category.name,
          current,
          max: Number(budget.amount),
          color: budget.category.color,
        };
      }),
    );

    const monthlyData: Array<{
      month: string;
      income: number;
      expenses: number;
      savings: number;
    }> = [];
    for (let i = 5; i >= 0; i -= 1) {
      const monthDate = subMonths(targetDate, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthTransactions = await this.dashboardRepository.findTransactionsByRange(
        userId,
        monthStart,
        monthEnd,
      );
      const monthIncome = sumByType(monthTransactions, 'GANHO');
      const monthExpenses = sumByType(monthTransactions, 'GASTO');
      monthlyData.push({
        month: format(monthDate, 'MMM'),
        income: monthIncome,
        expenses: monthExpenses,
        savings: monthIncome - monthExpenses,
      });
    }

    return {
      summary: {
        income: { amount: currentIncome, change: incomeChange },
        expenses: { amount: currentExpenses, change: expensesChange },
        savings: { amount: currentSavings, change: savingsChange },
        balance: currentIncome - currentExpenses,
      },
      expensesByCategory: Object.values(expensesByCategoryMap),
      recentTransactions,
      budgets: budgetsWithProgress,
      monthlyData,
    };
  }
}
