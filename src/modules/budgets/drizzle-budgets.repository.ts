import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { DrizzleService } from '../../infrastructure/drizzle/drizzle.service';
import { budgets, categories, DbBudget, DbCategory, transactions } from '../../infrastructure/drizzle/schema';
import { BudgetsRepository } from './budgets.repository';

@Injectable()
export class DrizzleBudgetsRepository extends BudgetsRepository {
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

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<(DbBudget & { category: DbCategory }) | null> {
    const rows = await this.drizzle.db
      .select({ budget: budgets, category: categories })
      .from(budgets)
      .innerJoin(categories, eq(budgets.categoryId, categories.id))
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      ...(row.budget as unknown as DbBudget),
      category: row.category as unknown as DbCategory,
    };
  }

  async findManyByUserId(
    userId: string,
    budgetMonth?: string,
  ): Promise<(DbBudget & { category: DbCategory })[]> {
    const where = budgetMonth
      ? and(eq(budgets.userId, userId), eq(budgets.budgetMonth, budgetMonth))
      : eq(budgets.userId, userId);
    const rows = await this.drizzle.db
      .select({ budget: budgets, category: categories })
      .from(budgets)
      .innerJoin(categories, eq(budgets.categoryId, categories.id))
      .where(where)
      .orderBy(desc(budgets.budgetMonth));
    return rows.map((row) => ({
      ...(row.budget as unknown as DbBudget),
      category: row.category as unknown as DbCategory,
    }));
  }

  async findByUnique(
    userId: string,
    categoryId: string,
    budgetMonth: string,
  ): Promise<DbBudget | null> {
    const rows = await this.drizzle.db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.categoryId, categoryId),
          eq(budgets.budgetMonth, budgetMonth),
        ),
      )
      .limit(1);
    return (rows[0] as unknown as DbBudget) ?? null;
  }

  async create(data: {
    amount: number | string;
    budgetMonth: string;
    categoryId: string;
    userId: string;
  }): Promise<DbBudget> {
    const rows = await this.drizzle.db
      .insert(budgets)
      .values(data as any)
      .returning();
    return rows[0] as unknown as DbBudget;
  }

  async update(
    id: string,
    data: Partial<{
      amount: number | string;
      budgetMonth: string;
      categoryId: string;
    }>,
  ): Promise<DbBudget & { category: DbCategory }> {
    const rows = await this.drizzle.db
      .update(budgets)
      .set({ ...(data as object), updatedAt: new Date() })
      .where(eq(budgets.id, id))
      .returning();
    const updated = rows[0];
    const categoryRows = await this.drizzle.db
      .select()
      .from(categories)
      .where(eq(categories.id, updated.categoryId))
      .limit(1);
    return {
      ...(updated as unknown as DbBudget),
      category: categoryRows[0] as unknown as DbCategory,
    };
  }

  async delete(id: string): Promise<DbBudget> {
    const rows = await this.drizzle.db
      .delete(budgets)
      .where(eq(budgets.id, id))
      .returning();
    return rows[0] as unknown as DbBudget;
  }

  findPreviousMonthBudgets(
    userId: string,
    budgetMonth: string,
  ): Promise<(DbBudget & { category: DbCategory })[]> {
    return this.findManyByUserId(userId, budgetMonth);
  }

  createManyForMonth(
    dataList: Array<{
      amount: number | string;
      budgetMonth: string;
      categoryId: string;
      userId: string;
    }>,
  ): Promise<(DbBudget & { category: DbCategory })[]> {
    return this.drizzle.db.transaction(async (tx) => {
      const out: (DbBudget & { category: DbCategory })[] = [];
      for (const data of dataList) {
        const rows = await tx
          .insert(budgets)
          .values(data as any)
          .returning();
        const inserted = rows[0];
        const categoryRows = await tx
          .select()
          .from(categories)
          .where(eq(categories.id, inserted.categoryId))
          .limit(1);
        out.push({
          ...(inserted as unknown as DbBudget),
          category: categoryRows[0] as unknown as DbCategory,
        });
      }
      return out;
    });
  }

  findExpensesByCategoryInRange(
    userId: string,
    categoryId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.drizzle.db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.categoryId, categoryId),
          eq(transactions.type, 'GASTO'),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
        ),
      );
  }
}
