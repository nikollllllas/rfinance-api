# Migration Notes: Next API -> Nest API

## Escopo

Este documento registra diferenças contratuais entre a API antiga (`rfinanece-web/app/api`) e a API nova em `rfinance-api`.

## Endpoints implementados

- `POST /v1/auth/login`
- `POST /v1/auth/logout`
- `GET /v1/auth/me`
- `GET /v1/categories`
- `GET /v1/categories/:id`
- `POST /v1/categories`
- `PUT /v1/categories/:id`
- `DELETE /v1/categories/:id`
- `GET /v1/transactions`
- `GET /v1/transactions/months`
- `GET /v1/transactions/:id`
- `POST /v1/transactions`
- `PUT /v1/transactions/:id`
- `DELETE /v1/transactions/:id`
- `POST /v1/budgets`
- `GET /v1/budgets`
- `PUT /v1/budgets` (replicate)
- `GET /v1/budgets/:id`
- `PUT /v1/budgets/:id`
- `DELETE /v1/budgets/:id`
- `GET /v1/budgets/:id/progress`
- `GET /v1/dashboard`

## Compatibilidades preservadas

- Scoping de dados financeiros por `userId`.
- Contrato de criação de transações com retorno `{ transactions: [...] }`.
- Regra de parcelamento (somente crédito, 2-12 parcelas).
- Replicação de orçamentos por mês no endpoint `PUT /v1/budgets`.
- RBAC de categorias para escrita com `ADMIN`.

## Mudanças intencionais

1. **Termo de domínio em budgets**
   - Antes: mensagens mistas de "Carteira" e "Orçamento".
   - Agora: mensagens padronizadas para **"Orçamento"**.
   - Impacto no frontend: apenas textos de erro/sucesso; sem quebra de shape JSON.

2. **Erro semântico em atualização de transação**
   - Antes: `PUT /transactions/:id` podia retornar `404 Transação não encontrada` para categoria inválida.
   - Agora: retorna `404 Categoria não encontrada` quando o problema é categoria.
   - Impacto no frontend: melhora semântica de tratamento de erro.

3. **Validação de mês (`YYYY-MM`)**
   - Antes: validação inconsistente em alguns endpoints.
   - Agora: validação estrita em:
     - `GET /v1/transactions?month=`
     - `GET /v1/budgets?month=`
     - `GET /v1/dashboard?month=`
   - Status em caso inválido: `422`.

4. **Validação DTO padronizada**
   - Agora: validações de entrada via `class-validator` em DTOs.
   - Status de validação inválida: `422` (global).

## Padronização de códigos HTTP

- `200`: leitura/atualização/exclusão com sucesso.
- `201`: criação com sucesso.
- `401`: não autenticado.
- `403`: sem permissão.
- `404`: recurso não encontrado.
- `409`: conflito de unicidade/dependência.
- `422`: erro de validação.
- `500`: erro interno não tratado.

## Estratégia de migração para Drizzle (sem downtime)

- Camada de repositório isolada por módulo.
- Migração finalizada com repositórios atendidos por Drizzle.
- Inicialmente, adapters `drizzle` mantêm contrato usando mesma semântica de repositório para migração segura.

## Riscos remanescentes

- Rollout de adapters Drizzle ainda em transição gradual por módulo.
- Dependência de `DATABASE_URL` correta para execução de integração real.
- Necessidade de testes de contrato e e2e com banco real para cobertura total do switch de adapter.
