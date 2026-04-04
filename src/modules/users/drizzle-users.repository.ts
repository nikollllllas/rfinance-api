import { Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DrizzleService } from '../../infrastructure/drizzle/drizzle.service';
import { passwordRecoveryTokens, users } from '../../infrastructure/drizzle/schema';
import { Role } from '../../common/enums/role.enum';
import { UserRecord } from './types/user-record.type';
import {
  CreatePasswordRecoveryTokenInput,
  CreateUserInput,
  PasswordRecoveryTokenRecord,
  UpdateUserInput,
  UsersRepository,
} from './users.repository';

@Injectable()
export class DrizzleUsersRepository extends UsersRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const user = result[0];
    if (!user) return null;
    return { ...user, role: user.role as Role };
  }

  async findById(id: string): Promise<UserRecord | null> {
    const result = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    const user = result[0];
    if (!user) return null;
    return { ...user, role: user.role as Role };
  }

  async create(data: CreateUserInput): Promise<UserRecord> {
    const result = await this.drizzle.db.insert(users).values(data).returning();
    return { ...result[0], role: result[0].role as Role };
  }

  async update(id: string, data: UpdateUserInput): Promise<UserRecord> {
    const result = await this.drizzle.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return { ...result[0], role: result[0].role as Role };
  }

  async createPasswordRecoveryToken(
    data: CreatePasswordRecoveryTokenInput,
  ): Promise<void> {
    await this.drizzle.db.insert(passwordRecoveryTokens).values(data);
  }

  async findActivePasswordRecoveryTokenByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<PasswordRecoveryTokenRecord | null> {
    const result = await this.drizzle.db
      .select()
      .from(passwordRecoveryTokens)
      .where(
        and(
          eq(passwordRecoveryTokens.tokenHash, tokenHash),
          isNull(passwordRecoveryTokens.usedAt),
          gt(passwordRecoveryTokens.expiresAt, now),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  }

  async markPasswordRecoveryTokenAsUsed(tokenId: string): Promise<void> {
    await this.drizzle.db
      .update(passwordRecoveryTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordRecoveryTokens.id, tokenId));
  }

  async markAllPasswordRecoveryTokensAsUsed(userId: string): Promise<void> {
    await this.drizzle.db
      .update(passwordRecoveryTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordRecoveryTokens.userId, userId),
          isNull(passwordRecoveryTokens.usedAt),
        ),
      );
  }
}
