import { Injectable } from '@nestjs/common';
import { DbCategory, DbTransaction } from '../../infrastructure/drizzle/schema';

type TransactionWithCategory = DbTransaction & { category: DbCategory };
type CreateTransactionInput = {
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
};
type UpdateTransactionInput = Partial<CreateTransactionInput>;

@Injectable()
export class TransactionsRepository {
  findCategoryByIdAndUserId(_categoryId: string, _userId: string): Promise<DbCategory | null> {
    throw new Error('Not implemented');
  }

  findManyByUserId(
    userId: string,
    dateRange?: { gte: Date; lte: Date },
  ): Promise<TransactionWithCategory[]> {
    throw new Error('Not implemented');
  }

  findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<TransactionWithCategory | null> {
    throw new Error('Not implemented');
  }

  create(_data: CreateTransactionInput): Promise<TransactionWithCategory> {
    throw new Error('Not implemented');
  }

  createManyInTransaction(
    _dataList: CreateTransactionInput[],
  ): Promise<TransactionWithCategory[]> {
    throw new Error('Not implemented');
  }

  update(_id: string, _data: UpdateTransactionInput): Promise<TransactionWithCategory> {
    throw new Error('Not implemented');
  }

  delete(_id: string): Promise<DbTransaction> {
    throw new Error('Not implemented');
  }

  listAvailableMonths(_userId: string): Promise<string[]> {
    throw new Error('Not implemented');
  }
}
