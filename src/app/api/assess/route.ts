import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeEP, computeFIP, computeLTI } from "@/lib/scoring/engine";
import { METHODOLOGY_VERSION } from "@/lib/scoring/methodology";
import { getActiveRuleSet } from "@/lib/rules";
import { computeComposite } from "@/lib/scoring/composite-engine";
import { isNegativePincode } from "@/lib/scoring/modules/penalties";
import type { AssessmentInput } from "@/lib/scoring/types";
import type { CompositeExtraInput } from "@/lib/scoring/composite-engine";
import type { CoApplicantInput } from "@/lib/scoring/modules/types";

// ─── Input schema ─────────────────────────────────────────────────────────

const coApplicantSchema = z.object({
  relation: z.enum(["FATHER", "MOTHER", "SPOUSE", "SIBLING", "GUARDIAN"]),
  occupationType: z.enum([
    "PRIVATE",
    "GOVT",
    "SELF_EMPLOYED",
    "NOT_WORKING",
    "RETIRED",
    "FARMER",
  ]),
  cibilScore: z.number().int().min(0).max(900).optional(),
  crifScore: z.number().int().min(0).max(900).optional(),
  annualSalary: z.number().min(0).optional(),
  annualRental: z.number().min(0).optional(),
  annualOther: z.number().min(0).optional(),
  existingEmis: z.array(z.number().min(0)).max(3).optional(),
});

const bodySchema = z.object({
  // Existing assessment fields
  studentName: z.string().min(1),
  nationality: z.string().min(1),
  undergradInstitution: z.string().min(1),
  undergradTier: z.string().min(1),
  undergradDegree: z.string().min(1),
  undergradMajor: z.string().min(1),
  undergradCgpa: z.number(),
  greScore: z.number().int().optional(),
  gmatScore: z.number().int().optional(),
  workExperienceYears: z.number().int().min(0),
  destinationCountry: z.string().min(1),
  destinationUniversity: z.string().min(1),
  targetDegree: z.string().min(1),
  targetCourse: z.string().min(1),
  isStem: z.boolean(),
  programDurationMonths: z.number().int().min(1),
  targetCity: z.string().optional(),
  loanAmountInr: z.number().min(0).optional(),
  notes: z.string().optional(),

  // Framework Jan-2026 additions — all optional so the endpoint stays
  // backward-compatible. When any of these are supplied the composite
  // score is computed and persisted.
  applicantCibilScore: z.number().int().min(0).max(900).optional(),
  applicantCrifScore: z.number().int().min(0).max(900).optional(),
  applicantAnnualSalary: z.number().min(0).optional(),
  applicantAnnualOther: z.number().min(0).optional(),
  applicantExistingEmis: z.array(z.number().min(0)).max(3).optional(),
  applicantFutureEmiInr: z.number().min(0).optional(),
  isNewToCredit: z.boolean().optional(),
  isNtcEligibleTransition: z.boolean().optional(),
  averageBankBalance3moInr: z.number().min(0).optional(),

  coApplicants: z.array(coApplicantSchema).max(3).optional(),

  // §15 Savings
  tuitionFeesInr: z.number().min(0).optional(),
  livingExpensesInr: z.number().min(0).optional(),
  totalCostOfAttInr: z.number().min(0).optional(),
  scholarshipInr: z.number().min(0).optional(),
  mutualFundInr: z.number().min(0).optional(),
  fdInr: z.number().min(0).optional(),
  bankSavingsInr: z.number().min(0).optional(),
  otherSavingsInr: z.number().min(0).optional(),

  // §4.2 Penalty flags
  addressPincode: z.string().optional(),
  documentAuthenticityStatus: z
    .enum(["VERIFIED", "PARTIAL", "MISMATCH", "FORGERY", "UNVERIFIABLE"])
    .optional(),
  admissionVisaFlightStatus: z
    .enum(["ALL_CONFIRMED", "VISA_IN_PROCESS", "CONDITIONAL", "LIKELY_REJECT", "FAKE"])
    .optional(),
  socialMediaRedFlag: z.boolean().optional(),
  creditDefault15PlusDpd: z.boolean().optional(),
  creditDefaultWriteOff: z.boolean().optional(),
  creditOverdueAbove3k: z.boolean().optional(),
  earlyEmiBounceHistory: z.boolean().optional(),
  consultantBlacklistHit: z.boolean().optional(),

  // §25 Insurance
  insuranceBundle: z
    .enum(["LIFE_ACC_HEALTH", "LIFE_ACC", "CREDIT_LIFE_ONLY", "DECLINED", "NONE"])
    .optional(),
});

