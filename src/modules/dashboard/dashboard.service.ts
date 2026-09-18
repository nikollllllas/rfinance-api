import { Injectable } from '@nestjs/common';
import { endOfMonth, format, parse, startOfMonth, subMonths } from 'date-fns';
import { DashboardRepository } from './dashboard.repository';

// 0 when both are 0; 100 when there is no baseline but current is positive.
const percentChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
};

@Injectable()
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async getSummary(userId: string, month?: string) {
    const targetDate = month
      ? parse(month, 'yyyy-MM', new Date())
      : new Date();
    const currentMonthStart = startOfMonth(targetDate);
    const currentMonthEnd = endOfMonth(targetDate);

    const [totals, categoryRows] = await Promise.all([
      this.dashboardRepository.monthlyTotals(
        userId,
        startOfMonth(subMonths(targetDate, 5)),
        currentMonthEnd,
      ),
      this.dashboardRepository.expensesByCategory(userId, currentMonthStart, currentMonthEnd),
    ]);
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
    const { income: currentIncome, expenses: currentExpenses } = monthlyData[5];
    const { income: previousIncome, expenses: previousExpenses } = monthlyData[4];

    const currentSavings = currentIncome - currentExpenses;
    const previousSavings = previousIncome - previousExpenses;
    const incomeChange = percentChange(currentIncome, previousIncome);
    const expensesChange = percentChange(currentExpenses, previousExpenses);
    const savingsChange = percentChange(currentSavings, previousSavings);

    const expensesByCategory = categoryRows.map((row) => ({
      name: row.name,
      value: Number(row.total ?? 0),
      color: row.color,
    }));

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

    return {
      summary: {
        income: { amount: currentIncome, change: incomeChange },
        expenses: { amount: currentExpenses, change: expensesChange },
        savings: { amount: currentSavings, change: savingsChange },
        balance: currentIncome - currentExpenses,
      },
      expensesByCategory,
      recentTransactions,
      budgets: budgetsWithProgress,
      monthlyData,
    };
  }
}
