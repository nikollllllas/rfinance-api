const send = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send } })),
}));

describe('MailService', () => {
  beforeEach(() => {
    jest.resetModules();
    send.mockReset();
  });

  const load = (apiKey?: string) => {
    jest.doMock('../../env', () => ({
      env: { RESEND_API_KEY: apiKey, MAIL_FROM: 'a@b.c' },
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MailService } = require('./mail.service');
    const { Logger } = require('@nestjs/common');
    const service = new MailService();
    return { service, Logger };
  };

  it('warns and does not throw without a client', async () => {
    const { service, Logger } = load(undefined);
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    await expect(
      service.sendPasswordRecoveryEmail('u@x.com', 'http://r'),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('logs an error and does not throw when Resend returns an error', async () => {
    const { service, Logger } = load('key');
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    send.mockResolvedValue({ error: { message: 'boom' } });
    await expect(
      service.sendPasswordRecoveryEmail('u@x.com', 'http://r'),
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
