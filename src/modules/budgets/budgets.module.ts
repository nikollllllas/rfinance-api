import { Module } from '@nestjs/common';
import { BudgetsController } from './budgets.controller';
import { BudgetsRepository } from './budgets.repository';
import { BudgetsService } from './budgets.service';
import { DrizzleBudgetsRepository } from './drizzle-budgets.repository';

const budgetsRepositoryProvider = {
  provide: BudgetsRepository,
  useClass: DrizzleBudgetsRepository,
};

@Module({
  controllers: [BudgetsController],
  providers: [budgetsRepositoryProvider, BudgetsService],
  exports: [BudgetsService],
})
export class BudgetsModule {}
