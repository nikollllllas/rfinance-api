import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums/role.enum';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let repository: UsersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            list: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<UsersRepository>(UsersRepository);
  });

  it('deve criar usuário com senha hasheada', async () => {
    (repository.findByEmail as jest.Mock).mockResolvedValue(null);
    (bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>).mockResolvedValue(
      'hashed-password',
    );
    (repository.create as jest.Mock).mockResolvedValue({
      id: 'user-id',
      name: 'User',
      email: 'user@rfinance.local',
      role: Role.USER,
      passwordHash: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const created = await service.create({
      name: 'User',
      email: 'user@rfinance.local',
      password: 'User@123',
      role: Role.USER,
    });

    expect(repository.create).toHaveBeenCalledWith({
      name: 'User',
      email: 'user@rfinance.local',
      passwordHash: 'hashed-password',
      role: Role.USER,
    });
    expect(created.email).toBe('user@rfinance.local');
  });

  it('deve impedir criação com email já existente', async () => {
    (repository.findByEmail as jest.Mock).mockResolvedValue({
      id: 'user-id',
      name: 'User',
      email: 'user@rfinance.local',
      role: Role.USER,
      passwordHash: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.create({
        name: 'User',
        email: 'user@rfinance.local',
        password: 'User@123',
        role: Role.USER,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deve permitir usuário editar somente o próprio perfil sem role', async () => {
    (repository.findById as jest.Mock).mockResolvedValue({
      id: 'user-id',
      name: 'User',
      email: 'user@rfinance.local',
      role: Role.USER,
      passwordHash: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (repository.update as jest.Mock).mockResolvedValue({
      id: 'user-id',
      name: 'Novo Nome',
      email: 'user@rfinance.local',
      role: Role.USER,
      passwordHash: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const updated = await service.updateOwnProfile(
      {
        userId: 'user-id',
        email: 'user@rfinance.local',
        role: Role.USER,
        permissions: [],
      },
      {
        name: 'Novo Nome',
      },
    );

    expect(updated.name).toBe('Novo Nome');
  });

  it('deve bloquear usuário comum de editar outro usuário', async () => {
    await expect(
      service.updateOwnProfile(
        {
          userId: 'user-1',
          email: 'user-1@rfinance.local',
          role: Role.USER,
          permissions: [],
        },
        {
          userId: 'user-2',
          name: 'Novo Nome',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deve resetar senha de usuário por admin', async () => {
    (repository.findById as jest.Mock).mockResolvedValue({
      id: 'user-id',
      name: 'User',
      email: 'user@rfinance.local',
      role: Role.USER,
      passwordHash: 'old-hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>).mockResolvedValue(
      'new-hash',
    );
    (repository.update as jest.Mock).mockResolvedValue({
      id: 'user-id',
      name: 'User',
      email: 'user@rfinance.local',
      role: Role.USER,
      passwordHash: 'new-hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.adminResetPassword('user-id', 'NewPassword@123');

    expect(repository.update).toHaveBeenCalledWith('user-id', {
      passwordHash: 'new-hash',
    });
  });

  it('deve retornar not found ao editar usuário inexistente', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      service.updateByAdmin('missing', {
        name: 'Novo Nome',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve listar usuários com paginação', async () => {
    const firstCreatedAt = new Date('2026-01-01T00:00:00.000Z');
    const firstUpdatedAt = new Date('2026-01-01T00:00:00.000Z');
    const secondCreatedAt = new Date('2026-01-02T00:00:00.000Z');
    const secondUpdatedAt = new Date('2026-01-02T00:00:00.000Z');

    (repository.list as jest.Mock).mockResolvedValue([
      {
        id: 'admin-id',
        name: 'Admin',
        email: 'admin@rfinance.local',
        role: Role.ADMIN,
        passwordHash: 'hashed-admin',
        createdAt: firstCreatedAt,
        updatedAt: firstUpdatedAt,
      },
      {
        id: 'user-id',
        name: 'User',
        email: 'user@rfinance.local',
        role: Role.USER,
        passwordHash: 'hashed-user',
        createdAt: secondCreatedAt,
        updatedAt: secondUpdatedAt,
      },
    ]);
    (repository.count as jest.Mock).mockResolvedValue(9);

    const result = await service.list({
      page: 2,
      perPage: 2,
    });

    expect(repository.list).toHaveBeenCalledWith({
      page: 2,
      perPage: 2,
      search: undefined,
    });
    expect(repository.count).toHaveBeenCalledWith({ search: undefined });
    expect(result).toEqual({
      items: [
        {
          id: 'admin-id',
          name: 'Admin',
          email: 'admin@rfinance.local',
          role: Role.ADMIN,
          createdAt: firstCreatedAt,
          updatedAt: firstUpdatedAt,
        },
        {
          id: 'user-id',
          name: 'User',
          email: 'user@rfinance.local',
          role: Role.USER,
          createdAt: secondCreatedAt,
          updatedAt: secondUpdatedAt,
        },
      ],
      page: 2,
      perPage: 2,
      total: 9,
      totalPages: 5,
    });
  });

  it('deve normalizar busca e aplicar paginação padrão ao listar usuários', async () => {
    const createdAt = new Date('2026-01-03T00:00:00.000Z');
    const updatedAt = new Date('2026-01-03T00:00:00.000Z');

    (repository.list as jest.Mock).mockResolvedValue([
      {
        id: 'user-id',
        name: 'User',
        email: 'user@rfinance.local',
        role: Role.USER,
        passwordHash: 'hashed-user',
        createdAt,
        updatedAt,
      },
    ]);
    (repository.count as jest.Mock).mockResolvedValue(1);

    const result = await service.list({
      search: '  USER@RFINANCE.LOCAL  ',
    });

    expect(repository.list).toHaveBeenCalledWith({
      page: 1,
      perPage: 10,
      search: 'user@rfinance.local',
    });
    expect(repository.count).toHaveBeenCalledWith({
      search: 'user@rfinance.local',
    });
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(10);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
  });
});
