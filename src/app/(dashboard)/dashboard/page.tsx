import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalAssessments, monthlyAssessments, recentAssessments, riskDistribution] = await Promise.all([
    prisma.assessment.count(),
    prisma.assessment.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.assessment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        studentName: true,
        destinationCountry: true,
        destinationUniversity: true,
        targetCourse: true,
        targetDegree: true,
        epScore: true,
        epRiskBand: true,
        fipYear1Local: true,
        fipYear1Inr: true,
        fipCurrency: true,
        createdAt: true,
      },
    }),
    prisma.assessment.groupBy({
      by: ["epRiskBand"],
      _count: { id: true },
    }),
  ]);

  const avgEp = totalAssessments > 0
    ? await prisma.assessment.aggregate({ _avg: { epScore: true } })
    : { _avg: { epScore: 0 } };

  const avgFipInr = totalAssessments > 0
    ? await prisma.assessment.aggregate({ _avg: { fipYear1Inr: true } })
    : { _avg: { fipYear1Inr: 0 } };

  const riskDist = {
    Low: 0,
    Medium: 0,
    High: 0,
    "Very High": 0,
  };
  for (const r of riskDistribution) {
    if (r.epRiskBand in riskDist) {
      riskDist[r.epRiskBand as keyof typeof riskDist] = r._count.id;
    }
  }

  return (
    <DashboardClient
      totalAssessments={totalAssessments}
      monthlyAssessments={monthlyAssessments}
      avgEpScore={Math.round(avgEp._avg.epScore ?? 0)}
      avgFipYear1Inr={Math.round(avgFipInr._avg.fipYear1Inr ?? 0)}
      riskDistribution={riskDist}
      recentAssessments={recentAssessments.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      }))}
      userName={session.user.name ?? "User"}
    />
  );
}
