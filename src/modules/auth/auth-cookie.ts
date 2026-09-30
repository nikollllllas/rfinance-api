import type { CookieOptions } from 'express';
import { env } from '../../env';

export const AUTH_COOKIE_NAME = 'rfinance_token';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000; // igual ao expiresIn do JwtModule

export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MS,
  };
}

// Express 5 não parseia cookies; evita dependência só pra isso.
export function tokenFromCookieHeader(header?: string): string | null {
  const match = header?.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}