type Body = z.infer<typeof bodySchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────

function hasAnyCompositeInput(b: Body): boolean {
  return !!(
    b.applicantCibilScore ||
    b.applicantCrifScore ||
    (b.coApplicants && b.coApplicants.length > 0) ||
    b.totalCostOfAttInr ||
    b.applicantFutureEmiInr ||
    b.addressPincode ||
    b.documentAuthenticityStatus ||
    b.admissionVisaFlightStatus ||
    b.insuranceBundle
  );
}

function buildCompositeExtras(b: Body): CompositeExtraInput {
  const coApplicants: CoApplicantInput[] = (b.coApplicants ?? []).map((c) => ({
    relation: c.relation,
    occupationType: c.occupationType,
    cibilScore: c.cibilScore,
    crifScore: c.crifScore,
    annualSalary: c.annualSalary ?? 0,
    annualRental: c.annualRental ?? 0,
    annualOther: c.annualOther ?? 0,
    existingEmis: c.existingEmis ?? [],
  }));

  const futureEmiInr = b.applicantFutureEmiInr ?? 0;

  return {
    credit: {
      applicantCibilScore: b.applicantCibilScore,
      applicantCrifScore: b.applicantCrifScore,
      isNewToCredit: b.isNewToCredit ?? false,
      isNtcEligibleTransition: b.isNtcEligibleTransition ?? false,
      averageBankBalance3moInr: b.averageBankBalance3moInr,
      futureEmiInr,
      coApplicants,
    },
    coApplicants,
    applicantIncome: {
      annualSalary: b.applicantAnnualSalary,
      annualOther: b.applicantAnnualOther,
      existingEmis: b.applicantExistingEmis,
    },
    savings: {
      scholarshipInr: b.scholarshipInr ?? 0,
      mutualFundInr: b.mutualFundInr ?? 0,
      fdInr: b.fdInr ?? 0,
      bankSavingsInr: b.bankSavingsInr ?? 0,
      otherSavingsInr: b.otherSavingsInr ?? 0,
      totalCostOfAttInr: b.totalCostOfAttInr ?? (b.loanAmountInr ?? 0),
    },
    penalties: {
      creditDefault15PlusDpd: b.creditDefault15PlusDpd ?? false,
      creditDefaultWriteOff: b.creditDefaultWriteOff ?? false,
      creditOverdueAbove3k: b.creditOverdueAbove3k ?? false,
      inNegativePincodeList: isNegativePincode(b.addressPincode),
      documentAuthenticityStatus: b.documentAuthenticityStatus,
      admissionVisaFlightStatus: b.admissionVisaFlightStatus,
      socialMediaRedFlag: b.socialMediaRedFlag ?? false,
      earlyEmiBounceHistory: b.earlyEmiBounceHistory ?? false,
      consultantBlacklistHit: b.consultantBlacklistHit ?? false,
    },
    insurance: {
      loanAmountInr: b.loanAmountInr,
      bundle: b.insuranceBundle,
    },
    futureEmiInr,
  };
}

