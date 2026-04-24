import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeEP, computeFIP, computeLTI } from "@/lib/scoring/engine";
import { METHODOLOGY_VERSION } from "@/lib/scoring/methodology";
import { getActiveRuleSet } from "@/lib/rules";
import type { AssessmentInput } from "@/lib/scoring/types";

// Build a complete AssessmentInput from a stored record so we can re-run
// the scoring engine and recover the derived fields that aren't persisted
// (returnScenario, visaInfo, year1 confidence bands, fx, dataSource, lti).
function toAssessmentInput(r: {
  studentName: string; undergradInstitution: string; undergradTier: string;
  undergradDegree: string; undergradMajor: string; undergradCgpa: number;
  greScore: number | null; gmatScore: number | null; workExperienceYears: number;
  destinationCountry: string; destinationUniversity: string; targetDegree: string;
  targetCourse: string; isStem: boolean; programDurationMonths: number;
  targetCity: string | null; loanAmountInr: number | null;
  nationality?: string | null;
}): AssessmentInput {
  return {
    studentName: r.studentName,
    nationality: r.nationality ?? "Indian",
    undergradInstitution: r.undergradInstitution,
    undergradTier: r.undergradTier,
    undergradDegree: r.undergradDegree,
    undergradMajor: r.undergradMajor,
    undergradCgpa: r.undergradCgpa,
    greScore: r.greScore ?? undefined,
    gmatScore: r.gmatScore ?? undefined,
    workExperienceYears: r.workExperienceYears,
    destinationCountry: r.destinationCountry,
    destinationUniversity: r.destinationUniversity,
    targetDegree: r.targetDegree,
    targetCourse: r.targetCourse,
    isStem: r.isStem,
    programDurationMonths: r.programDurationMonths,
    targetCity: r.targetCity ?? undefined,
    loanAmountInr: r.loanAmountInr ?? undefined,
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true, email: true } },
      coApplicants: true,
    },
  });

  if (!assessment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Re-run scoring so the detail page can render returnScenario, visaInfo,
  // confidence bands, fx, dataSource, lti — none of which are persisted. The
  // persisted scalars (epScore, fipYear1Local, …) remain available for
  // historical reference via the raw record fields.
  const input = toAssessmentInput(assessment);
  const [ep, fip] = await Promise.all([computeEP(input), computeFIP(input)]);
  const lti = assessment.loanAmountInr
    ? computeLTI(assessment.loanAmountInr, fip.year1Inr, fip.year3Inr)
    : undefined;

  // Rehydrate composite breakdown from storage (computed at assess-time).
  let composite: unknown = null;
  if (assessment.compositeBreakdown) {
    try {
      composite = JSON.parse(assessment.compositeBreakdown);
    } catch {
      composite = null;
    }
  }

  return NextResponse.json({
    ...assessment,
    ep,
    fip,
    lti,
    composite,
    methodologyVersion: METHODOLOGY_VERSION,
    ruleSetVersion: assessment.ruleSetVersion,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.assessment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json()) as AssessmentInput & { notes?: string };

  const [ep, fip, activeRuleSet] = await Promise.all([
    computeEP(body),
    computeFIP(body),
    getActiveRuleSet(),
  ]);

  const updated = await prisma.assessment.update({
    where: { id },
    data: {
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
    },
  });

  return NextResponse.json({
    id: updated.id,
    ep,
    fip,
    methodologyVersion: METHODOLOGY_VERSION,
    ruleSetVersion: activeRuleSet.version,
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.assessment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.assessment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
