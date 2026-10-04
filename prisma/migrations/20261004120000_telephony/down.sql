-- Rollback manuale della migrazione telephony.
-- Prisma non esegue questo file: va applicato a mano se serve tornare indietro.

DROP POLICY IF EXISTS "PhoneCall_tenant_select" ON "PhoneCall";
DROP POLICY IF EXISTS "PhoneCall_tenant_insert" ON "PhoneCall";
DROP POLICY IF EXISTS "PhoneCall_tenant_update" ON "PhoneCall";
DROP POLICY IF EXISTS "PhoneCall_tenant_delete" ON "PhoneCall";

DROP TABLE IF EXISTS "PhoneCall";

ALTER TABLE "ServiceTicket" DROP CONSTRAINT IF EXISTS "ServiceTicket_customerId_fkey";
DROP INDEX IF EXISTS "ServiceTicket_customerId_idx";

ALTER TABLE "ServiceTicket" DROP COLUMN IF EXISTS "customerId";
ALTER TABLE "ServiceTicket" DROP COLUMN IF EXISTS "department";
ALTER TABLE "ServiceTicket" DROP COLUMN IF EXISTS "aiProposalJson";
ALTER TABLE "ServiceTicket" DROP COLUMN IF EXISTS "operatorChoiceJson";
ALTER TABLE "ServiceTicket" DROP COLUMN IF EXISTS "resolvedAt";
