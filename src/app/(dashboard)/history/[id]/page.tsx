"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { formatCurrency, formatInr, getRiskBandColor } from "@/lib/utils";
import type { EPBreakdownItem, FIPBreakdownItem } from "@/lib/scoring/types";
import { DataSourceLabel, DataSourceLegend } from "@/components/ui/data-source-label";

interface AssessmentDetail {
  id: string;
  createdAt: string;
  studentName: string;
  undergradInstitution: string;
  undergradTier: string;
  undergradDegree: string;
  undergradMajor: string;
  undergradCgpa: number;
  greScore: number | null;
  gmatScore: number | null;
  workExperienceYears: number;
  destinationCountry: string;
  destinationUniversity: string;
  targetDegree: string;
  targetCourse: string;
  isStem: boolean;
  programDurationMonths: number;
  targetCity: string | null;
  loanAmountInr: number | null;
  epScore: number;
  epRiskBand: string;
  epBreakdown: string;
  fipYear1Local: number;
  fipYear3Local: number;
  fipYear5Local: number;
  fipYear1Inr: number;
  fipYear3Inr: number;
  fipYear5Inr: number;
  fipCurrency: string;
  fipBreakdown: string;
  notes: string | null;
  createdBy: { name: string | null; email: string | null };
}

function ScoreGauge({ score, riskBand }: { score: number; riskBand: string }) {
  const colorMap: Record<string, string> = {
    Low: "#16a34a",
    Medium: "#ca8a04",
    High: "#ea580c",
    "Very High": "#dc2626",
  };
  const color = colorMap[riskBand] ?? "#6b7280";
  const circumference = 2 * Math.PI * 40;
  const strokeDash = (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold text-slate-900">{Math.round(score)}</p>
        <p className="text-xs text-slate-500">/ 100</p>
      </div>
    </div>
  );
}

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "ep" | "fip">("overview");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/history/${id}`);
        if (res.status === 404) {
          if (!cancelled) setError("Assessment not found.");
          return;
        }
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const json = (await res.json()) as AssessmentDetail;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-20 text-slate-400">
          <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Link href="/history" className="text-sm text-blue-600 hover:underline">
          ← Back to Case History
        </Link>
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-slate-700 font-medium">{error ?? "Assessment not found."}</p>
          <p className="text-sm text-slate-500 mt-1">The case you are looking for may have been removed.</p>
        </div>
      </div>
    );
  }

  const epBreakdown = safeParse<EPBreakdownItem[]>(data.epBreakdown, []);
  const fipBreakdown = safeParse<FIPBreakdownItem[]>(data.fipBreakdown, []);
  const currency = data.fipCurrency;
  const riskColorClass = getRiskBandColor(data.epRiskBand);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/history" className="text-sm text-blue-600 hover:underline">
            ← Back to Case History
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Assessment: {data.studentName}</h1>
          <p className="text-sm text-slate-500">
            ID: {data.id} · {new Date(data.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            {" · by "}
            {data.createdBy.name ?? data.createdBy.email ?? "—"}
          </p>
        </div>
        <Link
          href={`/history/${data.id}/edit`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium rounded-xl transition-colors text-sm shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Case
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Employability Predictor</p>
            <p className="text-sm text-slate-600 mt-0.5">Probability of employment within 12 months</p>
          </div>
          <div className="flex items-center gap-6">
            <ScoreGauge score={data.epScore} riskBand={data.epRiskBand} />
            <div>
              <div
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${riskColorClass} mb-2`}
              >
                {data.epRiskBand} Risk
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">
                Final score computed from {epBreakdown.length} weighted factors at the time of assessment.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Future Income Predictor</p>
            <p className="text-sm text-slate-600 mt-0.5">Expected annual salary trajectory</p>
          </div>
          <div className="space-y-3">
            {[
              { label: "Year 1", local: data.fipYear1Local, inr: data.fipYear1Inr },
              { label: "Year 3", local: data.fipYear3Local, inr: data.fipYear3Inr },
              { label: "Year 5", local: data.fipYear5Local, inr: data.fipYear5Inr },
            ].map(({ label, local, inr }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 w-12">{label}</span>
                <div className="flex-1 mx-3 bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (local / data.fipYear5Local) * 100)}%` }}
                  />
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(local, currency)}</p>
                  <p className="text-xs text-slate-400">{formatInr(inr)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="flex border-b border-slate-200">
          {(["overview", "ep", "fip"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab === "overview" ? "Overview" : tab === "ep" ? "EP Breakdown" : "FIP Breakdown"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "overview" && <OverviewTab data={data} />}
          {activeTab === "ep" && <EPBreakdownTab breakdown={epBreakdown} />}
          {activeTab === "fip" && (
            <FIPBreakdownTab
              breakdown={fipBreakdown}
              currency={currency}
              years={{
                year1Local: data.fipYear1Local,
                year3Local: data.fipYear3Local,
                year5Local: data.fipYear5Local,
                year1Inr: data.fipYear1Inr,
                year3Inr: data.fipYear3Inr,
                year5Inr: data.fipYear5Inr,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function OverviewTab({ data }: { data: AssessmentDetail }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Student Profile</h3>
        <dl className="space-y-2">
          {[
            ["Name", data.studentName],
            ["Institution", data.undergradInstitution],
            ["Tier", data.undergradTier],
            ["Degree", `${data.undergradDegree} · ${data.undergradMajor}`],
            ["CGPA", `${data.undergradCgpa}`],
            ["GRE", data.greScore ? `${data.greScore}` : "—"],
            ["GMAT", data.gmatScore ? `${data.gmatScore}` : "—"],
            ["Experience", `${data.workExperienceYears} years`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm gap-4">
              <dt className="text-slate-500">{k}</dt>
              <dd className="font-medium text-slate-900 text-right">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Programme Details</h3>
        <dl className="space-y-2">
          {[
            ["Country", data.destinationCountry],
            ["University", data.destinationUniversity],
            ["Degree", data.targetDegree],
            ["Course", data.targetCourse],
            ["STEM", data.isStem ? "Yes" : "No"],
            ["Duration", `${data.programDurationMonths} months`],
            ["City", data.targetCity ?? "—"],
            ["Loan Amount", data.loanAmountInr ? formatInr(data.loanAmountInr) : "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm gap-4">
              <dt className="text-slate-500">{k}</dt>
              <dd className="font-medium text-slate-900 text-right">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      {data.notes && (
        <div className="md:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Notes</h3>
          <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4 whitespace-pre-wrap">{data.notes}</p>
        </div>
      )}
    </div>
  );
}

function EPBreakdownTab({ breakdown }: { breakdown: EPBreakdownItem[] }) {
  if (!breakdown.length) {
    return <p className="text-sm text-slate-500">No breakdown data available for this assessment.</p>;
  }
  return (
    <div className="space-y-4">
      <DataSourceLegend />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-slate-200">
            <th className="pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Factor</th>
            <th className="pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Weight</th>
            <th className="pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Score</th>
            <th className="pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Weighted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {breakdown.map((item) => (
            <tr key={item.factor}>
              <td className="py-3">
                <p className="font-medium text-slate-900">{item.factor}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.rationale}</p>
                <DataSourceLabel source={item.source} dataKind={item.dataKind} vintage={item.vintage} isLive={item.isLive} />
              </td>
              <td className="py-3 text-center text-slate-600">{(item.weight * 100).toFixed(0)}%</td>
              <td className="py-3 text-center">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                    item.rawScore >= 80
                      ? "bg-green-100 text-green-700"
                      : item.rawScore >= 60
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {item.rawScore}
                </span>
              </td>
              <td className="py-3 text-center font-semibold text-slate-900">{item.weightedScore}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200">
            <td colSpan={3} className="pt-3 text-right font-semibold text-slate-700 pr-4">
              Total EP Score
            </td>
            <td className="pt-3 text-center font-bold text-xl text-slate-900">
              {breakdown.reduce((s, i) => s + i.weightedScore, 0)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function FIPBreakdownTab({
  breakdown,
  currency,
  years,
}: {
  breakdown: FIPBreakdownItem[];
  currency: string;
  years: {
    year1Local: number;
    year3Local: number;
    year5Local: number;
    year1Inr: number;
    year3Inr: number;
    year5Inr: number;
  };
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        {[
          { label: "Year 1", local: years.year1Local, inr: years.year1Inr },
          { label: "Year 3", local: years.year3Local, inr: years.year3Inr },
          { label: "Year 5", local: years.year5Local, inr: years.year5Inr },
        ].map(({ label, local, inr }) => (
          <div key={label} className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-medium">{label}</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(local, currency)}</p>
            <p className="text-xs text-slate-400">{formatInr(inr)}</p>
          </div>
        ))}
      </div>

      {breakdown.length === 0 ? (
        <p className="text-sm text-slate-500">No breakdown data available for this assessment.</p>
      ) : (
        <>
        <DataSourceLegend />
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-slate-200">
              <th className="pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Component</th>
              <th className="pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {breakdown.map((item) => (
              <tr key={item.component}>
                <td className="py-3">
                  <p className="font-medium text-slate-900">{item.component}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.rationale}</p>
                  <DataSourceLabel source={item.source} dataKind={item.dataKind} vintage={item.vintage} isLive={item.isLive} />
                </td>
                <td className="py-3 text-right font-semibold text-slate-900">
                  {item.type === "base" ? formatCurrency(item.value, currency) : `× ${item.value.toFixed(2)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </>
      )}
    </div>
  );
}
