# Security Hardening (rfinance-api + rfinance-web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar os gaps de segurança/LGPD que restaram na `main` dos dois projetos após a auditoria de 2026-09-30.

**Architecture:** A sessão passa a viver num cookie `httpOnly` emitido pela própria API e servido no domínio do front via rewrite do Next (`/api/*` → API), o que torna o cookie first-party e o front same-origin. Revogação server-side por `tokenVersion` na tabela `users` (logout, reset de senha, exclusão). Auditoria numa tabela append-only. LGPD: exclusão de conta real (cascade já existe) + política + registro de consentimento.

**Tech Stack:** NestJS 11, Drizzle ORM, Postgres, passport-jwt, @nestjs/throttler, helmet · Next.js 15, Kubb (axios + react-query), bun.

**Spec:** Auditoria de segurança desta sessão (checklist: IDOR, auth, proteção da API, dados sensíveis, webhooks, operação, LGPD).

## Estado verificado na `main` (2026-09-30, após pull)

| Item | Estado |
|---|---|
| IDOR (filtro por userId) | ✅ leituras filtram; update/delete fazem check-then-act (Task 11 reforça) |
| helmet | ✅ `src/app.setup.ts` |
| throttler | ⚠️ existe (login 5/min), mas sem `trust proxy` no Render todo mundo compartilha o IP do proxy → limite global (Task 3) |
| ValidationPipe whitelist/forbidNonWhitelisted | ✅ |
| `resetToken` vazando fora de prod | ✅ corrigido (só `development`/`test` explícitos) |
| Seed com senha fixa | ✅ trava para host não-local |
| Backup `.sql` | ⚠️ removido da árvore e ignorado, **mas continua no histórico (`43e7a95`) e baixável publicamente** (Task 0) |
| JWT 7d, sem revogação, token legível por JS | ❌ (Tasks 5–7) |
| Postgres TLS | ❌ depende da URL (Task 2) |
| Logs com PII | ⚠️ `mail.service.ts` loga o e-mail do destinatário (Task 2) |
| Dependências | ❌ `pnpm audit --prod`: 18 vulns (8 high: path-to-regexp, multer, lodash, js-yaml) (Task 1) |
| CI / Dependabot | ❌ nenhum `.github/` nos dois repos (Task 1) |
| Headers de segurança no front | ❌ `next.config.ts` vazio (Task 7) |
| Log de auditoria | ❌ (Task 8) |
| Exclusão de conta / política / consentimento | ❌ (Tasks 9–10) |
| Webhooks / agregador / CPF | N/A — não existem no código. Quando entrarem: validar HMAC do webhook e criptografar tokens do agregador/CPF em nível de aplicação. |

## Fora do escopo (decisões conscientes)

- **Refresh token rotativo:** com cookie `httpOnly` + checagem de `tokenVersion` no banco a cada request, a sessão já é revogável server-side, que é o que o refresh rotativo resolveria aqui. Adicionar quando houver cliente mobile ou exigência de access token < 15 min.
- **MFA:** adicionar quando houver agregador bancário (open finance) — aí vira obrigatório.
- **Swagger público em prod:** o codegen do front (`OPENAPI_SPEC_URL`) depende de `/docs-json` e o código já é público; risco baixo. Revisitar se o repo ficar privado.
- **Deploy da API na Vercel (`vercel.json`):** throttler em memória não funciona entre instâncias serverless. Produção é o Render; se a Vercel for usada de verdade, trocar o storage do throttler por Redis.

## Global Constraints

- Commits sem `Co-Authored-By` nem qualquer atribuição ao Claude (regra global do usuário).
- Nome do cookie de sessão: `rfinance_token` (já usado por `rfinance-web/middleware.ts`).
- Mensagens de erro/UI em pt-BR, seguindo o padrão atual.
- API: `pnpm`. Web: `bun`.
- Toda migration via `pnpm db:generate` (drizzle-kit); nunca editar SQL gerado à mão.
- Tasks 5→6→7 são um corte de compatibilidade: API e web precisam ir para produção juntas.

## Decisões pendentes do usuário (antes da Task 10)

- E-mail de contato do encarregado (DPO) para a política de privacidade.
- Se o incidente do backup exige comunicação à ANPD/titulares (art. 48 LGPD) — decisão jurídica, não técnica.

---

### Task 0: Contenção do vazamento (MANUAL — executada pelo dono do repo)

Nada aqui é código; são ações destrutivas/externas que o executor **não** faz sozinho.

- [ ] **Step 1:** Tornar `nikollllllas/rfinance-api` privado (GitHub → Settings → Danger Zone). Avaliar o mesmo para `rfinance-web`.
- [ ] **Step 2:** Confirmar que o backup ainda é público antes do passo 1 (deve dar 200) e depois (deve dar 404):
  `curl -s -o /dev/null -w '%{http_code}\n' https://raw.githubusercontent.com/nikollllllas/rfinance-api/43e7a95/backups/pre-push-20260404-100903.sql`
- [ ] **Step 3:** Remover o arquivo do histórico (reescreve todos os SHAs — avisar quem tiver clone):
  ```bash
  pip install git-filter-repo
  git clone --mirror https://github.com/nikollllllas/rfinance-api.git rfinance-api-mirror
  cd rfinance-api-mirror
  git filter-repo --path backups/ --invert-paths
  git push --force --mirror
  ```
  Depois, abrir ticket no GitHub Support pedindo purge de cache/refs de PR do commit `43e7a95`.
- [ ] **Step 4:** Verificar se algum `.env` já foi commitado: `git log --all --oneline -- .env .env.local .env.production` nos dois repos. Se sim, rotacionar tudo que estava nele.
- [ ] **Step 5:** Rotacionar `JWT_SECRET` no Render com valor de 64 hex (`openssl rand -hex 32`). Derruba todas as sessões — desejado.
- [ ] **Step 6:** Checar se contas de seed existem em produção: `SELECT email FROM users WHERE email LIKE '%@rfinance.local';`. Para cada uma, trocar a senha (UI de admin) ou excluir.
- [ ] **Step 7:** Forçar troca de senha dos usuários reais presentes no backup (hashes bcrypt cost 10 vazaram): admin → "Redefinir senha" para cada um e avisar por fora.

---

### Task 1: Dependências vulneráveis + Dependabot + CI (ambos os repos)

**Files:**
- Modify: `rfinance-api/package.json` (bloco `pnpm.overrides`)
- Create: `rfinance-api/.github/dependabot.yml`, `rfinance-api/.github/workflows/ci.yml`
- Create: `rfinance-web/.github/dependabot.yml`, `rfinance-web/.github/workflows/ci.yml`

