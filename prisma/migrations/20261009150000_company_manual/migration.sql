-- Manuali caricati dalla sezione Manuale e usati come contesto della chat.

CREATE TABLE "CompanyManual" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeLabel" TEXT NOT NULL,
  "content" BYTEA NOT NULL,
  "extractedText" TEXT NOT NULL DEFAULT '',
  "textExtracted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyManual_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CompanyManual_companyId_createdAt_idx"
  ON "CompanyManual"("companyId", "createdAt");

ALTER TABLE "CompanyManual"
  ADD CONSTRAINT "CompanyManual_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyManual" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CompanyManual_tenant_select" ON "CompanyManual"
  FOR SELECT
  USING ("companyId" = current_setting('app.company_id', true));

CREATE POLICY "CompanyManual_tenant_insert" ON "CompanyManual"
  FOR INSERT
  WITH CHECK ("companyId" = current_setting('app.company_id', true));

CREATE POLICY "CompanyManual_tenant_update" ON "CompanyManual"
  FOR UPDATE
  USING ("companyId" = current_setting('app.company_id', true))
  WITH CHECK ("companyId" = current_setting('app.company_id', true));

CREATE POLICY "CompanyManual_tenant_delete" ON "CompanyManual"
  FOR DELETE
  USING ("companyId" = current_setting('app.company_id', true));
