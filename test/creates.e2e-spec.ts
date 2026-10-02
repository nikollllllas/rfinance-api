import 'dotenv/config';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { DrizzleService } from '../src/infrastructure/drizzle/drizzle.service';
import { TransactionType } from '../src/infrastructure/drizzle/schema';

const shouldRun = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);

const tokenFrom = (res: request.Response): string => {
  const raw = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const cookie = raw.find((c) => c.startsWith('rfinance_token='));
  if (!cookie) throw new Error('login sem cookie de sessão');
  return decodeURIComponent(cookie.split(';')[0].split('=')[1]);
};

(shouldRun ? describe : describe.skip)('Creates (e2e, DB)', () => {
  let app: INestApplication<App>;
  let drizzle: DrizzleService;
  const createdCategoryIds = new Set<string>();
  const createdBudgetIds = new Set<string>();
  const createdTransactionIds = new Set<string>();
  const createdUserIds = new Set<string>();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    drizzle = app.get(DrizzleService);
    await drizzle.db.execute(sql`
      CREATE TABLE IF NOT EXISTS password_recovery_tokens (
        "id" uuid PRIMARY KEY,
        "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
        "tokenHash" text NOT NULL UNIQUE,
        "expiresAt" timestamp NOT NULL,
        "usedAt" timestamp,
        "createdAt" timestamp NOT NULL
      );
    `);
  });

  afterEach(async () => {
    const transactionIds = Array.from(createdTransactionIds);
    if (transactionIds.length > 0) {
      await drizzle.db.execute(sql`
        DELETE FROM transactions
        WHERE id IN (${sql.join(
          transactionIds.map((id) => sql`${id}`),
          sql`, `,
        )})
      `);
      createdTransactionIds.clear();
    }

    const budgetIds = Array.from(createdBudgetIds);
    if (budgetIds.length > 0) {
      await drizzle.db.execute(sql`
        DELETE FROM budgets
        WHERE id IN (${sql.join(
          budgetIds.map((id) => sql`${id}`),
          sql`, `,
        )})
      `);
      createdBudgetIds.clear();
    }

    const categoryIds = Array.from(createdCategoryIds);
    if (categoryIds.length > 0) {
      await drizzle.db.execute(sql`
        DELETE FROM categories
        WHERE id IN (${sql.join(
          categoryIds.map((id) => sql`${id}`),
          sql`, `,
        )})
      `);
      createdCategoryIds.clear();
    }

    const userIds = Array.from(createdUserIds);
    if (userIds.length > 0) {
      await drizzle.db.execute(sql`
        DELETE FROM users
        WHERE id IN (${sql.join(
          userIds.map((id) => sql`${id}`),
          sql`, `,
        )})
      `);
      createdUserIds.clear();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria categoria, orçamento e transação (com limpeza pós-teste)', async () => {
    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'admin@rfinance.local', password: 'Admin@123' })
      .expect(200);

    const token = tokenFrom(login);
    expect(token).toBeDefined();

    const suffix = Date.now();
    const categoryRes = await request(app.getHttpServer())
      .post('/v1/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `E2E-Cat-${suffix}`,
        color: '#112233',
        type: 'GASTO',
        isDefault: false,
      })
      .expect(201);

    const categoryId = categoryRes.body.id as string;
    expect(categoryId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    createdCategoryIds.add(categoryId);

    const budgetMonth = `2030-${String((suffix % 12) + 1).padStart(2, '0')}`;
    const budgetRes = await request(app.getHttpServer())
      .post('/v1/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 100.5,
        budgetMonth,
        categoryId,
      })
      .expect(201);
    if (budgetRes.body?.id) {
      createdBudgetIds.add(String(budgetRes.body.id));
    }

    const transactionRes = await request(app.getHttpServer())
      .post('/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'E2E tx',
        amount: 0.01,
        date: new Date('2030-06-15T12:00:00.000Z').toISOString(),
        type: TransactionType.GANHO,
        categoryId,
        notes: 'e2e',
        tag: 'ECONOMIA',
      })
      .expect(201);
    for (const tx of transactionRes.body?.transactions ?? []) {
      createdTransactionIds.add(String(tx.id));
    }
  });

  it('cria usuário, atualiza perfil e recupera senha com token', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'admin@rfinance.local', password: 'Admin@123' })
      .expect(200);

    const adminToken = tokenFrom(adminLogin);
    const suffix = Date.now();
    const userEmail = `e2e-user-${suffix}@rfinance.local`;
    const initialPassword = 'Initial@123';
    const resetByAdminPassword = 'AdminReset@123';
    const finalPassword = 'FinalReset@123';

    const createdUser = await request(app.getHttpServer())
      .post('/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `E2E User ${suffix}`,
        email: userEmail,
        password: initialPassword,
        role: 'USER',
      })
      .expect(201);

    const userId = createdUser.body.id as string;
    expect(userId).toBeDefined();
    createdUserIds.add(userId);

    const userLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: userEmail, password: initialPassword })
      .expect(200);
    const userToken = tokenFrom(userLogin);

    await request(app.getHttpServer())
      .put('/v1/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: `E2E User Updated ${suffix}` })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/v1/users/${userId}/password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: resetByAdminPassword })
      .expect(200);

    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: userEmail, password: initialPassword })
      .expect(401);

    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: userEmail, password: resetByAdminPassword })
      .expect(200);

    const forgotPassword = await request(app.getHttpServer())
      .post('/v1/auth/forgot-password')
      .send({ email: userEmail })
      .expect(200);

    const recoveryToken = forgotPassword.body.resetToken as string;
    expect(recoveryToken).toBeDefined();

    await request(app.getHttpServer())
      .post('/v1/auth/reset-password')
      .send({ token: recoveryToken, password: finalPassword })
      .expect(200);

    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: userEmail, password: finalPassword })
      .expect(200);
  });

  it('logout revoga o token mesmo se ele for reapresentado', async () => {
    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'admin@rfinance.local', password: 'Admin@123' })
      .expect(200);
    const token = tokenFrom(login);
    expect(login.body.accessToken).toBeUndefined();

    await request(app.getHttpServer())
      .post('/v1/auth/logout')
      .set('Cookie', `rfinance_token=${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('usuário novo nasce com as categorias padrão', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'admin@rfinance.local', password: 'Admin@123' })
      .expect(200);
    const adminToken = tokenFrom(adminLogin);

    const suffix = Date.now();
    const email = `e2e-defaults-${suffix}@rfinance.local`;
    const password = 'Initial@123';
    const created = await request(app.getHttpServer())
      .post('/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `E2E Defaults ${suffix}`, email, password, role: 'USER' })
      .expect(201);
    createdUserIds.add(created.body.id as string);

    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password })
      .expect(200);

    const list = await request(app.getHttpServer())
      .get('/v1/categories')
      .set('Authorization', `Bearer ${tokenFrom(login)}`)
      .expect(200);

    const names = (list.body as Array<{ name: string }>).map((c) => c.name).sort();
    expect(names).toEqual(
      ['Alimentação', 'Compras', 'Moradia', 'Outros', 'Salário', 'Saúde', 'Transporte'],
    );
  });

  it('categoria com transação não pode ser excluída até a transação sair', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'admin@rfinance.local', password: 'Admin@123' })
      .expect(200);

    const suffix = Date.now();
    const email = `e2e-delete-${suffix}@rfinance.local`;
    const password = 'Initial@123';
    const created = await request(app.getHttpServer())
      .post('/v1/users')
      .set('Authorization', `Bearer ${tokenFrom(adminLogin)}`)
      .send({ name: `E2E Delete ${suffix}`, email, password, role: 'USER' })
      .expect(201);
    createdUserIds.add(created.body.id as string);

    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const token = tokenFrom(login);

    const list = await request(app.getHttpServer())
      .get('/v1/categories')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const food = (list.body as Array<{ id: string; name: string }>).find(
      (c) => c.name === 'Alimentação',
    );
    expect(food).toBeDefined();

    const tx = await request(app.getHttpServer())
      .post('/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'E2E mercado',
        amount: 10,
        date: new Date('2030-06-15T12:00:00.000Z').toISOString(),
        type: TransactionType.GASTO,
        categoryId: food!.id,
      })
      .expect(201);
    const transactionId = String(tx.body.transactions[0].id);

    const listWithUsage = await request(app.getHttpServer())
      .get('/v1/categories')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const foodWithUsage = (
      listWithUsage.body as Array<{ id: string; transactionCount: number; budgetCount: number }>
    ).find((c) => c.id === food!.id);
    expect(foodWithUsage).toMatchObject({ transactionCount: 1, budgetCount: 0 });

    await request(app.getHttpServer())
      .delete(`/v1/categories/${food!.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);

    await request(app.getHttpServer())
      .delete(`/v1/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/v1/categories/${food!.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('orçamento com transação no mês não pode ser excluído até a transação sair', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'admin@rfinance.local', password: 'Admin@123' })
      .expect(200);

    const suffix = Date.now();
    const email = `e2e-budget-${suffix}@rfinance.local`;
    const password = 'Initial@123';
    const created = await request(app.getHttpServer())
      .post('/v1/users')
      .set('Authorization', `Bearer ${tokenFrom(adminLogin)}`)
      .send({ name: `E2E Budget ${suffix}`, email, password, role: 'USER' })
      .expect(201);
    createdUserIds.add(created.body.id as string);

    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const token = tokenFrom(login);

    const list = await request(app.getHttpServer())
      .get('/v1/categories')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const food = (list.body as Array<{ id: string; name: string }>).find(
      (c) => c.name === 'Alimentação',
    )!;

    const budget = await request(app.getHttpServer())
      .post('/v1/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 500, budgetMonth: '2030-06', categoryId: food.id })
      .expect(201);
    const budgetId = String(budget.body.id);

    const tx = await request(app.getHttpServer())
      .post('/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'E2E mercado',
        amount: 10,
        date: new Date('2030-06-15T12:00:00.000Z').toISOString(),
        type: TransactionType.GASTO,
        categoryId: food.id,
      })
      .expect(201);
    const transactionId = String(tx.body.transactions[0].id);

    const progress = await request(app.getHttpServer())
      .get(`/v1/budgets/${budgetId}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(progress.body.transactionCount).toBe(1);

    await request(app.getHttpServer())
      .delete(`/v1/budgets/${budgetId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);

    await request(app.getHttpServer())
      .delete(`/v1/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/v1/budgets/${budgetId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('cadastro público cria USER com categorias e recusa role no body', async () => {
    const suffix = Date.now();
    const email = `e2e-register-${suffix}@rfinance.local`;

    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ name: 'Hacker', email: `x-${email}`, password: 'Senha@123', role: 'ADMIN' })
      .expect(422);

    const res = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ name: `E2E Register ${suffix}`, email, password: 'Senha@123' })
      .expect(201);
    createdUserIds.add(res.body.user.id as string);
    expect(res.body.user.role).toBe('USER');

    const categoriesRes = await request(app.getHttpServer())
      .get('/v1/categories')
      .set('Authorization', `Bearer ${tokenFrom(res)}`)
      .expect(200);
    expect(categoriesRes.body).toHaveLength(7);

    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ name: 'Dup', email, password: 'Senha@123' })
      .expect(409);
  });
});
