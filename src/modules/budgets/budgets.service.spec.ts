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
});
