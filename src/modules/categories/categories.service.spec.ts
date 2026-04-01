import {
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../../common/enums/role.enum';
import { CategoriesRepository } from './categories.repository';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: CategoriesRepository;

  const adminUser = {
    userId: 'admin-user',
    email: 'admin@rfinance.local',
    role: Role.ADMIN,
    permissions: [],
  };

  const regularUser = {
    userId: 'regular-user',
    email: 'user@rfinance.local',
    role: Role.USER,
    permissions: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: CategoriesRepository,
          useValue: {
            findAllByUserId: jest.fn(),
            findByIdAndUserId: jest.fn(),
            findByNameAndUserId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            countTransactionsByCategory: jest.fn(),
            countBudgetsByCategory: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    repository = module.get<CategoriesRepository>(CategoriesRepository);
  });

  it('deve retornar conflito (409) ao criar categoria duplicada', async () => {
    (repository.findByNameAndUserId as jest.Mock).mockResolvedValue({
      id: 'category-id',
    });

    await expect(
      service.create(adminUser, {
        name: 'Alimentação',
        color: '#22C55E',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deve negar criação para role sem permissão', async () => {
    await expect(
      service.create(regularUser, {
        name: 'Alimentação',
        color: '#22C55E',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
