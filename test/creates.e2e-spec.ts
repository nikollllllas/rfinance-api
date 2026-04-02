import 'dotenv/config';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransactionType } from '../src/infrastructure/drizzle/schema';

const shouldRun = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);

(shouldRun ? describe : describe.skip)('Creates (e2e, DB)', () => {
  let app: INestApplication<App>;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria categoria, orçamento e transação (inserts persistem)', async () => {
    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'admin@rfinance.local', password: 'Admin@123' })
      .expect(200);

    const token = login.body.accessToken as string;
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

    const budgetMonth = `2030-${String((suffix % 12) + 1).padStart(2, '0')}`;
    await request(app.getHttpServer())
      .post('/v1/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 100.5,
        budgetMonth,
        categoryId,
      })
      .expect(201);

    await request(app.getHttpServer())
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
  });
});
