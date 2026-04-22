import { cn } from "@/lib/utils";

// Heuristic used only for legacy breakdown rows saved before isLive was tracked.
// Returns true only when the source string unambiguously describes a live fetch.
function inferIsLiveFromSource(source: string | undefined): boolean {
  if (!source) return false;
  const s = source.toLowerCase();
  if (s.includes("static") || s.includes("hardcoded") || s.includes("fallback") || s.includes("lookup")) {
    return false;
  }
  return s.includes("(live)") || s.includes("api (live)");
}

interface DataSourceLabelProps {
  source: string;
  isLive?: boolean;
  className?: string;
}

/**
 * Renders the data-source attribution for a breakdown row with explicit
 * visual distinction between live API data and mock/static lookups so
 * reviewers can tell at a glance what is real vs. what is placeholder.
 */
export function DataSourceLabel({ source, isLive, className }: DataSourceLabelProps) {
  const live = isLive ?? inferIsLiveFromSource(source);

  if (live) {
    return (
      <p
        className={cn(
          "text-xs mt-1 italic flex items-center gap-1.5 text-blue-600",
          className,
        )}
      >
        <span
          aria-hidden
          className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"
        />
        <span className="font-semibold not-italic text-green-700">LIVE</span>
        <span>{source}</span>
      </p>
    );
  }

  return (
    <p
      className={cn(
        "text-xs mt-1 italic flex items-center gap-1.5 text-amber-800",
        className,
      )}
    >
      <span
        aria-hidden
        className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold not-italic tracking-wide shrink-0"
      >
        MOCK
      </span>
      <span>{source}</span>
    </p>
  );
}

/**
 * Small legend that explains the LIVE vs MOCK visual convention.
 * Render this above breakdown tables.
 */
export function DataSourceLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2",
        className,
      )}
    >
      <span className="font-semibold text-slate-700">Data source key:</span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
        <span className="font-semibold text-green-700">LIVE</span>
        <span className="text-slate-500">fetched from an external API at assessment time</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold tracking-wide">
          MOCK
        </span>
        <span className="text-slate-500">hardcoded / static lookup — not real-time</span>
      </span>
    </div>
  );
}
