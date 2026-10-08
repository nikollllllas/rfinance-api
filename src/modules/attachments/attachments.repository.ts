import { Injectable } from '@nestjs/common';
import { DbAttachment } from '../../infrastructure/drizzle/schema';

type CreateAttachmentInput = {
  transactionId: string;
  userId: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

@Injectable()
export class AttachmentsRepository {
  create(_data: CreateAttachmentInput): Promise<DbAttachment> {
    throw new Error('Not implemented');
  }

  findManyByTransactionIdAndUserId(
    _transactionId: string,
    _userId: string,
  ): Promise<DbAttachment[]> {
    throw new Error('Not implemented');
  }

  findByIdAndUserId(_id: string, _userId: string): Promise<DbAttachment | null> {
    throw new Error('Not implemented');
  }

  findManyByTransactionId(_transactionId: string): Promise<DbAttachment[]> {
    throw new Error('Not implemented');
  }

  delete(_id: string, _userId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  transactionBelongsToUser(_transactionId: string, _userId: string): Promise<boolean> {
    throw new Error('Not implemented');
  }
}
