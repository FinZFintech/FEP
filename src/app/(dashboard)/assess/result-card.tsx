"use client";

import { useState } from "react";
import { formatCurrency, formatInr, getRiskBandColor } from "@/lib/utils";
import type { EPResult, FIPResult, EPBreakdownItem, FIPBreakdownItem, LoanToIncomeResult } from "@/lib/scoring/types";
import { DataSourceLabel, DataSourceLegend } from "@/components/ui/data-source-label";

interface ResultCardProps {
  result: { id: string; ep: EPResult; fip: FIPResult; lti?: LoanToIncomeResult };
  formData: Record<string, unknown>;
  onNewAssessment: () => void;
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
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold text-slate-900">{score}</p>
        <p className="text-xs text-slate-500">/ 100</p>
      </div>
    </div>
  );
}

export function ResultCard({ result, formData, onNewAssessment }: ResultCardProps) {
  const { ep, fip, lti } = result;
  const [activeTab, setActiveTab] = useState<"overview" | "ep" | "fip" | "lti">("overview");
  const [exporting, setExporting] = useState(false);

  const currency = fip.currency;
  const studentName = formData.studentName as string;

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const { generatePDF } = await import("@/lib/pdf/generator");
      generatePDF({ result, formData });
    } finally {
      setExporting(false);
    }
  };

  const riskColorClass = getRiskBandColor(ep.riskBand);

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Assessment: {studentName}</h2>
          <p className="text-sm text-slate-500">ID: {result.id} · {new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {exporting ? "Generating..." : "Export PDF"}
          </button>
          <button
            onClick={onNewAssessment}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Assessment
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* EP Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Employability Predictor</p>
              <p className="text-sm text-slate-600 mt-0.5">Probability of employment within 12 months</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <ScoreGauge score={ep.score} riskBand={ep.riskBand} />
            <div>
              <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${riskColorClass} mb-2`}>
                {ep.riskBand} Risk
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">{ep.summary.slice(0, 120)}...</p>
            </div>
          </div>
        </div>

        {/* FIP Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Future Income Predictor</p>
            <p className="text-sm text-slate-600 mt-0.5">Expected annual salary trajectory (stay abroad)</p>
          </div>
          <div className="space-y-3">
            {[
              { label: "Year 1", local: fip.year1Local, inr: fip.year1Inr },
              { label: "Year 3", local: fip.year3Local, inr: fip.year3Inr },
              { label: "Year 5", local: fip.year5Local, inr: fip.year5Inr },
            ].map(({ label, local, inr }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 w-12">{label}</span>
                <div className="flex-1 mx-3 bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (local / fip.year5Local) * 100)}%` }}
                  />
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(local, currency)}</p>
                  <p className="text-xs text-slate-400">{formatInr(inr)}</p>
                </div>
              </div>
            ))}
          </div>
          {(() => {
            const baseItem = fip.breakdown.find((b) => b.type === "base");
            return (
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
                {baseItem && (
                  <DataSourceLabel
                    source={baseItem.source}
                    dataKind={baseItem.dataKind}
                    vintage={baseItem.vintage}
                    isLive={baseItem.isLive}
                  />
                )}
                <DataSourceLabel
                  source="Year 1/3/5 trajectory = base salary × university / degree / city / experience / growth multipliers (internal model). See FIP Breakdown for per-component provenance."
                  dataKind="heuristic"
                />
              </div>
            );
          })()}
        </div>
      </div>

      {/* Return Scenario + Visa Info */}
      {(fip.returnScenario || fip.visaInfo) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Return to Home Country */}
          {fip.returnScenario && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Return-to-Home Scenario</p>
                <p className="text-sm text-slate-600 mt-0.5">
                  If student returns — {Math.round(fip.returnScenario.probability * 100)}% probability
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Year 1", inr: fip.returnScenario.year1Inr },
                  { label: "Year 3", inr: fip.returnScenario.year3Inr },
                  { label: "Year 5", inr: fip.returnScenario.year5Inr },
                ].map(({ label, inr }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 w-12">{label}</span>
                    <div className="flex-1 mx-3 bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-orange-400 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (inr / fip.returnScenario!.year5Inr) * 100)}%` }}
                      />
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{formatInr(inr)}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">{fip.returnScenario.rationale}</p>
              <DataSourceLabel
                source="Return salary = adjusted stay-abroad salary × nationality return multiplier (nationalities.json); Y3 +20% / Y5 +45% uplift; stay-abroad probability from H1B lottery × sponsorship rate where available."
                dataKind="heuristic"
                className="mt-2"
              />
            </div>
          )}

          {/* Visa Pathway */}
          {fip.visaInfo && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Visa & Immigration Pathway</p>
                <p className="text-sm font-medium text-blue-700 mt-1">{fip.visaInfo.visaType}</p>
              </div>
              <dl className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-500">Post-study work permit</dt>
                  <dd className="font-semibold text-slate-900">{fip.visaInfo.postStudyMonths} months</dd>
                </div>
                {fip.visaInfo.h1bLotteryProb != null && (
                  <div className="flex justify-between text-sm">
                    <dt className="text-slate-500">H1B lottery probability</dt>
                    <dd className="font-semibold text-slate-900">{Math.round(fip.visaInfo.h1bLotteryProb * 100)}%</dd>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-500">Employer sponsorship rate</dt>
                  <dd className="font-semibold text-slate-900">{Math.round(fip.visaInfo.sponsorshipRate * 100)}%</dd>
                </div>
              </dl>
              {fip.visaInfo.notes && (
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">{fip.visaInfo.notes}</p>
              )}
              <p className="text-xs text-blue-500 mt-2 italic">{fip.visaInfo.source}</p>
            </div>
          )}
        </div>
      )}

      {/* LTI Card */}
      {lti && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Loan-to-Income Analysis</p>
              <p className="text-sm text-slate-600 mt-0.5">Repayment capacity assessment</p>
            </div>
            <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border"
              style={{ color: lti.bandColor, borderColor: lti.bandColor, backgroundColor: `${lti.bandColor}10` }}>
              {lti.band}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-3">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500">Loan Amount</p>
              <p className="text-sm font-bold text-slate-900">{formatInr(lti.loanAmountInr)}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500">Loan / Year 1</p>
              <p className="text-sm font-bold" style={{ color: lti.bandColor }}>{lti.ratio1yr.toFixed(1)}×</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500">Monthly EMI</p>
              <p className="text-sm font-bold text-slate-900">{formatInr(lti.monthlyEmi)}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500">EMI / Income</p>
              <p className="text-sm font-bold" style={{ color: lti.bandColor }}>{(lti.emiToIncomeRatio * 100).toFixed(0)}%</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">{lti.summary}</p>
          <DataSourceLabel
            source="EMI assumes 10-year term @ 10% p.a.; income from FIP Year 1 (INR). Band thresholds are an internal rubric."
            dataKind="heuristic"
            className="mt-2"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="flex border-b border-slate-200">
          {(["overview", "ep", "fip", ...(lti ? ["lti" as const] : [])] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`px-6 py-3.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab === "overview" ? "Overview" : tab === "ep" ? "EP Breakdown" : tab === "fip" ? "FIP Breakdown" : "Loan Analysis"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <OverviewTab ep={ep} fip={fip} currency={currency} formData={formData} />
          )}
          {activeTab === "ep" && <EPBreakdownTab breakdown={ep.breakdown} summary={ep.summary} />}
          {activeTab === "fip" && <FIPBreakdownTab breakdown={fip.breakdown} currency={currency} fip={fip} />}
          {activeTab === "lti" && lti && <LTIDetailTab lti={lti} />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ ep, fip, currency, formData }: { ep: EPResult; fip: FIPResult; currency: string; formData: Record<string, unknown> }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Student Profile</h3>
        <dl className="space-y-2">
          {[
            ["Name", formData.studentName as string],
            ["Institution", formData.undergradInstitution as string],
            ["Tier", formData.undergradTier as string],
            ["CGPA", `${formData.undergradCgpa}`],
            ["GRE", formData.greScore ? `${formData.greScore}` : "—"],
            ["GMAT", formData.gmatScore ? `${formData.gmatScore}` : "—"],
            ["Experience", `${formData.workExperienceYears} years`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm">
              <dt className="text-slate-500">{k}</dt>
              <dd className="font-medium text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Programme Details</h3>
        <dl className="space-y-2">
          {[
            ["Country", formData.destinationCountry as string],
            ["University", formData.destinationUniversity as string],
            ["Degree", formData.targetDegree as string],
            ["Course", formData.targetCourse as string],
            ["STEM", formData.isStem ? "Yes" : "No"],
            ["Duration", `${formData.programDurationMonths} months`],
            ["City", (formData.targetCity as string) || "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm">
              <dt className="text-slate-500">{k}</dt>
              <dd className="font-medium text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="md:col-span-2 space-y-2">
        <DataSourceLegend />
        <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-500">
          <strong>Data Sources:</strong> {fip.dataSource}
        </div>
      </div>
    </div>
  );
}

function EPBreakdownTab({ breakdown, summary }: { breakdown: EPBreakdownItem[]; summary: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4">{summary}</p>
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
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                  item.rawScore >= 80 ? "bg-green-100 text-green-700" :
                  item.rawScore >= 60 ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>{item.rawScore}</span>
              </td>
              <td className="py-3 text-center font-semibold text-slate-900">{item.weightedScore}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200">
            <td colSpan={3} className="pt-3 text-right font-semibold text-slate-700 pr-4">Total EP Score</td>
            <td className="pt-3 text-center font-bold text-xl text-slate-900">
              {breakdown.reduce((s, i) => s + i.weightedScore, 0)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function FIPBreakdownTab({ breakdown, currency, fip }: { breakdown: FIPBreakdownItem[]; currency: string; fip: FIPResult }) {
  return (
    <div className="space-y-4">
      <DataSourceLegend />
      <div className="grid grid-cols-3 gap-4 text-center">
        {[
          { label: "Year 1", local: fip.year1Local, inr: fip.year1Inr },
          { label: "Year 3", local: fip.year3Local, inr: fip.year3Inr },
          { label: "Year 5", local: fip.year5Local, inr: fip.year5Inr },
        ].map(({ label, local, inr }) => (
          <div key={label} className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-medium">{label}</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(local, currency)}</p>
            <p className="text-xs text-slate-400">{formatInr(inr)}</p>
          </div>
        ))}
      </div>

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
                {item.type === "base"
                  ? formatCurrency(item.value, currency)
                  : `× ${item.value.toFixed(2)}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LTIDetailTab({ lti }: { lti: LoanToIncomeResult }) {
  const thresholds = [
    { label: "Green (Low Risk)", range: "Loan <= 1.5x income, EMI <= 25%", color: "#16a34a" },
    { label: "Yellow (Moderate)", range: "Loan <= 2.5x income, EMI <= 40%", color: "#ca8a04" },
    { label: "Orange (Elevated)", range: "Loan <= 3.5x income, EMI <= 55%", color: "#ea580c" },
    { label: "Red (High Risk)", range: "Loan > 3.5x income or EMI > 55%", color: "#dc2626" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4">{lti.summary}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Loan Amount", value: formatInr(lti.loanAmountInr) },
          { label: "FIP Year 1 (INR)", value: formatInr(lti.fipYear1Inr) },
          { label: "Loan / Year 1 Income", value: `${lti.ratio1yr.toFixed(2)}x`, color: lti.bandColor },
          { label: "Loan / Year 3 Income", value: `${lti.ratio3yr.toFixed(2)}x` },
        ].map((item) => (
          <div key={item.label} className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="text-lg font-bold" style={{ color: item.color ?? "#0f172a" }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500">Estimated Monthly EMI</p>
          <p className="text-lg font-bold text-slate-900">{formatInr(lti.monthlyEmi)}</p>
          <p className="text-xs text-slate-400 mt-1">10-year term @ 10% p.a.</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500">EMI / Monthly Income</p>
          <p className="text-lg font-bold" style={{ color: lti.bandColor }}>{(lti.emiToIncomeRatio * 100).toFixed(1)}%</p>
          <p className="text-xs text-slate-400 mt-1">Based on FIP Year 1</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Risk Band Thresholds</h3>
        <div className="space-y-2">
          {thresholds.map((t) => (
            <div key={t.label} className="flex items-center gap-3 text-sm">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
              <span className="font-medium text-slate-700 w-40">{t.label}</span>
              <span className="text-slate-500">{t.range}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
