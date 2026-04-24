"use client";

import { useState } from "react";
import { formatCurrency, formatInr } from "@/lib/utils";
import type {
  EPResult,
  FIPResult,
  EPBreakdownItem,
  FIPBreakdownItem,
  LoanToIncomeResult,
} from "@/lib/scoring/types";
import type { CompositeResult } from "@/lib/scoring/composite-engine";
import {
  DataSourceLabel,
  DataSourceLegend,
  ProvenanceSummary,
} from "@/components/ui/data-source-label";

interface AssessmentDetailsProps {
  ep: EPResult;
  fip: FIPResult;
  lti?: LoanToIncomeResult;
  composite?: CompositeResult | null;
  methodologyVersion?: string;
  formData: Record<string, unknown>;
}

/**
 * Shared detail view used by both the fresh-assessment result page and the
 * /history/[id] case detail page. Owns the EP/FIP summary cards, the
 * return-to-home + visa + LTI cards, and the tab stack (overview / EP / FIP /
 * LTI). The wrapping page is responsible for its own header/action row.
 */
export function AssessmentDetails({
  ep,
  fip,
  lti,
  composite,
  methodologyVersion,
  formData,
}: AssessmentDetailsProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "ep" | "fip" | "lti" | "composite"
  >("overview");
  const currency = fip.currency;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EPSummaryCard ep={ep} />
        <FIPSummaryCard fip={fip} currency={currency} />
      </div>

      {/* Return Scenario + Visa Info */}
      {(fip.returnScenario || fip.visaInfo) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fip.returnScenario && <ReturnScenarioCard fip={fip} />}
          {fip.visaInfo && <VisaInfoCard fip={fip} />}
        </div>
      )}

      {/* LTI Card */}
      {lti && <LTISummaryCard lti={lti} />}

      {/* Composite decision banner */}
      {composite && <CompositeBanner composite={composite} />}

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {(
            [
              "overview",
              "ep",
              "fip",
              ...(lti ? (["lti"] as const) : []),
              ...(composite ? (["composite"] as const) : []),
            ] as const
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`px-6 py-3.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab === "overview"
                ? "Overview"
                : tab === "ep"
                  ? "EP Breakdown"
                  : tab === "fip"
                    ? "FIP Breakdown"
                    : tab === "lti"
                      ? "Loan Analysis"
                      : "Composite Scorecard"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <OverviewTab
              ep={ep}
              fip={fip}
              formData={formData}
              methodologyVersion={methodologyVersion}
            />
          )}
          {activeTab === "ep" && <EPBreakdownTab breakdown={ep.breakdown} summary={ep.summary} />}
          {activeTab === "fip" && (
            <FIPBreakdownTab breakdown={fip.breakdown} currency={currency} fip={fip} />
          )}
          {activeTab === "lti" && lti && <LTIDetailTab lti={lti} />}
          {activeTab === "composite" && composite && <CompositeTab composite={composite} />}
        </div>
      </div>
    </div>
  );
}

// ─── Framework Jan-2026 Composite scorecard ───────────────────────────────

function decisionStyle(decision: CompositeResult["decision"]): { bg: string; text: string; border: string; label: string } {
  if (decision === "APPROVE")
    return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", label: "Approve" };
  if (decision === "CAUTION")
    return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Caution — manual review" };
  return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Reject" };
}

function CompositeBanner({ composite }: { composite: CompositeResult }) {
  const style = decisionStyle(composite.decision);
  return (
    <div className={`rounded-2xl border p-6 ${style.bg} ${style.border}`}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Framework Jan-2026 · Composite Scorecard
          </p>
          <p className={`text-2xl font-bold mt-1 ${style.text}`}>
            {composite.compositeScore.toFixed(1)} / 100 &middot; {style.label}
          </p>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            {composite.decisionReason}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Gross weighted</p>
          <p className="text-lg font-semibold text-slate-800">{composite.grossScore.toFixed(1)}</p>
          {composite.penaltyDeductionPct > 0 && (
            <p className="text-xs text-red-600 mt-0.5">
              −{(composite.penaltyDeductionPct * 100).toFixed(0)}% penalty
            </p>
          )}
        </div>
      </div>
      {composite.hardReject?.triggered && (
        <div className="mt-3 text-xs font-medium text-red-700 bg-red-100 border border-red-200 rounded-md p-2">
          Hard reject override from §13: {composite.hardReject.reason}
        </div>
      )}
    </div>
  );
}

function CompositeTab({ composite }: { composite: CompositeResult }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Parameter contributions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="text-left py-2">Parameter</th>
                <th className="text-right py-2">Weight</th>
                <th className="text-right py-2">Score (0–10)</th>
                <th className="text-right py-2">Weighted</th>
                <th className="text-left py-2 pl-4">Rationale</th>
              </tr>
            </thead>
            <tbody>
              {composite.parameters.map((p) => (
                <tr key={p.parameter} className="border-b border-slate-100">
                  <td className="py-2 font-medium text-slate-700">{p.parameter}</td>
                  <td className="py-2 text-right text-slate-600">{(p.weight * 100).toFixed(0)}%</td>
                  <td className="py-2 text-right font-mono text-slate-700">{p.score.toFixed(1)}</td>
                  <td className="py-2 text-right font-mono font-semibold text-slate-800">{p.weightedScore.toFixed(1)}</td>
                  <td className="py-2 pl-4 text-xs text-slate-500 max-w-md">{p.rationale}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-300">
                <td colSpan={3} className="py-2 text-right font-semibold text-slate-700">Gross weighted</td>
                <td className="py-2 text-right font-mono font-bold text-slate-900">{composite.grossScore.toFixed(1)}</td>
                <td className="py-2 pl-4 text-xs text-slate-500">Sum before §4.2 penalty deductions.</td>
              </tr>
              {composite.penaltyDeductionPct > 0 && (
                <tr>
                  <td colSpan={3} className="py-2 text-right font-semibold text-red-700">Penalty deduction</td>
                  <td className="py-2 text-right font-mono font-bold text-red-700">
                    −{(composite.penaltyDeductionPct * 100).toFixed(0)}%
                  </td>
                  <td className="py-2 pl-4 text-xs text-red-600">Applied multiplicatively to gross.</td>
                </tr>
              )}
              <tr className="bg-slate-50">
                <td colSpan={3} className="py-2 text-right font-bold text-slate-800">Composite (final)</td>
                <td className="py-2 text-right font-mono font-bold text-slate-900">{composite.compositeScore.toFixed(1)}</td>
                <td className="py-2 pl-4 text-xs text-slate-600">§5 thresholds: ≥80 Approve · 65–79 Caution · &lt;65 Reject.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {composite.penalties.triggered.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Triggered penalties (§4.2)</h3>
          <ul className="space-y-1 text-sm">
            {composite.penalties.triggered.map((p) => (
              <li key={p.code} className="flex items-center justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-700">{p.label}</span>
                <span className="font-mono text-red-600 font-semibold">−{(p.deductionPct * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {composite.insurance.mandatory && (
        <div className={`rounded-lg border p-3 text-sm ${composite.insurance.flagged ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-green-50 border-green-200 text-green-800"}`}>
          <strong>Insurance (§25):</strong> {composite.insurance.rationale}
        </div>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer font-semibold text-slate-700 hover:text-slate-900">Module-level breakdown</summary>
        <div className="mt-3 space-y-4">
          {[
            { key: "credit",           label: "§12 Credit Score",         m: composite.modules.credit },
            { key: "incomeStability",  label: "§13 Income Stability",     m: composite.modules.incomeStability },
            { key: "incomeSource",     label: "§14 Income Source",        m: composite.modules.incomeSource },
            { key: "savings",          label: "§15 Savings",              m: composite.modules.savings },
            { key: "futureIncomeBand", label: "§16 Future Income Band",   m: composite.modules.futureIncomeBand },
          ].map(({ key, label, m }) => (
            <div key={key} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-700">{label}</span>
                <span className="font-mono text-slate-900">{m.score.toFixed(1)} / 10</span>
              </div>
              <p className="text-xs text-slate-500 mb-2">{m.rationale}</p>
              <ul className="text-xs text-slate-600 space-y-0.5">
                {m.breakdown.map((b, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-medium min-w-[8rem]">{b.label}:</span>
                    <span className="font-mono">{String(b.value)}</span>
                    <span className="text-slate-500">— {b.rationale}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────

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

function riskColorClass(band: string) {
  if (band === "Low") return "bg-green-50 text-green-700 border-green-200";
  if (band === "Medium") return "bg-yellow-50 text-yellow-700 border-yellow-200";
  if (band === "High") return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function EPSummaryCard({ ep }: { ep: EPResult }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Employability Predictor
          </p>
          <p className="text-sm text-slate-600 mt-0.5">Probability of employment within 12 months</p>
        </div>
        <ProvenanceSummary items={ep.breakdown} />
      </div>
      <div className="flex items-center gap-6">
        <ScoreGauge score={ep.score} riskBand={ep.riskBand} />
        <div>
          <div
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${riskColorClass(ep.riskBand)} mb-2`}
          >
            {ep.riskBand} Risk
          </div>
          <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">
            {ep.summary.slice(0, 120)}...
          </p>
        </div>
      </div>
    </div>
  );
}

function FIPSummaryCard({ fip, currency }: { fip: FIPResult; currency: string }) {
  const baseItem = fip.breakdown.find((b) => b.type === "base");

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Future Income Predictor
          </p>
          <p className="text-sm text-slate-600 mt-0.5">
            Expected annual salary trajectory (stay abroad)
          </p>
        </div>
        <ProvenanceSummary items={fip.breakdown} />
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
      {fip.year1LocalConfidence && (
        <p className="mt-3 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Year 1 range:</span>{" "}
          {formatCurrency(fip.year1LocalConfidence.p25, currency)} –{" "}
          {formatCurrency(fip.year1LocalConfidence.p75, currency)}{" "}
          <span className="text-slate-400">
            (P25–P75
            {fip.year1LocalConfidence.sampleSize
              ? `, n=${fip.year1LocalConfidence.sampleSize.toLocaleString()}`
              : ""}
            )
          </span>
        </p>
      )}
      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
        {baseItem && (
          <DataSourceLabel
            source={baseItem.source}
            dataKind={baseItem.dataKind}
            vintage={baseItem.vintage}
            fetchedAt={baseItem.fetchedAt}
            isLive={baseItem.isLive}
          />
        )}
        {fip.fx && (
          <DataSourceLabel
            source={`FX: ${fip.fx.source}`}
            dataKind={fip.fx.dataKind}
            vintage={fip.fx.vintage}
            fetchedAt={fip.fx.fetchedAt}
          />
        )}
        <DataSourceLabel
          source="Year 1/3/5 trajectory = base salary × university / degree / city / experience / growth multipliers (internal model). See FIP Breakdown for per-component provenance."
          dataKind="heuristic"
        />
      </div>
    </div>
  );
}

function ReturnScenarioCard({ fip }: { fip: FIPResult }) {
  const rs = fip.returnScenario!;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Return-to-Home Scenario
        </p>
        <p className="text-sm text-slate-600 mt-0.5">
          If student returns — {Math.round(rs.probability * 100)}% probability
        </p>
      </div>
      <div className="space-y-3">
        {[
          { label: "Year 1", inr: rs.year1Inr },
          { label: "Year 3", inr: rs.year3Inr },
          { label: "Year 5", inr: rs.year5Inr },
        ].map(({ label, inr }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 w-12">{label}</span>
            <div className="flex-1 mx-3 bg-slate-100 rounded-full h-2">
              <div
                className="bg-orange-400 h-2 rounded-full"
                style={{ width: `${Math.min(100, (inr / rs.year5Inr) * 100)}%` }}
              />
            </div>
            <p className="text-sm font-semibold text-slate-900">{formatInr(inr)}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-3 leading-relaxed">{rs.rationale}</p>
      {rs.growthSource && (
        <DataSourceLabel
          source={`Y3/Y5 uplift: ${rs.growthSource}`}
          dataKind={rs.growthKind ?? "heuristic"}
          vintage={rs.growthVintage}
          fetchedAt={rs.growthFetchedAt}
          className="mt-2"
        />
      )}
      <DataSourceLabel
        source="Return salary = adjusted stay-abroad salary × nationality return multiplier (nationalities.json); stay-abroad probability from H1B lottery × sponsorship rate where available."
        dataKind="heuristic"
        className="mt-1"
      />
    </div>
  );
}

function VisaInfoCard({ fip }: { fip: FIPResult }) {
  const v = fip.visaInfo!;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Visa & Immigration Pathway
        </p>
        <p className="text-sm font-medium text-blue-700 mt-1">{v.visaType}</p>
      </div>
      <dl className="space-y-2.5">
        <div className="flex justify-between text-sm">
          <dt className="text-slate-500">Post-study work permit</dt>
          <dd className="font-semibold text-slate-900">{v.postStudyMonths} months</dd>
        </div>
        {v.h1bLotteryProb != null && (
          <div className="flex justify-between text-sm">
            <dt className="text-slate-500">H1B lottery probability</dt>
            <dd className="font-semibold text-slate-900">{Math.round(v.h1bLotteryProb * 100)}%</dd>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <dt className="text-slate-500">Employer sponsorship rate</dt>
          <dd className="font-semibold text-slate-900">{Math.round(v.sponsorshipRate * 100)}%</dd>
        </div>
      </dl>
      {v.notes && <p className="text-xs text-slate-400 mt-3 leading-relaxed">{v.notes}</p>}
      <p className="text-xs text-blue-500 mt-2 italic">{v.source}</p>
    </div>
  );
}

function LTISummaryCard({ lti }: { lti: LoanToIncomeResult }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Loan-to-Income Analysis
          </p>
          <p className="text-sm text-slate-600 mt-0.5">Repayment capacity assessment</p>
        </div>
        <div
          className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border"
          style={{ color: lti.bandColor, borderColor: lti.bandColor, backgroundColor: `${lti.bandColor}10` }}
        >
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
          <p className="text-sm font-bold" style={{ color: lti.bandColor }}>
            {lti.ratio1yr.toFixed(1)}×
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500">Monthly EMI</p>
          <p className="text-sm font-bold text-slate-900">{formatInr(lti.monthlyEmi)}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500">EMI / Income</p>
          <p className="text-sm font-bold" style={{ color: lti.bandColor }}>
            {(lti.emiToIncomeRatio * 100).toFixed(0)}%
          </p>
        </div>
      </div>
      <p className="text-xs text-slate-500">{lti.summary}</p>
      <DataSourceLabel
        source="EMI assumes 10-year term @ 10% p.a.; income from FIP Year 1 (INR). Band thresholds are an internal rubric."
        dataKind="heuristic"
        className="mt-2"
      />
    </div>
  );
}

// ─── Tab content ──────────────────────────────────────────────────────────

function OverviewTab({
  ep,
  fip,
  formData,
  methodologyVersion,
}: {
  ep: EPResult;
  fip: FIPResult;
  formData: Record<string, unknown>;
  methodologyVersion?: string;
}) {
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
        <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-500 space-y-1">
          <p><strong>Data Sources:</strong> {fip.dataSource}</p>
          {fip.fx && (
            <p>
              <strong>FX:</strong> {fip.fx.source}
              {fip.fx.inrPerUnit > 0 && fip.fx.currency !== "INR" && (
                <span className="text-slate-400">
                  {" "}(1 {fip.fx.currency} ≈ ₹{fip.fx.inrPerUnit.toFixed(2)})
                </span>
              )}
            </p>
          )}
          {methodologyVersion && (
            <p>
              <strong>Methodology:</strong> v{methodologyVersion} — results persist their own version so
              historical cases stay reproducible.
            </p>
          )}
        </div>
        <ProvenanceSummary items={[...ep.breakdown, ...fip.breakdown]} className="mt-1" />
      </div>
    </div>
  );
}

function EPBreakdownTab({
  breakdown,
  summary,
}: {
  breakdown: EPBreakdownItem[];
  summary: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4">{summary}</p>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <DataSourceLegend />
        <ProvenanceSummary items={breakdown} />
      </div>
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
                <DataSourceLabel
                  source={item.source}
                  dataKind={item.dataKind}
                  vintage={item.vintage}
                  fetchedAt={item.fetchedAt}
                  isLive={item.isLive}
                />
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
  fip,
}: {
  breakdown: FIPBreakdownItem[];
  currency: string;
  fip: FIPResult;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <DataSourceLegend />
        <ProvenanceSummary items={breakdown} />
      </div>
      {fip.year1InrConfidence && (
        <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600">
          <span className="font-semibold text-slate-700">Year 1 income range (P25–P75, INR):</span>{" "}
          {formatInr(fip.year1InrConfidence.p25)} – {formatInr(fip.year1InrConfidence.p75)}
          {fip.year1InrConfidence.sampleSize ? (
            <span className="text-slate-400">
              {" "}· n={fip.year1InrConfidence.sampleSize.toLocaleString()}
            </span>
          ) : null}
        </div>
      )}
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
                <DataSourceLabel
                  source={item.source}
                  dataKind={item.dataKind}
                  vintage={item.vintage}
                  fetchedAt={item.fetchedAt}
                  isLive={item.isLive}
                />
                {item.confidence && (
                  <p className="text-xs text-slate-500 mt-1">
                    P25–P75: {item.confidence.unit ?? ""}{" "}
                    {item.confidence.p25.toLocaleString()} – {item.confidence.p75.toLocaleString()}
                    {item.confidence.sampleSize
                      ? ` (n=${item.confidence.sampleSize.toLocaleString()})`
                      : ""}
                  </p>
                )}
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
            <p className="text-lg font-bold" style={{ color: item.color ?? "#0f172a" }}>
              {item.value}
            </p>
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
          <p className="text-lg font-bold" style={{ color: lti.bandColor }}>
            {(lti.emiToIncomeRatio * 100).toFixed(1)}%
          </p>
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
