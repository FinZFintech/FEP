"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AssessmentForm, type AssessmentFormInitialData } from "../../../assess/assessment-form";

interface AssessmentDetail extends AssessmentFormInitialData {
  id: string;
}

export default function EditCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [initialData, setInitialData] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        if (!cancelled) setInitialData(json);
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

  const handleSubmit = async (data: Record<string, unknown>) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/history/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save changes. Please try again.");
      router.push(`/history/${id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-center py-20 text-slate-400">
          <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  if (error && !initialData) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Link href="/history" className="text-sm text-blue-600 hover:underline">
          ← Back to Case History
        </Link>
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <p className="text-slate-700 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!initialData) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href={`/history/${id}`} className="text-sm text-blue-600 hover:underline">
          ← Back to Case
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Edit Case</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Update student and programme details. EP and FIP scores will be recomputed on save.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <AssessmentForm
        onSubmit={handleSubmit}
        loading={submitting}
        initialData={initialData}
        submitLabel="Save Changes"
        submittingLabel="Saving..."
      />
    </div>
  );
}
