import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeEP, computeFIP } from "@/lib/scoring/engine";
import { METHODOLOGY_VERSION } from "@/lib/scoring/methodology";
import type { AssessmentInput } from "@/lib/scoring/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  if (!assessment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ...assessment, methodologyVersion: METHODOLOGY_VERSION });
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

  const [ep, fip] = await Promise.all([computeEP(body), computeFIP(body)]);

  const updated = await prisma.assessment.update({
    where: { id },
    data: {
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

  return NextResponse.json({ id: updated.id, ep, fip, methodologyVersion: METHODOLOGY_VERSION });
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
