# Categorias padrão + onboarding de Orçamentos — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Todo usuário novo nasce com categorias prontas (editáveis e excluíveis); categoria ou orçamento com transações não pode ser excluído (e o botão aparece desabilitado); qualquer pessoa pode criar conta pela tela de registro; a web deixa de exigir "criar categoria antes" para usar Orçamentos/Transações.

**Architecture:** API (NestJS + Drizzle): o `DrizzleUsersRepository.create` insere usuário + categorias padrão numa única transação de banco, então tanto o cadastro pelo admin quanto o novo `POST /v1/auth/register` herdam as categorias. `CategoriesService` deixa de tratar `isDefault` como bloqueio; a regra de exclusão é "sem transações e sem orçamentos". `BudgetsService.remove` passa a recusar orçamento com transações da categoria no mês. A listagem de categorias e o progresso do orçamento passam a devolver contagens de uso, que a web usa para desabilitar a lixeira antes do clique (a API continua sendo a garantia). A FK `transactions.categoryId` (sem `ON DELETE`) garante a regra de categoria no banco mesmo sob corrida. Web (Next.js): regenera o cliente kubb, remove os bloqueios de `isDefault`, mostra a mensagem real da API, cria categoria de dentro dos diálogos, adiciona `/register` e corrige bugs/clareza listados.

**Tech Stack:** API: NestJS 11, Drizzle ORM 0.45, Postgres, Jest (pnpm). Web: Next.js (App Router), Radix/shadcn, kubb + react-query (bun).

**Spec:** Análise de UX feita na conversa de 2026-10-01 (resumo em "Contexto" abaixo).

## Contexto

- Hoje `UsersService.create` não cria categorias; `isDefault` só existe no seed de dev. Usuário novo abre "Novo Orçamento" e vê "Nenhuma categoria disponível".
- `CategoriesService.remove` já bloqueia exclusão com transações/orçamentos (409), mas também bloqueia `isDefault` (403) — isso precisa sair.
- `useCategories().removeCategory` mostra toast em inglês com `err.message` do axios ("Request failed with status code 409") e a página mostra outro toast igual: a mensagem da API nunca chega ao usuário.
- Bug: `budget-create-dialog.tsx` guarda o mês escolhido em `month` mas envia `budgetMonth`, que nunca muda → todo orçamento vai para o mês atual.
- `BudgetsService.remove` hoje apaga qualquer orçamento, sem checar transações.
- Não existe rota pública de cadastro: o único caminho é `POST /v1/users` (exige `USERS_MANAGE`). O cliente kubb em `web/lib/api/auth/` só tem login, logout, me, forgot e reset. A Task 5 cria a rota; a Task 7 regenera o cliente.

## Global Constraints

- Dois repositórios git independentes: `api/` e `web/` (ambos hoje em `feat/security-hardening`). Commits separados em cada um.
- NUNCA adicionar `Co-Authored-By: Claude`, "Generated with Claude Code" ou qualquer atribuição ao Claude em commits/PRs.
- Textos de UI e mensagens de erro em português (pt-BR).
- Ícones de categoria usam nomes lucide em PascalCase (mesma lista de `web/components/category-icon-picker.tsx`).
- Regra de exclusão de categoria: com **transações ou orçamentos** não pode ser excluída; ao excluir os lançamentos, volta a ser excluível. Nada de cascade em transações.
- Regra de exclusão de orçamento: não pode ser excluído se existir **qualquer transação (ganho ou gasto) da sua categoria dentro do seu mês**; sem elas, volta a ser excluível.
- Botão de excluir desabilitado na web quando a contagem de uso > 0, com texto explicando o motivo. A API sempre revalida (409).
- Cadastro público sempre cria `role: USER`; o DTO de registro não aceita `role` (`forbidNonWhitelisted` responde 422).
- `isDefault` continua no schema/DTO só como marcador de origem; não restringe edição nem exclusão.
- Web não tem suíte de testes: verificação = `bunx tsc --noEmit` sem erros novos + checagem manual descrita em cada task.

---

### Task 1: API — criar categorias padrão junto com o usuário

**Files:**
- Create: `api/src/modules/categories/default-categories.ts`
- Modify: `api/src/modules/users/drizzle-users.repository.ts:1-46`
- Test: `api/test/creates.e2e-spec.ts` (novo `it`)

**Interfaces:**
- Produces: `DEFAULT_CATEGORIES: ReadonlyArray<{ name: string; color: string; icon: string; type: CategoryType }>` exportado de `api/src/modules/categories/default-categories.ts` (usado também na Task 6 como referência dos valores).

- [ ] **Step 0: Branch**

```bash
cd api && git checkout -b feat/default-categories
```

- [ ] **Step 1: Escrever o teste e2e que falha**

Adicionar ao final do `describe` em `api/test/creates.e2e-spec.ts` (antes do `});` final):

```ts
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
```

(A limpeza do `afterEach` apaga o usuário; `categories.userId` tem `ON DELETE CASCADE`.)

- [ ] **Step 2: Rodar e ver falhar**

Pré-requisito: Postgres local com migrations e seed (`pnpm db:up && pnpm db:migrate && pnpm db:seed`) e `.env` com `DATABASE_URL` e `JWT_SECRET`.

Run: `cd api && pnpm test:e2e -t "categorias padrão"`
Expected: FAIL — `expect(names).toEqual(...)` recebe `[]`.

- [ ] **Step 3: Criar a lista de categorias padrão**

`api/src/modules/categories/default-categories.ts`:

```ts
import { CategoryType } from '../../infrastructure/drizzle/schema';

// Criadas para todo usuário novo. Pertencem ao usuário: podem ser editadas e excluídas.
export const DEFAULT_CATEGORIES: ReadonlyArray<{
  name: string;
  color: string;
  icon: string;
  type: CategoryType;
}> = [
  { name: 'Salário', color: '#16A34A', icon: 'Wallet', type: 'GANHO' },
  { name: 'Alimentação', color: '#F97316', icon: 'UtensilsCrossed', type: 'GASTO' },
  { name: 'Moradia', color: '#2563EB', icon: 'Home', type: 'GASTO' },
  { name: 'Transporte', color: '#F59E0B', icon: 'Car', type: 'GASTO' },
  { name: 'Saúde', color: '#DC2626', icon: 'HeartPulse', type: 'GASTO' },
  { name: 'Compras', color: '#9333EA', icon: 'ShoppingBag', type: 'GASTO' },
  { name: 'Outros', color: '#6B7280', icon: 'Tag', type: 'AMBOS' },
];
```

- [ ] **Step 4: Inserir usuário + categorias na mesma transação**

Em `api/src/modules/users/drizzle-users.repository.ts`, ajustar o import do schema e o `create`:

```ts
import { categories, passwordRecoveryTokens, users } from '../../infrastructure/drizzle/schema';
import { DEFAULT_CATEGORIES } from '../categories/default-categories';
```

