import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { AttachmentsController, TransactionAttachmentsController } from './attachments.controller';
import { AttachmentsRepository } from './attachments.repository';
import { AttachmentsService } from './attachments.service';
import { DrizzleAttachmentsRepository } from './drizzle-attachments.repository';

const attachmentsRepositoryProvider = {
  provide: AttachmentsRepository,
  useClass: DrizzleAttachmentsRepository,
};

@Module({
  imports: [StorageModule],
  controllers: [TransactionAttachmentsController, AttachmentsController],
  providers: [attachmentsRepositoryProvider, AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
