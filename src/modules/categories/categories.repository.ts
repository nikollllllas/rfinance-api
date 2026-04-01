import { Injectable } from '@nestjs/common';
import { DbCategory } from '../../infrastructure/drizzle/schema';

type CreateCategoryInput = {
  name: string;
  color: string;
  icon: string | null;
  type: DbCategory['type'];
  isDefault: boolean;
  userId: string;
};
type UpdateCategoryInput = Partial<
  Omit<DbCategory, 'id' | 'userId' | 'createdAt'>
> & {
  updatedAt?: Date;
};

@Injectable()
export class CategoriesRepository {
  findAllByUserId(_userId: string): Promise<DbCategory[]> {
    throw new Error('Not implemented');
  }

  findByIdAndUserId(_id: string, _userId: string): Promise<DbCategory | null> {
    throw new Error('Not implemented');
  }

  findByNameAndUserId(_name: string, _userId: string): Promise<DbCategory | null> {
    throw new Error('Not implemented');
  }

  create(_data: CreateCategoryInput): Promise<DbCategory> {
    throw new Error('Not implemented');
  }

  update(_id: string, _data: UpdateCategoryInput): Promise<DbCategory> {
    throw new Error('Not implemented');
  }

  delete(_id: string): Promise<DbCategory> {
    throw new Error('Not implemented');
  }

  countTransactionsByCategory(_categoryId: string, _userId: string): Promise<number> {
    throw new Error('Not implemented');
  }

  countBudgetsByCategory(_categoryId: string, _userId: string): Promise<number> {
    throw new Error('Not implemented');
  }
}