- [ ] **Step 1: Atualizar dentro dos ranges e medir**

```bash
cd rfinance-api && pnpm update && pnpm audit --prod
```

- [ ] **Step 2: Forçar os transitivos que sobrarem** — adicionar em `rfinance-api/package.json` (só as linhas cujos pacotes ainda aparecerem no audit):

```json
  "pnpm": {
    "overrides": {
      "path-to-regexp@>=8 <8.4.0": "^8.4.0",
      "multer@<2.3.0": "^2.3.0",
      "lodash@<4.18.1": "^4.18.1",
      "js-yaml@>=4 <4.3.2": "^4.3.2"
    }
  }
```

Run: `pnpm install && pnpm audit --prod --audit-level high && pnpm build && pnpm test`
Expected: zero high/critical; build e testes verdes.

- [ ] **Step 3: Web** — `cd rfinance-web && bun update && bun audit`. Corrigir high/critical com `bun update <pkg>` ou `"overrides"` no `package.json` (bun respeita `overrides`). Rodar `bun run build`.

- [ ] **Step 4: Dependabot (API)** — `rfinance-api/.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly }
    open-pull-requests-limit: 5
    groups:
      minor-and-patch:
        update-types: [minor, patch]
  - package-ecosystem: github-actions
    directory: /
    schedule: { interval: monthly }
```

Mesmo arquivo em `rfinance-web/.github/dependabot.yml`.

- [ ] **Step 5: CI (API)** — `rfinance-api/.github/workflows/ci.yml`:

```yaml
name: ci
on:
  push: { branches: [main] }
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    env:
      JWT_SECRET: ci-secret-ci-secret-ci-secret-ci-secret
      DATABASE_URL: postgres://postgres:postgres@localhost:5432/rfinance
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --prod --audit-level high
      - run: pnpm build
      - run: pnpm test
```

- [ ] **Step 6: CI (web)** — `rfinance-web/.github/workflows/ci.yml`:

```yaml
name: ci
on:
  push: { branches: [main] }
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun audit --audit-level=high
      - run: bun run build
```

- [ ] **Step 7: Commit (um por repo)**

```bash
git add package.json pnpm-lock.yaml .github && git commit -m "chore: corrige deps vulneráveis e adiciona dependabot + CI com audit"
```

---

### Task 2: Config segura — TLS no Postgres, JWT_SECRET forte, logs sem PII (API)

**Files:**
- Modify: `src/env.ts`
- Modify: `src/modules/mail/mail.service.ts:13,28`
- Test: `src/env.spec.ts` (novo)

**Interfaces:**
- Produces: `isDatabaseUrlSafe(url: string, nodeEnv: string): boolean` exportado de `src/env.ts`.

- [ ] **Step 1: Teste que falha** — `src/env.spec.ts`:

```ts
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
});
```

- [ ] **Step 2:** `pnpm test -- env.spec` → FAIL (`isDatabaseUrlSafe` não existe).

- [ ] **Step 3: Implementar** em `src/env.ts` — adicionar antes do `envSchema`:

```ts
// Hosts sem ponto (ex.: Render internal "dpg-xxx-a") ficam em rede privada.
export function isDatabaseUrlSafe(url: string, nodeEnv: string): boolean {
  if (nodeEnv !== 'production') return true;
  const parsed = new URL(url);
  if (!parsed.hostname.includes('.')) return true;
  return ['require', 'verify-ca', 'verify-full'].includes(
    parsed.searchParams.get('sslmode') ?? '',
  );
}
```

Trocar `JWT_SECRET` por:

```ts
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must have at least 32 characters'),
```

E no fim do `z.object({...})`, antes do `;`, encadear:

```ts
}).refine((e) => isDatabaseUrlSafe(e.DATABASE_URL, e.NODE_ENV), {
  message: 'DATABASE_URL de host público em produção precisa de ?sslmode=require',
  path: ['DATABASE_URL'],
});
```

- [ ] **Step 4:** `pnpm test -- env.spec` → PASS.

- [ ] **Step 5: Tirar e-mail dos logs** em `src/modules/mail/mail.service.ts`:

```ts
      this.logger.warn('RESEND_API_KEY não configurado — email de recuperação não enviado');
```
```ts
      this.logger.error(`Falha ao enviar email de recuperação: ${error.message}`);
```

- [ ] **Step 6: Antes do deploy** — no Render, confirmar que `DATABASE_URL` é a internal URL (sem ponto no host) ou tem `?sslmode=require`; senão o boot falha (intencional). Atualizar `.env.example` com `JWT_SECRET=` comentado `# openssl rand -hex 32`.

- [ ] **Step 7:** `pnpm build && pnpm test` → verde. Commit: `fix: exige TLS no postgres em prod, JWT_SECRET >= 32 e remove e-mail dos logs`.

---

### Task 3: Throttler com IP real atrás do proxy (API)

Hoje, no Render, `req.ip` é o IP do load balancer → o limite de 5 logins/min vale para **todos os usuários somados**.

**Files:**
- Modify: `src/env.ts` (nova var `TRUST_PROXY_HOPS`)
- Modify: `src/app.setup.ts`
- Modify: `render.yaml`

- [ ] **Step 1:** Em `src/env.ts`, adicionar ao schema:

```ts
  // Nº de proxies confiáveis na frente da API. Render = 1; Render atrás do rewrite da Vercel = 2.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
```

- [ ] **Step 2:** Em `src/app.setup.ts`, primeira linha de `configureApp`:

```ts
  (app as NestExpressApplication).set('trust proxy', env.TRUST_PROXY_HOPS);
```

com `import type { NestExpressApplication } from '@nestjs/platform-express';`.

- [ ] **Step 3: Descobrir o número certo de hops** (depois da Task 7 no ar, porque o rewrite da Vercel adiciona um hop): subir temporariamente, em `LoggingInterceptor`, `request.ips` no log de uma rota, fazer login pelo front de produção, ler o log no Render, e escolher o menor `N` tal que `req.ip` seja o IP público do seu navegador. **Remover o log de IP em seguida** (IP é dado pessoal).

- [ ] **Step 4:** `render.yaml` → `- key: TRUST_PROXY_HOPS` / `value: "<N>"`. Nunca usar `true` (confia em `X-Forwarded-For` forjado pelo cliente e anula o rate limit).

- [ ] **Step 5: Verificação** — 6 logins errados seguidos pelo front → o 6º devolve 429; de outra rede (4G) o login continua funcionando.

