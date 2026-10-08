import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from '../storage/storage.service';
import { AttachmentsRepository } from './attachments.repository';
import { AttachmentsService } from './attachments.service';

describe('AttachmentsService', () => {
  let service: AttachmentsService;
  let repository: AttachmentsRepository;
  let storage: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentsService,
        {
          provide: AttachmentsRepository,
          useValue: {
            create: jest.fn(),
            findManyByTransactionIdAndUserId: jest.fn(),
            findByIdAndUserId: jest.fn(),
            findManyByTransactionId: jest.fn(),
            delete: jest.fn(),
            transactionBelongsToUser: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            upload: jest.fn(),
            getSignedDownloadUrl: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AttachmentsService);
    repository = module.get(AttachmentsRepository);
    storage = module.get(StorageService);
  });

  const file = {
    originalname: 'conta de luz.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('fake-pdf'),
  };

  it('deve rejeitar upload para transação de outro usuário', async () => {
    (repository.transactionBelongsToUser as jest.Mock).mockResolvedValue(false);

    await expect(service.upload('tx-id', 'user-id', file)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('deve rejeitar tipo de arquivo não suportado', async () => {
    (repository.transactionBelongsToUser as jest.Mock).mockResolvedValue(true);

    await expect(
      service.upload('tx-id', 'user-id', { ...file, mimetype: 'application/zip' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('deve rejeitar arquivo acima do limite configurado', async () => {
    (repository.transactionBelongsToUser as jest.Mock).mockResolvedValue(true);

    await expect(
      service.upload('tx-id', 'user-id', { ...file, size: 999_999_999 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('deve sanitizar o nome do arquivo e salvar o anexo', async () => {
    (repository.transactionBelongsToUser as jest.Mock).mockResolvedValue(true);
    (repository.create as jest.Mock).mockResolvedValue({ id: 'attachment-id' });

    await service.upload('tx-id', 'user-id', file);

    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringContaining('attachments/user-id/tx-id/'),
      file.buffer,
      'application/pdf',
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: 'tx-id',
        userId: 'user-id',
        fileName: expect.stringMatching(/^conta_de_luz\.pdf$/),
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      }),
    );
  });

  it('deve recusar baixar anexo de outro usuário', async () => {
    (repository.findByIdAndUserId as jest.Mock).mockResolvedValue(null);

    await expect(service.getDownloadUrl('att-id', 'user-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deve apagar do storage antes de apagar o registro', async () => {
    (repository.findByIdAndUserId as jest.Mock).mockResolvedValue({
      id: 'att-id',
      storageKey: 'attachments/user-id/tx-id/foo.pdf',
    });

    await service.remove('att-id', 'user-id');

    expect(storage.delete).toHaveBeenCalledWith('attachments/user-id/tx-id/foo.pdf');
    expect(repository.delete).toHaveBeenCalledWith('att-id', 'user-id');
  });
});
