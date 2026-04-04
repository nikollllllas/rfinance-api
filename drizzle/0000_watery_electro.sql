CREATE TYPE "public"."CategoryType" AS ENUM('GANHO', 'GASTO', 'AMBOS');--> statement-breakpoint
CREATE TYPE "public"."PaymentMethod" AS ENUM('PIX', 'DEBITO', 'CREDITO');--> statement-breakpoint
CREATE TYPE "public"."Role" AS ENUM('ADMIN', 'USER');--> statement-breakpoint
CREATE TYPE "public"."TransactionTag" AS ENUM('FALTA', 'PAGO', 'DEVOLVER', 'ECONOMIA');--> statement-breakpoint
CREATE TYPE "public"."TransactionType" AS ENUM('GANHO', 'GASTO');--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"categoryId" text NOT NULL,
	"budgetMonth" text NOT NULL,
	CONSTRAINT "budgets_userId_categoryId_budgetMonth_key" UNIQUE("userId","categoryId","budgetMonth")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#000000' NOT NULL,
	"icon" text,
	"isDefault" boolean DEFAULT false NOT NULL,
	"type" "CategoryType",
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "categories_userId_name_key" UNIQUE("userId","name")
);
--> statement-breakpoint
CREATE TABLE "password_recovery_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"tokenHash" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"usedAt" timestamp,
	"createdAt" timestamp NOT NULL,
	CONSTRAINT "password_recovery_tokens_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"date" timestamp NOT NULL,
	"notes" text,
	"type" "TransactionType" NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"categoryId" text NOT NULL,
	"tag" "TransactionTag",
	"paymentMethod" "PaymentMethod",
	"installmentGroupId" uuid,
	"installmentIndex" integer,
	"installmentCount" integer
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"passwordHash" text NOT NULL,
	"role" "Role" DEFAULT 'USER' NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_categoryId_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "password_recovery_tokens" ADD CONSTRAINT "password_recovery_tokens_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_categoryId_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "budgets_userId_idx" ON "budgets" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "budgets_categoryId_idx" ON "budgets" USING btree ("categoryId");--> statement-breakpoint
CREATE INDEX "budgets_budgetMonth_idx" ON "budgets" USING btree ("budgetMonth");--> statement-breakpoint
CREATE INDEX "categories_userId_idx" ON "categories" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "password_recovery_tokens_userId_idx" ON "password_recovery_tokens" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "password_recovery_tokens_expiresAt_idx" ON "password_recovery_tokens" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "transactions_userId_idx" ON "transactions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "transactions_categoryId_idx" ON "transactions" USING btree ("categoryId");--> statement-breakpoint
CREATE INDEX "transactions_date_idx" ON "transactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "transactions_installmentGroupId_idx" ON "transactions" USING btree ("installmentGroupId");