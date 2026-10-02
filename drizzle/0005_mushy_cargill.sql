CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"actorId" uuid,
	"targetId" text,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs" USING btree ("actorId");--> statement-breakpoint
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs" USING btree ("createdAt");