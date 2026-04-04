import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { Role } from '../../common/enums/role.enum';
import { UserRecord } from './types/user-record.type';
import { UsersRepository } from './users.repository';

const PASSWORD_SALT_ROUNDS = 10;

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: Role;
};

export type UpdateUserByAdminInput = Partial<{
  name: string;
  email: string;
  role: Role;
}>;

export type UpdateOwnProfileInput = Partial<{
  userId: string;
  name: string;
  email: string;
}>;

export type UserPublicView = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findByEmail(email: string): Promise<UserRecord | null> {
    return this.usersRepository.findByEmail(this.normalizeEmail(email));
  }

  findById(id: string): Promise<UserRecord | null> {
    return this.usersRepository.findById(id);
  }

  async create(input: CreateUserInput): Promise<UserPublicView> {
    const normalizedEmail = this.normalizeEmail(input.email);
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException('E-mail já está em uso');
    }

    const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);
    const created = await this.usersRepository.create({
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: input.role,
    });
    return this.toPublicView(created);
  }

  async updateByAdmin(id: string, input: UpdateUserByAdminInput): Promise<UserPublicView> {
    const existing = await this.findByIdOrThrow(id);
    const normalizedEmail = input.email ? this.normalizeEmail(input.email) : undefined;

    if (normalizedEmail && normalizedEmail !== existing.email) {
      const userWithEmail = await this.findByEmail(normalizedEmail);
      if (userWithEmail && userWithEmail.id !== id) {
        throw new ConflictException('E-mail já está em uso');
      }
    }

    const updated = await this.usersRepository.update(id, {
      name: input.name?.trim(),
      email: normalizedEmail,
      role: input.role,
    });
    return this.toPublicView(updated);
  }

  async updateOwnProfile(
    user: AuthenticatedUser,
    input: UpdateOwnProfileInput,
  ): Promise<UserPublicView> {
    const targetUserId = input.userId ?? user.userId;
    if (targetUserId !== user.userId) {
      throw new ForbiddenException('Sem permissão para editar este usuário');
    }

    const existing = await this.findByIdOrThrow(user.userId);
    const normalizedEmail = input.email ? this.normalizeEmail(input.email) : undefined;

    if (normalizedEmail && normalizedEmail !== existing.email) {
      const userWithEmail = await this.findByEmail(normalizedEmail);
      if (userWithEmail && userWithEmail.id !== user.userId) {
        throw new ConflictException('E-mail já está em uso');
      }
    }

    const updated = await this.usersRepository.update(user.userId, {
      name: input.name?.trim(),
      email: normalizedEmail,
    });
    return this.toPublicView(updated);
  }

  async adminResetPassword(userId: string, password: string): Promise<void> {
    await this.findByIdOrThrow(userId);
    const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    await this.usersRepository.update(userId, { passwordHash });
  }

  updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    return this.usersRepository.update(userId, { passwordHash }).then(() => undefined);
  }

  createPasswordRecoveryToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    return this.usersRepository.createPasswordRecoveryToken(input);
  }

  findActivePasswordRecoveryTokenByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<{ id: string; userId: string } | null> {
    return this.usersRepository.findActivePasswordRecoveryTokenByTokenHash(tokenHash, now);
  }

  markPasswordRecoveryTokenAsUsed(tokenId: string): Promise<void> {
    return this.usersRepository.markPasswordRecoveryTokenAsUsed(tokenId);
  }

  markAllPasswordRecoveryTokensAsUsed(userId: string): Promise<void> {
    return this.usersRepository.markAllPasswordRecoveryTokensAsUsed(userId);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async findByIdOrThrow(id: string): Promise<UserRecord> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  private toPublicView(user: UserRecord): UserPublicView {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
