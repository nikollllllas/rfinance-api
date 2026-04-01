import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesRepository } from './categories.repository';
import { CategoriesService } from './categories.service';
import { DrizzleCategoriesRepository } from './drizzle-categories.repository';

const categoriesRepositoryProvider = {
  provide: CategoriesRepository,
  useClass: DrizzleCategoriesRepository,
};

@Module({
  controllers: [CategoriesController],
  providers: [categoriesRepositoryProvider, CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
