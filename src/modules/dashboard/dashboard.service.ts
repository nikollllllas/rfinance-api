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
    const spentByCategory = new Map(
      (
        await this.dashboardRepository.categoryExpenseTotals(
          userId,
          currentMonthStart,
          currentMonthEnd,
        )
      ).map((row) => [row.categoryId, Number(row.total ?? 0)]),
    );
    const budgetsWithProgress = budgets.map((budget) => ({
      id: budget.id,
      category: budget.category.name,
      current: spentByCategory.get(budget.categoryId) ?? 0,
      max: Number(budget.amount),
      color: budget.category.color,
    }));

    const totals = await this.dashboardRepository.monthlyTotals(
      userId,
      startOfMonth(subMonths(targetDate, 5)),
      currentMonthEnd,
    );
    const monthlyData = Array.from({ length: 6 }, (_, idx) => {
      const monthDate = subMonths(targetDate, 5 - idx);
      const key = format(monthDate, 'yyyy-MM');
      const sum = (type: string) =>
        totals
          .filter((row) => row.month === key && row.type === type)
          .reduce((acc, row) => acc + Number(row.total ?? 0), 0);
      const income = sum('GANHO');
      const expenses = sum('GASTO');
      return { month: format(monthDate, 'MMM'), income, expenses, savings: income - expenses };
    });

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
