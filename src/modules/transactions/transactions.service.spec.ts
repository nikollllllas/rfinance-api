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
            findTransactionIdsByIdempotencyKey: jest.fn(),
            saveIdempotencyKey: jest.fn(),
            findManyByIdsAndUserId: jest.fn(),
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

  it('deve devolver o resultado salvo em vez de criar de novo quando a idempotency key já existe', async () => {
    (repository.findTransactionIdsByIdempotencyKey as jest.Mock).mockResolvedValue(['tx-1']);
    (repository.findManyByIdsAndUserId as jest.Mock).mockResolvedValue([{ id: 'tx-1' }]);

    const user = { userId: 'user-1', email: 'user@rfinance.local', role: Role.USER, permissions: [] };
    const result = await service.create(
      user,
      {
        description: 'Mercado',
        amount: 100,
        date: '2026-03-01T00:00:00.000Z',
        type: TransactionType.GASTO,
        categoryId: 'cat-1',
      },
      'key-abc',
    );

    expect(result).toEqual({ transactions: [{ id: 'tx-1' }] });
    expect(repository.findCategoryByIdAndUserId).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('deve salvar a idempotency key após criar quando ela ainda não existe', async () => {
    (repository.findTransactionIdsByIdempotencyKey as jest.Mock).mockResolvedValue(null);
    (repository.findCategoryByIdAndUserId as jest.Mock).mockResolvedValue({ id: 'cat-1' });
    (repository.create as jest.Mock).mockResolvedValue({ id: 'tx-2' });

    const user = { userId: 'user-1', email: 'user@rfinance.local', role: Role.USER, permissions: [] };
    await service.create(
      user,
      {
        description: 'Mercado',
        amount: 100,
        date: '2026-03-01T00:00:00.000Z',
        type: TransactionType.GASTO,
        categoryId: 'cat-1',
      },
      'key-novo',
    );

    expect(repository.saveIdempotencyKey).toHaveBeenCalledWith('user-1', 'key-novo', ['tx-2']);
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

  it('deve repassar o userId para o repository.update', async () => {
    (repository.findByIdAndUserId as jest.Mock).mockResolvedValue({ id: 'tx-id' });
    (repository.update as jest.Mock).mockResolvedValue({ id: 'tx-id' });

    await service.update(
      'tx-id',
      { userId: 'user-id', email: 'user@rfinance.local', role: Role.USER, permissions: [] },
      { type: TransactionType.GASTO },
    );

    expect(repository.update).toHaveBeenCalledWith(
      'tx-id',
      'user-id',
      expect.any(Object),
    );
  });

  it('deve repassar o userId para o repository.delete', async () => {
    (repository.findByIdAndUserId as jest.Mock).mockResolvedValue({ id: 'tx-id' });
    (repository.delete as jest.Mock).mockResolvedValue({ id: 'tx-id' });

    await service.remove('tx-id', 'user-id');

    expect(repository.delete).toHaveBeenCalledWith('tx-id', 'user-id');
  });
});
