import { Injectable } from '@nestjs/common';
import { DbBudget, DbCategory, DbTransaction } from '../../infrastructure/drizzle/schema';

type BudgetWithCategory = DbBudget & { category: DbCategory };
type CreateBudgetInput = {
  amount: number | string;
  budgetMonth: string;
  categoryId: string;
  userId: string;
};
type UpdateBudgetInput = Partial<{
  amount: number | string;
  budgetMonth: string;
  categoryId: string;
}>;

@Injectable()
export class BudgetsRepository {
  findCategoryByIdAndUserId(_categoryId: string, _userId: string): Promise<DbCategory | null> {
    throw new Error('Not implemented');
  }

  findByIdAndUserId(_id: string, _userId: string): Promise<BudgetWithCategory | null> {
    throw new Error('Not implemented');
  }

  findManyByUserId(_userId: string, _budgetMonth?: string): Promise<BudgetWithCategory[]> {
    throw new Error('Not implemented');
  }

  findByUnique(_userId: string, _categoryId: string, _budgetMonth: string): Promise<DbBudget | null> {
    throw new Error('Not implemented');
  }

  create(_data: CreateBudgetInput): Promise<DbBudget> {
    throw new Error('Not implemented');
  }

  update(_id: string, _data: UpdateBudgetInput): Promise<BudgetWithCategory> {
    throw new Error('Not implemented');
  }

  delete(_id: string): Promise<DbBudget> {
    throw new Error('Not implemented');
  }

  findPreviousMonthBudgets(_userId: string, _budgetMonth: string): Promise<BudgetWithCategory[]> {
    throw new Error('Not implemented');
  }

  createManyForMonth(_dataList: CreateBudgetInput[]): Promise<BudgetWithCategory[]> {
    throw new Error('Not implemented');
  }

  findExpensesByCategoryInRange(
    _userId: string,
    _categoryId: string,
    _startDate: Date,
    _endDate: Date,
  ): Promise<DbTransaction[]> {
    throw new Error('Not implemented');
  }
}
