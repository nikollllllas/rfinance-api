import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { RbacService } from '../rbac/rbac.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload.type';

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
}
