import Link from "next/link";
import type { RuleParameters } from "@/lib/rules/defaults";
import { DEFAULT_DATA_SOURCES, type DataKind, type RuleSourceRef, type BandRule } from "@/lib/rules/defaults";

interface RuleEngineViewProps {
  version: string;
  name: string;
  status: "draft" | "active" | "archived";
  parameters: RuleParameters;
  changeSummary: string | null;
  publishedAt: Date | null;
  createdBy: { name: string | null; email: string | null } | null;
  isFallback: boolean;
  canEdit: boolean;
  isAdmin: boolean;
}

const KIND_PILL: Record<DataKind, string> = {
  live:      "bg-green-100 border-green-300 text-green-800",
  snapshot:  "bg-amber-100 border-amber-300 text-amber-900",
  heuristic: "bg-orange-100 border-orange-400 text-orange-900",
};

function KindBadge({ kind }: { kind: DataKind }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide border ${KIND_PILL[kind]}`}>
      {kind.toUpperCase()}
    </span>
  );
}

function StatusBadge({ status }: { status: RuleEngineViewProps["status"] }) {
  const cls = status === "active"
    ? "bg-green-50 text-green-700 border-green-200"
    : status === "archived"
      ? "bg-slate-100 text-slate-600 border-slate-200"
      : "bg-yellow-50 text-yellow-700 border-yellow-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {status[0].toUpperCase() + status.slice(1)}
    </span>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function WeightTable({ rows }: { rows: { label: string; weight: number; source: string; kind: DataKind }[] }) {
  const total = rows.reduce((s, r) => s + r.weight, 0);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <th className="pb-2">Factor</th>
          <th className="pb-2 text-center">Weight</th>
          <th className="pb-2">Source</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((r) => (
          <tr key={r.label}>
            <td className="py-3 font-medium text-slate-900">{r.label}</td>
            <td className="py-3 text-center font-semibold text-slate-700">{(r.weight * 100).toFixed(0)}%</td>
            <td className="py-3 text-slate-500">
              <div className="flex items-center gap-2 flex-wrap">
                <KindBadge kind={r.kind} /> <span>{r.source}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-slate-200">
          <td className="pt-3 font-semibold text-slate-700">Total</td>
          <td className="pt-3 text-center font-bold text-slate-900">{(total * 100).toFixed(0)}%</td>
          <td />
        </tr>
      </tfoot>
    </table>
  );
}

function BandTable({ bands, valueLabel = "Score" }: { bands: BandRule[]; valueLabel?: string }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <th className="pb-2">Threshold</th>
          <th className="pb-2 text-right">{valueLabel}</th>
          <th className="pb-2">Band</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {bands.map((b, idx) => (
          <tr key={idx}>
            <td className="py-2 font-mono text-slate-700">{b.min === null ? "—" : `≥ ${b.min}`}</td>
            <td className="py-2 text-right font-semibold text-slate-900">{b.output}</td>
            <td className="py-2 text-slate-500">{b.label}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MultiplierGrid({ rows }: { rows: { label: string; value: number }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {rows.map((r) => (
        <div key={r.label} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
          <p className="text-xs text-slate-500">{r.label}</p>
          <p className="text-sm font-bold text-slate-900">× {r.value.toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
}

export function RuleEngineView({
  version,
  name,
  status,
  parameters,
  changeSummary,
  publishedAt,
  createdBy,
  isFallback,
  canEdit,
  isAdmin,
}: RuleEngineViewProps) {
  const ep = parameters.ep;
  const fip = parameters.fip;
  const lti = parameters.lti;

  const epWeightRows: { label: string; weight: number; source: string; kind: DataKind }[] = [
    { label: "Destination University Tier",        weight: ep.weights.universityTier,     source: "QS World University Rankings (embedded) + College Scorecard completion bonus (live)", kind: "snapshot" },
    { label: "Course Demand",                       weight: ep.weights.courseDemand,       source: "BLS Employment Projections 2023–2033 + O*NET Bright Outlook (live, US)",                kind: "snapshot" },
    { label: "Student Caliber",                     weight: ep.weights.studentCaliber,     source: "Internal model — undergrad tier, CGPA-vs-baseline, GRE/GMAT band score",                kind: "heuristic" },
    { label: "Destination Country Employment Rate", weight: ep.weights.countryEmployment,  source: "HESA / Statistics Canada / QILT / OECD EAG (embedded)",                                  kind: "snapshot" },
    { label: "STEM / Visa Advantage",               weight: ep.weights.stemVisaAdvantage,  source: "Internal model over USCIS OPT / PGWP 2024 policy",                                       kind: "heuristic" },
    { label: "Work Experience",                     weight: ep.weights.workExperience,     source: "Internal model — invented step curve by years of experience",                            kind: "heuristic" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rule Engine</h1>
          <p className="text-sm text-slate-500 mt-1">
            How EP, FIP and LTI scores are computed — every API, weight and threshold the engine uses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/rules/archive"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium rounded-xl transition-colors text-sm"
          >
            View archive
          </Link>
          {canEdit && (
            <Link
              href="/admin/rule-engine/edit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors text-sm"
            >
              Edit rules
            </Link>
          )}
        </div>
      </header>

      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active rule set</p>
            <div className="flex items-center gap-3 mt-1">
              <h2 className="text-xl font-semibold text-slate-900">{name}</h2>
              <span className="text-sm font-mono text-slate-500">v{version}</span>
              <StatusBadge status={status} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {publishedAt ? `Published ${publishedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : "Not yet published"}
              {createdBy && ` · by ${createdBy.name ?? createdBy.email ?? "—"}`}
              {isFallback && " · built-in baseline (no admin-published version yet)"}
            </p>
          </div>
          {!isAdmin && (
            <p className="text-xs text-slate-500 max-w-sm text-right">
              Read-only view. Only admins can edit heuristics and publish new rule-set versions.
            </p>
          )}
        </div>
        {changeSummary && (
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Change summary</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{changeSummary}</p>
          </div>
        )}
      </section>

      <Section
        title="Employability Predictor (EP)"
        subtitle={`Probability of employment within 12 months. ${epWeightRows.length} weighted factors → score 0–100 → risk band.`}
      >
        <WeightTable rows={epWeightRows} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Risk band cut-offs</p>
            <ul className="text-sm space-y-1">
              <li><span className="inline-block w-20 font-mono text-slate-500">≥ {ep.riskBands.low}</span> <span className="text-green-700 font-semibold">Low</span></li>
              <li><span className="inline-block w-20 font-mono text-slate-500">≥ {ep.riskBands.medium}</span> <span className="text-yellow-700 font-semibold">Medium</span></li>
              <li><span className="inline-block w-20 font-mono text-slate-500">≥ {ep.riskBands.high}</span> <span className="text-orange-700 font-semibold">High</span></li>
              <li><span className="inline-block w-20 font-mono text-slate-500">{`< ${ep.riskBands.high}`}</span> <span className="text-red-700 font-semibold">Very High</span></li>
            </ul>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Student caliber composite</p>
            <ul className="text-sm space-y-1 text-slate-700">
              <li>Undergrad tier × <strong>{(ep.caliberCompositeWeights.undergradTier * 100).toFixed(0)}%</strong></li>
              <li>CGPA vs baseline × <strong>{(ep.caliberCompositeWeights.cgpaVsBaseline * 100).toFixed(0)}%</strong></li>
              <li>GRE / GMAT × <strong>{(ep.caliberCompositeWeights.greGmat * 100).toFixed(0)}%</strong></li>
            </ul>
          </div>
        </div>

        <details className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">GRE band table</summary>
          <div className="mt-3"><BandTable bands={ep.greBands} /></div>
        </details>
        <details className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">GMAT band table</summary>
          <div className="mt-3"><BandTable bands={ep.gmatBands} /></div>
        </details>
        <details className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">Work experience band table</summary>
          <div className="mt-3"><BandTable bands={ep.workExperienceBands} /></div>
        </details>
        <details className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">BLS occupation-growth band table (Course Demand)</summary>
          <div className="mt-3"><BandTable bands={ep.blsGrowthBands} /></div>
        </details>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">STEM / Visa advantage scores</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {[
              { label: "US — STEM",                  value: ep.stemVisaScores.usStem },
              { label: "Canada — STEM",              value: ep.stemVisaScores.canadaStem },
              { label: "Germany / Ireland — STEM",   value: ep.stemVisaScores.germanyOrIrelandStem },
              { label: "Other countries — STEM",     value: ep.stemVisaScores.otherStem },
              { label: "Non-STEM",                   value: ep.stemVisaScores.nonStem },
            ].map((r) => (
              <div key={r.label} className="bg-white rounded px-3 py-2 border border-slate-200">
                <p className="text-xs text-slate-500">{r.label}</p>
                <p className="text-sm font-bold text-slate-900">{r.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Live API bonuses</p>
          <ul className="text-sm space-y-1 text-slate-700">
            <li>O*NET Bright Outlook flag: <strong>+{ep.bonuses.onetBrightOutlook}</strong> on Course Demand</li>
            <li>College Scorecard completion ≥ 90%: <strong>+{ep.bonuses.collegeScorecardCompletion90}</strong> on University Tier</li>
            <li>College Scorecard completion ≥ 70%: <strong>+{ep.bonuses.collegeScorecardCompletion70}</strong> on University Tier</li>
          </ul>
        </div>
      </Section>

      <Section
        title="Future Income Predictor (FIP)"
        subtitle="Base salary × multiplier chain → Year 1 / Year 3 / Year 5 trajectory in destination currency and INR."
      >
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Base salary resolution waterfall</p>
          <ol className="text-sm space-y-2 text-slate-700 list-decimal list-inside">
            <li><KindBadge kind="live" /> <strong>US:</strong> College Scorecard program-level earnings (by school + program + degree)</li>
            <li><KindBadge kind="snapshot" /> <strong>US fallback 1:</strong> DOL OFLC H1B LCA disclosures FY2025 (median + P25/P75)</li>
            <li><KindBadge kind="live" /> <strong>US fallback 2:</strong> BLS OES (Occupational Employment Statistics)</li>
            <li><KindBadge kind="snapshot" /> <strong>US fallback 3:</strong> BLS Occupational Outlook Handbook embedded median</li>
            <li><KindBadge kind="live" /> <strong>UK:</strong> ONS Nomis ASHE NM_30_1 by SOC 2020 unit-group code</li>
            <li><KindBadge kind="snapshot" /> <strong>Other non-US:</strong> Embedded country-earnings table with cited primary source</li>
          </ol>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">University tier premium</p>
            <MultiplierGrid rows={[
              { label: "T50",      value: fip.universityTierMultipliers.T50 },
              { label: "T100",     value: fip.universityTierMultipliers.T100 },
              { label: "T200",     value: fip.universityTierMultipliers.T200 },
              { label: "T500",     value: fip.universityTierMultipliers.T500 },
              { label: "Unranked", value: fip.universityTierMultipliers.UNRANKED },
            ]} />
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Degree level premium</p>
            <MultiplierGrid rows={[
              { label: "PhD",     value: fip.degreeMultipliers.PHD },
              { label: "MBA",     value: fip.degreeMultipliers.MBA },
              { label: "MS",      value: fip.degreeMultipliers.MS },
              { label: "LLM",     value: fip.degreeMultipliers.LLM },
              { label: "MFA",     value: fip.degreeMultipliers.MFA },
              { label: "Default", value: fip.degreeMultipliers.DEFAULT },
            ]} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Work experience premium</p>
            <p className="text-sm text-slate-700">+{(fip.workExperiencePremiumPerYear * 100).toFixed(1)}% per year of prior experience</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Heuristic Year-3 / Year-5 fallback</p>
            <p className="text-sm text-slate-700">
              Year 3: ×{fip.fallbackGrowth.year3.toFixed(2)} &nbsp;|&nbsp;
              Year 5: ×{fip.fallbackGrowth.year5.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Used only when the live national wage-index API (FRED / ONS KAB9 / StatCan / Eurostat / ABS) is unreachable.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Return-to-home scenario</p>
          <p className="text-sm text-slate-700">
            Salary multiplier (default) × <strong>{fip.returnScenario.defaultSalaryMultiplier.toFixed(2)}</strong> &nbsp;·&nbsp;
            Year 3 growth × <strong>{fip.returnScenario.year3Growth.toFixed(2)}</strong> &nbsp;·&nbsp;
            Year 5 growth × <strong>{fip.returnScenario.year5Growth.toFixed(2)}</strong> &nbsp;·&nbsp;
            Default return probability <strong>{(fip.returnScenario.defaultProbability * 100).toFixed(0)}%</strong>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Per-nationality overrides (H1B lottery odds, sponsorship rates, return multiplier) live in
            <code className="mx-1 px-1 py-0.5 bg-white border border-slate-200 rounded">nationalities.json</code>
            and override the defaults shown here when present.
          </p>
        </div>
      </Section>

      <Section
        title="Loan-to-Income (LTI)"
        subtitle="Repayment-capacity band on the back of FIP Year-1 income and the loan amount on file."
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th className="pb-2">Band</th>
              <th className="pb-2 text-center">Loan / Year-1 income ≤</th>
              <th className="pb-2 text-center">EMI / Monthly income ≤</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr><td className="py-2 font-semibold text-green-700">Green</td><td className="py-2 text-center font-mono">{lti.bands.green.maxLoanToYear1.toFixed(1)}×</td><td className="py-2 text-center font-mono">{(lti.bands.green.maxEmiToIncome * 100).toFixed(0)}%</td></tr>
            <tr><td className="py-2 font-semibold text-yellow-700">Yellow</td><td className="py-2 text-center font-mono">{lti.bands.yellow.maxLoanToYear1.toFixed(1)}×</td><td className="py-2 text-center font-mono">{(lti.bands.yellow.maxEmiToIncome * 100).toFixed(0)}%</td></tr>
            <tr><td className="py-2 font-semibold text-orange-700">Orange</td><td className="py-2 text-center font-mono">{lti.bands.orange.maxLoanToYear1.toFixed(1)}×</td><td className="py-2 text-center font-mono">{(lti.bands.orange.maxEmiToIncome * 100).toFixed(0)}%</td></tr>
            <tr><td className="py-2 font-semibold text-red-700">Red</td><td className="py-2 text-center text-slate-500">above thresholds</td><td className="py-2 text-center text-slate-500">above thresholds</td></tr>
          </tbody>
        </table>
        <p className="text-xs text-slate-500">
          EMI computed at <strong>{(lti.loanInterestRate * 100).toFixed(1)}%</strong> nominal interest over <strong>{lti.loanTenorMonths} months</strong>.
        </p>
      </Section>

      <Section
        title="External data sources"
        subtitle="Every API and embedded dataset the engine touches when it computes a case."
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th className="pb-2">Source</th>
              <th className="pb-2">Kind</th>
              <th className="pb-2">Vintage</th>
              <th className="pb-2">Used for</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DEFAULT_DATA_SOURCES.map((s: RuleSourceRef) => (
              <tr key={s.label}>
                <td className="py-2 font-medium text-slate-900">{s.label}</td>
                <td className="py-2"><KindBadge kind={s.kind} /></td>
                <td className="py-2 text-slate-500">{s.vintage ?? "—"}</td>
                <td className="py-2 text-slate-600">{s.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