```ts
  async create(data: CreateUserInput): Promise<UserRecord> {
    return this.drizzle.db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values(data).returning();
      await tx.insert(categories).values(
        DEFAULT_CATEGORIES.map((category) => ({
          ...category,
          userId: user.id,
          isDefault: true,
        })),
      );
      return { ...user, role: user.role as Role };
    });
  }
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd api && pnpm test:e2e -t "categorias padrão" && pnpm test`
Expected: PASS em ambos (unit tests não mudam: `UsersService` mocka o repositório).

- [ ] **Step 6: Commit**

```bash
cd api && git add src/modules/categories/default-categories.ts src/modules/users/drizzle-users.repository.ts test/creates.e2e-spec.ts
git commit -m "feat(users): cria categorias padrão ao criar usuário"
```

---

### Task 2: API — categorias padrão editáveis/excluíveis; exclusão só sem lançamentos

**Files:**
- Modify: `api/src/modules/categories/categories.service.ts:1-6, 48-103`
- Test: `api/src/modules/categories/categories.service.spec.ts`, `api/test/creates.e2e-spec.ts`

**Interfaces:**
- Consumes: categorias padrão da Task 1 (e2e usa "Alimentação").
- Produces: `DELETE /v1/categories/:id` → 200 se sem transações/orçamentos; 409 com mensagem pt-BR caso contrário (independe de `isDefault`). `PATCH` de categoria padrão aceita `name`/`type`.

- [ ] **Step 1: Testes unitários que falham**

Adicionar a `api/src/modules/categories/categories.service.spec.ts` (antes do `});` final):

```ts
  it('deve permitir excluir categoria padrão sem lançamentos', async () => {
    (repository.findByIdAndUserId as jest.Mock).mockResolvedValue({
      id: 'category-id',
      isDefault: true,
    });
    (repository.countTransactionsByCategory as jest.Mock).mockResolvedValue(0);
    (repository.countBudgetsByCategory as jest.Mock).mockResolvedValue(0);
    (repository.delete as jest.Mock).mockResolvedValue({ id: 'category-id' });

    await service.remove('category-id', regularUser);

    expect(repository.delete).toHaveBeenCalledWith('category-id', regularUser.userId);
  });

  it('deve bloquear (409) exclusão de categoria com transações, mesmo padrão', async () => {
    (repository.findByIdAndUserId as jest.Mock).mockResolvedValue({
      id: 'category-id',
      isDefault: true,
    });
    (repository.countTransactionsByCategory as jest.Mock).mockResolvedValue(2);

    await expect(service.remove('category-id', regularUser)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('deve bloquear (409) exclusão de categoria com orçamentos', async () => {
    (repository.findByIdAndUserId as jest.Mock).mockResolvedValue({
      id: 'category-id',
      isDefault: false,
    });
    (repository.countTransactionsByCategory as jest.Mock).mockResolvedValue(0);
    (repository.countBudgetsByCategory as jest.Mock).mockResolvedValue(1);

    await expect(service.remove('category-id', regularUser)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('deve permitir renomear categoria padrão', async () => {
    (repository.findByIdAndUserId as jest.Mock).mockResolvedValue({
      id: 'category-id',
      name: 'Saúde',
      isDefault: true,
    });
    (repository.findByNameAndUserId as jest.Mock).mockResolvedValue(null);
    (repository.update as jest.Mock).mockResolvedValue({ id: 'category-id' });

    await service.update('category-id', regularUser, { name: 'Farmácia', type: 'GASTO' });

    expect(repository.update).toHaveBeenCalledWith(
      'category-id',
      regularUser.userId,
      expect.objectContaining({ name: 'Farmácia', type: 'GASTO' }),
    );
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd api && pnpm test -- categories.service`
Expected: FAIL — "excluir categoria padrão" lança `ForbiddenException`; "renomear categoria padrão" recebe payload sem `name`/`type`.

- [ ] **Step 3: Remover as restrições de `isDefault`**

Em `api/src/modules/categories/categories.service.ts`:

Imports — tirar `ForbiddenException`:

```ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
```

`update` — substituir o bloco que começa em `const payload` até o `if (payload.name ...` por:

```ts
    const existing = await this.getById(id, user.userId);
    const payload: UpdateCategoryDto = { ...dto };
    delete payload.isDefault;
```

(mantém o restante: checagem de nome duplicado e `repository.update`.)

`remove` — apagar o bloco `if (existing.isDefault) { throw new ForbiddenException(...) }` e trocar `const existing = await this.getById(...)` por `await this.getById(id, user.userId);`. Ajustar as mensagens:

```ts
      throw new ConflictException(
        'Esta categoria tem transações lançadas. Exclua ou mova essas transações para outra categoria antes de excluí-la.',
      );
```

```ts
      throw new ConflictException(
        'Esta categoria tem orçamentos. Exclua esses orçamentos antes de excluí-la.',
      );
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd api && pnpm test -- categories.service`
Expected: PASS (inclusive os 4 testes antigos).

- [ ] **Step 5: e2e do ciclo completo (lança → bloqueia → apaga lançamento → libera)**

Adicionar a `api/test/creates.e2e-spec.ts`:

```ts
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
```

Run: `cd api && pnpm test:e2e`
Expected: PASS (todos os e2e).

- [ ] **Step 6: Commit**

```bash
cd api && git add src/modules/categories/categories.service.ts src/modules/categories/categories.service.spec.ts test/creates.e2e-spec.ts
git commit -m "feat(categories): categorias padrão editáveis e excluíveis quando sem lançamentos"
```

---

### Task 3: API — orçamento com transações no mês não pode ser excluído; progresso devolve `transactionCount`

**Files:**
- Modify: `api/src/modules/budgets/budgets.repository.ts` (novo método abstrato)
- Modify: `api/src/modules/budgets/drizzle-budgets.repository.ts:2, fim da classe`
- Modify: `api/src/modules/budgets/budgets.service.ts:93-97, 138-162`
- Modify: `api/src/modules/budgets/dto/budget-response.dto.ts` (`BudgetProgressResponseDto`)
- Test: `api/src/modules/budgets/budgets.service.spec.ts`, `api/test/creates.e2e-spec.ts`

**Interfaces:**
- Produces: `BudgetsRepository.countTransactionsByCategoryInRange(userId: string, categoryId: string, startDate: Date, endDate: Date): Promise<number>` (conta ganho **e** gasto).
- Produces: `GET /v1/budgets/:id/progress` passa a incluir `transactionCount: number`. `DELETE /v1/budgets/:id` → 409 quando `transactionCount > 0`.

- [ ] **Step 1: Testes unitários que falham**

Em `api/src/modules/budgets/budgets.service.spec.ts`, adicionar ao `useValue` do repositório:

```ts
            countTransactionsByCategoryInRange: jest.fn(),
```

Substituir o teste `'deve repassar o userId para o repository.delete'` e adicionar o de conflito:

