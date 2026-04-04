import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { RbacService } from '../rbac/rbac.service';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './types/jwt-payload.type';

const PASSWORD_RECOVERY_TOKEN_TTL_MINUTES = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly rbacService: RbacService,
  ) {}

  async login(dto: LoginDto): Promise<{
    accessToken: string;
    user: { id: string; name: string; email: string; role: Role };
  }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as Role,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: payload.role,
      },
    };
  }

  async me(userId: string): Promise<{
    id: string;
    name: string;
    email: string;
    role: Role;
  }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
    };
  }

  async validateJwtPayload(payload: JwtPayload): Promise<AuthenticatedUser> {
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      permissions: this.rbacService.resolvePermissions(payload.role),
    };
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<{ message: string; resetToken?: string }> {
    const user = await this.usersService.findByEmail(dto.email);
    const genericResponse = {
      message:
        'Se existir uma conta com este e-mail, enviaremos as instruções de recuperação.',
    };

    if (!user) {
      return genericResponse;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashRecoveryToken(token);
    const expiresAt = new Date(
      Date.now() + PASSWORD_RECOVERY_TOKEN_TTL_MINUTES * 60 * 1000,
    );

    await this.usersService.markAllPasswordRecoveryTokensAsUsed(user.id);
    await this.usersService.createPasswordRecoveryToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    if (process.env.NODE_ENV !== 'production') {
      return { ...genericResponse, resetToken: token };
    }

    return genericResponse;
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ success: boolean }> {
    const tokenHash = this.hashRecoveryToken(dto.token);
    const token = await this.usersService.findActivePasswordRecoveryTokenByTokenHash(
      tokenHash,
      new Date(),
    );
    if (!token) {
      throw new UnauthorizedException('Token de recuperação inválido ou expirado');
    }

    const user = await this.usersService.findById(token.userId);
    if (!user) {
      throw new UnauthorizedException('Token de recuperação inválido ou expirado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.usersService.updatePasswordHash(user.id, passwordHash);
    await this.usersService.markPasswordRecoveryTokenAsUsed(token.id);
    await this.usersService.markAllPasswordRecoveryTokensAsUsed(user.id);

    return { success: true };
  }

  private hashRecoveryToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