- [ ] **Step 6:** Commit: `fix: throttler usa IP real do cliente atrás do proxy`.

---

### Task 4: Revogação de sessão com `tokenVersion` + bcrypt 12 (API)

**Files:**
- Modify: `src/infrastructure/drizzle/schema.ts` (coluna `tokenVersion` em `users`)
- Create: migration via `pnpm db:generate`
- Modify: `src/modules/users/types/user-record.type.ts`, `src/modules/users/users.repository.ts`, `src/modules/users/drizzle-users.repository.ts`, `src/modules/users/users.service.ts`
- Modify: `src/modules/auth/types/jwt-payload.type.ts`, `src/modules/auth/auth.service.ts`, `src/modules/auth/jwt.strategy.ts`
- Test: `src/modules/auth/auth.service.spec.ts`

**Interfaces:**
- Produces: `UsersRepository.incrementTokenVersion(id: string): Promise<void>`; `UsersService.revokeSessions(userId: string): Promise<void>`; `UsersService.setPassword(userId: string, password: string): Promise<void>`; `JwtPayload.tv: number`; `AuthService.validateJwtPayload(payload): Promise<AuthenticatedUser>` agora consulta o banco e lança `UnauthorizedException` se usuário sumiu ou `tv` difere.

- [ ] **Step 1: Schema** — em `users` (`schema.ts`), após `role`:

```ts
  tokenVersion: integer('tokenVersion').notNull().default(0),
```

`UserRecord` ganha `tokenVersion: number;`.

- [ ] **Step 2:** `pnpm db:generate` → gera `drizzle/0004_*.sql` com `ALTER TABLE "users" ADD COLUMN "tokenVersion" integer DEFAULT 0 NOT NULL;`. Conferir o SQL.

- [ ] **Step 3: Testes que falham** — em `auth.service.spec.ts`, adicionar `revokeSessions: jest.fn()` e `setPassword: jest.fn()` ao mock de `UsersService`, e:

```ts
  it('rejeita token de versão antiga', async () => {
    (usersService.findById as jest.Mock).mockResolvedValue({
      id: 'user-id', email: 'u@x.com', role: Role.USER, tokenVersion: 2,
    });
    await expect(
      service.validateJwtPayload({ userId: 'user-id', email: 'u@x.com', role: Role.USER, tv: 1 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejeita token de usuário excluído', async () => {
    (usersService.findById as jest.Mock).mockResolvedValue(null);
    await expect(
      service.validateJwtPayload({ userId: 'gone', email: 'u@x.com', role: Role.USER, tv: 0 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('usa o role atual do banco, não o do token', async () => {
    (usersService.findById as jest.Mock).mockResolvedValue({
      id: 'user-id', email: 'u@x.com', role: Role.USER, tokenVersion: 0,
    });
    const result = await service.validateJwtPayload({
      userId: 'user-id', email: 'u@x.com', role: Role.ADMIN, tv: 0,
    });
    expect(result.role).toBe(Role.USER);
  });

  it('reset de senha revoga sessões', async () => {
    (usersService.findActivePasswordRecoveryTokenByTokenHash as jest.Mock).mockResolvedValue({ id: 't', userId: 'user-id' });
    (usersService.findById as jest.Mock).mockResolvedValue({ id: 'user-id', tokenVersion: 0 });
    await service.resetPassword({ token: 'tok', password: 'NovaSenha@123' });
    expect(usersService.setPassword).toHaveBeenCalledWith('user-id', 'NovaSenha@123');
  });
```

Atualizar o teste existente "deve gerar token com payload esperado" para esperar `{ userId, email, role, tv: 0 }` (mock do usuário com `tokenVersion: 0`) e o "deve resetar senha" para esperar `setPassword` em vez de `updatePasswordHash`.

- [ ] **Step 4:** `pnpm test -- auth.service` → FAIL.

- [ ] **Step 5: Repositório** — `users.repository.ts`:

```ts
  incrementTokenVersion(_id: string): Promise<void> {
    throw new Error('Not implemented');
  }
```

`drizzle-users.repository.ts` (importar `sql` de `drizzle-orm`):

```ts
  async incrementTokenVersion(id: string): Promise<void> {
    await this.drizzle.db
      .update(users)
      .set({ tokenVersion: sql`${users.tokenVersion} + 1`, updatedAt: new Date() })
      .where(eq(users.id, id));
  }
```

- [ ] **Step 6: UsersService** — trocar `PASSWORD_SALT_ROUNDS = 10` por `12`, substituir `adminResetPassword` e `updatePasswordHash` por:

```ts
  async adminResetPassword(userId: string, password: string): Promise<void> {
    await this.findByIdOrThrow(userId);
    await this.setPassword(userId, password);
  }

  // Troca de senha sempre derruba as sessões abertas.
  async setPassword(userId: string, password: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    await this.usersRepository.update(userId, { passwordHash });
    await this.usersRepository.incrementTokenVersion(userId);
  }

  revokeSessions(userId: string): Promise<void> {
    return this.usersRepository.incrementTokenVersion(userId);
  }
```

Adicionar `incrementTokenVersion: jest.fn()` ao mock do repositório em `users.service.spec.ts` e ajustar o teste de `adminResetPassword` se ele checar `update` com cost 10.

- [ ] **Step 7: AuthService** — `JwtPayload` ganha `tv: number;`. Em `login`, o payload vira:

```ts
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as Role,
      tv: user.tokenVersion,
    };
```

`validateJwtPayload`:

```ts
  async validateJwtPayload(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findById(payload.userId);
    if (!user || user.tokenVersion !== payload.tv) {
      throw new UnauthorizedException('Sessão expirada');
    }
    const role = user.role as Role;
    return {
      userId: user.id,
      email: user.email,
      role,
      permissions: this.rbacService.resolvePermissions(role),
    };
  }
```

Em `resetPassword`, trocar as linhas `bcrypt.hash(dto.password, 10)` + `updatePasswordHash` por:

```ts
    await this.usersService.setPassword(user.id, dto.password);
```

(remover o import de `bcrypt` só se não houver mais uso — `login` ainda usa `bcrypt.compare`).

- [ ] **Step 8:** Em `jwt.strategy.ts`, a checagem vira `if (!payload.userId || typeof payload.tv !== 'number')` (tokens antigos sem `tv` passam a ser rejeitados — todo mundo reloga uma vez).

- [ ] **Step 9:** `pnpm test` → PASS. `pnpm db:up && pnpm db:migrate && pnpm test:e2e` → PASS.