```ts
  it('deve repassar o userId para o repository.delete', async () => {
    (repository.findByIdAndUserId as jest.Mock).mockResolvedValue({
      id: 'budget-1',
      categoryId: 'cat-1',
      budgetMonth: '2026-03',
    });
    (repository.countTransactionsByCategoryInRange as jest.Mock).mockResolvedValue(0);
    (repository.delete as jest.Mock).mockResolvedValue({ id: 'budget-1' });

    await service.remove('budget-1', 'user-1');

    expect(repository.countTransactionsByCategoryInRange).toHaveBeenCalledWith(
      'user-1',
      'cat-1',
      new Date(2026, 2, 1),
      expect.any(Date),
    );
    expect(repository.delete).toHaveBeenCalledWith('budget-1', 'user-1');
  });

  it('deve bloquear (409) exclusão de orçamento com transações no mês', async () => {
    (repository.findByIdAndUserId as jest.Mock).mockResolvedValue({
      id: 'budget-1',
      categoryId: 'cat-1',
      budgetMonth: '2026-03',
    });
    (repository.countTransactionsByCategoryInRange as jest.Mock).mockResolvedValue(3);

    await expect(service.remove('budget-1', 'user-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd api && pnpm test -- budgets.service`
Expected: FAIL — `countTransactionsByCategoryInRange` nunca é chamado e o orçamento é apagado.

- [ ] **Step 3: Método no repositório**

`api/src/modules/budgets/budgets.repository.ts`, dentro da classe:

```ts
  countTransactionsByCategoryInRange(
    _userId: string,
    _categoryId: string,
    _startDate: Date,
    _endDate: Date,
  ): Promise<number> {
    throw new Error('Not implemented');
  }
```

`api/src/modules/budgets/drizzle-budgets.repository.ts` — import `import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';` e, no fim da classe:

```ts
  async countTransactionsByCategoryInRange(
    userId: string,
    categoryId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const rows = await this.drizzle.db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.categoryId, categoryId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
        ),
      );
    return Number(rows[0]?.count ?? 0);
  }
```

- [ ] **Step 4: Service — regra no `remove` e contagem no `getProgress`**

Em `api/src/modules/budgets/budgets.service.ts`, adicionar o helper (junto de `ensureValidMonth`):

```ts
  private monthRange(budgetMonth: string) {
    const [year, month] = budgetMonth.split('-').map(Number);
    const reference = new Date(year, month - 1);
    return { startDate: startOfMonth(reference), endDate: endOfMonth(reference) };
  }
```

`remove`:

```ts
  async remove(id: string, userId: string) {
    const budget = await this.getById(id, userId);
    const { startDate, endDate } = this.monthRange(budget.budgetMonth);
    const transactionCount = await this.budgetsRepository.countTransactionsByCategoryInRange(
      userId,
      budget.categoryId,
      startDate,
      endDate,
    );
    if (transactionCount > 0) {
      throw new ConflictException(
        'Este orçamento tem transações lançadas no mês. Exclua ou mova essas transações antes de excluí-lo.',
      );
    }
    await this.budgetsRepository.delete(id, userId);
    return { message: 'Orçamento apagado com sucesso' };
  }
```

`getProgress` — trocar as 4 primeiras linhas e a busca por:

```ts
    const budget = await this.getById(id, userId);
    const { startDate, endDate } = this.monthRange(budget.budgetMonth);

    const [transactions, transactionCount] = await Promise.all([
      this.budgetsRepository.findExpensesByCategoryInRange(
        userId,
        budget.categoryId,
        startDate,
        endDate,
      ),
      this.budgetsRepository.countTransactionsByCategoryInRange(
        userId,
        budget.categoryId,
        startDate,
        endDate,
      ),
    ]);
```

e incluir `transactionCount,` no objeto retornado (depois de `isOverBudget`).

`BudgetProgressResponseDto` em `dto/budget-response.dto.ts`:

```ts
  @ApiProperty({ example: 3, description: 'Transações (ganho ou gasto) da categoria no mês' })
  transactionCount!: number;
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd api && pnpm test -- budgets.service`
Expected: PASS.

- [ ] **Step 6: e2e**

Adicionar a `api/test/creates.e2e-spec.ts`:

```ts
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
```

Run: `cd api && pnpm test:e2e`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd api && git add src/modules/budgets test/creates.e2e-spec.ts
git commit -m "feat(budgets): bloqueia exclusão de orçamento com transações no mês"
```

---

### Task 4: API — listagem de categorias devolve contagens de uso

**Files:**
- Modify: `api/src/modules/categories/categories.repository.ts` (tipo + assinatura)
- Modify: `api/src/modules/categories/drizzle-categories.repository.ts:1-20`
- Modify: `api/src/modules/categories/categories.service.ts` (`list`)
- Modify: `api/src/modules/categories/dto/category-response.dto.ts`
- Modify: `api/src/modules/categories/categories.controller.ts:24-29`
- Test: `api/test/creates.e2e-spec.ts`

**Interfaces:**
- Produces: `export type CategoryWithUsage = DbCategory & { transactionCount: number; budgetCount: number }` em `categories.repository.ts`.
- Produces: `GET /v1/categories` → cada item com `transactionCount` e `budgetCount` (inteiros). Demais endpoints de categoria não mudam.

- [ ] **Step 1: e2e que falha**

Na Task 2, o teste `'categoria com transação não pode ser excluída até a transação sair'` já cria uma transação em "Alimentação". Logo depois do `POST /v1/transactions` (antes do primeiro `DELETE`), inserir:

```ts
    const listWithUsage = await request(app.getHttpServer())
      .get('/v1/categories')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const foodWithUsage = (
      listWithUsage.body as Array<{ id: string; transactionCount: number; budgetCount: number }>
    ).find((c) => c.id === food!.id);
    expect(foodWithUsage).toMatchObject({ transactionCount: 1, budgetCount: 0 });
```

Run: `cd api && pnpm test:e2e -t "categoria com transação"`
Expected: FAIL — `transactionCount` é `undefined`.

- [ ] **Step 2: Tipo e assinatura do repositório**

`api/src/modules/categories/categories.repository.ts`:

```ts
export type CategoryWithUsage = DbCategory & {
  transactionCount: number;
  budgetCount: number;
};
```

```ts
  findAllByUserId(_userId: string): Promise<CategoryWithUsage[]> {
    throw new Error('Not implemented');
  }
```

- [ ] **Step 3: Query com subconsultas de contagem**

`api/src/modules/categories/drizzle-categories.repository.ts` — adicionar `getTableColumns` ao import de `drizzle-orm` e `CategoryWithUsage` ao import de `./categories.repository`, e trocar `findAllByUserId`:

```ts
  async findAllByUserId(userId: string): Promise<CategoryWithUsage[]> {
    const rows = await this.drizzle.db
      .select({
        ...getTableColumns(categories),
        transactionCount: sql<number>`(select count(*)::int from "transactions" t where t."categoryId" = "categories"."id")`,
        budgetCount: sql<number>`(select count(*)::int from "budgets" b where b."categoryId" = "categories"."id")`,
      })
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(categories.name);
    return rows as unknown as CategoryWithUsage[];
  }
