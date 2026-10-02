import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { lt } from 'drizzle-orm';
import { DrizzleService } from '../../infrastructure/drizzle/drizzle.service';
import { auditLogs } from '../../infrastructure/drizzle/schema';

export type AuditAction =
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'auth.password_reset'
  | 'auth.register'
  | 'user.create'
  | 'user.update'
  | 'user.password_reset_by_admin'
  | 'user.self_delete'
  | 'user.privacy_consent';

// ponytail: insert direto, sem repositório abstrato; extrair se ganhar consultas.
@Injectable()
export class AuditService implements OnModuleInit {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  // ponytail: expurgo só no boot; mover para cron se o processo ficar semanas sem reiniciar.
  async onModuleInit(): Promise<void> {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      await this.drizzle.db.delete(auditLogs).where(lt(auditLogs.createdAt, sixMonthsAgo));
    } catch (err) {
      this.logger.error(
        'Falha ao expurgar auditoria antiga',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  // Falha ao gravar auditoria não pode derrubar a operação original: registra e segue.
  async log(action: AuditAction, actorId: string | null, targetId: string | null = null): Promise<void> {
    try {
      await this.drizzle.db.insert(auditLogs).values({ action, actorId, targetId });
    } catch (err) {
      this.logger.error(
        `Falha ao gravar auditoria: ${action}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
