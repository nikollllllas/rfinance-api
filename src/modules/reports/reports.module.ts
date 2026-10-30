import { Module } from '@nestjs/common';
import { DrizzleReportsRepository } from './drizzle-reports.repository';
import { ReportsController } from './reports.controller';
import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

const reportsRepositoryProvider = {
  provide: ReportsRepository,
  useClass: DrizzleReportsRepository,
};

@Module({
  controllers: [ReportsController],
  providers: [reportsRepositoryProvider, ReportsService],
})
export class ReportsModule {}
