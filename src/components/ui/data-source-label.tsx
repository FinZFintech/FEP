import { cn } from "@/lib/utils";
import type { DataKind } from "@/lib/scoring/types";

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
  /** @deprecated use dataKind instead — kept for legacy saved assessments */
  isLive?: boolean;
  className?: string;
}

/**
 * Renders the data-source attribution for a breakdown row with three
 * distinct visual treatments so reviewers can tell at a glance which
 * numbers are real-time, which are point-in-time embedded snapshots,
 * and which are invented internal heuristics.
 */
export function DataSourceLabel({ source, dataKind, vintage, isLive, className }: DataSourceLabelProps) {
  const kind = dataKind ?? inferDataKind(source, isLive);

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
          LIVE
        </span>
        <span>{source}</span>
      </p>
    );
  }

  if (kind === "snapshot") {
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
