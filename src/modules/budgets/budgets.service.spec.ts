import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../../common/enums/role.enum';
import { BudgetsRepository } from './budgets.repository';
import { BudgetsService } from './budgets.service';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let repository: BudgetsRepository;

  const authUser = {
    userId: 'user-1',
    email: 'user@rfinance.local',
    role: Role.USER,
    permissions: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        {
          provide: BudgetsRepository,
          useValue: {
            findCategoryByIdAndUserId: jest.fn(),
            findByIdAndUserId: jest.fn(),
            findManyByUserId: jest.fn(),
            findByUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findPreviousMonthBudgets: jest.fn(),
            createManyForMonth: jest.fn(),
            findExpensesByCategoryInRange: jest.fn(),
            countTransactionsByCategoryInRange: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
    repository = module.get<BudgetsRepository>(BudgetsRepository);
  });

  it('deve falhar com conflito em duplicidade de orçamento', async () => {
    (repository.findCategoryByIdAndUserId as jest.Mock).mockResolvedValue({ id: 'cat-1' });
    (repository.findByUnique as jest.Mock).mockResolvedValue({ id: 'budget-1' });

    await expect(
      service.create(authUser, {
        amount: 100,
        budgetMonth: '2026-03',
        categoryId: '00000000-0000-4000-8000-000000000001',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deve validar formato de mês', async () => {
    expect(() => service.list('user-1', '2026/03')).toThrow(BadRequestException);
  });

  it('deve respeitar scoping por userId ao buscar orçamento por id', async () => {
    (repository.findByIdAndUserId as jest.Mock).mockResolvedValue(null);

    await expect(service.getById('budget-1', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.findByIdAndUserId).toHaveBeenCalledWith('budget-1', 'user-1');
  });

  it('deve repassar o userId para o repository.update', async () => {
    const existing = { id: 'budget-1', categoryId: 'cat-1', budgetMonth: '2026-03' };
    (repository.findByIdAndUserId as jest.Mock).mockResolvedValue(existing);
    (repository.findByUnique as jest.Mock).mockResolvedValue(null);
    (repository.update as jest.Mock).mockResolvedValue(existing);

    await service.update('budget-1', authUser, { amount: 200 });

    expect(repository.update).toHaveBeenCalledWith(
      'budget-1',
      'user-1',
      expect.any(Object),
    );
  });

  it('deve repassar o userId para o repository.delete', async () => {
    (repository.findByIdAndUserId as jest.Mock).mockResolvedValue({
      id: 'budget-1',
      categoryId: 'cat-1',
      budgetMonth: '2026-03',
    });
    (repository.countTransactionsByCategoryInRange as jest.Mock).mockResolvedValue(0);
    (repository.delete as jest.Mock).mockResolvedValue({ id: 'budget-1' });

    await service.remove('budget-1', 'user-1');

    expect(repository.countTransactionsByCategoryInRange).toHaveBeenCalledWith(
      'user-1',
      'cat-1',
      new Date(2026, 2, 1),
      expect.any(Date),
    );
    expect(repository.delete).toHaveBeenCalledWith('budget-1', 'user-1');
  });

  it('deve bloquear (409) exclusão de orçamento com transações no mês', async () => {
    (repository.findByIdAndUserId as jest.Mock).mockResolvedValue({
      id: 'budget-1',
      categoryId: 'cat-1',
      budgetMonth: '2026-03',
    });
    (repository.countTransactionsByCategoryInRange as jest.Mock).mockResolvedValue(3);

    await expect(service.remove('budget-1', 'user-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