- [ ] **Step 10:** Commit: `feat: revogação de sessão por tokenVersion, role lido do banco e bcrypt cost 12`.

---

### Task 5: Sessão em cookie httpOnly emitido pela API (API)

**Files:**
- Create: `src/modules/auth/auth-cookie.ts`
- Modify: `src/modules/auth/jwt.strategy.ts`, `src/modules/auth/auth.controller.ts`, `src/modules/auth/auth.service.ts`, `src/modules/auth/dto/auth-response.dto.ts`
- Modify: `test/creates.e2e-spec.ts`
- Test: `src/modules/auth/auth-cookie.spec.ts`

**Interfaces:**
- Consumes: `UsersService.revokeSessions` (Task 4).
- Produces: `AUTH_COOKIE_NAME = 'rfinance_token'`; `authCookieOptions(): CookieOptions`; `tokenFromCookieHeader(header?: string): string | null`; `AuthService.logout(token: string | null): Promise<void>`; `POST /v1/auth/login` → `Set-Cookie` + body `{ user }` (sem `accessToken`); `POST /v1/auth/logout` público, sempre limpa o cookie.

- [ ] **Step 1: Teste que falha** — `src/modules/auth/auth-cookie.spec.ts`:

```ts
import { tokenFromCookieHeader } from './auth-cookie';

describe('tokenFromCookieHeader', () => {
  it('extrai o token entre outros cookies', () => {
    expect(tokenFromCookieHeader('a=1; rfinance_token=abc.def; b=2')).toBe('abc.def');
  });
  it('retorna null sem header ou sem o cookie', () => {
    expect(tokenFromCookieHeader(undefined)).toBeNull();
    expect(tokenFromCookieHeader('x_rfinance_token=abc')).toBeNull();
  });
});
```

- [ ] **Step 2:** `pnpm test -- auth-cookie` → FAIL.

- [ ] **Step 3: Implementar** `src/modules/auth/auth-cookie.ts`:

```ts
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
```

- [ ] **Step 4:** `pnpm test -- auth-cookie` → PASS.

- [ ] **Step 5: Strategy aceita cookie ou Bearer** (Bearer continua para Swagger/curl/e2e) — `jwt.strategy.ts`:

```ts
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => tokenFromCookieHeader(req.headers.cookie),
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
```

com `import type { Request } from 'express';` e `import { tokenFromCookieHeader } from './auth-cookie';`.

- [ ] **Step 6: AuthService.logout** — adicionar:

```ts
  async logout(token: string | null): Promise<void> {
    if (!token) return;
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      await this.usersService.revokeSessions(payload.userId);
    } catch {
      // token inválido/expirado: nada a revogar, o cookie é limpo mesmo assim
    }
  }
```

Adicionar `verifyAsync: jest.fn()` ao mock de `JwtService` no spec.

- [ ] **Step 7: Controller** — em `auth.controller.ts` (importar `Req`, `Res` de `@nestjs/common`, `type { Request, Response }` de `express`, e `AUTH_COOKIE_NAME, authCookieOptions, tokenFromCookieHeader` de `./auth-cookie`):

```ts
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const { accessToken, user } = await this.authService.login(dto);
    res.cookie(AUTH_COOKIE_NAME, accessToken, authCookieOptions());
    return { user };
  }
```

```ts
  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOkResponse({ type: SuccessResponseDto })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SuccessResponseDto> {
    await this.authService.logout(tokenFromCookieHeader(req.headers.cookie));
    const { maxAge: _maxAge, ...clearOptions } = authCookieOptions();
    res.clearCookie(AUTH_COOKIE_NAME, clearOptions);
    return { success: true };
  }
```

Em `LoginResponseDto`, remover a propriedade `accessToken` (fica só `user`).

- [ ] **Step 8: e2e** — em `test/creates.e2e-spec.ts`, adicionar no topo:

```ts
const tokenFrom = (res: request.Response): string => {
  const raw = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const cookie = raw.find((c) => c.startsWith('rfinance_token='));
  if (!cookie) throw new Error('login sem cookie de sessão');
  return decodeURIComponent(cookie.split(';')[0].split('=')[1]);
};
```

e trocar cada `login.body.accessToken as string` / `adminLogin.body.accessToken as string` / `userLogin.body.accessToken as string` por `tokenFrom(login)` / `tokenFrom(adminLogin)` / `tokenFrom(userLogin)`. Adicionar um caso:

```ts
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
```

- [ ] **Step 9:** `pnpm test && pnpm test:e2e` → PASS.

- [ ] **Step 10:** Commit: `feat: sessão em cookie httpOnly e logout com revogação`. **Não fazer deploy ainda** — o front atual depende de `accessToken` no body; sobe junto com a Task 6.

---

### Task 6: Front same-origin via rewrite + fim do token em JS (web)

**Files:**
- Modify: `next.config.ts`
- Modify: `lib/kubb-client.ts`
- Delete: `lib/auth/token-cookie.ts`
- Modify: `lib/auth/constants.ts` (remover `AUTH_COOKIE_MAX_AGE_SEC`)
- Modify: `app/login/page.tsx:8,35-42`
- Modify: `components/sidebar.tsx:13,207-213`
- Modify: `.env.example`
- Regenerate: `lib/api/**` via Kubb

**Interfaces:**
- Consumes: API da Task 5 (cookie `rfinance_token`, login sem `accessToken`, logout público).
- Produces: todas as chamadas do browser vão para `/api/v1/...` no domínio do front.

- [ ] **Step 1: Rewrite** — `next.config.ts`:

```ts
import type { NextConfig } from 'next';

// Proxy same-origin: o cookie httpOnly da API vira first-party no domínio do front.
const apiTarget = (process.env.API_PROXY_TARGET ?? 'https://rfinance-api.onrender.com').replace(/\/+$/, '');

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiTarget}/:path*` }];
  },
};

export default nextConfig;
```

`.env.example`: trocar `NEXT_PUBLIC_API_BASE_URL=...` por `API_PROXY_TARGET=https://rfinance-api.onrender.com` (local: `http://localhost:<porta-da-api>`). Na Vercel, criar `API_PROXY_TARGET` e remover `NEXT_PUBLIC_API_BASE_URL`.

- [ ] **Step 2: Cliente** — `lib/kubb-client.ts` inteiro:

