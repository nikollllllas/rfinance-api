import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DrizzleService } from '../../infrastructure/drizzle/drizzle.service';
import { budgets, categories, DbCategory, transactions } from '../../infrastructure/drizzle/schema';
import { CategoriesRepository } from './categories.repository';

@Injectable()
export class DrizzleCategoriesRepository extends CategoriesRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  async findAllByUserId(userId: string): Promise<DbCategory[]> {
    const rows = await this.drizzle.db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(categories.name);
    return rows as unknown as DbCategory[];
  }

  async findByIdAndUserId(id: string, userId: string): Promise<DbCategory | null> {
    const rows = await this.drizzle.db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .limit(1);
    return (rows[0] as unknown as DbCategory) ?? null;
  }

  async findByNameAndUserId(name: string, userId: string): Promise<DbCategory | null> {
    const rows = await this.drizzle.db
      .select()
      .from(categories)
      .where(and(eq(categories.name, name), eq(categories.userId, userId)))
      .limit(1);
    return (rows[0] as unknown as DbCategory) ?? null;
  }

  async create(data: {
    name: string;
    color: string;
    icon: string | null;
    type: DbCategory['type'];
    isDefault: boolean;
    userId: string;
  }): Promise<DbCategory> {
    const rows = await this.drizzle.db
      .insert(categories)
      .values(data as any)
      .returning();
    return rows[0] as unknown as DbCategory;
  }

  async update(
    id: string,
    data: Partial<Omit<DbCategory, 'id' | 'userId' | 'createdAt'>>,
  ): Promise<DbCategory> {
    const rows = await this.drizzle.db
      .update(categories)
      .set({ ...(data as object), updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return rows[0] as unknown as DbCategory;
  }

  async delete(id: string): Promise<DbCategory> {
    const rows = await this.drizzle.db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning();
    return rows[0] as unknown as DbCategory;
  }

  async countTransactionsByCategory(
    categoryId: string,
    userId: string,
  ): Promise<number> {
    const rows = await this.drizzle.db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.categoryId, categoryId),
          eq(transactions.userId, userId),
        ),
      );
    return Number(rows[0]?.count ?? 0);
  }

  async countBudgetsByCategory(categoryId: string, userId: string): Promise<number> {
    const rows = await this.drizzle.db
      .select({ count: sql<number>`count(*)` })
      .from(budgets)
      .where(and(eq(budgets.categoryId, categoryId), eq(budgets.userId, userId)));
    return Number(rows[0]?.count ?? 0);
  }
}
