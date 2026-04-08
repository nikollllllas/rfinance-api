import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { DbCategory } from '../../infrastructure/drizzle/schema';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  list(userId: string): Promise<DbCategory[]> {
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
    if (existing.isDefault) {
      delete payload.name;
      delete payload.type;
      delete payload.isDefault;
    }

    if (payload.name && payload.name !== existing.name) {
      const categoryWithSameName = await this.categoriesRepository.findByNameAndUserId(
        payload.name,
        user.userId,
      );
      if (categoryWithSameName) {
        throw new ConflictException('Uma categoria com este nome já existe');
      }
    }

    return this.categoriesRepository.update(id, payload);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<{ message: string }> {
    const existing = await this.getById(id, user.userId);

    if (existing.isDefault) {
      throw new ForbiddenException(
        'Não é possível excluir uma categoria padrão',
      );
    }

    const transactionCount =
      await this.categoriesRepository.countTransactionsByCategory(id, user.userId);
    if (transactionCount > 0) {
      throw new ConflictException(
        'Não é possível excluir uma categoria que possui transações. Reatribua ou exclua as transações primeiro.',
      );
    }

    const budgetCount = await this.categoriesRepository.countBudgetsByCategory(
      id,
      user.userId,
    );
    if (budgetCount > 0) {
      throw new ConflictException(
        'Não é possível excluir uma categoria que possui orçamentos. Reatribua ou exclua os orçamentos primeiro.',
      );
    }

    await this.categoriesRepository.delete(id);
    return { message: 'Categoria excluída com sucesso' };
  }
}
