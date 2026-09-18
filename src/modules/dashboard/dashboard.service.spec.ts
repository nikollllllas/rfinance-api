import { format, subMonths } from 'date-fns';
import { DashboardRepository } from './dashboard.repository';
import { DashboardService } from './dashboard.service';

const key = (offset: number) => format(subMonths(new Date(), offset), 'yyyy-MM');

function build(overrides: Partial<Record<keyof DashboardRepository, unknown>> = {}) {
  const repo = {
    monthlyTotals: jest.fn().mockResolvedValue([]),
    expensesByCategory: jest.fn().mockResolvedValue([]),
    findRecentTransactions: jest.fn().mockResolvedValue([]),
    findBudgetsWithCategory: jest.fn().mockResolvedValue([]),
    categoryExpenseTotals: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
  return new DashboardService(repo as unknown as DashboardRepository);
}

describe('DashboardService.getSummary', () => {
  it('returns 0 change when both periods are empty', async () => {
    const { summary } = await build().getSummary('u');
    expect(summary.income.change).toBe(0);
    expect(summary.expenses.change).toBe(0);
    expect(summary.savings.change).toBe(0);
  });

  it('returns 100 change when previous is 0 and current > 0', async () => {
    const service = build({
      monthlyTotals: jest.fn().mockResolvedValue([
        { month: key(0), type: 'GANHO', total: '100.00' },
        { month: key(0), type: 'GASTO', total: '40.00' },
      ]),
    });
    const { summary } = await service.getSummary('u');
    expect(summary.income).toEqual({ amount: 100, change: 100 });
    expect(summary.expenses).toEqual({ amount: 40, change: 100 });
    expect(summary.savings).toEqual({ amount: 60, change: 100 });
    expect(summary.balance).toBe(60);
  });

  it('computes regular percentage against previous month', async () => {
    const service = build({
      monthlyTotals: jest.fn().mockResolvedValue([
        { month: key(1), type: 'GANHO', total: '100' },
        { month: key(0), type: 'GANHO', total: '150' },
      ]),
    });
    expect((await service.getSummary('u')).summary.income.change).toBe(50);
  });

  it('returns 6 monthly entries and the expected response keys', async () => {
    const res = await build().getSummary('u', '2026-03');
    expect(res.monthlyData).toHaveLength(6);
    expect(res.monthlyData.map((m) => m.month)).toEqual([
      'Oct',
      'Nov',
      'Dec',
      'Jan',
      'Feb',
      'Mar',
    ]);
    expect(Object.keys(res).sort()).toEqual([
      'budgets',
      'expensesByCategory',
      'monthlyData',
      'recentTransactions',
      'summary',
    ]);
    expect(Object.keys(res.summary).sort()).toEqual(['balance', 'expenses', 'income', 'savings']);
  });

  it('passes recentTransactions through and builds budget progress', async () => {
    const recent = [{ id: 't1', category: { name: 'Food' } }];
    const service = build({
      findRecentTransactions: jest.fn().mockResolvedValue(recent),
      findBudgetsWithCategory: jest.fn().mockResolvedValue([
        { id: 'b1', categoryId: 'c1', amount: '200.00', category: { name: 'Food', color: '#f00' } },
      ]),
      categoryExpenseTotals: jest.fn().mockResolvedValue([{ categoryId: 'c1', total: '50.5' }]),
    });
    const res = await service.getSummary('u');
    expect(res.recentTransactions).toBe(recent);
    expect(res.budgets).toEqual([
      { id: 'b1', category: 'Food', current: 50.5, max: 200, color: '#f00' },
    ]);
  });
});
