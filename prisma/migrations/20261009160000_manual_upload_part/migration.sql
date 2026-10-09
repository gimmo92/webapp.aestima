-- Pezzi temporanei per caricare un manuale in più richieste.

CREATE TABLE "ManualUploadPart" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "uploadId" TEXT NOT NULL,
  "partIndex" INTEGER NOT NULL,
  "content" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ManualUploadPart_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ManualUploadPart_companyId_uploadId_partIndex_key"
  ON "ManualUploadPart"("companyId", "uploadId", "partIndex");

CREATE INDEX "ManualUploadPart_companyId_uploadId_idx"
  ON "ManualUploadPart"("companyId", "uploadId");

ALTER TABLE "ManualUploadPart"
  ADD CONSTRAINT "ManualUploadPart_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