```ts
"use client"

import {
  axiosInstance,
  setConfig,
} from "@kubb/plugin-client/clients/axios"

export const kubbClientConfig = {
  baseURL: "/api",
}

let didRegisterInterceptor = false

export const initKubbClient = () => {
  setConfig(kubbClientConfig)
  axiosInstance.defaults.baseURL = "/api"

  if (didRegisterInterceptor) {
    return
  }
  didRegisterInterceptor = true

  // Sessão revogada/expirada: a API limpa o cookie no logout e voltamos pro login.
  axiosInstance.interceptors.response.use(undefined, async (error) => {
    const url: string = error?.config?.url ?? ""
    if (error?.response?.status === 401 && !url.includes("/auth/")) {
      await fetch("/api/v1/auth/logout", { method: "POST" }).catch(() => undefined)
      window.location.href = "/login"
    }
    return Promise.reject(error)
  })
}
```

- [ ] **Step 3: Regenerar o client** — com a API da Task 5 rodando local: `OPENAPI_SPEC_URL=http://localhost:<porta>/docs-json bun run kubb:generate`. Conferir que `LoginResponseDto` não tem mais `accessToken`.

- [ ] **Step 4: Login** — em `app/login/page.tsx`, remover o import de `setAuthTokenCookie` e o bloco `if (payload && ... accessToken ...) { setAuthTokenCookie(...) }`; fica:

```tsx
      await loginMutation.mutateAsync({
        data: { email, password },
      })

      router.replace("/")
      router.refresh()
```

- [ ] **Step 5: Logout** — em `components/sidebar.tsx`, remover o import de `clearAuthTokenCookie` e a chamada no `finally` (o cookie é httpOnly; quem limpa é a API):

```tsx
              onClick={async () => {
                try {
                  await logoutMutation.mutateAsync()
                } finally {
                  window.location.href = "/login"
                }
              }}
```

- [ ] **Step 6:** Apagar `lib/auth/token-cookie.ts` e `AUTH_COOKIE_MAX_AGE_SEC` de `lib/auth/constants.ts`. `grep -rn "token-cookie\|AUTH_COOKIE_MAX_AGE_SEC\|NEXT_PUBLIC_API_BASE_URL" app components hooks lib` → vazio.

- [ ] **Step 7: Verificação manual** (API local + `bun dev`):
  1. Login → DevTools › Application › Cookies: `rfinance_token` com **HttpOnly** marcado, domínio `localhost`.
  2. Console: `document.cookie` **não** contém `rfinance_token`.
  3. Navegar dashboard/transações → requests para `/api/v1/...` com 200.
  4. Sair → cookie some; voltar com o token antigo (copiado do DevTools) via `curl -H "Authorization: Bearer <token>" localhost:<porta>/v1/auth/me` → 401.
  5. `bun run build` verde.

- [ ] **Step 8:** Commit: `feat: API via rewrite same-origin e sessão só em cookie httpOnly`.

- [ ] **Step 9: Deploy coordenado** — migration da Task 4 em prod (`DATABASE_URL=<prod> pnpm db:migrate`), deploy da API (Tasks 4–5) e do web (Task 6) na mesma janela. Em seguida, executar a Task 3 Step 3 (hops).

---

### Task 7: Headers de segurança no front (web)

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1:** Adicionar `headers()` ao `nextConfig` da Task 6:

```ts
const isDev = process.env.NODE_ENV !== 'production';

const csp = [
  "default-src 'self'",
  // Next injeta scripts inline de hidratação; sem nonce, 'unsafe-inline' é necessário.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');
```

e dentro de `nextConfig`:

```ts
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
```

`connect-src 'self'` só funciona porque a Task 6 tornou a API same-origin; `@vercel/analytics` usa `/_vercel/insights` (same-origin).

- [ ] **Step 2: Verificação** — `bun run build && bun start`, abrir login, dashboard, transações, orçamentos, categorias, admin: console sem violações de CSP; `curl -sI localhost:3000/login | grep -i content-security` retorna o header.

- [ ] **Step 3:** Commit: `feat: headers de segurança (CSP, HSTS, nosniff) no front`.

---

### Task 8: Log de auditoria (API)

**Files:**
- Modify: `src/infrastructure/drizzle/schema.ts` (tabela `audit_logs`)
- Create: migration via `pnpm db:generate`
- Create: `src/modules/audit/audit.module.ts`, `src/modules/audit/audit.service.ts`
- Modify: `src/app.module.ts`, `src/modules/auth/auth.service.ts`, `src/modules/users/users.controller.ts`
- Test: `src/modules/auth/auth.service.spec.ts`

**Interfaces:**
- Produces: `AuditService.log(action: AuditAction, actorId: string | null, targetId?: string | null): Promise<void>`; `type AuditAction = 'auth.login' | 'auth.login_failed' | 'auth.logout' | 'auth.password_reset' | 'user.create' | 'user.update' | 'user.password_reset_by_admin' | 'user.self_delete' | 'user.privacy_consent'`.

- [ ] **Step 1: Schema** — em `schema.ts`:

```ts
// Sem FK: o registro precisa sobreviver à exclusão do usuário.
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    action: text('action').notNull(),
    actorId: uuid('actorId'),
    targetId: text('targetId'),
    createdAt: timestamp('createdAt', { withTimezone: false })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    actorIdx: index('audit_logs_actorId_idx').on(t.actorId),
    createdAtIdx: index('audit_logs_createdAt_idx').on(t.createdAt),
  }),
);
```

`pnpm db:generate` e conferir o SQL.

- [ ] **Step 2: Service** — `src/modules/audit/audit.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../infrastructure/drizzle/drizzle.service';
import { auditLogs } from '../../infrastructure/drizzle/schema';

export type AuditAction =
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'auth.password_reset'
  | 'user.create'
  | 'user.update'
  | 'user.password_reset_by_admin'
  | 'user.self_delete'
  | 'user.privacy_consent';

// ponytail: insert direto, sem repositório abstrato; extrair se ganhar consultas.
@Injectable()
export class AuditService {
  constructor(private readonly drizzle: DrizzleService) {}

  async log(action: AuditAction, actorId: string | null, targetId: string | null = null): Promise<void> {
    await this.drizzle.db.insert(auditLogs).values({ action, actorId, targetId });
  }
}
```

`src/modules/audit/audit.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
```

Registrar `AuditModule` em `imports` de `app.module.ts`.

- [ ] **Step 3: Teste que falha** — em `auth.service.spec.ts`, prover `{ provide: AuditService, useValue: { log: jest.fn() } }`, pegar `auditService = module.get(AuditService)` e:

