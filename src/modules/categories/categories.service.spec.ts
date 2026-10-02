import { ConflictException } from '@nestjs/common';
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

  it('deve permitir criação para usuário comum', async () => {
    (repository.findByNameAndUserId as jest.Mock).mockResolvedValue(null);
    (repository.create as jest.Mock).mockResolvedValue({ id: 'category-id' });

    await expect(
      service.create(regularUser, {
        name: 'Alimentação',
        color: '#22C55E',
      }),
    ).resolves.toEqual({ id: 'category-id' });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: regularUser.userId }),
    );
  });

  it('deve repassar o userId para o repository.update', async () => {
    (repository.findByIdAndUserId as jest.Mock).mockResolvedValue({
      id: 'category-id',
      isDefault: false,
      name: 'Alimentação',
    });
    (repository.update as jest.Mock).mockResolvedValue({ id: 'category-id' });

    await service.update('category-id', regularUser, { color: '#000000' });

    expect(repository.update).toHaveBeenCalledWith(
      'category-id',
      regularUser.userId,
      expect.any(Object),
    );
  });

  it('deve repassar o userId para o repository.delete', async () => {
    (repository.findByIdAndUserId as jest.Mock).mockResolvedValue({
      id: 'category-id',
      isDefault: false,
    });
    (repository.countTransactionsByCategory as jest.Mock).mockResolvedValue(0);
    (repository.countBudgetsByCategory as jest.Mock).mockResolvedValue(0);
    (repository.delete as jest.Mock).mockResolvedValue({ id: 'category-id' });

    await service.remove('category-id', regularUser);

    expect(repository.delete).toHaveBeenCalledWith('category-id', regularUser.userId);
  });

  it('deve permitir excluir categoria padrão sem lançamentos', async () => {
    (repository.findByIdAndUserId as jest.Mock).mockResolvedValue({
      id: 'category-id',
      isDefault: true,
    });
    (repository.countTransactionsByCategory as jest.Mock).mockResolvedValue(0);
    (repository.countBudgetsByCategory as jest.Mock).mockResolvedValue(0);
    (repository.delete as jest.Mock).mockResolvedValue({ id: 'category-id' });

    await service.remove('category-id', regularUser);

    expect(repository.delete).toHaveBeenCalledWith('category-id', regularUser.userId);
  });

  it('deve bloquear (409) exclusão de categoria com transações, mesmo padrão', async () => {
    (repository.findByIdAndUserId as jest.Mock).mockResolvedValue({
      id: 'category-id',
      isDefault: true,
    });
    (repository.countTransactionsByCategory as jest.Mock).mockResolvedValue(2);

    await expect(service.remove('category-id', regularUser)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('deve bloquear (409) exclusão de categoria com orçamentos', async () => {
    (repository.findByIdAndUserId as jest.Mock).mockResolvedValue({
      id: 'category-id',
      isDefault: false,
    });
    (repository.countTransactionsByCategory as jest.Mock).mockResolvedValue(0);
    (repository.countBudgetsByCategory as jest.Mock).mockResolvedValue(1);

    await expect(service.remove('category-id', regularUser)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('deve permitir renomear categoria padrão', async () => {
    (repository.findByIdAndUserId as jest.Mock).mockResolvedValue({
      id: 'category-id',
      name: 'Saúde',
      isDefault: true,
    });
    (repository.findByNameAndUserId as jest.Mock).mockResolvedValue(null);
    (repository.update as jest.Mock).mockResolvedValue({ id: 'category-id' });

    await service.update('category-id', regularUser, { name: 'Farmácia', type: 'GASTO' });

    expect(repository.update).toHaveBeenCalledWith(
      'category-id',
      regularUser.userId,
      expect.objectContaining({ name: 'Farmácia', type: 'GASTO' }),
    );
  });
});