```

`categories.service.ts`:

```ts
  list(userId: string): Promise<CategoryWithUsage[]> {
    return this.categoriesRepository.findAllByUserId(userId);
  }
```

(import `CategoryWithUsage` de `./categories.repository`.)

- [ ] **Step 4: DTO de listagem**

No fim de `api/src/modules/categories/dto/category-response.dto.ts`:

```ts
export class CategoryListItemDto extends CategoryResponseDto {
  @ApiProperty({ example: 4, description: 'Transações lançadas nesta categoria' })
  transactionCount!: number;

  @ApiProperty({ example: 1, description: 'Orçamentos que usam esta categoria' })
  budgetCount!: number;
}
```

`categories.controller.ts`, no `@Get()`: `@ApiOkResponse({ type: CategoryListItemDto, isArray: true })` (e importar `CategoryListItemDto`).

- [ ] **Step 5: Rodar e ver passar**

Run: `cd api && pnpm test && pnpm test:e2e`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd api && git add src/modules/categories test/creates.e2e-spec.ts
git commit -m "feat(categories): listagem informa transações e orçamentos de cada categoria"
```

---

### Task 5: API — cadastro público `POST /v1/auth/register`

**Files:**
- Create: `api/src/modules/auth/dto/register.dto.ts`
- Modify: `api/src/modules/audit/audit.service.ts:6-15` (nova ação)
- Modify: `api/src/modules/auth/auth.service.ts` (método `register`)
- Modify: `api/src/modules/auth/auth.controller.ts` (rota)
- Test: `api/src/modules/auth/auth.service.spec.ts`, `api/test/creates.e2e-spec.ts`

**Interfaces:**
- Consumes: `UsersService.create(input: CreateUserInput)` (que, desde a Task 1, já cria as categorias padrão).
- Produces: `POST /v1/auth/register` body `{ name: string; email: string; password: string }` → 201 `{ user }` + cookie de sessão (mesmo formato do login); 409 e-mail em uso; 422 se vier `role` ou campo extra. Operação kubb esperada: `authControllerRegister` / hook `useAuthControllerRegister` (confirmar o nome gerado na Task 7).

- [ ] **Step 1: Teste unitário que falha**

Em `api/src/modules/auth/auth.service.spec.ts`, adicionar `create: jest.fn(),` ao `useValue` de `UsersService` e o teste:

```ts
  it('register cria usuário com role USER e inicia sessão', async () => {
    (usersService.create as jest.Mock).mockResolvedValue({ id: 'new-user' });
    const loginSpy = jest.spyOn(service, 'login').mockResolvedValue({
      accessToken: 'token',
      user: { id: 'new-user', name: 'Nova', email: 'nova@x.com', role: Role.USER },
    });

    await expect(
      service.register({ name: 'Nova', email: 'nova@x.com', password: 'Senha@123' }),
    ).resolves.toMatchObject({ accessToken: 'token' });

    expect(usersService.create).toHaveBeenCalledWith({
      name: 'Nova',
      email: 'nova@x.com',
      password: 'Senha@123',
      role: Role.USER,
    });
    expect(auditService.log).toHaveBeenCalledWith('auth.register', 'new-user');
    expect(loginSpy).toHaveBeenCalledWith({ email: 'nova@x.com', password: 'Senha@123' });
  });
```

Run: `cd api && pnpm test -- auth.service`
Expected: FAIL — `service.register is not a function`.

- [ ] **Step 2: DTO**

`api/src/modules/auth/dto/register.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @MinLength(1, { message: 'Nome é obrigatório' })
  name!: string;

  @ApiProperty({ example: 'maria@email.com' })
  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @ApiProperty({ example: 'Senha@123' })
  @IsString()
  @MinLength(6, { message: 'A senha precisa ter ao menos 6 caracteres' })
  password!: string;
}
```

- [ ] **Step 3: Ação de auditoria + service**

`audit.service.ts`: adicionar `| 'auth.register'` à união `AuditAction`.

`auth.service.ts` (imports de `RegisterDto` e `Role` se faltarem):

```ts
  async register(dto: RegisterDto) {
    const user = await this.usersService.create({ ...dto, role: Role.USER });
    await this.audit.log('auth.register', user.id);
    return this.login({ email: dto.email, password: dto.password });
  }
```

- [ ] **Step 4: Rota**

`auth.controller.ts` — importar `ApiCreatedResponse` de `@nestjs/swagger` e `RegisterDto`; adicionar depois do `login`:

```ts
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('register')
  @HttpCode(201)
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ description: 'Conta criada e sessão iniciada', type: LoginResponseDto })
  @ApiResponse({ status: 409, description: 'E-mail já está em uso' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const { accessToken, user } = await this.authService.register(dto);
    res.cookie(AUTH_COOKIE_NAME, accessToken, authCookieOptions());
    return { user };
  }
```

Run: `cd api && pnpm test -- auth.service`
Expected: PASS.

- [ ] **Step 5: e2e**

```ts
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
```

