-- Telefonia: colonne ticket additive e tabella chiamate.
-- Le colonne nuove sono nullable: i ticket esistenti restano invariati.

ALTER TABLE "ServiceTicket" ADD COLUMN "customerId" TEXT;
ALTER TABLE "ServiceTicket" ADD COLUMN "department" TEXT;
ALTER TABLE "ServiceTicket" ADD COLUMN "aiProposalJson" JSONB;
ALTER TABLE "ServiceTicket" ADD COLUMN "operatorChoiceJson" JSONB;
ALTER TABLE "ServiceTicket" ADD COLUMN "resolvedAt" TIMESTAMP(3);

CREATE INDEX "ServiceTicket_customerId_idx" ON "ServiceTicket"("customerId");

ALTER TABLE "ServiceTicket"
  ADD CONSTRAINT "ServiceTicket_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PhoneCall" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "durationSec" INTEGER,
  "outcome" TEXT NOT NULL,
  "recordingUrl" TEXT,
  "transcript" TEXT,
  "operatorName" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "ticketId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PhoneCall_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PhoneCall_companyId_externalId_key"
  ON "PhoneCall"("companyId", "externalId");
CREATE INDEX "PhoneCall_companyId_occurredAt_idx"
  ON "PhoneCall"("companyId", "occurredAt");
CREATE INDEX "PhoneCall_companyId_phone_idx"
  ON "PhoneCall"("companyId", "phone");
CREATE INDEX "PhoneCall_ticketId_idx" ON "PhoneCall"("ticketId");

ALTER TABLE "PhoneCall"
  ADD CONSTRAINT "PhoneCall_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PhoneCall"
  ADD CONSTRAINT "PhoneCall_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "ServiceTicket"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PhoneCall" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PhoneCall_tenant_select" ON "PhoneCall"
  FOR SELECT
  USING ("companyId" = current_setting('app.company_id', true));

CREATE POLICY "PhoneCall_tenant_insert" ON "PhoneCall"
  FOR INSERT
  WITH CHECK ("companyId" = current_setting('app.company_id', true));

CREATE POLICY "PhoneCall_tenant_update" ON "PhoneCall"
  FOR UPDATE
  USING ("companyId" = current_setting('app.company_id', true))
  WITH CHECK ("companyId" = current_setting('app.company_id', true));

CREATE POLICY "PhoneCall_tenant_delete" ON "PhoneCall"
  FOR DELETE
  USING ("companyId" = current_setting('app.company_id', true));
