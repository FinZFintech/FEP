-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "addressPincode" TEXT,
ADD COLUMN     "admissionVisaFlightStatus" TEXT,
ADD COLUMN     "applicantAnnualOther" DOUBLE PRECISION,
ADD COLUMN     "applicantAnnualSalary" DOUBLE PRECISION,
ADD COLUMN     "applicantCibilScore" INTEGER,
ADD COLUMN     "applicantCrifScore" INTEGER,
ADD COLUMN     "applicantExistingEmis" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
ADD COLUMN     "applicantFutureEmiInr" DOUBLE PRECISION,
ADD COLUMN     "averageBankBalance3moInr" DOUBLE PRECISION,
ADD COLUMN     "bankSavingsInr" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "compositeBreakdown" TEXT,
ADD COLUMN     "compositeDecision" TEXT,
ADD COLUMN     "compositeScore" DOUBLE PRECISION,
ADD COLUMN     "consultantBlacklistHit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "creditDefault15PlusDpd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "creditDefaultWriteOff" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "creditOverdueAbove3k" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "documentAuthenticityStatus" TEXT,
ADD COLUMN     "earlyEmiBounceHistory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fdInr" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "inNegativePincodeList" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "insuranceBundle" TEXT,
ADD COLUMN     "isNewToCredit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "livingExpensesInr" DOUBLE PRECISION,
ADD COLUMN     "mutualFundInr" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "otherSavingsInr" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "scholarshipInr" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "socialMediaRedFlag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalCostOfAttInr" DOUBLE PRECISION,
ADD COLUMN     "tuitionFeesInr" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "CoApplicant" (
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
CREATE INDEX "CoApplicant_assessmentId_idx" ON "CoApplicant"("assessmentId");

-- AddForeignKey
ALTER TABLE "CoApplicant" ADD CONSTRAINT "CoApplicant_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