Run: `cd api && pnpm test:e2e`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd api && git add src/modules/auth src/modules/audit/audit.service.ts test/creates.e2e-spec.ts
git commit -m "feat(auth): cadastro público de usuário"
```

---

### Task 6 (opcional — confirmar antes de aplicar em produção): API — backfill para usuários existentes sem categorias

Só afeta usuários com **zero** categorias; quem já tem alguma não é tocado.

**Files:**
- Create: `api/drizzle/0007_backfill_default_categories.sql` (gerado com `--custom`; o número pode variar)

- [ ] **Step 1: Gerar migration custom**

Run: `cd api && pnpm drizzle-kit generate --custom --name=backfill_default_categories`
Expected: cria `drizzle/00XX_backfill_default_categories.sql` vazio e atualiza `drizzle/meta/_journal.json`.

- [ ] **Step 2: Preencher o SQL** (valores iguais a `DEFAULT_CATEGORIES` da Task 1 — migration é um retrato, não importa código)

```sql
INSERT INTO "categories" ("id", "userId", "name", "color", "icon", "isDefault", "type", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, u."id", d.name, d.color, d.icon, true, d.type::"CategoryType", now(), now()
FROM "users" u
CROSS JOIN (VALUES
  ('Salário', '#16A34A', 'Wallet', 'GANHO'),
  ('Alimentação', '#F97316', 'UtensilsCrossed', 'GASTO'),
  ('Moradia', '#2563EB', 'Home', 'GASTO'),
  ('Transporte', '#F59E0B', 'Car', 'GASTO'),
  ('Saúde', '#DC2626', 'HeartPulse', 'GASTO'),
  ('Compras', '#9333EA', 'ShoppingBag', 'GASTO'),
  ('Outros', '#6B7280', 'Tag', 'AMBOS')
) AS d(name, color, icon, type)
WHERE NOT EXISTS (SELECT 1 FROM "categories" c WHERE c."userId" = u."id");
```

- [ ] **Step 3: Aplicar localmente e conferir**

Run: `cd api && pnpm db:migrate && pnpm test:e2e`
Expected: migration aplicada sem erro; e2e PASS. Conferir no `pnpm db:studio` que um usuário sem categorias passou a ter 7.

- [ ] **Step 4: Commit**

```bash
cd api && git add drizzle/
git commit -m "chore(db): backfill de categorias padrão para usuários sem categorias"
```

---

### Task 7: Web — exclusão/edição de categorias sem bloqueio de `isDefault` e com a mensagem real da API

**Files:**
- Modify: `web/app/categories/page.tsx:34-56, 185-225`
- Modify: `web/hooks/use-categories.ts:72-91`
- Modify: `web/components/category-edit-dialog.tsx:160-224`
- Delete: `web/app/categories/[id]/edit/page.tsx` (página morta: nada linka para ela; a edição é pelo diálogo)

**Interfaces:**
- Consumes: 409 da Task 2 com `response.data.message` em pt-BR; `transactionCount`/`budgetCount` da listagem (Task 4).
- Produces: `useCategories().removeCategory(id)` não mostra toast; quem chama é responsável pelo feedback.

- [ ] **Step 0: Branch e linha de base de tipos**

```bash
cd web && git checkout -b feat/default-categories && bunx tsc --noEmit > ../tsc-baseline.txt; echo exit=$?
```

Guardar a contagem de erros pré-existentes; ao fim de cada task web, `bunx tsc --noEmit` não pode ter erros novos.

- [ ] **Step 0b: Regenerar o cliente kubb com as rotas das Tasks 3–5**

Com a API rodando localmente (`cd api && pnpm dev`, Swagger em `http://localhost:3000/docs`):

```bash
cd web && OPENAPI_SPEC_URL=http://localhost:3000/docs bun run kubb:generate
ls lib/api/auth lib/api/auth/hooks | grep -i register
```

Expected: aparece `auth-controller-register.ts` e `hooks/use-auth-controller-register.ts`. Se o nome gerado for outro, usar o nome real na Task 12. Commitar o código gerado separadamente:

```bash
cd web && git add openapi lib/api && git commit -m "chore(api-client): regenera cliente kubb"
```

- [ ] **Step 1: Hook sem toast duplicado/em inglês**

Em `web/hooks/use-categories.ts`, substituir o `removeCategory` inteiro por:

```ts
  const removeCategory = useCallback(
    async (id: string) => {
      await removeMutation.mutateAsync({ id })
      await categoriesQuery.refetch()
    },
    [removeMutation, categoriesQuery],
  )
```

(único consumidor: `app/categories/page.tsx`, que já mostra os toasts.)

- [ ] **Step 2: Página mostra a mensagem da API e libera exclusão das padrão**

Em `web/app/categories/page.tsx`:

Import:

```tsx
import { getApiErrorMessage } from "@/lib/errors/get-api-error-message";
```

No `catch` do `handleDelete`:

```tsx
      toast({
        title: "Não foi possível excluir",
        description: getApiErrorMessage(error, "Não foi possível excluir a categoria."),
        variant: "destructive",
      });
```

Logo no início do `categories.map((category) => {` (transformar o corpo em bloco com `return`), calcular o uso:

```tsx
              const inUse = (category.transactionCount ?? 0) + (category.budgetCount ?? 0) > 0;
              const usageText = [
                category.transactionCount ? `${category.transactionCount} transaç${category.transactionCount === 1 ? "ão" : "ões"}` : null,
                category.budgetCount ? `${category.budgetCount} orçamento${category.budgetCount === 1 ? "" : "s"}` : null,
              ].filter(Boolean).join(" e ");
```

No `CardContent`, antes do `div` de botões, mostrar o uso:

```tsx
                  {inUse ? (
                    <p className="text-xs text-muted-foreground">Em uso: {usageText}</p>
                  ) : null}
```

Botão de lixeira — envolver o `AlertDialogTrigger` num `span` com a explicação (botão desabilitado não dispara tooltip) e trocar `disabled={!!deletingId || category.isDefault}` por:

```tsx
                    <span
                      title={
                        inUse
                          ? `Não dá para excluir: categoria em uso (${usageText}). Exclua os lançamentos primeiro.`
                          : "Excluir categoria"
                      }
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={!!deletingId || inUse}
                          aria-label={`Excluir categoria ${category.name}`}
                        >
```

(fechar o `</span>` logo após `</AlertDialogTrigger>`.)

No `AlertDialogDescription`, substituir o bloco `{category.isDefault && (...)}` por:

```tsx
                            <span className="mt-2 block">
                              Categorias com transações ou orçamentos não podem ser excluídas.
                            </span>
```

No `AlertDialogAction`, remover `disabled={category.isDefault}`.

- [ ] **Step 3: Diálogo de edição liberado para categorias padrão**

Em `web/components/category-edit-dialog.tsx`:
- remover `disabled={category?.isDefault}` do `Input` de nome, do `Select` de tipo, do `CategoryColorPicker` e do `CategoryIconPicker`;
- remover os dois parágrafos `{category?.isDefault && (<p ...>Esta é uma categoria padrão...</p>)}`;
- no botão submit: `disabled={isSaving}`;
- `<SelectItem value="AMBOS">Ambos</SelectItem>` → `<SelectItem value="AMBOS">Ambos (ganhos e gastos)</SelectItem>`.

Fazer a mesma troca do rótulo "Ambos" em `web/components/category-create-dialog.tsx:139`.

- [ ] **Step 4: Apagar página morta**

```bash
cd web && grep -rn "categories/.*/edit" app components hooks lib   # esperado: nenhum resultado
git rm "app/categories/[id]/edit/page.tsx"
```

- [ ] **Step 5: Verificar**

Run: `cd web && bunx tsc --noEmit`
Expected: sem erros novos em relação à linha de base.

Manual (`bun dev` + API local, logado com um usuário criado após a Task 1):
1. Categorias mostra as 7 padrão; "Editar" em "Saúde" permite renomear.
2. Criar transação em "Alimentação" → card mostra "Em uso: 1 transação" e a lixeira fica desabilitada, com tooltip explicando.
3. Excluir a transação → a lixeira volta a ficar habilitada; excluir "Alimentação" → sucesso.
4. Garantia da API: com a lixeira desabilitada, rodar no console do navegador `fetch('/api/v1/categories/<id>', { method: 'DELETE' }).then(r => r.status)` → `409`. Para ver o toast de erro, abrir a tela em duas abas, lançar a transação numa e excluir na outra sem recarregar → um único toast "Não foi possível excluir" com o texto da API em pt-BR.

- [ ] **Step 6: Commit**

```bash
cd web && git add -A app/categories hooks/use-categories.ts components/category-edit-dialog.tsx components/category-create-dialog.tsx
git commit -m "feat(categories): libera categorias padrão, desabilita exclusão em uso e exibe erro da API"
```

---

### Task 8: Web — corrigir mês ignorado ao criar orçamento

**Files:**
- Modify: `web/components/budget-create-dialog.tsx:3-4, 25-85, 169-175`
- Modify: `web/app/budgets/page.tsx:399-403`

**Interfaces:**
- Produces: `BudgetCreateDialog` aceita `initialMonth?: string` (formato `"YYYY-MM"`); ao abrir, o seletor começa nesse mês.

- [ ] **Step 1: Um único estado de mês, derivando `budgetMonth`**

Em `web/components/budget-create-dialog.tsx`:

```tsx
import { useEffect, useState } from "react"
```

Props:

```tsx
interface BudgetCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  initialMonth?: string // "YYYY-MM"
}

const parseMonth = (value?: string) => {
  if (!value) return new Date()
  const [year, month] = value.split("-").map(Number)
  return new Date(year, month - 1)
}

const toBudgetMonth = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
```

Assinatura e estado — remover `const [month, setMonth] = useState<Date>();` e o `useState` de `budgetMonth`, e usar:

```tsx
export function BudgetCreateDialog({ open, onOpenChange, onSuccess, initialMonth }: BudgetCreateDialogProps) {
  ...
  const [month, setMonth] = useState<Date>(() => parseMonth(initialMonth))

  useEffect(() => {
    if (open) setMonth(parseMonth(initialMonth))
  }, [open, initialMonth])
```

No `handleSubmit`:

```tsx
      const budgetData = {
        amount: Number.parseFloat(amount),
        budgetMonth: toBudgetMonth(month),
        categoryId,
      }
```

e no reset pós-sucesso remover o `setBudgetMonth(...)` (o `useEffect` reinicia o mês na próxima abertura). Remover também `useRouter`/`router` se ficarem sem uso.

- [ ] **Step 2: Página passa o mês selecionado**

Em `web/app/budgets/page.tsx`:

```tsx
      <BudgetCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleBudgetChanged}
        initialMonth={selectedMonth}
      />
```

- [ ] **Step 3: Verificar**

Run: `cd web && bunx tsc --noEmit` → sem erros novos.
Manual: em Orçamentos, "Novo Orçamento" → escolher um mês diferente do atual → salvar → selecionar esse mês no seletor da página → o orçamento aparece lá (e não no mês atual).

- [ ] **Step 4: Commit**

```bash
cd web && git add components/budget-create-dialog.tsx app/budgets/page.tsx
git commit -m "fix(budgets): respeita o mês escolhido ao criar orçamento"
```

---

### Task 9: Web — criar categoria sem sair do diálogo de orçamento/transação

**Files:**
- Modify: `web/components/category-create-dialog.tsx:30-90`
- Modify: `web/components/budget-create-dialog.tsx` (bloco do select de categoria e fim do `DialogContent`)
- Modify: `web/components/transaction-create-dialog.tsx:54, 324-352, ~455`

**Interfaces:**
- Consumes: `BudgetCreateDialog` da Task 8.
- Produces: `CategoryCreateDialog` com `onSuccess?: (category: Category) => void` e `defaultType?: "GANHO" | "GASTO" | "AMBOS"`. Chamadores existentes que passam `() => void` continuam compatíveis.

- [ ] **Step 1: `CategoryCreateDialog` devolve a categoria criada e aceita tipo inicial**

Em `web/components/category-create-dialog.tsx`:

```tsx
import { useEffect, useState } from "react";
import type { Category } from "@/lib/api-types";
import { getApiErrorMessage } from "@/lib/errors/get-api-error-message";

type CategoryTypeValue = "GANHO" | "GASTO" | "AMBOS";

interface CategoryCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (category: Category) => void;
  defaultType?: CategoryTypeValue;
}
```

```tsx
export function CategoryCreateDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultType = "GASTO",
}: CategoryCreateDialogProps) {
  ...
  const [type, setType] = useState<CategoryTypeValue>(defaultType);

  useEffect(() => {
    if (open) setType(defaultType);
  }, [open, defaultType]);

  const resetForm = () => {
    setName("");
    setType(defaultType);
    setColor("#6366f1");
    setIcon("");
  };
```

No `handleSubmit` (o diálogo pode ser renderizado dentro de outro `<Dialog>`; o `stopPropagation` evita que o submit suba pela árvore React):

```tsx
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsSaving(true);

    try {
      const created = await categoriesControllerCreate(
        { name, color, type, icon: icon || undefined, isDefault: false } as any,
        kubbClientConfig
      );
      toast({ title: "Categoria criada", description: "Sua categoria foi criada com sucesso." });
      handleOpenChange(false);
      onSuccess?.(created as Category);
    } catch (error) {
      toast({
        title: "Erro",
        description: getApiErrorMessage(error, "Falha ao criar categoria"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
```

- [ ] **Step 2: Link "+ Nova categoria" no diálogo de orçamento**

Em `web/components/budget-create-dialog.tsx`:

```tsx
import { CategoryCreateDialog } from "@/components/category-create-dialog"
```

```tsx
  const { categories, isLoading: categoriesLoading, refreshCategories } = useCategories()
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
```

Logo após o `</Select>` da categoria (ainda dentro do `div` `sm:col-span-2`):

```tsx
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() => setIsCategoryDialogOpen(true)}
              >
                + Nova categoria
              </Button>
```

Logo após `</form>` e antes de `</DialogContent>` (fora do `<form>`, dentro do `DialogContent`, para o Radix empilhar os diálogos):

```tsx
        <CategoryCreateDialog
          open={isCategoryDialogOpen}
          onOpenChange={setIsCategoryDialogOpen}
          defaultType="GASTO"
          onSuccess={async (category) => {
            await refreshCategories()
            setCategoryId(category.id)
          }}
        />
```

- [ ] **Step 3: Mesmo link no diálogo de transação**

Em `web/components/transaction-create-dialog.tsx`, mesmo import; trocar a linha 54 por:

```tsx
  const { categories, isLoading: categoriesLoading, refreshCategories } = useCategories();
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
```

Após o `</Select>` da categoria (linha ~352, dentro do `div className="space-y-2"`):

```tsx
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() => setIsCategoryDialogOpen(true)}
              >
                + Nova categoria
              </Button>
```

Antes de `</DialogContent>` (fora do `<form>`):

```tsx
        <CategoryCreateDialog
          open={isCategoryDialogOpen}
          onOpenChange={setIsCategoryDialogOpen}
          defaultType={transactionType}
          onSuccess={async (category) => {
            await refreshCategories();
            setCategoryId(category.id);
          }}
        />
```

- [ ] **Step 4: Verificar**

Run: `cd web && bunx tsc --noEmit` → sem erros novos.
Manual:
1. Novo Orçamento → "+ Nova categoria" → criar "Pets" → diálogo fecha, "Pets" fica selecionada no select de orçamento; o orçamento **não** foi criado sozinho.
2. Nova Transação com tipo "Ganho" → "+ Nova categoria" abre com tipo "Ganho" pré-selecionado → criar → fica selecionada.
3. Página Categorias → "Nova Categoria" continua funcionando.

- [ ] **Step 5: Commit**

```bash
cd web && git add components/category-create-dialog.tsx components/budget-create-dialog.tsx components/transaction-create-dialog.tsx
git commit -m "feat: cria categoria direto dos diálogos de orçamento e transação"
```

---

### Task 10: Web — clareza da página de Orçamentos

**Files:**
- Modify: `web/app/budgets/page.tsx:193-196, 238-245, 295-302`
- Modify: `web/components/budget-create-dialog.tsx` (ordem dos grupos do select)
- Modify: `web/hooks/use-budgets.ts:69-88, 133-158`
- Modify: `web/app/budgets/page.tsx:27-53, 133-169` (`BudgetCard`)

**Interfaces:**
- Consumes: `transactionCount` do progresso e 409 da Task 3.
- Produces: `useBudgetProgress(id).progress.transactionCount: number`; `useBudgets().removeBudget(id)` não mostra toast (quem chama mostra).

- [ ] **Step 0: Exclusão de orçamento desabilitada quando há transações**

Em `web/hooks/use-budgets.ts`, `useBudgetProgress`:

```ts
  const progressData = (progressQuery.data ?? { current: 0, max: 0, transactionCount: 0 }) as {
    current: number
    max: number
    transactionCount?: number
  }
```

e no objeto `progress` retornado, adicionar `transactionCount: progressData.transactionCount ?? 0,`.

`removeBudget` sem toasts (o card já mostra os seus):

```ts
  const removeBudget = useCallback(
    async (id: string) => {
      await removeMutation.mutateAsync({ id })
      await budgetsQuery.refetch()
    },
    [removeMutation, budgetsQuery],
  )
```

(remover `toast` das dependências; se `useToast` ficar sem uso no hook, remover o import.)

Em `web/app/budgets/page.tsx`, `BudgetCard`:
- import `getApiErrorMessage` de `@/lib/errors/get-api-error-message`;
- no `catch` do `handleDelete`: `description: getApiErrorMessage(error, "Falha ao excluir orçamento")` e `title: "Não foi possível excluir"`;
- depois de `const { percentage, isOverBudget } = progress`:

```tsx
  const hasTransactions = progress.transactionCount > 0
```

- abaixo da linha `{formatCurrency(progress.current)} / ...`:

```tsx
          {hasTransactions ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {progress.transactionCount} transaç{progress.transactionCount === 1 ? "ão" : "ões"} neste mês
            </p>
          ) : null}
```

- envolver o `AlertDialogTrigger` do botão Excluir:

```tsx
            <span
              title={
                hasTransactions
                  ? "Não dá para excluir: há transações desta categoria neste mês. Exclua-as primeiro."
                  : "Excluir orçamento"
              }
            >
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting || hasTransactions}>
```

(fechar `</span>` logo após `</AlertDialogTrigger>`.)

- [ ] **Step 1: Seletor de mês inclui mês atual, próximos 2 e o selecionado**

Em `web/app/budgets/page.tsx`, substituir `availableMonths`:

```tsx
  const availableMonths = React.useMemo(() => {
    const now = new Date()
    const upcoming = [0, 1, 2].map((offset) => {
      const date = new Date(now.getFullYear(), now.getMonth() + offset)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    })
    const budgetMonths = budgets.map((budget: any) => budget.budgetMonth as string)
    return [...new Set([...budgetMonths, ...upcoming, selectedMonth])].sort().reverse()
  }, [budgets, selectedMonth])
```

- [ ] **Step 2: Cabeçalho não estoura no mobile**

Nos **dois** headers (loading, ~linha 239, e normal, ~linha 296):

```tsx
          <div className="flex min-h-14 flex-wrap items-center gap-2 px-4 py-2">
```

```tsx
            <div className="ml-auto flex flex-wrap items-center gap-2">
```

```tsx
              <SelectTrigger className="w-full sm:w-[200px]">
```

- [ ] **Step 3: "Gasto" primeiro no select de categoria do orçamento**

Em `web/components/budget-create-dialog.tsx`, reordenar os três `SelectGroup`: primeiro o de `expenseCategories` (rótulo "Gasto"), depois `bothCategories` ("Ganho e Gasto"), por último `incomeCategories` ("Ganho"). Mover os blocos como estão, sem alterar o conteúdo.

- [ ] **Step 4: Verificar**

Run: `cd web && bunx tsc --noEmit` → sem erros novos.
Manual: usuário sem orçamentos → seletor lista mês atual + 2 seguintes e permite ir ao próximo mês; DevTools em 375px de largura → header quebra linha sem scroll horizontal; select de categoria do orçamento começa por "Gasto". Orçamento de "Alimentação" no mês atual + transação em "Alimentação" no mesmo mês → card mostra "1 transação neste mês" e Excluir fica desabilitado com tooltip; excluir a transação → Excluir volta a funcionar.

- [ ] **Step 5: Commit**

```bash
cd web && git add app/budgets/page.tsx components/budget-create-dialog.tsx hooks/use-budgets.ts
git commit -m "feat(budgets): bloqueia exclusão com transações, meses futuros, header responsivo"
```

---

### Task 11: Web — sidebar e estado vazio do painel

**Files:**
- Modify: `web/components/sidebar.tsx:17-53, 180-200`
- Modify: `web/components/recent-transactions.tsx:37-42`

- [ ] **Step 1: Categorias vai para o rodapé da sidebar**

Em `web/components/sidebar.tsx`, adicionar `secondary?: boolean` ao `SidebarRoute`, mover o item "Categorias" para o fim do array `routes` com `secondary: true`, e logo após `visibleRoutes`:

```tsx
  const mainRoutes = visibleRoutes.filter((route) => !route.secondary)
  const secondaryRoutes = visibleRoutes.filter((route) => route.secondary)

  const renderRoute = (route: SidebarRoute) => (
    <Link
      key={route.href}
      href={route.href}
      aria-label={route.label}
      title={route.label}
      className={cn(
        "flex items-center py-3 px-3 text-sm font-medium rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground",
        pathname === route.href ? "bg-success/15 text-foreground" : "text-muted-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <route.icon className={cn("h-5 w-5", pathname === route.href && "text-success")} />
      {!collapsed && <span className="ml-3">{route.label}</span>}
    </Link>
  )
```

Declarar `renderRoute` depois de `const collapsed = !isMobile && isCollapsed` (linha ~97), pois ele usa `collapsed` e `pathname`. Trocar o `visibleRoutes.map(...)` da lista principal por `mainRoutes.map(renderRoute)` e, como primeiro filho do `<div className="mt-auto space-y-2">`:

```tsx
            {secondaryRoutes.map(renderRoute)}
```

- [ ] **Step 2: Estado vazio do painel aponta o próximo passo**

Em `web/components/recent-transactions.tsx`:

```tsx
        <p className="text-muted-foreground">
          Nenhuma transação ainda. Use “Nova Transação” no topo para registrar a primeira.
        </p>
```

- [ ] **Step 3: Verificar**

Run: `cd web && bunx tsc --noEmit` → sem erros novos.
Manual: sidebar expandida, recolhida e mobile → Painel/Transações/Orçamentos(/Usuários) no topo, Categorias no rodapé acima do tema, com destaque ativo funcionando em `/categories`; painel de usuário novo mostra a nova mensagem.

- [ ] **Step 4: Commit**

```bash
cd web && git add components/sidebar.tsx components/recent-transactions.tsx
git commit -m "feat(ui): categorias no rodapé da sidebar e dica no painel vazio"
```

---

### Task 12: Web — tela de registro (`/register`)

**Files:**
- Create: `web/app/register/page.tsx`
- Modify: `web/middleware.ts:4` (rota pública)
- Modify: `web/components/app-shell.tsx:11-16` (layout sem sidebar)
- Modify: `web/app/login/page.tsx` (link "Criar conta")

**Interfaces:**
- Consumes: `useAuthControllerRegister` gerado na Task 7 (Step 0b) a partir da rota da Task 5. Body `{ name, email, password }`; a API já devolve o cookie de sessão.

- [ ] **Step 1: Liberar a rota sem login**

`web/middleware.ts`:

```ts
const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password"]
```

`web/components/app-shell.tsx`, no `isBareLayoutPage`, adicionar:

```tsx
    pathname.startsWith("/register") ||
```

- [ ] **Step 2: Página**

`web/app/register/page.tsx` (mesmo visual do login: `AuthShell` + `AuthInput`):

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail, User } from "lucide-react"
import { useAuthControllerRegister } from "@/lib/api/auth/hooks/use-auth-controller-register"
import { getApiErrorMessage } from "@/lib/errors/get-api-error-message"
import { kubbClientConfig } from "@/lib/kubb-client"
import { AuthInput } from "@/components/auth/auth-input"
import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"

