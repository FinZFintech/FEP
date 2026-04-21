"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getRiskBandColor, formatInr } from "@/lib/utils";

interface Assessment {
  id: string;
  createdAt: string;
  studentName: string;
  undergradInstitution: string;
  undergradTier: string;
  destinationCountry: string;
  destinationUniversity: string;
  targetDegree: string;
  targetCourse: string;
  epScore: number;
  epRiskBand: string;
  fipYear1Local: number;
  fipYear1Inr: number;
  fipCurrency: string;
  createdBy: { name: string | null; email: string | null };
}

interface PageData { assessments: Assessment[]; total: number; page: number; limit: number }

export default function HistoryPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/history?page=${page}&limit=20`);
    const json = await res.json() as PageData;
    setData(json);
    setLoading(false);
  }, [page]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Case History</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {data ? `${data.total} assessments on record` : "Loading..."}
          </p>
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

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : !data?.assessments.length ? (
          <div className="text-center py-20 text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No assessments yet.</p>
            <Link href="/assess" className="text-blue-500 text-sm mt-1 inline-block hover:underline">Run your first assessment →</Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Student</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Programme</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">EP Score</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Risk</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">FIP Year 1</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Assessed By</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.assessments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{a.studentName}</p>
                        <p className="text-xs text-slate-400">{a.undergradInstitution} ({a.undergradTier})</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{a.targetDegree} {a.targetCourse}</p>
                        <p className="text-xs text-slate-400">{a.destinationUniversity}, {a.destinationCountry}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-lg font-bold text-slate-900">{a.epScore}</span>
                        <span className="text-slate-400 text-xs">/100</span>
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
                      <td className="px-4 py-3 text-sm text-slate-500">{a.createdBy.name ?? a.createdBy.email}</td>
                      <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                        {new Date(a.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/history/${a.id}`} className="text-blue-500 hover:text-blue-700 text-xs font-medium">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages} · {data.total} total
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
