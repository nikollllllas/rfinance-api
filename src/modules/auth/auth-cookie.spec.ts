import { tokenFromCookieHeader } from './auth-cookie';

describe('tokenFromCookieHeader', () => {
  it('extrai o token entre outros cookies', () => {
    expect(tokenFromCookieHeader('a=1; rfinance_token=abc.def; b=2')).toBe('abc.def');
  });
  it('retorna null sem header ou sem o cookie', () => {
    expect(tokenFromCookieHeader(undefined)).toBeNull();
    expect(tokenFromCookieHeader('x_rfinance_token=abc')).toBeNull();
  });
  it('retorna null se o valor do cookie estiver malformado', () => {
    expect(tokenFromCookieHeader('rfinance_token=abc%zz')).toBeNull();
  });
});
