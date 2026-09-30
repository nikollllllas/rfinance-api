import { Logger } from '@nestjs/common';
import { DrizzleService } from '../../infrastructure/drizzle/drizzle.service';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('grava o log com action, actorId e targetId', async () => {
    const values = jest.fn().mockResolvedValue(undefined);
    const drizzle = { db: { insert: () => ({ values }) } } as unknown as DrizzleService;
    const service = new AuditService(drizzle);

    await service.log('auth.login', 'u1');

    expect(values).toHaveBeenCalledWith({ action: 'auth.login', actorId: 'u1', targetId: null });
  });

  it('não propaga erro quando o insert falha', async () => {
    const drizzle = {
      db: { insert: () => ({ values: () => Promise.reject(new Error('db down')) }) },
    } as unknown as DrizzleService;
    const service = new AuditService(drizzle);

    await expect(service.log('auth.login', 'u1')).resolves.toBeUndefined();
  });

  it('expurga logs com mais de 6 meses no boot', async () => {
    const where = jest.fn().mockResolvedValue(undefined);
    const drizzle = {
      db: { delete: () => ({ where }) },
    } as unknown as DrizzleService;
    const service = new AuditService(drizzle);

    await service.onModuleInit();

    expect(where).toHaveBeenCalled();
  });

  it('não propaga erro quando o expurgo falha', async () => {
    const drizzle = {
      db: { delete: () => ({ where: () => Promise.reject(new Error('db down')) }) },
    } as unknown as DrizzleService;
    const service = new AuditService(drizzle);

    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });
});
