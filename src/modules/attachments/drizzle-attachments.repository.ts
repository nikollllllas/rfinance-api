import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '../../infrastructure/drizzle/drizzle.service';
import { attachments, DbAttachment, transactions } from '../../infrastructure/drizzle/schema';
import { AttachmentsRepository } from './attachments.repository';

@Injectable()
export class DrizzleAttachmentsRepository extends AttachmentsRepository {
  constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  async create(data: {
    transactionId: string;
    userId: string;
    storageKey: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<DbAttachment> {
    const rows = await this.drizzle.db.insert(attachments).values(data).returning();
    return rows[0] as unknown as DbAttachment;
  }

  async findManyByTransactionIdAndUserId(
    transactionId: string,
    userId: string,
  ): Promise<DbAttachment[]> {
    const rows = await this.drizzle.db
      .select()
      .from(attachments)
      .where(and(eq(attachments.transactionId, transactionId), eq(attachments.userId, userId)));
    return rows as unknown as DbAttachment[];
  }

  async findByIdAndUserId(id: string, userId: string): Promise<DbAttachment | null> {
    const rows = await this.drizzle.db
      .select()
      .from(attachments)
      .where(and(eq(attachments.id, id), eq(attachments.userId, userId)))
      .limit(1);
    return (rows[0] as unknown as DbAttachment) ?? null;
  }

  async findManyByTransactionId(transactionId: string): Promise<DbAttachment[]> {
    const rows = await this.drizzle.db
      .select()
      .from(attachments)
      .where(eq(attachments.transactionId, transactionId));
    return rows as unknown as DbAttachment[];
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.drizzle.db
      .delete(attachments)
      .where(and(eq(attachments.id, id), eq(attachments.userId, userId)));
  }

  async transactionBelongsToUser(transactionId: string, userId: string): Promise<boolean> {
    const rows = await this.drizzle.db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
      .limit(1);
    return rows.length > 0;
  }
}
