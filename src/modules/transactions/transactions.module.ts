import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { TransactionsController } from './transactions.controller';
import { DrizzleTransactionsRepository } from './drizzle-transactions.repository';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsService } from './transactions.service';

const transactionsRepositoryProvider = {
  provide: TransactionsRepository,
  useClass: DrizzleTransactionsRepository,
};

@Module({
  imports: [AttachmentsModule],
  controllers: [TransactionsController],
  providers: [transactionsRepositoryProvider, TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
