# Deploy no Render

## 1) Criar serviço

- Plataforma: Render
- Tipo: Web Service
- Runtime: Node
- Plano inicial: Free
- Região sugerida: Ohio (`us-ohio`)

## 2) Build e start

- Build command:

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm build
```

- Start command:

```bash
pnpm start:prod
```

## 3) Variáveis de ambiente obrigatórias

- `NODE_ENV=production`
- `JWT_SECRET=<segredo forte>`
- `DATABASE_URL=<url do banco de produção>`
- `CORS_ALLOWED_ORIGINS=https://www.rfinanece-vercel.app,https://rfinanece-web-git-main-nikollas-projects-9321ac0f.vercel.app,https://rfinanece-g2pe0tq1p-nikollas-projects-9321ac0f.vercel.app`

## 4) Banco já em produção (estratégia segura)

1. Suba a API primeiro somente com leitura de saúde:
   - `GET /v1`
   - `GET /docs`
2. Não executar `db:push` automaticamente no deploy inicial.
3. Fazer qualquer alteração de schema em janela controlada e com backup/snapshot previamente validado.
4. Em caso de incidente, remover temporariamente `DATABASE_URL` no serviço ou pausar o deploy para bloquear tráfego.

## 5) Verificação de CORS

Troque `<API_URL>` pela URL pública da API no Render.

### Preflight permitido (origens autorizadas)

```bash
curl -i -X OPTIONS "<API_URL>/v1/auth/login" \
  -H "Origin: https://www.rfinanece-vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type"
```

Repita para:
- `https://rfinanece-web-git-main-nikollas-projects-9321ac0f.vercel.app`
- `https://rfinanece-g2pe0tq1p-nikollas-projects-9321ac0f.vercel.app`

### Preflight bloqueado (origem fora da allowlist)

```bash
curl -i -X OPTIONS "<API_URL>/v1/auth/login" \
  -H "Origin: https://evil.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization,Content-Type"
```

## 6) Health check Render

Configure `healthCheckPath` como:

```text
/v1
```
