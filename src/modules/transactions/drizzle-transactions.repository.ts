import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { DrizzleService } from '../../infrastructure/drizzle/drizzle.service';
import { categories, DbCategory, DbTransaction, transactions } from '../../infrastructure/drizzle/schema';
import { TransactionsRepository } from './transactions.repository';

@Injectable()
export class DrizzleTransactionsRepository extends TransactionsRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  async findCategoryByIdAndUserId(
    categoryId: string,
    userId: string,
  ): Promise<DbCategory | null> {
    const rows = await this.drizzle.db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
      .limit(1);
    return (rows[0] as unknown as DbCategory) ?? null;
  }

  async findManyByUserId(
    userId: string,
    dateRange?: { gte: Date; lte: Date },
  ): Promise<(DbTransaction & { category: DbCategory })[]> {
    const where = dateRange
      ? and(
          eq(transactions.userId, userId),
          gte(transactions.date, dateRange.gte),
          lte(transactions.date, dateRange.lte),
        )
      : eq(transactions.userId, userId);
    const rows = await this.drizzle.db
      .select({ transaction: transactions, category: categories })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(where)
      .orderBy(desc(transactions.date));
    return rows.map((row) => ({
      ...(row.transaction as unknown as DbTransaction),
      category: row.category as unknown as DbCategory,
    }));
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<(DbTransaction & { category: DbCategory }) | null> {
    const rows = await this.drizzle.db
      .select({ transaction: transactions, category: categories })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      ...(row.transaction as unknown as DbTransaction),
      category: row.category as unknown as DbCategory,
    };
  }

  async create(
    data: {
      description: string;
      amount: number | string;
      date: Date;
      type: DbTransaction['type'];
      categoryId: string;
      userId: string;
      notes?: string | null;
      tag?: DbTransaction['tag'];
      paymentMethod?: DbTransaction['paymentMethod'];
      installmentGroupId?: string | null;
      installmentIndex?: number | null;
      installmentCount?: number | null;
    },
  ): Promise<DbTransaction & { category: DbCategory }> {
    const inserted = await this.drizzle.db
      .insert(transactions)
      .values(data as any)
      .returning();
    const created = inserted[0];
    const category = await this.findCategoryByIdAndUserId(
      created.categoryId,
      created.userId,
    );
    return {
      ...(created as unknown as DbTransaction),
      category: category as DbCategory,
    };
  }

  async createManyInTransaction(
    dataList: Array<{
      description: string;
      amount: number | string;
      date: Date;
      type: DbTransaction['type'];
      categoryId: string;
      userId: string;
      notes?: string | null;
      tag?: DbTransaction['tag'];
      paymentMethod?: DbTransaction['paymentMethod'];
      installmentGroupId?: string | null;
      installmentIndex?: number | null;
      installmentCount?: number | null;
    }>,
  ): Promise<(DbTransaction & { category: DbCategory })[]> {
    return this.drizzle.db.transaction(async (tx) => {
      const out: (DbTransaction & { category: DbCategory })[] = [];
      for (const data of dataList) {
        const inserted = await tx
          .insert(transactions)
          .values(data as any)
          .returning();
        const created = inserted[0];
        const category = await tx
          .select()
          .from(categories)
          .where(eq(categories.id, created.categoryId))
          .limit(1);
        out.push({
          ...(created as unknown as DbTransaction),
          category: category[0] as unknown as DbCategory,
        });
      }
      return out;
    });
  }

  async update(
    id: string,
    data: Partial<{
      description: string;
      amount: number | string;
      date: Date;
      type: DbTransaction['type'];
      categoryId: string;
      notes?: string | null;
      tag?: DbTransaction['tag'];
      paymentMethod?: DbTransaction['paymentMethod'];
      installmentGroupId?: string | null;
      installmentIndex?: number | null;
      installmentCount?: number | null;
    }>,
  ): Promise<DbTransaction & { category: DbCategory }> {
    const rows = await this.drizzle.db
      .update(transactions)
      .set({ ...(data as object), updatedAt: new Date() })
      .where(eq(transactions.id, id))
      .returning();
    const updated = rows[0];
    const categoryRows = await this.drizzle.db
      .select()
      .from(categories)
      .where(eq(categories.id, updated.categoryId))
      .limit(1);
    return {
      ...(updated as unknown as DbTransaction),
      category: categoryRows[0] as unknown as DbCategory,
    };
  }

  async delete(id: string): Promise<DbTransaction> {
    const rows = await this.drizzle.db
      .delete(transactions)
      .where(eq(transactions.id, id))
      .returning();
    return rows[0] as unknown as DbTransaction;
  }

  async listAvailableMonths(userId: string): Promise<string[]> {
    const rows = await this.drizzle.db.execute(sql`
      SELECT DISTINCT TO_CHAR(date, 'YYYY-MM') as month
      FROM transactions
      WHERE "userId" = ${userId}::uuid
      ORDER BY month DESC
    `);
    return (rows as any).rows.map((row: { month: string }) => row.month);
  }
}
