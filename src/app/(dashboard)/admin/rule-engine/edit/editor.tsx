"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RuleParameters } from "@/lib/rules/defaults";

interface EditorProps {
  baselineVersion: string;
  baselineParameters: RuleParameters;
}

function suggestNextVersion(current: string): string {
  const parts = current.split(".");
  const last = parts[parts.length - 1];
  const lastNum = parseInt(last, 10);
  if (Number.isFinite(lastNum)) {
    parts[parts.length - 1] = String(lastNum + 1);
    return parts.join(".");
  }
  return `${current}-r2`;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

interface NumField {
  path: (keyof RuleParameters | string)[];
  label: string;
  hint?: string;
  step?: number;
  min?: number;
  max?: number;
}

const EP_WEIGHT_FIELDS: NumField[] = [
  { path: ["ep", "weights", "universityTier"],     label: "University tier",       hint: "0–1, sums to 1.00 across factors" },
  { path: ["ep", "weights", "courseDemand"],       label: "Course demand",         hint: "0–1" },
  { path: ["ep", "weights", "studentCaliber"],     label: "Student caliber",       hint: "0–1" },
  { path: ["ep", "weights", "countryEmployment"],  label: "Country employment",    hint: "0–1" },
  { path: ["ep", "weights", "stemVisaAdvantage"],  label: "STEM / visa",           hint: "0–1" },
  { path: ["ep", "weights", "workExperience"],     label: "Work experience",       hint: "0–1" },
];

const EP_RISK_FIELDS: NumField[] = [
  { path: ["ep", "riskBands", "low"],    label: "Low ≥",     hint: "Score threshold" },
  { path: ["ep", "riskBands", "medium"], label: "Medium ≥",  hint: "Score threshold" },
  { path: ["ep", "riskBands", "high"],   label: "High ≥",    hint: "Score threshold; below this = Very High" },
];

const FIP_TIER_FIELDS: NumField[] = [
  { path: ["fip", "universityTierMultipliers", "T50"],      label: "T50",      step: 0.01 },
  { path: ["fip", "universityTierMultipliers", "T100"],     label: "T100",     step: 0.01 },
  { path: ["fip", "universityTierMultipliers", "T200"],     label: "T200",     step: 0.01 },
  { path: ["fip", "universityTierMultipliers", "T500"],     label: "T500",     step: 0.01 },
  { path: ["fip", "universityTierMultipliers", "UNRANKED"], label: "Unranked", step: 0.01 },
];

const FIP_DEGREE_FIELDS: NumField[] = [
  { path: ["fip", "degreeMultipliers", "PHD"],     label: "PhD",     step: 0.01 },
  { path: ["fip", "degreeMultipliers", "MBA"],     label: "MBA",     step: 0.01 },
  { path: ["fip", "degreeMultipliers", "MS"],      label: "MS",      step: 0.01 },
  { path: ["fip", "degreeMultipliers", "LLM"],     label: "LLM",     step: 0.01 },
  { path: ["fip", "degreeMultipliers", "MFA"],     label: "MFA",     step: 0.01 },
  { path: ["fip", "degreeMultipliers", "DEFAULT"], label: "Default", step: 0.01 },
];

const FIP_GROWTH_FIELDS: NumField[] = [
  { path: ["fip", "workExperiencePremiumPerYear"], label: "Work-exp premium / year",  hint: "Decimal — 0.04 = +4% per year", step: 0.005 },
  { path: ["fip", "fallbackGrowth", "year3"],      label: "Year-3 fallback growth",   hint: "Used only when wage-index API is down", step: 0.01 },
  { path: ["fip", "fallbackGrowth", "year5"],      label: "Year-5 fallback growth",   hint: "Used only when wage-index API is down", step: 0.01 },
];

const LTI_FIELDS: NumField[] = [
  { path: ["lti", "bands", "green",  "maxLoanToYear1"], label: "Green: max Loan / Year-1",  step: 0.1 },
  { path: ["lti", "bands", "green",  "maxEmiToIncome"], label: "Green: max EMI / Income",   step: 0.01 },
  { path: ["lti", "bands", "yellow", "maxLoanToYear1"], label: "Yellow: max Loan / Year-1", step: 0.1 },
  { path: ["lti", "bands", "yellow", "maxEmiToIncome"], label: "Yellow: max EMI / Income",  step: 0.01 },
  { path: ["lti", "bands", "orange", "maxLoanToYear1"], label: "Orange: max Loan / Year-1", step: 0.1 },
  { path: ["lti", "bands", "orange", "maxEmiToIncome"], label: "Orange: max EMI / Income",  step: 0.01 },
  { path: ["lti", "loanInterestRate"], label: "Loan interest rate", hint: "Decimal — 0.10 = 10%", step: 0.005 },
  { path: ["lti", "loanTenorMonths"],  label: "Loan tenor (months)", step: 1 },
];

function getAt(obj: unknown, path: (string | number)[]): number {
  let cur: unknown = obj;
  for (const p of path) {
    if (cur && typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[String(p)];
    }
  }
  return typeof cur === "number" ? cur : 0;
}

function setAt(obj: Record<string, unknown>, path: (string | number)[], value: number): void {
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < path.length - 1; i++) {
    cur = cur[String(path[i])] as Record<string, unknown>;
  }
  cur[String(path[path.length - 1])] = value;
}

