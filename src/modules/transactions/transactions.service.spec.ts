import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../../common/enums/role.enum';
import { TransactionType } from '../../infrastructure/drizzle/schema';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let repository: TransactionsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: TransactionsRepository,
          useValue: {
            findCategoryByIdAndUserId: jest.fn(),
            findManyByUserId: jest.fn(),
            findByIdAndUserId: jest.fn(),
            create: jest.fn(),
            createManyInTransaction: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            listAvailableMonths: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    repository = module.get<TransactionsRepository>(TransactionsRepository);
  });

  it('deve aplicar scoping por userId na listagem', async () => {
    (repository.findManyByUserId as jest.Mock).mockResolvedValue([]);

    await service.list('user-1', undefined);

    expect(repository.findManyByUserId).toHaveBeenCalledWith('user-1');
    expect(repository.findManyByUserId).not.toHaveBeenCalledWith('user-2');
  });

  it('deve bloquear acesso cruzado ao atualizar transação de outro usuário', async () => {
    (repository.findByIdAndUserId as jest.Mock).mockResolvedValue(null);

    await expect(
      service.update(
        'tx-1',
        {
          userId: 'user-1',
          email: 'user@rfinance.local',
          role: Role.USER,
          permissions: [],
        },
        { type: TransactionType.GASTO },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