```ts
  it('audita login com falha sem vazar se o e-mail existe', async () => {
    (usersService.findByEmail as jest.Mock).mockResolvedValue({ id: 'user-id', passwordHash: 'h' });
    (bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>).mockResolvedValue(false);
    await expect(service.login({ email: 'u@x.com', password: 'errada' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(auditService.log).toHaveBeenCalledWith('auth.login_failed', 'user-id');
  });
```

`pnpm test -- auth.service` → FAIL.

- [ ] **Step 4: Instrumentar AuthService** (injetar `private readonly audit: AuditService`):
  - `login`: e-mail inexistente → `await this.audit.log('auth.login_failed', null);`; senha errada → `await this.audit.log('auth.login_failed', user.id);`; sucesso → `await this.audit.log('auth.login', user.id);`
  - `logout`: após `revokeSessions` → `await this.audit.log('auth.logout', payload.userId);`
  - `resetPassword`: após `setPassword` → `await this.audit.log('auth.password_reset', user.id);`

- [ ] **Step 5: Instrumentar UsersController** (injetar `AuditService`; `create`, `updateByAdmin`, `adminResetPassword` recebem `@CurrentUser() actor: AuthenticatedUser`):

```ts
  async create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateUserDto) {
    const created = await this.usersService.create(dto);
    await this.audit.log('user.create', actor.userId, created.id);
    return created;
  }
```

Mesmo padrão: `updateByAdmin` → `'user.update'` com `id`; `adminResetPassword` → `'user.password_reset_by_admin'` com `id`.

- [ ] **Step 6:** `pnpm test && pnpm test:e2e` → PASS. Conferir no banco local: `SELECT action, "actorId" FROM audit_logs ORDER BY "createdAt" DESC LIMIT 5;` após um login.

- [ ] **Step 7:** Commit: `feat: log de auditoria para autenticação e ações de admin`.

---

### Task 9: Exclusão de conta pelo próprio usuário (API + web)

O `onDelete: 'cascade'` já existe em categories, transactions, budgets, password_recovery_tokens e idempotency_keys → `DELETE FROM users` remove tudo. `audit_logs` fica (sem FK, só UUID pseudônimo — base legal: art. 16, II/art. 7, IX).

**Files (API):**
- Modify: `src/modules/users/users.repository.ts`, `src/modules/users/drizzle-users.repository.ts`, `src/modules/users/users.service.ts`, `src/modules/users/users.controller.ts`
- Create: `src/modules/users/dto/delete-own-account.dto.ts`
- Test: `src/modules/users/users.service.spec.ts`

**Files (web):**
- Create: `components/delete-account-dialog.tsx`
- Modify: `components/sidebar.tsx`

**Interfaces:**
- Consumes: `AuditService.log` (Task 8), `AUTH_COOKIE_NAME`/`authCookieOptions` (Task 5).
- Produces: `DELETE /v1/users/me` body `{ password: string }` → 200 `{ success: true }` + cookie limpo; 401 se a senha estiver errada. `UsersService.deleteOwnAccount(userId: string, password: string): Promise<void>`. Hook gerado: `useUsersControllerDeleteOwnAccount`.

- [ ] **Step 1: Testes que falham** — em `users.service.spec.ts` (adicionar `delete: jest.fn()` ao mock do repositório e `compare: jest.fn()` ao `jest.mock('bcrypt')`):

```ts
  describe('deleteOwnAccount', () => {
    it('exclui quando a senha confere', async () => {
      (repository.findById as jest.Mock).mockResolvedValue({ id: 'u1', passwordHash: 'h' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await service.deleteOwnAccount('u1', 'Senha@123');
      expect(repository.delete).toHaveBeenCalledWith('u1');
    });

    it('recusa com senha errada e não exclui', async () => {
      (repository.findById as jest.Mock).mockResolvedValue({ id: 'u1', passwordHash: 'h' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.deleteOwnAccount('u1', 'errada')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
```

`pnpm test -- users.service` → FAIL.

- [ ] **Step 2: Repositório** — `users.repository.ts`:

```ts
  delete(_id: string): Promise<void> {
    throw new Error('Not implemented');
  }
```

`drizzle-users.repository.ts`:

```ts
  async delete(id: string): Promise<void> {
    await this.drizzle.db.delete(users).where(eq(users.id, id));
  }
```

- [ ] **Step 3: Service** (importar `UnauthorizedException`):

```ts
  async deleteOwnAccount(userId: string, password: string): Promise<void> {
    const user = await this.findByIdOrThrow(userId);
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Senha incorreta');
    }
    await this.usersRepository.delete(userId);
  }
```

- [ ] **Step 4: DTO** — `dto/delete-own-account.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class DeleteOwnAccountDto {
  @ApiProperty({ example: 'MinhaSenha@123' })
  @IsString()
  @MinLength(1)
  password!: string;
}
```

- [ ] **Step 5: Controller** — em `users.controller.ts` (importar `Delete`, `Res`, `Throttle`, `type { Response }` de express, `AUTH_COOKIE_NAME, authCookieOptions` de `../auth/auth-cookie`). Declarar **antes** de rotas com `:id`:

```ts
  @Delete('me')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiBody({ type: DeleteOwnAccountDto })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiResponse({ status: 401, description: 'Senha incorreta' })
  async deleteOwnAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DeleteOwnAccountDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SuccessResponseDto> {
    await this.usersService.deleteOwnAccount(user.userId, dto.password);
    await this.audit.log('user.self_delete', user.userId);
    const { maxAge: _maxAge, ...clearOptions } = authCookieOptions();
    res.clearCookie(AUTH_COOKIE_NAME, clearOptions);
    return { success: true };
  }
```

- [ ] **Step 6:** `pnpm test` → PASS. Manual local: criar usuário, lançar transação, `DELETE /v1/users/me` → `SELECT count(*) FROM transactions WHERE "userId" = '<id>'` = 0.

- [ ] **Step 7: Web** — `bun run kubb:generate` (API local). Criar `components/delete-account-dialog.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useUsersControllerDeleteOwnAccount } from "@/lib/api/users/hooks/use-users-controller-delete-own-account"
import { getApiErrorMessage } from "@/lib/errors/get-api-error-message"
import { kubbClientConfig } from "@/lib/kubb-client"

type DeleteAccountDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const mutation = useUsersControllerDeleteOwnAccount({ client: kubbClientConfig })

  const handleDelete = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    try {
      await mutation.mutateAsync({ data: { password } })
      window.location.href = "/login"
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível excluir a conta."))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <form onSubmit={handleDelete}>
          <DialogHeader>
            <DialogTitle>Excluir minha conta</DialogTitle>
            <DialogDescription>
              Todas as suas transações, categorias e orçamentos serão apagados definitivamente. Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 flex flex-col gap-2">
            <Label htmlFor="delete-account-password">Confirme sua senha</Label>
            <Input
              id="delete-account-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={mutation.isPending || password.length === 0}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 8: Sidebar** — em `components/sidebar.tsx`: `const [isDeleteOpen, setIsDeleteOpen] = useState(false)`, e acima do botão "Sair":

```tsx
            <Button
              variant="ghost"
              className={cn("w-full justify-center gap-2 text-destructive", collapsed && "px-0")}
              onClick={() => setIsDeleteOpen(true)}
            >
              <UserX className="h-4 w-4" />
              {!collapsed && <span>Excluir conta</span>}
            </Button>
            <DeleteAccountDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} />