function FieldGroup({
  title,
  fields,
  values,
  onChange,
}: {
  title: string;
  fields: NumField[];
  values: RuleParameters;
  onChange: (path: (string | number)[], value: number) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((f) => {
          const id = f.path.join(".");
          return (
            <div key={id}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
              <input
                id={id}
                type="number"
                step={f.step ?? 0.01}
                min={f.min}
                max={f.max}
                value={getAt(values, f.path as (string | number)[])}
                onChange={(e) => onChange(f.path as (string | number)[], Number(e.target.value))}
                className="w-full text-sm border border-slate-300 rounded-md px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {f.hint && <p className="text-xs text-slate-400 mt-0.5">{f.hint}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RuleEngineEditor({ baselineVersion, baselineParameters }: EditorProps) {
  const [params, setParams] = useState<RuleParameters>(() => clone(baselineParameters));
  const [version, setVersion] = useState(() => suggestNextVersion(baselineVersion));
  const [name, setName] = useState(() => `Rule set ${suggestNextVersion(baselineVersion)}`);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function update(path: (string | number)[], value: number) {
    setParams((prev) => {
      const next = clone(prev) as unknown as Record<string, unknown>;
      setAt(next, path, value);
      return next as unknown as RuleParameters;
    });
  }

  function reset() {
    setParams(clone(baselineParameters));
  }

  const epWeightSum =
    params.ep.weights.universityTier +
    params.ep.weights.courseDemand +
    params.ep.weights.studentCaliber +
    params.ep.weights.countryEmployment +
    params.ep.weights.stemVisaAdvantage +
    params.ep.weights.workExperience;
  const weightsOk = Math.abs(epWeightSum - 1) < 1e-6;

  function publish() {
    setError(null);
    if (!weightsOk) {
      setError(`EP factor weights must sum to 1.00 (currently ${epWeightSum.toFixed(3)}).`);
      return;
    }
    if (!version.trim()) {
      setError("Version string is required.");
      return;
    }
    if (!name.trim()) {
      setError("Rule set name is required.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/rule-engine", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ version: version.trim(), name: name.trim(), changeSummary: summary.trim() || null, parameters: params }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `Publish failed (${res.status})`);
        }
        router.push("/rules");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Publish failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Version metadata</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Version (unique)</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="e.g. 2026.04.6"
              className="w-full text-sm border border-slate-300 rounded-md px-2.5 py-1.5 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-md px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Change summary</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="What is changing in this version, and why?"
            rows={3}
            className="w-full text-sm border border-slate-300 rounded-md px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <FieldGroup title="EP — factor weights" fields={EP_WEIGHT_FIELDS} values={params} onChange={update} />
      <p className={`text-xs ${weightsOk ? "text-slate-500" : "text-red-600"}`}>
        Sum of EP weights: <strong>{epWeightSum.toFixed(3)}</strong>
        {!weightsOk && " — must equal 1.000 to publish"}
      </p>

      <FieldGroup title="EP — risk band thresholds" fields={EP_RISK_FIELDS} values={params} onChange={update} />
      <FieldGroup title="FIP — university tier multipliers" fields={FIP_TIER_FIELDS} values={params} onChange={update} />
      <FieldGroup title="FIP — degree level multipliers" fields={FIP_DEGREE_FIELDS} values={params} onChange={update} />
      <FieldGroup title="FIP — work-experience and growth fallbacks" fields={FIP_GROWTH_FIELDS} values={params} onChange={update} />
      <FieldGroup title="LTI — band thresholds and loan terms" fields={LTI_FIELDS} values={params} onChange={update} />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="sticky bottom-4 bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3 shadow-md">
        <button
          type="button"
          onClick={reset}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg"
        >
          Reset to baseline
        </button>
        <button
          type="button"
          onClick={publish}
          disabled={isPending || !weightsOk}
          className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 rounded-lg"
        >
          {isPending ? "Publishing…" : `Publish v${version || "?"}`}
        </button>
      </div>
    </div>
  );
}
