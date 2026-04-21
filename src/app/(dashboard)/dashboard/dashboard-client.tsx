"use client";

import Link from "next/link";
import { formatInr, getRiskBandColor } from "@/lib/utils";

interface DashboardProps {
  totalAssessments: number;
  monthlyAssessments: number;
  avgEpScore: number;
  avgFipYear1Inr: number;
  riskDistribution: Record<string, number>;
  recentAssessments: Array<{
    id: string;
    studentName: string;
    destinationCountry: string;
    destinationUniversity: string;
    targetCourse: string;
    targetDegree: string;
    epScore: number;
    epRiskBand: string;
    fipYear1Local: number;
    fipYear1Inr: number;
    fipCurrency: string;
    createdAt: string;
  }>;
  userName: string;
}

export function DashboardClient({
  totalAssessments,
  monthlyAssessments,
  avgEpScore,
  avgFipYear1Inr,
  riskDistribution,
  recentAssessments,
  userName,
}: DashboardProps) {
  const totalRisk = Object.values(riskDistribution).reduce((a, b) => a + b, 0) || 1;
  const riskBands = [
    { label: "Low", count: riskDistribution["Low"] ?? 0, color: "#16a34a" },
    { label: "Medium", count: riskDistribution["Medium"] ?? 0, color: "#ca8a04" },
    { label: "High", count: riskDistribution["High"] ?? 0, color: "#ea580c" },
    { label: "Very High", count: riskDistribution["Very High"] ?? 0, color: "#dc2626" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {userName.split(" ")[0]}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">FinZ Finance Credit Underwriting Dashboard</p>
        </div>
        <Link
          href="/assess"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Assessment
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Assessments", value: totalAssessments.toString(), icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
          { label: "This Month", value: monthlyAssessments.toString(), icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
          { label: "Avg EP Score", value: avgEpScore > 0 ? `${avgEpScore}/100` : "—", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
          { label: "Avg FIP Year 1", value: avgFipYear1Inr > 0 ? formatInr(avgFipYear1Inr) : "—", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Risk Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Risk Band Distribution</h2>
          {totalAssessments === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No assessments yet</p>
          ) : (
            <div className="space-y-3">
              {riskBands.map((band) => (
                <div key={band.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600 font-medium">{band.label}</span>
                    <span className="text-slate-900 font-semibold">{band.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all"
                      style={{ width: `${(band.count / totalRisk) * 100}%`, backgroundColor: band.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/assess", label: "New Assessment", desc: "Score a single applicant", icon: "M12 4v16m8-8H4" },
              { href: "/batch", label: "Batch Upload", desc: "Score multiple applicants via CSV", icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" },
              { href: "/history", label: "Case History", desc: "View all past assessments", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
              { href: "/insights", label: "Course Insights", desc: "Market intelligence & salary data", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center flex-shrink-0 transition-colors">
                  <svg className="w-5 h-5 text-slate-500 group-hover:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{link.label}</p>
                  <p className="text-xs text-slate-500">{link.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Assessments */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">Recent Assessments</h2>
          <Link href="/history" className="text-xs text-blue-500 hover:text-blue-700 font-medium">View all →</Link>
        </div>
        {recentAssessments.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm">No assessments yet. Run your first one.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {recentAssessments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3">
                    <p className="font-medium text-slate-900">{a.studentName}</p>
                    <p className="text-xs text-slate-400">{a.targetDegree} {a.targetCourse}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {a.destinationUniversity}, {a.destinationCountry}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-lg font-bold text-slate-900">{a.epScore}</span>
                    <span className="text-xs text-slate-400">/100</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getRiskBandColor(a.epRiskBand)}`}>
                      {a.epRiskBand}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-semibold text-slate-900">{a.fipCurrency} {a.fipYear1Local.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-slate-400">{formatInr(a.fipYear1Inr)}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-400">
                    {new Date(a.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
