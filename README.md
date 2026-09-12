# RFinance API

API backend do **RFinance**, construída com NestJS. Fornece autenticação, controle de acesso por papéis (RBAC) e os recursos de gestão financeira (transações, categorias e orçamentos) consumidos pelo [RFinance Web](https://github.com/nikollllllas/rfinance-web).

## Stack

- NestJS 11
- Drizzle ORM (PostgreSQL)
- Autenticação JWT (Bearer) + RBAC
- Documentação via Swagger em `/docs`

## Módulos implementados

- `auth`
- `users`
- `rbac`
- `categories`
- `transactions`
- `budgets`
- `dashboard`

## Requisitos

- Node.js 20+
- pnpm 10+
- Docker (para Postgres local)

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

3. Instale as dependências:

```bash
pnpm install
```

4. Suba o Postgres local:

```bash
pnpm db:up
```

`DATABASE_URL` local padrão:

```
postgresql://postgres:postgres@localhost:5432/rfinance
```

Outros comandos úteis do banco:

```bash
pnpm db:down    # para e remove containers/rede
pnpm db:logs    # logs do banco
```

## Execução

```bash
pnpm dev
```

Ou para subir banco + API com um único comando:

```bash
pnpm dev:up
```

- API: `http://localhost:3000/v1`
- Swagger: `http://localhost:3000/docs`

## Build e testes

```bash
pnpm build
pnpm test
```

## Observações de migração

Diferenças relevantes de contrato e compatibilidade estão documentadas em `docs/migration-notes.md`.

## Deploy no Render

Guia de deploy e checklist de validação em `docs/render-deploy.md`.
