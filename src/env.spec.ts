process.env.JWT_SECRET ??= 'x'.repeat(32);
process.env.DATABASE_URL ??= 'postgres://u:p@localhost:5432/db';

import { isDatabaseUrlSafe } from './env';

describe('isDatabaseUrlSafe', () => {
  it('exige sslmode em host público em produção', () => {
    expect(isDatabaseUrlSafe('postgres://u:p@db.example.com/db', 'production')).toBe(false);
    expect(isDatabaseUrlSafe('postgres://u:p@db.example.com/db?sslmode=require', 'production')).toBe(true);
    expect(isDatabaseUrlSafe('postgres://u:p@db.example.com/db?sslmode=disable', 'production')).toBe(false);
  });

  it('libera host de rede privada (sem ponto) e ambientes não-prod', () => {
    expect(isDatabaseUrlSafe('postgres://u:p@dpg-abc123-a/db', 'production')).toBe(true);
    expect(isDatabaseUrlSafe('postgres://u:p@db.example.com/db', 'development')).toBe(true);
  });

  it('rejeita URL malformada', () => {
    expect(isDatabaseUrlSafe('not a url', 'production')).toBe(false);
  });
});
