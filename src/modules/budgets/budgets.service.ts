import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { endOfMonth, startOfMonth } from 'date-fns';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { BudgetsRepository } from './budgets.repository';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { ReplicateBudgetsDto } from './dto/replicate-budgets.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private readonly budgetsRepository: BudgetsRepository) {}

  async create(user: AuthenticatedUser, dto: CreateBudgetDto) {
    this.ensureValidMonth(dto.budgetMonth);
    const category = await this.budgetsRepository.findCategoryByIdAndUserId(
      dto.categoryId,
      user.userId,
    );
    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    const existing = await this.budgetsRepository.findByUnique(
      user.userId,
      dto.categoryId,
      dto.budgetMonth,
    );
    if (existing) {
      throw new ConflictException(
        'Já existe um orçamento para essa categoria neste mês',
      );
    }

    return this.budgetsRepository.create({
      amount: dto.amount,
      budgetMonth: dto.budgetMonth,
      categoryId: dto.categoryId,
      userId: user.userId,
    });
  }

  list(userId: string, month?: string) {
    if (month) {
      this.ensureValidMonth(month);
    }
    return this.budgetsRepository.findManyByUserId(userId, month);
  }

  async getById(id: string, userId: string) {
    const budget = await this.budgetsRepository.findByIdAndUserId(id, userId);
    if (!budget) {
      throw new NotFoundException('Orçamento não encontrado');
    }
    return budget;
  }

  async update(id: string, user: AuthenticatedUser, dto: UpdateBudgetDto) {
    const existing = await this.getById(id, user.userId);
    if (dto.budgetMonth) {
      this.ensureValidMonth(dto.budgetMonth);
    }

    if (dto.categoryId) {
      const category = await this.budgetsRepository.findCategoryByIdAndUserId(
        dto.categoryId,
        user.userId,
      );
      if (!category) {
        throw new NotFoundException('Categoria não encontrada');
      }
    }

    const checkCategoryId = dto.categoryId ?? existing.categoryId;
    const checkMonth = dto.budgetMonth ?? existing.budgetMonth;
    const duplicate = await this.budgetsRepository.findByUnique(
      user.userId,
      checkCategoryId,
      checkMonth,
    );
    if (duplicate && duplicate.id !== existing.id) {
      throw new ConflictException(
        'Já existe um orçamento para essa categoria neste mês',
      );
    }

    return this.budgetsRepository.update(id, dto);
  }

  async remove(id: string, userId: string) {
    await this.getById(id, userId);
    await this.budgetsRepository.delete(id);
    return { message: 'Orçamento apagado com sucesso' };
  }

  async replicate(userId: string, dto: ReplicateBudgetsDto) {
    this.ensureValidMonth(dto.targetMonth);
    const [year, month] = dto.targetMonth.split('-').map(Number);
    const previousDate = new Date(year, month - 2);
    const previousMonth = `${previousDate.getFullYear()}-${String(
      previousDate.getMonth() + 1,
    ).padStart(2, '0')}`;

    const previousBudgets = await this.budgetsRepository.findPreviousMonthBudgets(
      userId,
      previousMonth,
    );
    if (previousBudgets.length === 0) {
      throw new NotFoundException(`Nenhum orçamento encontrado para ${previousMonth}`);
    }

    const currentBudgets = await this.budgetsRepository.findManyByUserId(
      userId,
      dto.targetMonth,
    );
    if (currentBudgets.length > 0) {
      throw new ConflictException(`Já existem orçamentos para ${dto.targetMonth}`);
    }

    const created = await this.budgetsRepository.createManyForMonth(
      previousBudgets.map((budget) => ({
        amount: budget.amount,
        budgetMonth: dto.targetMonth,
        categoryId: budget.categoryId,
        userId,
      })),
    );
    return {
      message: `${created.length} orçamentos replicados com sucesso`,
      budgets: created,
    };
  }

  async getProgress(id: string, userId: string) {
    const budget = await this.getById(id, userId);
    const [year, month] = budget.budgetMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    const transactions = await this.budgetsRepository.findExpensesByCategoryInRange(
      userId,
      budget.categoryId,
      startDate,
      endDate,
    );
    const totalSpent = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const max = Number(budget.amount);
    const percentage = max > 0 ? (totalSpent / max) * 100 : 0;
    return {
      current: totalSpent,
      max,
      percentage: Math.round(percentage * 100) / 100,
      isOverBudget: totalSpent > max,
      budgetMonth: budget.budgetMonth,
      categoryName: budget.category.name,
      categoryColor: budget.category.color,
      startDate,
      endDate,
    };
  }

  private ensureValidMonth(month: string): void {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('Formato de mês inválido (YYYY-MM)');
    }
  }
}
