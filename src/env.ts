import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  DATABASE_URL: z
    .string()
    .url('DATABASE_URL must be a valid URL')
    .refine(
      (url) =>
        url.startsWith('postgres://') || url.startsWith('postgresql://'),
      'DATABASE_URL must use postgres:// or postgresql://',
    ),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default(
      [
        'https://www.rfinanece-vercel.app',
        'https://rfinanece-web-git-main-nikollas-projects-9321ac0f.vercel.app',
        'https://rfinanece-g2pe0tq1p-nikollas-projects-9321ac0f.vercel.app',
      ].join(','),
    )
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
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env: Env = parsed.data;
