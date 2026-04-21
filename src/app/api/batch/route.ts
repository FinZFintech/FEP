import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeEP, computeFIP } from "@/lib/scoring/engine";
import type { AssessmentInput } from "@/lib/scoring/types";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json() as { fileName: string; rows: AssessmentInput[] };

  const batchJob = await prisma.batchJob.create({
    data: {
      createdById: session.user.id,
      fileName: body.fileName,
      rowCount: body.rows.length,
      status: "processing",
    },
  });

  const results = [];

  for (const row of body.rows) {
    const ep = computeEP(row);
    const fip = computeFIP(row);

    const assessment = await prisma.assessment.create({
      data: {
        createdById: session.user.id,
        batchJobId: batchJob.id,
        studentName: row.studentName,
        undergradInstitution: row.undergradInstitution,
        undergradTier: row.undergradTier,
        undergradDegree: row.undergradDegree,
        undergradMajor: row.undergradMajor,
        undergradCgpa: row.undergradCgpa,
        greScore: row.greScore ?? null,
        gmatScore: row.gmatScore ?? null,
        workExperienceYears: row.workExperienceYears ?? 0,
        destinationCountry: row.destinationCountry,
        destinationUniversity: row.destinationUniversity,
        targetDegree: row.targetDegree,
        targetCourse: row.targetCourse,
        isStem: row.isStem ?? false,
        programDurationMonths: row.programDurationMonths ?? 24,
        targetCity: row.targetCity ?? null,
        loanAmountInr: row.loanAmountInr ?? null,
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
      },
    });

    results.push({ id: assessment.id, studentName: row.studentName, ep, fip });
  }

  await prisma.batchJob.update({
    where: { id: batchJob.id },
    data: { status: "completed" },
  });

  return NextResponse.json({ batchJobId: batchJob.id, results });
}
