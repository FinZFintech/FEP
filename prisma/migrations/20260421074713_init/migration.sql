-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'credit_manager',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "undergradInstitution" TEXT NOT NULL,
    "undergradTier" TEXT NOT NULL,
    "undergradDegree" TEXT NOT NULL,
    "undergradMajor" TEXT NOT NULL,
    "undergradCgpa" REAL NOT NULL,
    "greScore" INTEGER,
    "gmatScore" INTEGER,
    "workExperienceYears" INTEGER NOT NULL DEFAULT 0,
    "destinationCountry" TEXT NOT NULL,
    "destinationUniversity" TEXT NOT NULL,
    "targetDegree" TEXT NOT NULL,
    "targetCourse" TEXT NOT NULL,
    "isStem" BOOLEAN NOT NULL DEFAULT false,
    "programDurationMonths" INTEGER NOT NULL DEFAULT 24,
    "targetCity" TEXT,
    "loanAmountInr" REAL,
    "epScore" REAL NOT NULL,
    "epRiskBand" TEXT NOT NULL,
    "epBreakdown" TEXT NOT NULL,
    "fipYear1Local" REAL NOT NULL,
    "fipYear3Local" REAL NOT NULL,
    "fipYear5Local" REAL NOT NULL,
    "fipYear1Inr" REAL NOT NULL,
    "fipYear3Inr" REAL NOT NULL,
    "fipYear5Inr" REAL NOT NULL,
    "fipCurrency" TEXT NOT NULL,
    "fipBreakdown" TEXT NOT NULL,
    "notes" TEXT,
    "batchJobId" TEXT,
    CONSTRAINT "Assessment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Assessment_batchJobId_fkey" FOREIGN KEY ("batchJobId") REFERENCES "BatchJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BatchJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMsg" TEXT,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "BatchJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
