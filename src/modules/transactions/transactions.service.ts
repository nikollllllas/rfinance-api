import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { addMonths } from 'date-fns';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import {
  PaymentMethod,
  TransactionType,
  type PaymentMethod as PaymentMethodType,
  type TransactionType as TransactionTypeValue,
} from '../../infrastructure/drizzle/schema';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsRepository } from './transactions.repository';

const INSTALLMENT_MIN_SPLIT = 2;
const INSTALLMENT_MAX = 12;

const splitInstallmentAmounts = (amount: number, count: number): number[] => {
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / count);
  const remainder = cents % count;
  return Array.from({ length: count }, (_, idx) =>
    (base + (idx < remainder ? 1 : 0)) / 100,
  );
};

@Injectable()
export class TransactionsService {
  constructor(private readonly transactionsRepository: TransactionsRepository) {}

  async create(user: AuthenticatedUser, dto: CreateTransactionDto) {
    const category = await this.transactionsRepository.findCategoryByIdAndUserId(
      dto.categoryId,
      user.userId,
    );
    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    this.validateInstallments(dto.type, dto.paymentMethod, dto.installmentCount);

    const normalizedPaymentMethod =
      dto.type === TransactionType.GANHO ? null : (dto.paymentMethod ?? null);
    const isInstallmentGroup =
      dto.type === TransactionType.GASTO &&
      normalizedPaymentMethod === PaymentMethod.CREDITO &&
      dto.installmentCount !== undefined &&
      dto.installmentCount >= INSTALLMENT_MIN_SPLIT;

    if (!isInstallmentGroup) {
      const transaction = await this.transactionsRepository.create({
        description: dto.description,
        amount: dto.amount,
        date: new Date(dto.date),
        type: dto.type,
        categoryId: dto.categoryId,
        userId: user.userId,
        notes: dto.notes,
        tag: dto.tag,
        paymentMethod: normalizedPaymentMethod ?? undefined,
      });
      return { transactions: [transaction] };
    }

    const groupId = randomUUID();
    const parcelAmounts = splitInstallmentAmounts(dto.amount, dto.installmentCount!);
    const payload = parcelAmounts.map((parcelAmount, index) => ({
      description: dto.description,
      amount: parcelAmount,
      date: addMonths(new Date(dto.date), index),
      type: dto.type,
      categoryId: dto.categoryId,
      userId: user.userId,
      notes: dto.notes,
      tag: dto.tag,
      paymentMethod: PaymentMethod.CREDITO,
      installmentGroupId: groupId,
      installmentIndex: index + 1,
      installmentCount: dto.installmentCount,
    }));
    const transactions =
      await this.transactionsRepository.createManyInTransaction(payload);
    return { transactions };
  }

  async list(userId: string, month?: string) {
    if (!month) {
      return {
        transactions: await this.transactionsRepository.findManyByUserId(userId),
      };
    }

    this.ensureValidMonth(month);
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));
    return {
      transactions: await this.transactionsRepository.findManyByUserId(userId, {
        gte: startDate,
        lte: endDate,
      }),
    };
  }

  listMonths(userId: string): Promise<string[]> {
    return this.transactionsRepository.listAvailableMonths(userId);
  }

  async getById(id: string, userId: string) {
    const transaction = await this.transactionsRepository.findByIdAndUserId(
      id,
      userId,
    );
    if (!transaction) {
      throw new NotFoundException('Transação não encontrada');
    }
    return transaction;
  }

  async update(id: string, user: AuthenticatedUser, dto: UpdateTransactionDto) {
    await this.getById(id, user.userId);
    if (dto.categoryId) {
      const category = await this.transactionsRepository.findCategoryByIdAndUserId(
        dto.categoryId,
        user.userId,
      );
      if (!category) {
        throw new NotFoundException('Categoria não encontrada');
      }
    }

    this.validateInstallments(dto.type, dto.paymentMethod, dto.installmentCount);

    const payload = {
      ...dto,
      date: dto.date ? new Date(dto.date) : undefined,
      paymentMethod:
        dto.type === TransactionType.GANHO ? null : dto.paymentMethod,
    };
    return this.transactionsRepository.update(id, payload);
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    await this.getById(id, userId);
    await this.transactionsRepository.delete(id);
    return { message: 'Transação apagada com sucesso' };
  }

  private ensureValidMonth(month: string): void {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('Formato de mês inválido (YYYY-MM)');
    }
  }

  private validateInstallments(
    type?: TransactionTypeValue,
    paymentMethod?: PaymentMethodType,
    installmentCount?: number,
  ): void {
    if (installmentCount === undefined) {
      return;
    }
    if (type === TransactionType.GANHO) {
      throw new BadRequestException(
        'Parcelamento só é permitido para pagamento no crédito',
      );
    }
    if (paymentMethod !== PaymentMethod.CREDITO) {
      throw new BadRequestException(
        'Parcelamento só é permitido para pagamento no crédito',
      );
    }
    if (
      installmentCount < INSTALLMENT_MIN_SPLIT ||
      installmentCount > INSTALLMENT_MAX
    ) {
      throw new BadRequestException(
        `Parcelas devem estar entre ${INSTALLMENT_MIN_SPLIT} e ${INSTALLMENT_MAX}`,
      );
    }
  }
}
