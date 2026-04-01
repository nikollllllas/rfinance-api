import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums/role.enum';
import { RbacService } from '../rbac/rbac.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        RbacService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('deve autenticar com credenciais válidas', async () => {
    const user = {
      id: 'user-id',
      name: 'Admin',
      email: 'admin@rfinance.local',
      passwordHash: 'hash',
      role: Role.ADMIN,
    };
    (usersService.findByEmail as jest.Mock).mockResolvedValue(user);
    (bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>).mockResolvedValue(
      true,
    );
    (jwtService.signAsync as jest.Mock).mockResolvedValue('token');

    const result = await service.login({
      email: 'admin@rfinance.local',
      password: 'Admin@123',
    });

    expect(result.accessToken).toBe('token');
    expect(result.user).toEqual({
      id: 'user-id',
      name: 'Admin',
      email: 'admin@rfinance.local',
      role: Role.ADMIN,
    });
  });

  it('deve falhar login inválido', async () => {
    (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

    await expect(
      service.login({
        email: 'wrong@rfinance.local',
        password: '123456',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('deve gerar token com payload esperado', async () => {
    const user = {
      id: 'user-id',
      name: 'User',
      email: 'user@rfinance.local',
      passwordHash: 'hash',
      role: Role.USER,
    };
    (usersService.findByEmail as jest.Mock).mockResolvedValue(user);
    (bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>).mockResolvedValue(
      true,
    );
    (jwtService.signAsync as jest.Mock).mockResolvedValue('jwt');

    await service.login({
      email: 'user@rfinance.local',
      password: 'User@123',
    });

    expect(jwtService.signAsync).toHaveBeenCalledWith({
      userId: 'user-id',
      email: 'user@rfinance.local',
      role: Role.USER,
    });
  });
});
