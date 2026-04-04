import { Injectable } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';
import { UserRecord } from './types/user-record.type';

export type CreateUserInput = {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
};

export type UpdateUserInput = Partial<{
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
}>;

export type CreatePasswordRecoveryTokenInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export type ListUsersInput = {
  page: number;
  perPage: number;
  search?: string;
};

export type CountUsersInput = {
  search?: string;
};

export type PasswordRecoveryTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class UsersRepository {
  findByEmail(_email: string): Promise<UserRecord | null> {
    throw new Error('Not implemented');
  }

  findById(_id: string): Promise<UserRecord | null> {
    throw new Error('Not implemented');
  }

  create(_data: CreateUserInput): Promise<UserRecord> {
    throw new Error('Not implemented');
  }

  update(_id: string, _data: UpdateUserInput): Promise<UserRecord> {
    throw new Error('Not implemented');
  }

  list(_input: ListUsersInput): Promise<UserRecord[]> {
    throw new Error('Not implemented');
  }

  count(_input: CountUsersInput): Promise<number> {
    throw new Error('Not implemented');
  }

  createPasswordRecoveryToken(
    _data: CreatePasswordRecoveryTokenInput,
  ): Promise<void> {
    throw new Error('Not implemented');
  }

  findActivePasswordRecoveryTokenByTokenHash(
    _tokenHash: string,
    _now: Date,
  ): Promise<PasswordRecoveryTokenRecord | null> {
    throw new Error('Not implemented');
  }

  markPasswordRecoveryTokenAsUsed(_tokenId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  markAllPasswordRecoveryTokensAsUsed(_userId: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
