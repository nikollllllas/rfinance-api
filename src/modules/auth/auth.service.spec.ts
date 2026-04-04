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
  hash: jest.fn(),
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
            createPasswordRecoveryToken: jest.fn(),
            findActivePasswordRecoveryTokenByTokenHash: jest.fn(),
            markPasswordRecoveryTokenAsUsed: jest.fn(),
            markAllPasswordRecoveryTokensAsUsed: jest.fn(),
            updatePasswordHash: jest.fn(),
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

  it('deve retornar resposta neutra em forgot password com email inexistente', async () => {
    (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

    const result = await service.forgotPassword({ email: 'missing@rfinance.local' });

    expect(result).toEqual({
      message:
        'Se existir uma conta com este e-mail, enviaremos as instruções de recuperação.',
    });
  });

  it('deve criar token de recuperação para usuário existente', async () => {
    (usersService.findByEmail as jest.Mock).mockResolvedValue({
      id: 'user-id',
      name: 'User',
      email: 'user@rfinance.local',
      passwordHash: 'hash',
      role: Role.USER,
    });
    (usersService.markAllPasswordRecoveryTokensAsUsed as jest.Mock).mockResolvedValue(
      undefined,
    );
    (usersService.createPasswordRecoveryToken as jest.Mock).mockResolvedValue(undefined);

    await service.forgotPassword({ email: 'user@rfinance.local' });

    expect(usersService.createPasswordRecoveryToken).toHaveBeenCalled();
  });

  it('deve rejeitar reset com token inválido', async () => {
    (usersService.findActivePasswordRecoveryTokenByTokenHash as jest.Mock).mockResolvedValue(
      null,
    );

    await expect(
      service.resetPassword({ token: 'invalid-token', password: 'NewPassword@123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('deve resetar senha e invalidar token válido', async () => {
    (usersService.findActivePasswordRecoveryTokenByTokenHash as jest.Mock).mockResolvedValue(
      {
        id: 'token-id',
        userId: 'user-id',
      },
    );
    (usersService.findById as jest.Mock).mockResolvedValue({
      id: 'user-id',
      name: 'User',
      email: 'user@rfinance.local',
      role: Role.USER,
      passwordHash: 'old-hash',
    });
    (bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>).mockResolvedValue(
      'new-password-hash',
    );
    (usersService.updatePasswordHash as jest.Mock).mockResolvedValue(undefined);
    (usersService.markPasswordRecoveryTokenAsUsed as jest.Mock).mockResolvedValue(
      undefined,
    );
    (usersService.markAllPasswordRecoveryTokensAsUsed as jest.Mock).mockResolvedValue(
      undefined,
    );

    const result = await service.resetPassword({
      token: 'valid-token',
      password: 'NewPassword@123',
    });

    expect(result).toEqual({ success: true });
    expect(usersService.updatePasswordHash).toHaveBeenCalledWith(
      'user-id',
      'new-password-hash',
    );
  });
});
