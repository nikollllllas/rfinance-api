CREATE TABLE "attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"transactionId" text NOT NULL,
	"userId" uuid NOT NULL,
	"storageKey" text NOT NULL,
	"fileName" text NOT NULL,
	"mimeType" text NOT NULL,
	"sizeBytes" integer NOT NULL,
	"createdAt" timestamp NOT NULL,
	CONSTRAINT "attachments_storageKey_unique" UNIQUE("storageKey")
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_transactionId_transactions_id_fk" FOREIGN KEY ("transactionId") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "attachments_transactionId_idx" ON "attachments" USING btree ("transactionId");--> statement-breakpoint
CREATE INDEX "attachments_userId_idx" ON "attachments" USING btree ("userId");