// ─── Route ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const raw = await req.json();
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const body = parsed.data;
  const input: AssessmentInput = {
    studentName: body.studentName,
    nationality: body.nationality,
    undergradInstitution: body.undergradInstitution,
    undergradTier: body.undergradTier,
    undergradDegree: body.undergradDegree,
    undergradMajor: body.undergradMajor,
    undergradCgpa: body.undergradCgpa,
    greScore: body.greScore,
    gmatScore: body.gmatScore,
    workExperienceYears: body.workExperienceYears,
    destinationCountry: body.destinationCountry,
    destinationUniversity: body.destinationUniversity,
    targetDegree: body.targetDegree,
    targetCourse: body.targetCourse,
    isStem: body.isStem,
    programDurationMonths: body.programDurationMonths,
    targetCity: body.targetCity,
    loanAmountInr: body.loanAmountInr,
  };

  const [ep, fip, activeRuleSet] = await Promise.all([
    computeEP(input),
    computeFIP(input),
    getActiveRuleSet(),
  ]);

  const lti = body.loanAmountInr
    ? computeLTI(body.loanAmountInr, fip.year1Inr, fip.year3Inr)
    : undefined;

  // Composite is optional — only compute when the caller supplied the
  // additional inputs. Keeps back-compat with callers that only want EP/FIP.
  const composite = hasAnyCompositeInput(body)
    ? computeComposite(input, ep, fip, buildCompositeExtras(body))
    : null;

  const assessment = await prisma.assessment.create({
    data: {
      createdById: session.user.id,
      ruleSetVersion: activeRuleSet.version,
      studentName: body.studentName,
      undergradInstitution: body.undergradInstitution,
      undergradTier: body.undergradTier,
      undergradDegree: body.undergradDegree,
      undergradMajor: body.undergradMajor,
      undergradCgpa: body.undergradCgpa,
      greScore: body.greScore ?? null,
      gmatScore: body.gmatScore ?? null,
      workExperienceYears: body.workExperienceYears ?? 0,
      destinationCountry: body.destinationCountry,
      destinationUniversity: body.destinationUniversity,
      targetDegree: body.targetDegree,
      targetCourse: body.targetCourse,
      isStem: body.isStem,
      programDurationMonths: body.programDurationMonths ?? 24,
      targetCity: body.targetCity ?? null,
      loanAmountInr: body.loanAmountInr ?? null,
      epScore: ep.score,
      epRiskBand: ep.riskBand,
      epBreakdown: JSON.stringify(ep.breakdown),
      fipYear1Local: fip.year1Local,
      fipYear3Local: fip.year3Local,
      fipYear5Local: fip.year5Local,
      fipYear1Inr: fip.year1Inr,
      fipYear3Inr: fip.year3Inr,
      fipYear5Inr: fip.year5Inr,
      fipCurrency: fip.currency,
      fipBreakdown: JSON.stringify(fip.breakdown),
      notes: body.notes ?? null,

      // ── Framework Jan-2026 persistence ────────────────────────────────
      applicantCibilScore: body.applicantCibilScore ?? null,
      applicantCrifScore: body.applicantCrifScore ?? null,
      applicantAnnualSalary: body.applicantAnnualSalary ?? null,
      applicantAnnualOther: body.applicantAnnualOther ?? null,
      applicantExistingEmis: body.applicantExistingEmis ?? [],
      applicantFutureEmiInr: body.applicantFutureEmiInr ?? null,
      isNewToCredit: body.isNewToCredit ?? false,
      averageBankBalance3moInr: body.averageBankBalance3moInr ?? null,

      tuitionFeesInr: body.tuitionFeesInr ?? null,
      livingExpensesInr: body.livingExpensesInr ?? null,
      totalCostOfAttInr: body.totalCostOfAttInr ?? null,
      scholarshipInr: body.scholarshipInr ?? 0,
      mutualFundInr: body.mutualFundInr ?? 0,
      fdInr: body.fdInr ?? 0,
      bankSavingsInr: body.bankSavingsInr ?? 0,
      otherSavingsInr: body.otherSavingsInr ?? 0,

      addressPincode: body.addressPincode ?? null,
      inNegativePincodeList: isNegativePincode(body.addressPincode),
      documentAuthenticityStatus: body.documentAuthenticityStatus ?? null,
      admissionVisaFlightStatus: body.admissionVisaFlightStatus ?? null,
      socialMediaRedFlag: body.socialMediaRedFlag ?? false,
      creditDefault15PlusDpd: body.creditDefault15PlusDpd ?? false,
      creditDefaultWriteOff: body.creditDefaultWriteOff ?? false,
      creditOverdueAbove3k: body.creditOverdueAbove3k ?? false,
      earlyEmiBounceHistory: body.earlyEmiBounceHistory ?? false,
      consultantBlacklistHit: body.consultantBlacklistHit ?? false,

      insuranceBundle: body.insuranceBundle ?? null,

      compositeScore: composite?.compositeScore ?? null,
      compositeDecision: composite?.decision ?? null,
      compositeBreakdown: composite ? JSON.stringify(composite) : null,

      coApplicants: body.coApplicants
        ? {
            create: body.coApplicants.map((c) => ({
              relation: c.relation,
              occupationType: c.occupationType,
              cibilScore: c.cibilScore ?? null,
              crifScore: c.crifScore ?? null,
              annualSalary: c.annualSalary ?? 0,
              annualRental: c.annualRental ?? 0,
              annualOther: c.annualOther ?? 0,
              existingEmis: c.existingEmis ?? [],
            })),
          }
        : undefined,
    },
  });

  return NextResponse.json({
    id: assessment.id,
    ep,
    fip,
    lti,
    composite,
    methodologyVersion: METHODOLOGY_VERSION,
    ruleSetVersion: activeRuleSet.version,
  });
}
