"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EPResult, FIPResult, LoanToIncomeResult } from "@/lib/scoring/types";
import type { CompositeResult } from "@/lib/scoring/composite-engine";
import { AssessmentDetails } from "@/components/assessment/details";

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
  notes: string | null;
  createdBy: { name: string | null; email: string | null };
  ep: EPResult;
  fip: FIPResult;
  lti?: LoanToIncomeResult;
  composite?: CompositeResult | null;
  methodologyVersion?: string;
  ruleSetVersion?: string | null;
}

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!data) return;
    const ok = window.confirm(
      `Delete assessment for ${data.studentName}?\n\nThis is permanent — the saved breakdown cannot be recovered.`,
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(`Delete failed: ${body.error ?? res.statusText}`);
        return;
      }
      router.push("/history");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  };

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

  // Rebuild the formData shape that AssessmentDetails expects — same keys as
  // the fresh-assessment form, so the Overview tab renders identically.
  const formData: Record<string, unknown> = {
    studentName: data.studentName,
    undergradInstitution: data.undergradInstitution,
    undergradTier: data.undergradTier,
    undergradDegree: data.undergradDegree,
    undergradMajor: data.undergradMajor,
    undergradCgpa: data.undergradCgpa,
    greScore: data.greScore ?? undefined,
    gmatScore: data.gmatScore ?? undefined,
    workExperienceYears: data.workExperienceYears,
    destinationCountry: data.destinationCountry,
    destinationUniversity: data.destinationUniversity,
    targetDegree: data.targetDegree,
    targetCourse: data.targetCourse,
    isStem: data.isStem,
    programDurationMonths: data.programDurationMonths,
    targetCity: data.targetCity,
    loanAmountInr: data.loanAmountInr,
  };

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
            {data.methodologyVersion && (
              <>
                {" · "}
                <span className="text-slate-400">Methodology v{data.methodologyVersion}</span>
              </>
            )}
            {data.ruleSetVersion && (
              <>
                {" · "}
                <Link href="/rules/archive" className="text-blue-600 hover:underline">
                  Rule set v{data.ruleSetVersion}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/history/${data.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium rounded-xl transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Case
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-red-50 border border-red-300 text-red-700 font-medium rounded-xl transition-colors text-sm disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
            </svg>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      <AssessmentDetails
        ep={data.ep}
        fip={data.fip}
        lti={data.lti}
        composite={data.composite}
        methodologyVersion={data.methodologyVersion}
        formData={formData}
      />

      {data.notes && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Notes</h3>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{data.notes}</p>
        </div>
      )}
    </div>
  );
}
