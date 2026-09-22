CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"key" text NOT NULL,
	"transactionIds" text[] NOT NULL,
	"createdAt" timestamp NOT NULL,
	CONSTRAINT "idempotency_keys_userId_key_key" UNIQUE("userId","key")
);
--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;