# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)
1. **[2026-03-31] Validate environment variables before app start**
   Do instead: ensure `.env` (or shell env) includes `DATABASE_URL` before running `pnpm start:dev`.

## Shell & Command Reliability
1. **[2026-03-31] Keep local database bootstrapping reproducible**
   Do instead: use a committed `docker-compose.yml` and a single documented startup command.
2. **[2026-03-31] pnpm lockfile may keep optional peer metadata**
   Do instead: validate runtime usage with `pnpm list <pkg>` and code search, not lockfile strings only.

## Domain Behavior Guardrails
1. **[2026-03-31] Keep production and local database configs separate**
   Do instead: use local `DATABASE_URL` for containerized Postgres and keep production serverless URL out of local defaults.

## User Directives
1. **[2026-03-31] Prefer concise, complete implementation**
   Do instead: make the change end-to-end with minimal prose and no placeholders.
