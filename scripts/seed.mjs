import 'dotenv/config';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run seed');
}

const pool = new Pool({ connectionString: databaseUrl });

const now = new Date();

const usersSeed = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Administrador',
    email: 'admin@rfinance.local',
    password: 'Admin@123',
    role: 'ADMIN',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Maria Silva',
    email: 'maria@rfinance.local',
    password: 'Maria@123',
    role: 'USER',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Joao Santos',
    email: 'joao@rfinance.local',
    password: 'Joao@123',
    role: 'USER',
  },
];

const categoriesSeed = [
  {
    id: 'cat-salario',
    userId: '00000000-0000-0000-0000-000000000001',
    name: 'Salario',
    color: '#16A34A',
    icon: 'wallet',
    isDefault: true,
    type: 'GANHO',
  },
  {
    id: 'cat-mercado',
    userId: '00000000-0000-0000-0000-000000000001',
    name: 'Mercado',
    color: '#2563EB',
    icon: 'shopping-cart',
    isDefault: true,
    type: 'GASTO',
  },
  {
    id: 'cat-transporte',
    userId: '00000000-0000-0000-0000-000000000001',
    name: 'Transporte',
    color: '#F59E0B',
    icon: 'car',
    isDefault: true,
    type: 'GASTO',
  },
];

const transactionsSeed = [
  {
    id: 'trx-salario-2026-03',
    userId: '00000000-0000-0000-0000-000000000001',
    description: 'Salario mensal',
    amount: '7500.00',
    date: new Date('2026-03-05T09:00:00'),
    notes: 'Pagamento principal',
    type: 'GANHO',
    categoryId: 'cat-salario',
    tag: 'PAGO',
    paymentMethod: 'PIX',
  },
  {
    id: 'trx-mercado-2026-03',
    userId: '00000000-0000-0000-0000-000000000001',
    description: 'Compras do mercado',
    amount: '450.90',
    date: new Date('2026-03-10T18:30:00'),
    notes: 'Compra quinzenal',
    type: 'GASTO',
    categoryId: 'cat-mercado',
    tag: 'PAGO',
    paymentMethod: 'DEBITO',
  },
  {
    id: 'trx-transporte-2026-03',
    userId: '00000000-0000-0000-0000-000000000001',
    description: 'Combustivel',
    amount: '320.00',
    date: new Date('2026-03-18T12:00:00'),
    notes: 'Abastecimento completo',
    type: 'GASTO',
    categoryId: 'cat-transporte',
    tag: 'PAGO',
    paymentMethod: 'CREDITO',
  },
];

const budgetsSeed = [
  {
    id: 'bud-mercado-2026-03',
    userId: '00000000-0000-0000-0000-000000000001',
    amount: '900.00',
    categoryId: 'cat-mercado',
    budgetMonth: '2026-03',
  },
  {
    id: 'bud-transporte-2026-03',
    userId: '00000000-0000-0000-0000-000000000001',
    amount: '600.00',
    categoryId: 'cat-transporte',
    budgetMonth: '2026-03',
  },
  {
    id: 'bud-mercado-2026-04',
    userId: '00000000-0000-0000-0000-000000000001',
    amount: '950.00',
    categoryId: 'cat-mercado',
    budgetMonth: '2026-04',
  },
];

async function runSeed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const user of usersSeed) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await client.query(
        `
          INSERT INTO users (id, name, email, "passwordHash", role, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (email)
          DO UPDATE SET
            name = EXCLUDED.name,
            "passwordHash" = EXCLUDED."passwordHash",
            role = EXCLUDED.role,
            "updatedAt" = EXCLUDED."updatedAt"
        `,
        [user.id, user.name, user.email, passwordHash, user.role, now, now],
      );
    }

    for (const category of categoriesSeed) {
      await client.query(
        `
          INSERT INTO categories (id, "userId", name, color, icon, "isDefault", type, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id)
          DO UPDATE SET
            "userId" = EXCLUDED."userId",
            name = EXCLUDED.name,
            color = EXCLUDED.color,
            icon = EXCLUDED.icon,
            "isDefault" = EXCLUDED."isDefault",
            type = EXCLUDED.type,
            "updatedAt" = EXCLUDED."updatedAt"
        `,
        [
          category.id,
          category.userId,
          category.name,
          category.color,
          category.icon,
          category.isDefault,
          category.type,
          now,
          now,
        ],
      );
    }

    for (const transaction of transactionsSeed) {
      await client.query(
        `
          INSERT INTO transactions (
            id, "userId", description, amount, date, notes, type,
            "createdAt", "updatedAt", "categoryId", tag, "paymentMethod"
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id)
          DO UPDATE SET
            "userId" = EXCLUDED."userId",
            description = EXCLUDED.description,
            amount = EXCLUDED.amount,
            date = EXCLUDED.date,
            notes = EXCLUDED.notes,
            type = EXCLUDED.type,
            "updatedAt" = EXCLUDED."updatedAt",
            "categoryId" = EXCLUDED."categoryId",
            tag = EXCLUDED.tag,
            "paymentMethod" = EXCLUDED."paymentMethod"
        `,
        [
          transaction.id,
          transaction.userId,
          transaction.description,
          transaction.amount,
          transaction.date,
          transaction.notes,
          transaction.type,
          now,
          now,
          transaction.categoryId,
          transaction.tag,
          transaction.paymentMethod,
        ],
      );
    }

    for (const budget of budgetsSeed) {
      await client.query(
        `
          INSERT INTO budgets (id, "userId", amount, "createdAt", "updatedAt", "categoryId", "budgetMonth")
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id)
          DO UPDATE SET
            "userId" = EXCLUDED."userId",
            amount = EXCLUDED.amount,
            "updatedAt" = EXCLUDED."updatedAt",
            "categoryId" = EXCLUDED."categoryId",
            "budgetMonth" = EXCLUDED."budgetMonth"
        `,
        [
          budget.id,
          budget.userId,
          budget.amount,
          now,
          now,
          budget.categoryId,
          budget.budgetMonth,
        ],
      );
    }

    await client.query('COMMIT');

    console.log('Seed concluido com sucesso.');
    console.log(`users: ${usersSeed.length}`);
    console.log(`categories: ${categoriesSeed.length}`);
    console.log(`transactions: ${transactionsSeed.length}`);
    console.log(`budgets: ${budgetsSeed.length}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed().catch((error) => {
  console.error('Erro ao executar seed:', error);
  process.exit(1);
});
