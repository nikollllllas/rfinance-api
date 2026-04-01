# RFinance API

API backend do RFinance construída com NestJS.

## Stack

- NestJS 11
- Drizzle ORM
- JWT (Bearer) + RBAC
- Swagger em `/docs`

## Requisitos

- Node.js 20+
- pnpm 10+
- Docker (para Postgres local)

## Banco local com Docker

Suba o Postgres local:

```bash
pnpm db:up
```

Pare e remova containers/rede:

```bash
pnpm db:down
```

Ver logs do banco:

```bash
pnpm db:logs
```

`DATABASE_URL` local padrão:

```bash
postgresql://postgres:postgres@localhost:5432/rfinance
```

## Configuração

1. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

2. Ajuste as variáveis:

- `PORT`
- `JWT_SECRET`
- `DATABASE_URL`
- `CORS_ALLOWED_ORIGINS`

3. Instale dependências:

```bash
pnpm install
```

4. Suba o Postgres local:

```bash
pnpm db:up
```

## Execução

```bash
pnpm dev
```

Ou para subir banco + API com um comando:

```bash
pnpm dev:up
```

API:
- Base URL: `http://localhost:3000/v1`
- Swagger: `http://localhost:3000/docs`

## Build e testes

```bash
pnpm build
pnpm test
```

Validação:

```bash
pnpm test
```

## Módulos implementados

- `auth`
- `users`
- `rbac`
- `categories`
- `transactions`
- `budgets`
- `dashboard`

## Observações de migração

As diferenças relevantes de contrato e compatibilidade estão em:

- `docs/migration-notes.md`

## Deploy no Render

Guia de deploy e checklist de validação:

- `docs/render-deploy.md`
