import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { DbCategory } from '../../infrastructure/drizzle/schema';
import { CategoriesRepository, CategoryWithUsage } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  list(userId: string): Promise<CategoryWithUsage[]> {
    return this.categoriesRepository.findAllByUserId(userId);
  }

  async getById(id: string, userId: string): Promise<DbCategory> {
    const category = await this.categoriesRepository.findByIdAndUserId(id, userId);
    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }
    return category;
  }

  async create(user: AuthenticatedUser, dto: CreateCategoryDto): Promise<DbCategory> {
    const existing = await this.categoriesRepository.findByNameAndUserId(
      dto.name,
      user.userId,
    );
    if (existing) {
      throw new ConflictException('Uma categoria com este nome já existe');
    }

    return this.categoriesRepository.create({
      name: dto.name,
      color: dto.color,
      icon: dto.icon ?? null,
      type: dto.type ?? null,
      isDefault: dto.isDefault ?? false,
      userId: user.userId,
    });
  }

  async update(
    id: string,
    user: AuthenticatedUser,
    dto: UpdateCategoryDto,
  ): Promise<DbCategory> {
    const existing = await this.getById(id, user.userId);

    const payload: UpdateCategoryDto = { ...dto };
    delete payload.isDefault;

    if (payload.name && payload.name !== existing.name) {
      const categoryWithSameName = await this.categoriesRepository.findByNameAndUserId(
        payload.name,
        user.userId,
      );
      if (categoryWithSameName) {
        throw new ConflictException('Uma categoria com este nome já existe');
      }
    }

    return this.categoriesRepository.update(id, user.userId, payload);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<{ message: string }> {
    await this.getById(id, user.userId);

    const transactionCount =
      await this.categoriesRepository.countTransactionsByCategory(id, user.userId);
    if (transactionCount > 0) {
      throw new ConflictException(
        'Esta categoria tem transações lançadas. Exclua ou mova essas transações para outra categoria antes de excluí-la.',
      );
    }

    const budgetCount = await this.categoriesRepository.countBudgetsByCategory(
      id,
      user.userId,
    );
    if (budgetCount > 0) {
      throw new ConflictException(
        'Esta categoria tem orçamentos. Exclua esses orçamentos antes de excluí-la.',
      );
    }

    await this.categoriesRepository.delete(id, user.userId);
    return { message: 'Categoria excluída com sucesso' };
  }
}
