-- Reparto dell'utente. Nullable: gli account esistenti restano senza reparto.

ALTER TABLE "User" ADD COLUMN "department" TEXT;
