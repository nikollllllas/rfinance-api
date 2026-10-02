import { ThrottlerByEmailGuard } from './throttler-by-email.guard';

describe('ThrottlerByEmailGuard', () => {
  const guard = Object.create(
    ThrottlerByEmailGuard.prototype,
  ) as ThrottlerByEmailGuard;
  const getTracker = (guard as any).getTracker.bind(guard) as (
    req: Record<string, any>,
  ) => Promise<string>;

  it('rastreia por e-mail normalizado quando presente no body', async () => {
    const tracker = await getTracker({
      body: { email: ' A@X.com ' },
      ip: '1.2.3.4',
    });
    expect(tracker).toBe('email:a@x.com');
  });

  it('cai para o IP quando não há e-mail no body', async () => {
    const tracker = await getTracker({ body: {}, ip: '1.2.3.4' });
    expect(tracker).toBe('1.2.3.4');
  });
});
