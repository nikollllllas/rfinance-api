import { randomUUID } from 'node:crypto';
import {
  boolean,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('Role', ['ADMIN', 'USER']);
export const categoryTypeEnum = pgEnum('CategoryType', ['GANHO', 'GASTO', 'AMBOS']);
export const transactionTypeEnum = pgEnum('TransactionType', ['GANHO', 'GASTO']);
export const transactionTagEnum = pgEnum('TransactionTag', [
  'FALTA',
  'PAGO',
  'DEVOLVER',
  'ECONOMIA',
  'RECEBIDO',
]);
export const paymentMethodEnum = pgEnum('PaymentMethod', [
  'PIX',
  'DEBITO',
  'CREDITO',
]);

export const users = pgTable('users', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('passwordHash').notNull(),
  role: roleEnum('role').notNull().default('USER'),
  tokenVersion: integer('tokenVersion').notNull().default(0),
  privacyAcceptedAt: timestamp('privacyAcceptedAt', { withTimezone: false }),
  privacyPolicyVersion: text('privacyPolicyVersion'),
  createdAt: timestamp('createdAt', { withTimezone: false })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp('updatedAt', { withTimezone: false })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const passwordRecoveryTokens = pgTable(
  'password_recovery_tokens',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: uuid('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    tokenHash: text('tokenHash').notNull().unique(),
    expiresAt: timestamp('expiresAt', { withTimezone: false }).notNull(),
    usedAt: timestamp('usedAt', { withTimezone: false }),
    createdAt: timestamp('createdAt', { withTimezone: false })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    userIdx: index('password_recovery_tokens_userId_idx').on(t.userId),
    expiresAtIdx: index('password_recovery_tokens_expiresAt_idx').on(t.expiresAt),
  }),
);

export const categories = pgTable(
  'categories',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: uuid('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull().default('#000000'),
    icon: text('icon'),
    isDefault: boolean('isDefault').notNull().default(false),
    type: categoryTypeEnum('type'),
    createdAt: timestamp('createdAt', { withTimezone: false })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp('updatedAt', { withTimezone: false })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    userIdx: index('categories_userId_idx').on(t.userId),
    userNameUnique: unique('categories_userId_name_key').on(t.userId, t.name),
  }),
);

export const transactions = pgTable(
  'transactions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: uuid('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    description: text('description').notNull(),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    date: timestamp('date', { withTimezone: false }).notNull(),
    notes: text('notes'),
    type: transactionTypeEnum('type').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: false })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp('updatedAt', { withTimezone: false })
      .notNull()
      .$defaultFn(() => new Date()),
    categoryId: text('categoryId')
      .notNull()
      .references(() => categories.id, { onUpdate: 'cascade' }),
    tag: transactionTagEnum('tag'),
    paymentMethod: paymentMethodEnum('paymentMethod'),
    installmentGroupId: uuid('installmentGroupId'),
    installmentIndex: integer('installmentIndex'),
    installmentCount: integer('installmentCount'),
  },
  (t) => ({
    userIdx: index('transactions_userId_idx').on(t.userId),
    categoryIdx: index('transactions_categoryId_idx').on(t.categoryId),
    dateIdx: index('transactions_date_idx').on(t.date),
    userCreatedAtIdx: index('transactions_userId_createdAt_idx').on(t.userId, t.createdAt),
    userDateIdx: index('transactions_userId_date_idx').on(t.userId, t.date),
    groupIdx: index('transactions_installmentGroupId_idx').on(t.installmentGroupId),
  }),
);

export const budgets = pgTable(
  'budgets',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: uuid('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp('createdAt', { withTimezone: false })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp('updatedAt', { withTimezone: false })
      .notNull()
      .$defaultFn(() => new Date()),
    categoryId: text('categoryId')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    budgetMonth: text('budgetMonth').notNull(),
  },
  (t) => ({
    userIdx: index('budgets_userId_idx').on(t.userId),
    categoryIdx: index('budgets_categoryId_idx').on(t.categoryId),
    monthIdx: index('budgets_budgetMonth_idx').on(t.budgetMonth),
    uniquePerMonth: unique('budgets_userId_categoryId_budgetMonth_key').on(
      t.userId,
      t.categoryId,
      t.budgetMonth,
    ),
  }),
);

export const attachments = pgTable(
  'attachments',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    transactionId: text('transactionId')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    userId: uuid('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    storageKey: text('storageKey').notNull().unique(),
    fileName: text('fileName').notNull(),
    mimeType: text('mimeType').notNull(),
    sizeBytes: integer('sizeBytes').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: false })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    transactionIdx: index('attachments_transactionId_idx').on(t.transactionId),
    userIdx: index('attachments_userId_idx').on(t.userId),
  }),
);

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: uuid('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    key: text('key').notNull(),
    transactionIds: text('transactionIds').array().notNull(),
    createdAt: timestamp('createdAt', { withTimezone: false })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    userKeyUnique: unique('idempotency_keys_userId_key_key').on(t.userId, t.key),
  }),
);

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

export type DbUser = typeof users.$inferSelect;
export type DbCategory = typeof categories.$inferSelect;
export type DbTransaction = typeof transactions.$inferSelect;
export type DbBudget = typeof budgets.$inferSelect;
export type DbIdempotencyKey = typeof idempotencyKeys.$inferSelect;
export type DbAttachment = typeof attachments.$inferSelect;
export type DbPasswordRecoveryToken = typeof passwordRecoveryTokens.$inferSelect;

export const CategoryType = {
  GANHO: 'GANHO',
  GASTO: 'GASTO',
  AMBOS: 'AMBOS',
} as const;
export type CategoryType = (typeof CategoryType)[keyof typeof CategoryType];

export const TransactionType = {
  GANHO: 'GANHO',
  GASTO: 'GASTO',
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const TransactionTag = {
  FALTA: 'FALTA',
  PAGO: 'PAGO',
  DEVOLVER: 'DEVOLVER',
  ECONOMIA: 'ECONOMIA',
  RECEBIDO: 'RECEBIDO',
} as const;
export type TransactionTag = (typeof TransactionTag)[keyof typeof TransactionTag];

export const PaymentMethod = {
  PIX: 'PIX',
  DEBITO: 'DEBITO',
  CREDITO: 'CREDITO',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
