import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../../env';
import * as schema from './schema';

@Injectable()
export class DrizzleService implements OnModuleDestroy {
  private pool: Pool;
  db: NodePgDatabase<typeof schema>;

  constructor() {
    this.pool = new Pool({
      connectionString: env.DATABASE_URL,
      connectionTimeoutMillis: 10_000,
    });
    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
