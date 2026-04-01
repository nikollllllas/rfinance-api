# Contract Baseline (v1)

Este arquivo é a matriz de referência dos contratos atualmente implementados na API Nest.

## Auth

- `POST /v1/auth/login` -> `200`, `{ accessToken, user }`
- `POST /v1/auth/logout` -> `200`, `{ success: true }`
- `GET /v1/auth/me` -> `200`, `{ user }`

## Categories

- `GET /v1/categories` -> `200`, `Category[]`
- `GET /v1/categories/:id` -> `200`, `Category`
- `POST /v1/categories` -> `201`, `Category` (`ADMIN`)
- `PUT /v1/categories/:id` -> `200`, `Category` (`ADMIN`)
- `DELETE /v1/categories/:id` -> `200`, `{ message }` (`ADMIN`)

## Transactions

- `GET /v1/transactions` -> `200`, `{ transactions }`
- `GET /v1/transactions/months` -> `200`, `string[]`
- `GET /v1/transactions/:id` -> `200`, `Transaction`
- `POST /v1/transactions` -> `201`, `{ transactions }`
- `PUT /v1/transactions/:id` -> `200`, `Transaction`
- `DELETE /v1/transactions/:id` -> `200`, `{ message }`

## Budgets

- `POST /v1/budgets` -> `201`, `Budget`
- `GET /v1/budgets` -> `200`, `Budget[]`
- `PUT /v1/budgets` -> `200`, `{ message, budgets }` (replicate)
- `GET /v1/budgets/:id` -> `200`, `Budget`
- `PUT /v1/budgets/:id` -> `200`, `Budget`
- `DELETE /v1/budgets/:id` -> `200`, `{ message }`
- `GET /v1/budgets/:id/progress` -> `200`, budget progress

## Dashboard

- `GET /v1/dashboard` -> `200`, dashboard summary

## Error pattern

- `401` não autenticado
- `403` sem permissão
- `404` recurso não encontrado
- `409` conflito
- `422` erro de validação
- `500` erro interno
