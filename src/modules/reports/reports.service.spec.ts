import { BadRequestException } from '@nestjs/common';
import { ReportsRepository, ReportTransactionRow } from './reports.repository';
import { ReportsService } from './reports.service';

const category = { id: 'c1', name: 'Mercado', color: '#22c55e' };

const row = (
  id: string,
  date: string,
  type: 'GANHO' | 'GASTO',
  amount: string,
): ReportTransactionRow =>
  ({
    id,
    userId: 'u',
    description: `t-${id}`,
    amount,
    date: new Date(`${date}T00:00:00.000Z`),
    notes: null,
    type,
    createdAt: new Date(),
    updatedAt: new Date(),
    categoryId: category.id,
    tag: null,
    paymentMethod: 'PIX',
    installmentGroupId: null,
    installmentIndex: null,
    installmentCount: null,
    category,
  }) as ReportTransactionRow;

function build(rows: ReportTransactionRow[] = []) {
  const repo = { findTransactionsInPeriod: jest.fn().mockResolvedValue(rows) };
  return { service: new ReportsService(repo as unknown as ReportsRepository), repo };
}

describe('ReportsService.getTransactionsReport', () => {
  it('groups transactions by month and includes empty months', async () => {
    const { service } = build([
      row('1', '2026-01-05', 'GASTO', '100.10'),
      row('2', '2026-01-20', 'GANHO', '1000'),
      row('3', '2026-03-31', 'GASTO', '50.20'),
    ]);
    const res = await service.getTransactionsReport('u', '2026-01-01', '2026-03-31');

    expect(res.months.map((m) => m.month)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(res.months[0].totals).toEqual({ income: 1000, expense: 100.1, balance: 899.9, count: 2 });
    expect(res.months[1]).toEqual({
      month: '2026-02',
      totals: { income: 0, expense: 0, balance: 0, count: 0 },
      transactions: [],
    });
    expect(res.months[2].transactions[0]).toMatchObject({ id: '3', date: '2026-03-31', amount: 50.2 });
    expect(res.totals).toEqual({ income: 1000, expense: 150.3, balance: 849.7, count: 3 });
    expect(res.type).toBe('AMBOS');
  });

  it('queries the whole last day and passes the type filter', async () => {
    const { service, repo } = build();
    await service.getTransactionsReport('u', '2026-10-01', '2026-10-31', 'GASTO');
    const [userId, start, end, type] = repo.findTransactionsInPeriod.mock.calls[0];
    expect(userId).toBe('u');
    expect(start.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-31T23:59:59.999Z');
    expect(type).toBe('GASTO');
  });

  it('does not filter by type when AMBOS', async () => {
    const { service, repo } = build();
    await service.getTransactionsReport('u', '2026-10-01', '2026-10-07', 'AMBOS');
    expect(repo.findTransactionsInPeriod.mock.calls[0][3]).toBeUndefined();
  });

  it('accepts a full year and rejects more than 12 months', async () => {
    const { service } = build();
    const year = await service.getTransactionsReport('u', '2026-01-01', '2026-12-31');
    expect(year.months).toHaveLength(12);
    await expect(service.getTransactionsReport('u', '2026-01-01', '2027-01-01')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects inverted periods and non-existent dates', async () => {
    const { service } = build();
    await expect(service.getTransactionsReport('u', '2026-05-10', '2026-05-01')).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.getTransactionsReport('u', '2026-02-31', '2026-03-01')).rejects.toThrow(
      BadRequestException,
    );
  });
});
