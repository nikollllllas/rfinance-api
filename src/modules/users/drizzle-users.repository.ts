import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../../infrastructure/drizzle/drizzle.service';
import { users } from '../../infrastructure/drizzle/schema';
import { Role } from '../../common/enums/role.enum';
import { UserRecord } from './types/user-record.type';
import { UsersRepository } from './users.repository';

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
}
