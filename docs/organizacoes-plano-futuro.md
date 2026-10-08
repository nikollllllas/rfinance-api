# Organizações/empresas — plano futuro (não implementado)

Rascunho de arquitetura para o dia em que o RFinance precisar atender
contas de empresa, não só pessoa física. Nenhuma linha de código daqui
foi escrita ainda — isso é só o desenho pra quando a prioridade chegar.

## Estado atual

Todo dado é isolado por `userId` (`transactions`, `budgets`, `categories`
já têm FK direta pra `users`, ver `src/infrastructure/drizzle/schema.ts`).
Cada usuário é, na prática, um tenant isolado. O role `ADMIN` hoje só
gerencia contas de usuário (`/v1/users`) — não enxerga nem agrega dado
financeiro de outro usuário. Não existe nenhum conceito de dado
compartilhado entre contas.

## O que muda pra suportar empresa

Não é reescrita — é uma camada nova por cima do que já existe:

1. **Tabela `organizations`** — `id, name, createdAt, ...`
2. **Tabela `organization_members`** — `organizationId, userId, role`
   - roles sugeridas: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`
3. **`transactions` / `budgets` / `categories` ganham `organizationId`
   opcional** (nullable) — lançamento pessoal continua só com `userId`;
   lançamento de empresa tem `organizationId` preenchido e `userId`
   vira "quem lançou" (autoria), não mais "dono exclusivo do dado".
4. **Convite de membro** — fluxo de email parecido com o de recuperação
   de senha já existente (token com expiração, aceite cria o vínculo em
   `organization_members`).
5. **Troca de contexto nos clientes** (web e mobile) — um seletor
   "Pessoal" vs. "Empresa X", igual Vercel/Linear/Notion. Toda chamada
   de API passa a carregar o contexto ativo (header ou query param
   `organizationId`), e o backend valida que o usuário é membro antes
   de servir/alterar qualquer dado daquela organização.

## O que realmente é difícil aqui (não é o schema)

O schema é a parte fácil. O que pesa:

- **Permissão por ação**: quem pode ver todos os lançamentos da empresa
  vs. só os próprios (ex.: `MEMBER` lança mas só `ADMIN`/`OWNER` vê o
  todo)? Precisa decidir granularidade antes de implementar guard.
- **Aprovação de despesa** — faz sentido pra empresa (alguém lança,
  outro aprova) e não existe hoje no modelo pessoal.
- **Auditoria** — quem criou/editou/excluiu o quê, quando. Hoje não há
  audit log nenhum.
- **Orçamento e dashboard por organização** — os agregados atuais
  (`GET /v1/dashboard`) assumem um único dono; viram agregados por
  organização, com os mesmos filtros de permissão acima.
- **Billing** — se empresa virar plano pago, precisa de onde pendurar
  isso (Stripe, plano por organização, não por usuário).

## Tamanho do salto

Isso é mais próximo de um produto novo (multi-tenant B2B) do que de um
toggle em cima do que existe. Vale tratar como iniciativa própria —
brainstorm + spec completo — quando a prioridade justificar o
investimento, não encaixar via feature flag apressada.
