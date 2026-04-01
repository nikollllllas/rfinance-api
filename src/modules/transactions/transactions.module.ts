import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { DrizzleTransactionsRepository } from './drizzle-transactions.repository';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsService } from './transactions.service';

const transactionsRepositoryProvider = {
  provide: TransactionsRepository,
  useClass: DrizzleTransactionsRepository,
};

@Module({
  controllers: [TransactionsController],
  providers: [transactionsRepositoryProvider, TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
