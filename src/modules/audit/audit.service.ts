import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../infrastructure/drizzle/drizzle.service';
import { auditLogs } from '../../infrastructure/drizzle/schema';

export type AuditAction =
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'auth.password_reset'
  | 'user.create'
  | 'user.update'
  | 'user.password_reset_by_admin'
  | 'user.self_delete'
  | 'user.privacy_consent';

// ponytail: insert direto, sem repositório abstrato; extrair se ganhar consultas.
@Injectable()
export class AuditService {
  constructor(private readonly drizzle: DrizzleService) {}

  async log(action: AuditAction, actorId: string | null, targetId: string | null = null): Promise<void> {
    await this.drizzle.db.insert(auditLogs).values({ action, actorId, targetId });
  }
}
