import 'dotenv/config';
import { z } from 'zod';

// Hosts sem ponto (ex.: Render internal "dpg-xxx-a") ficam em rede privada.
export function isDatabaseUrlSafe(url: string, nodeEnv: string): boolean {
  if (nodeEnv !== 'production') return true;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('.')) return true;
    return ['require', 'verify-ca', 'verify-full'].includes(
      parsed.searchParams.get('sslmode') ?? '',
    );
  } catch {
    return false;
  }
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must have at least 32 characters'),
  DATABASE_URL: z
    .string()
    .url('DATABASE_URL must be a valid URL')
    .refine(
      (url) =>
        url.startsWith('postgres://') || url.startsWith('postgresql://'),
      'DATABASE_URL must use postgres:// or postgresql://',
    ),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default('RFinance <onboarding@resend.dev>'),
  FRONTEND_URL: z
    .string()
    .url()
    .default('https://www.rfinanece-vercel.app'),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('https://www.rfinanece-vercel.app')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    )
    .refine((origins) => origins.length > 0, {
      message: 'CORS_ALLOWED_ORIGINS must include at least one origin',
    })
    .refine(
      (origins) =>
        origins.every((origin) => {
          try {
            const parsed = new URL(origin);
            return parsed.protocol === 'https:' || parsed.protocol === 'http:';
          } catch {
            return false;
          }
        }),
      {
        message:
          'CORS_ALLOWED_ORIGINS must be a comma-separated list of valid URLs',
      },
    ),
  // Nº de proxies confiáveis na frente da API. Render = 1; Render atrás do rewrite da Vercel = 2.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
}).refine((e) => isDatabaseUrlSafe(e.DATABASE_URL, e.NODE_ENV), {
  message: 'DATABASE_URL de host público em produção precisa de ?sslmode=require',
  path: ['DATABASE_URL'],
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env: Env = parsed.data;
