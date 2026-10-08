import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { env } from '../../env';
import { DbAttachment } from '../../infrastructure/drizzle/schema';
import { StorageService } from '../storage/storage.service';
import { AttachmentsRepository } from './attachments.repository';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]);

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly attachmentsRepository: AttachmentsRepository,
    private readonly storageService: StorageService,
  ) {}

  async upload(
    transactionId: string,
    userId: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ): Promise<DbAttachment> {
    const belongsToUser = await this.attachmentsRepository.transactionBelongsToUser(
      transactionId,
      userId,
    );
    if (!belongsToUser) {
      throw new NotFoundException('Transação não encontrada');
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Tipo de arquivo não suportado. Envie PDF, JPEG, PNG, WEBP ou HEIC',
      );
    }

    const maxBytes = env.ATTACHMENT_MAX_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException(
        `Arquivo maior que o limite de ${env.ATTACHMENT_MAX_SIZE_MB}MB`,
      );
    }

    const sanitizedFileName = file.originalname.replace(/[^\w.\-]+/g, '_').slice(-120);
    const storageKey = `attachments/${userId}/${transactionId}/${randomUUID()}-${sanitizedFileName}`;

    await this.storageService.upload(storageKey, file.buffer, file.mimetype);

    return this.attachmentsRepository.create({
      transactionId,
      userId,
      storageKey,
      fileName: sanitizedFileName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });
  }

  async list(transactionId: string, userId: string): Promise<DbAttachment[]> {
    const belongsToUser = await this.attachmentsRepository.transactionBelongsToUser(
      transactionId,
      userId,
    );
    if (!belongsToUser) {
      throw new NotFoundException('Transação não encontrada');
    }
    return this.attachmentsRepository.findManyByTransactionIdAndUserId(transactionId, userId);
  }

  async getDownloadUrl(id: string, userId: string): Promise<{ url: string; fileName: string }> {
    const attachment = await this.attachmentsRepository.findByIdAndUserId(id, userId);
    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado');
    }
    const url = await this.storageService.getSignedDownloadUrl(
      attachment.storageKey,
      attachment.fileName,
    );
    return { url, fileName: attachment.fileName };
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const attachment = await this.attachmentsRepository.findByIdAndUserId(id, userId);
    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado');
    }
    await this.storageService.delete(attachment.storageKey);
    await this.attachmentsRepository.delete(id, userId);
    return { message: 'Anexo apagado com sucesso' };
  }

  // Chamado pelo TransactionsService ao excluir a transação — o chamador já validou
  // que a transação pertence ao usuário, então aqui só limpa o que restou pra trás.
  async removeAllForTransaction(transactionId: string): Promise<void> {
    const existing = await this.attachmentsRepository.findManyByTransactionId(transactionId);
    for (const attachment of existing) {
      await this.storageService.delete(attachment.storageKey);
    }
  }
}