const MIN_PASSWORD_LENGTH = 6

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [error, setError] = useState("")
  const registerMutation = useAuthControllerRegister({ client: kubbClientConfig })

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("As senhas não conferem.")
      return
    }

    try {
      await registerMutation.mutateAsync({ data: { name, email, password } })
      router.replace("/")
      router.refresh()
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível criar a conta. Tente novamente."))
    }
  }

  const isLoading = registerMutation.isPending

  return (
    <AuthShell title="Crie sua conta" subtitle="Já começamos com categorias prontas pra você organizar suas finanças.">
      <form className="flex flex-col gap-[18px]" onSubmit={handleRegister}>
        <div className="flex flex-col gap-[7px]">
          <label className="text-[13px] font-medium text-foreground/80" htmlFor="register-name">
            Nome
          </label>
          <AuthInput
            id="register-name"
            icon={<User className="h-[17px] w-[17px]" />}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Seu nome"
            autoComplete="name"
            required
          />
        </div>

        <div className="flex flex-col gap-[7px]">
          <label className="text-[13px] font-medium text-foreground/80" htmlFor="register-email">
            Email
          </label>
          <AuthInput
            id="register-email"
            type="email"
            icon={<Mail className="h-[17px] w-[17px]" />}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="flex flex-col gap-[7px]">
          <label className="text-[13px] font-medium text-foreground/80" htmlFor="register-password">
            Senha
          </label>
          <AuthInput
            id="register-password"
            type={isPasswordVisible ? "text" : "password"}
            icon={<LockKeyhole className="h-[17px] w-[17px]" />}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
            rightSlot={
              <button
                type="button"
                onClick={() => setIsPasswordVisible((current) => !current)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
              >
                {isPasswordVisible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            }
          />
        </div>

        <div className="flex flex-col gap-[7px]">
          <label className="text-[13px] font-medium text-foreground/80" htmlFor="register-confirm">
            Confirmar senha
          </label>
          <AuthInput
            id="register-confirm"
            type={isPasswordVisible ? "text" : "password"}
            icon={<LockKeyhole className="h-[17px] w-[17px]" />}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repita a senha"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </div>

        {error ? (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button className="mt-2.5 h-12 w-full rounded-xl text-[14.5px]" disabled={isLoading} type="submit">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando conta...
            </>
          ) : (
            <>
              Criar conta
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-center text-[13.5px] text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Entrar
          </Link>
        </p>

        <a href="/privacidade" className="text-xs text-muted-foreground underline">
          Política de Privacidade
        </a>
      </form>
    </AuthShell>
  )
}
```

(`AuthInput` repassa todas as props de `<input>`, então `autoComplete`/`minLength` funcionam; `isPending` é do react-query v5, já instalado.) O aceite da política fica com o `PrivacyConsentGate`, que já aparece no primeiro acesso logado.

- [ ] **Step 3: Link no login**

Em `web/app/login/page.tsx`, logo antes do link "Política de Privacidade":

```tsx
        <p className="text-center text-[13.5px] text-muted-foreground">
          Não tem conta?{" "}
          <Link href="/register" className="font-medium text-foreground hover:underline">
            Criar conta
          </Link>
        </p>
```

- [ ] **Step 4: Verificar**

Run: `cd web && bunx tsc --noEmit` → sem erros novos.
Manual (deslogado):
1. `/login` → "Criar conta" → `/register` sem sidebar.
2. Senhas diferentes → "As senhas não conferem." sem chamar a API (aba Network).
3. E-mail já usado → mensagem "E-mail já está em uso" vinda da API.
4. Dados válidos → cai no painel logado, aparece o gate de privacidade; após aceitar, Categorias mostra as 7 padrão.
5. Logado, acessar `/register` → redireciona para `/`.

- [ ] **Step 5: Commit**

```bash
cd web && git add app/register middleware.ts components/app-shell.tsx app/login/page.tsx
git commit -m "feat(auth): tela de cadastro"
```

---

## Fora do escopo (deliberado)

- **Corrida entre checagem e exclusão:** para transações, a FK sem `ON DELETE` já impede a exclusão no banco (no pior caso a API responde 500 em vez de 409). Para orçamentos (`ON DELETE CASCADE`), a janela é de milissegundos. Mapear o erro `23503` → 409 só se aparecer em log.
- **Verificação de e-mail no cadastro, CAPTCHA:** o cadastro público fica protegido só pelo throttle (3/min). Adicionar se aparecer abuso.
- **Recuperação por SMS:** não há telefone no cadastro; ver a análise na conversa de 2026-10-01.
- **Deduplicar os dois headers de `budgets/page.tsx`** (loading vs. normal): é refatoração sem relação com o relato.
