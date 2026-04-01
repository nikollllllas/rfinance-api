import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardRepository } from './dashboard.repository';
import { DashboardService } from './dashboard.service';
import { DrizzleDashboardRepository } from './drizzle-dashboard.repository';

const dashboardRepositoryProvider = {
  provide: DashboardRepository,
  useClass: DrizzleDashboardRepository,
};

@Module({
  controllers: [DashboardController],
  providers: [dashboardRepositoryProvider, DashboardService],
})
export class DashboardModule {}