```

(importar `UserX` de `lucide-react` e `DeleteAccountDialog`). Verificar manualmente: senha errada mostra erro; senha certa redireciona para `/login` e o login antigo não funciona mais.

- [ ] **Step 9:** Commits (um por repo): `feat: exclusão de conta pelo próprio usuário (LGPD art. 18)`.

---

### Task 10: Política de privacidade + registro de consentimento (API + web)

Não há cadastro público (usuários são criados por admin), então o consentimento é pedido no primeiro acesso autenticado e fica registrado com data e versão da política.

**Files (API):**
- Modify: `src/infrastructure/drizzle/schema.ts` (`privacyAcceptedAt`, `privacyPolicyVersion` em `users`) + migration
- Modify: `src/modules/users/types/user-record.type.ts`, `src/modules/users/users.repository.ts` (`UpdateUserInput`), `src/modules/users/users.service.ts`, `src/modules/users/users.controller.ts`
- Modify: `src/modules/auth/auth.service.ts` (`me`) e `src/modules/auth/dto/auth-response.dto.ts`
- Test: `src/modules/users/users.service.spec.ts`

**Files (web):**
- Create: `app/privacidade/page.tsx`, `components/privacy-consent-gate.tsx`
- Modify: `middleware.ts:4`, `components/app-shell.tsx`, `app/login/page.tsx` (link)

**Interfaces:**
- Produces: `PRIVACY_POLICY_VERSION = '2026-10-01'` (`users.service.ts`, exportado); `POST /v1/users/me/privacy-consent` → `{ success: true }`; `GET /v1/auth/me` → `user.privacyAcceptedAt: string | null` e `user.privacyPolicyVersion: string | null`. Hook gerado: `useUsersControllerAcceptPrivacy`.

- [ ] **Step 1: Schema** — em `users`:

```ts
  privacyAcceptedAt: timestamp('privacyAcceptedAt', { withTimezone: false }),
  privacyPolicyVersion: text('privacyPolicyVersion'),
```

`UserRecord` e `UpdateUserInput` ganham `privacyAcceptedAt: Date | null; privacyPolicyVersion: string | null;` (no `UpdateUserInput`, dentro do `Partial`). `pnpm db:generate`.

- [ ] **Step 2: Teste que falha** — `users.service.spec.ts`:

```ts
  it('registra consentimento com data e versão da política', async () => {
    await service.acceptPrivacy('u1');
    expect(repository.update).toHaveBeenCalledWith('u1', {
      privacyAcceptedAt: expect.any(Date),
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    });
  });
```

`pnpm test -- users.service` → FAIL.

- [ ] **Step 3: Service**:

```ts
// Trocar a versão quando o texto de app/privacidade mudar: força novo aceite.
export const PRIVACY_POLICY_VERSION = '2026-10-01';
```

```ts
  async acceptPrivacy(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      privacyAcceptedAt: new Date(),
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    });
  }
```

- [ ] **Step 4: Controller** (antes das rotas `:id`):

```ts
  @Post('me/privacy-consent')
  @HttpCode(200)
  @ApiOkResponse({ type: SuccessResponseDto })
  async acceptPrivacy(@CurrentUser() user: AuthenticatedUser): Promise<SuccessResponseDto> {
    await this.usersService.acceptPrivacy(user.userId);
    await this.audit.log('user.privacy_consent', user.userId);
    return { success: true };
  }
```

- [ ] **Step 5: `/auth/me`** — `AuthService.me` passa a retornar também:

```ts
      privacyAcceptedAt: user.privacyPolicyVersion === PRIVACY_POLICY_VERSION ? user.privacyAcceptedAt : null,
      privacyPolicyVersion: user.privacyPolicyVersion,
```

(tipo de retorno ajustado; `UserSummaryDto` ganha os dois campos com `@ApiProperty({ type: String, nullable: true })` — `privacyAcceptedAt` como `type: String, format: 'date-time'`). `pnpm test` → PASS.

- [ ] **Step 6: Página** — `app/privacidade/page.tsx` (texto base; revisar com jurídico e preencher o e-mail do encarregado — ver "Decisões pendentes"):

```tsx
export const metadata = { title: "Política de Privacidade — RFinance" }

const CONTACT_EMAIL = "<definido pelo usuário>"

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-12 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold">Política de Privacidade</h1>
      <p className="text-muted-foreground">Versão 2026-10-01</p>
      <h2 className="text-lg font-medium">Dados que coletamos</h2>
      <p>Nome, e-mail, senha (armazenada apenas como hash) e os lançamentos financeiros, categorias e orçamentos que você cadastra.</p>
      <h2 className="text-lg font-medium">Para que usamos</h2>
      <p>Exclusivamente para prestar o serviço de controle financeiro pessoal: autenticação, exibição dos seus dados e envio de e-mails de recuperação de senha. Não vendemos nem compartilhamos seus dados para publicidade.</p>
      <h2 className="text-lg font-medium">Com quem compartilhamos</h2>
      <p>Provedores de infraestrutura necessários para operar o serviço: hospedagem (Vercel, Render), banco de dados e envio de e-mail (Resend).</p>
      <h2 className="text-lg font-medium">Por quanto tempo</h2>
      <p>Enquanto sua conta existir. Ao excluir a conta, todos os seus dados financeiros são apagados imediatamente. Registros de segurança (data de login e ações administrativas, sem conteúdo financeiro) são mantidos por até 6 meses para prevenção a fraudes.</p>
      <h2 className="text-lg font-medium">Seus direitos (LGPD, art. 18)</h2>
      <p>Você pode acessar, corrigir e excluir seus dados a qualquer momento pelo próprio app (menu lateral → Excluir conta), além de revogar este consentimento. Para outras solicitações, fale com o encarregado: {CONTACT_EMAIL}.</p>
    </main>
  )
}
```

Retenção de 6 meses dos `audit_logs`: documentar; job de limpeza fica para quando houver volume (`DELETE FROM audit_logs WHERE "createdAt" < now() - interval '6 months'` manual/cron).

- [ ] **Step 7: Rota pública** — `middleware.ts`: `const publicPaths = ["/login", "/forgot-password", "/reset-password", "/privacidade"]`, e em `app-shell.tsx` incluir `pathname.startsWith("/privacidade")` em `isBareLayoutPage`. No `app/login/page.tsx`, abaixo do botão de entrar: `<a href="/privacidade" className="text-xs text-muted-foreground underline">Política de Privacidade</a>`.

- [ ] **Step 8: Gate de consentimento** — `bun run kubb:generate`, depois `components/privacy-consent-gate.tsx`:

```tsx
"use client"

