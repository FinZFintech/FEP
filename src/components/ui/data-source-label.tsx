import { cn } from "@/lib/utils";
import type { DataKind, EPBreakdownItem, FIPBreakdownItem } from "@/lib/scoring/types";

// Backward-compat heuristic for breakdown rows saved before dataKind was
// tracked. Conservative: only classify live when the source string explicitly
// says "(live)"; classify heuristic when it mentions an internal model; else
// treat as snapshot.
function inferDataKind(source: string | undefined, legacyIsLive?: boolean): DataKind {
  if (legacyIsLive === true) return "live";
  const s = (source ?? "").toLowerCase();
  if (s.includes("(live)")) return "live";
  if (
    s.includes("internal model") ||
    s.includes("hardcoded") ||
    s.includes("heuristic") ||
    s.includes("fixed multiplier") ||
    s.includes("no external source")
  ) {
    return "heuristic";
  }
  return "snapshot";
}

interface DataSourceLabelProps {
  source: string;
  dataKind?: DataKind;
  vintage?: string;
  /** ISO timestamp of the live fetch (only meaningful for dataKind="live"). */
  fetchedAt?: string;
  /** @deprecated use dataKind instead — kept for legacy saved assessments */
  isLive?: boolean;
  className?: string;
}

// Maximum age beyond which a SNAPSHOT is flagged stale. 18 months is a
// common threshold for annual publications (HESA, QILT, OECD EAG, BLS OOH).
const STALE_VINTAGE_MONTHS = 18;

function isVintageStale(vintage?: string): boolean {
  if (!vintage) return false;
  // Accept common formats: "2022-23", "2024", "FY2025 Q1-Q3", "2023-2033 projections", ISO dates.
  const yearMatch = vintage.match(/(\d{4})/g);
  if (!yearMatch) return false;
  // Use the newest year mentioned in the vintage string.
  const latestYear = Math.max(...yearMatch.map((y) => parseInt(y, 10)));
  if (!Number.isFinite(latestYear)) return false;
  const now = new Date();
  const monthsOld = (now.getFullYear() - latestYear) * 12 + now.getMonth();
  return monthsOld > STALE_VINTAGE_MONTHS;
}

function relativeAge(isoDate?: string): string | null {
  if (!isoDate) return null;
  const t = new Date(isoDate).getTime();
  if (!Number.isFinite(t)) return null;
  const diffMs = Date.now() - t;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}

/**
 * Renders the data-source attribution for a breakdown row with three
 * distinct visual treatments so reviewers can tell at a glance which
 * numbers are real-time, which are point-in-time embedded snapshots,
 * and which are invented internal heuristics.
 */
export function DataSourceLabel({ source, dataKind, vintage, fetchedAt, isLive, className }: DataSourceLabelProps) {
  const kind = dataKind ?? inferDataKind(source, isLive);
  const age = relativeAge(fetchedAt);

  if (kind === "live") {
    return (
      <p
        className={cn(
          "text-xs mt-1 italic flex items-start gap-1.5 text-blue-700",
          className,
        )}
      >
        <span
          aria-hidden
          className="inline-flex items-center px-1.5 py-0.5 rounded bg-green-100 border border-green-300 text-green-800 text-[10px] font-bold not-italic tracking-wide shrink-0"
        >
          LIVE{age ? ` · ${age}` : ""}
        </span>
        <span>{source}</span>
      </p>
    );
  }

  if (kind === "snapshot") {
    const stale = isVintageStale(vintage);
    return (
      <p
        className={cn(
          "text-xs mt-1 italic flex items-start gap-1.5 text-amber-800",
          className,
        )}
      >
        <span
          aria-hidden
          className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold not-italic tracking-wide shrink-0 whitespace-nowrap"
        >
          SNAPSHOT{vintage ? ` · ${vintage}` : ""}
        </span>
        {stale && (
          <span
            aria-label="Stale snapshot"
            title={`Published more than ${STALE_VINTAGE_MONTHS} months ago — consider refreshing`}
            className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-100 border border-red-300 text-red-800 text-[10px] font-bold not-italic tracking-wide shrink-0 whitespace-nowrap"
          >
            STALE
          </span>
        )}
        <span>{source}</span>
      </p>
    );
  }

  // heuristic — internal product model, no external source
  return (
    <p
      className={cn(
        "text-xs mt-1 italic flex items-start gap-1.5 text-orange-800",
        className,
      )}
    >
      <span
        aria-hidden
        className="inline-flex items-center px-1.5 py-0.5 rounded bg-orange-100 border border-orange-400 text-orange-900 text-[10px] font-bold not-italic tracking-wide shrink-0"
      >
        HEURISTIC
      </span>
      <span>{source}</span>
    </p>
  );
}

/**
 * Legend explaining the LIVE / SNAPSHOT / HEURISTIC convention.
 * Render above breakdown tables.
 */
export function DataSourceLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2",
        className,
      )}
    >
      <span className="font-semibold text-slate-700">Data source key:</span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-green-100 border border-green-300 text-green-800 text-[10px] font-bold tracking-wide">
          LIVE
        </span>
        <span className="text-slate-500">fetched from an external API at assessment time</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold tracking-wide">
          SNAPSHOT
        </span>
        <span className="text-slate-500">real published source, embedded at a point in time (vintage shown)</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-orange-100 border border-orange-400 text-orange-900 text-[10px] font-bold tracking-wide">
          HEURISTIC
        </span>
        <span className="text-slate-500">internal product model, no external source</span>
      </span>
    </div>
  );
}

interface ProvenanceCounts {
  live: number;
  snapshot: number;
  heuristic: number;
}

function countProvenance(items: Array<EPBreakdownItem | FIPBreakdownItem>): ProvenanceCounts {
  const counts: ProvenanceCounts = { live: 0, snapshot: 0, heuristic: 0 };
  for (const item of items) {
    const kind = item.dataKind ?? inferDataKind(item.source, item.isLive);
    counts[kind]++;
  }
  return counts;
}

/**
 * Compact badge summarising the LIVE / SNAPSHOT / HEURISTIC mix across a set
 * of breakdown rows. Render at the top of a card so readers can judge the
 * overall quality at a glance instead of auditing every row.
 */
export function ProvenanceSummary({
  items,
  className,
}: {
  items: Array<EPBreakdownItem | FIPBreakdownItem>;
  className?: string;
}) {
  const counts = countProvenance(items);
  const total = counts.live + counts.snapshot + counts.heuristic;
  if (total === 0) return null;

  const pill = (n: number, label: string, bg: string, border: string, text: string) =>
    n > 0 ? (
      <span
        key={label}
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide border",
          bg,
          border,
          text,
        )}
      >
        <span>{n}</span>
        <span className="opacity-80">{label}</span>
      </span>
    ) : null;

  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-1.5 text-[10px]",
        className,
      )}
      title={`${counts.live} live · ${counts.snapshot} snapshot · ${counts.heuristic} heuristic (of ${total} components)`}
    >
      <span className="text-slate-500 font-medium uppercase tracking-wider mr-1">Data mix:</span>
      {pill(counts.live, "LIVE", "bg-green-100", "border-green-300", "text-green-800")}
      {pill(counts.snapshot, "SNAPSHOT", "bg-amber-100", "border-amber-300", "text-amber-900")}
      {pill(counts.heuristic, "HEURISTIC", "bg-orange-100", "border-orange-400", "text-orange-900")}
    </div>
  );
}
