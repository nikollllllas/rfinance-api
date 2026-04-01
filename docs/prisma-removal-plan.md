# Prisma Removal Plan

## Estado atual

- Drizzle é o engine padrão (`REPOSITORY_ENGINE=drizzle`).
- Prisma permanece como fallback (`REPOSITORY_ENGINE=prisma`) durante janela de estabilização.

## Pré-condições para remoção total

1. 14 dias sem incidentes com `drizzle` em ambiente de homologação/produção.
2. Suítes `build` e `test` verdes com `REPOSITORY_ENGINE=drizzle`.
3. Smoke tests de endpoints críticos aprovados:
   - auth login/me
   - categories CRUD
   - transactions CRUD + months + parcelamento
   - budgets CRUD + replicate + progress
   - dashboard

## Passos de remoção

1. Remover providers e classes Prisma dos módulos:
   - `src/modules/prisma/*`
   - `src/modules/*/*prisma*.repository.ts`
2. Tornar Drizzle único provider de repositório.
3. Remover dependências Prisma de `package.json`:
   - `@prisma/client`
   - `prisma`
4. Remover diretório `prisma/` e artifacts não utilizados.
5. Atualizar README e docs para engine única Drizzle.

## Rollback

Enquanto Prisma existir no código:
- Reverter env para `REPOSITORY_ENGINE=prisma`.
- Reiniciar aplicação.

Após remoção total:
- rollback via release anterior empacotada.
