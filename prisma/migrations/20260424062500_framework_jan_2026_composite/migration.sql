-- Idempotent additive migration. Safe to re-run against a DB where some
-- or all of these columns / tables were previously applied via `db push`
-- or manual SQL. Every statement is guarded with IF NOT EXISTS (or an
-- existence check for the FK constraint).

-- AlterTable: Assessment
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "addressPincode" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "admissionVisaFlightStatus" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "applicantAnnualOther" DOUBLE PRECISION;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "applicantAnnualSalary" DOUBLE PRECISION;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "applicantCibilScore" INTEGER;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "applicantCrifScore" INTEGER;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "applicantExistingEmis" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[];
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "applicantFutureEmiInr" DOUBLE PRECISION;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "averageBankBalance3moInr" DOUBLE PRECISION;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "bankSavingsInr" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "compositeBreakdown" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "compositeDecision" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "compositeScore" DOUBLE PRECISION;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "consultantBlacklistHit" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "creditDefault15PlusDpd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "creditDefaultWriteOff" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "creditOverdueAbove3k" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "documentAuthenticityStatus" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "earlyEmiBounceHistory" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "fdInr" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "inNegativePincodeList" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "insuranceBundle" TEXT;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "isNewToCredit" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "livingExpensesInr" DOUBLE PRECISION;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "mutualFundInr" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "otherSavingsInr" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "scholarshipInr" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "socialMediaRedFlag" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "totalCostOfAttInr" DOUBLE PRECISION;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "tuitionFeesInr" DOUBLE PRECISION;

-- CreateTable: CoApplicant
CREATE TABLE IF NOT EXISTS "CoApplicant" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "occupationType" TEXT NOT NULL,
    "cibilScore" INTEGER,
    "crifScore" INTEGER,
    "annualSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "annualRental" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "annualOther" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "existingEmis" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],

    CONSTRAINT "CoApplicant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CoApplicant_assessmentId_idx" ON "CoApplicant"("assessmentId");

-- AddForeignKey (guarded — Postgres has no "IF NOT EXISTS" for constraints)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'CoApplicant_assessmentId_fkey'
    ) THEN
        ALTER TABLE "CoApplicant"
            ADD CONSTRAINT "CoApplicant_assessmentId_fkey"
            FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