import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuthControllerMe } from "@/lib/api/auth/hooks/use-auth-controller-me"
import { useUsersControllerAcceptPrivacy } from "@/lib/api/users/hooks/use-users-controller-accept-privacy"
import { kubbClientConfig } from "@/lib/kubb-client"

export function PrivacyConsentGate() {
  const queryClient = useQueryClient()
  const meQuery = useAuthControllerMe({ client: kubbClientConfig })
  const accept = useUsersControllerAcceptPrivacy({ client: kubbClientConfig })
  const user = (meQuery.data as { user?: { privacyAcceptedAt?: string | null } } | undefined)?.user
  const needsConsent = Boolean(user) && !user?.privacyAcceptedAt

  return (
    <Dialog open={needsConsent}>
      <DialogContent className="sm:max-w-[520px]" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Política de Privacidade</DialogTitle>
          <DialogDescription>
            Para continuar usando o RFinance, leia e aceite nossa{" "}
            <a href="/privacidade" target="_blank" rel="noreferrer" className="underline">Política de Privacidade</a>.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={accept.isPending}
            onClick={async () => {
              await accept.mutateAsync()
              await queryClient.invalidateQueries()
            }}
          >
            Li e aceito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

Em `app-shell.tsx`, renderizar `<PrivacyConsentGate />` logo após `<Sidebar />`. Se o `DialogContent` do projeto tiver botão de fechar embutido, escondê-lo aqui (o aceite é obrigatório para usar o app; recusar = sair ou excluir a conta).

- [ ] **Step 9: Verificação manual** — usuário novo: modal aparece e não fecha com Esc/clique fora; "Li e aceito" fecha; recarregar não mostra de novo; `SELECT "privacyAcceptedAt", "privacyPolicyVersion" FROM users WHERE id='<id>'` preenchido; `audit_logs` tem `user.privacy_consent`. `/privacidade` abre deslogado.

- [ ] **Step 10:** Commits: `feat: registro de consentimento da política de privacidade` (API) e `feat: página de privacidade e aceite obrigatório` (web).

---

### Task 11: Defesa em profundidade no IDOR (API)

Hoje `update`/`delete` de transactions, budgets e categories filtram só por `id`, confiando no `getById(id, userId)` feito antes pelo service. Colocar `userId` no próprio `WHERE` impede regressão se um service futuro esquecer a checagem.

**Files:**
- Modify: `src/modules/{transactions,budgets,categories}/{name}.repository.ts` (assinaturas)
- Modify: `src/modules/{transactions,budgets,categories}/drizzle-{name}.repository.ts`
- Modify: `src/modules/{transactions,budgets,categories}/{name}.service.ts` (chamadas)
- Test: `src/modules/{transactions,budgets,categories}/{name}.service.spec.ts`

**Interfaces:**
- Produces: `update(id: string, userId: string, data)` e `delete(id: string, userId: string)` nos três repositórios.

- [ ] **Step 1: Teste que falha** — em `transactions.service.spec.ts`, no teste existente de `remove`, trocar a expectativa para `expect(repository.delete).toHaveBeenCalledWith('tx-id', 'user-id')` (usar os ids que o teste já usa). Idem para `update` (`toHaveBeenCalledWith(id, userId, expect.any(Object))`) e para os specs de budgets e categories. `pnpm test` → FAIL.

- [ ] **Step 2: Assinaturas abstratas** — nos três `*.repository.ts`:

```ts
  update(_id: string, _userId: string, _data: UpdateTransactionInput): Promise<TransactionWithCategory> {
    throw new Error('Not implemented');
  }

  delete(_id: string, _userId: string): Promise<DbTransaction> {
    throw new Error('Not implemented');
  }
```

(com os tipos respectivos de budgets/categories).

- [ ] **Step 3: Drizzle** — em cada `drizzle-*.repository.ts`, nos métodos `update` e `delete`, trocar `.where(eq(<tabela>.id, id))` por:

```ts
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
```

(`budgets`/`categories` nos respectivos arquivos; `and` já importado nos três). Manter as queries secundárias por `categories.id` como estão (a categoria já foi validada como do usuário).

- [ ] **Step 4: Services** — passar `user.userId`/`userId` nas chamadas: `this.transactionsRepository.update(id, user.userId, payload)`, `this.transactionsRepository.delete(id, userId)`; idem budgets (`update(id, user.userId, dto)`, `delete(id, userId)`) e categories (`update(id, user.userId, payload)`, `delete(id, user.userId)`).

- [ ] **Step 5:** `pnpm test && pnpm test:e2e` → PASS.

- [ ] **Step 6:** Commit: `refactor: update/delete filtram por userId no próprio WHERE`.

---

### Task 12: Backups testados (MANUAL)

- [ ] **Step 1:** Identificar o provedor do Postgres de produção e confirmar backup automático + retenção (Render Postgres free **não** tem backup; plano pago tem PITR).
- [ ] **Step 2:** Se não houver: job semanal `pg_dump "$DATABASE_URL" | gzip | age -r <chave-pública> > backup.sql.gz.age` enviado para storage privado (nunca para o repo; `backups/` já está no `.gitignore`).
- [ ] **Step 3:** Teste de restore trimestral: `pnpm db:up`, restaurar o dump no Postgres local, `SELECT count(*) FROM users;` bate com produção. Registrar data do teste em `docs/render-deploy.md`.

---

## Ordem de execução

`0 → 1 → 2 → 4 → 5 → 6 → (deploy coordenado) → 3 → 7 → 8 → 9 → 10 → 11 → 12`

Task 0 é imediata e independente de código. Tasks 4–6 sobem juntas. Task 3 depende do rewrite da Task 6 estar no ar para medir os hops.
