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
});
