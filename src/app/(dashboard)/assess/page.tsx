"use client";

import { useState } from "react";
import { AssessmentForm } from "./assessment-form";
import { ResultCard } from "./result-card";
import type { EPResult, FIPResult, LoanToIncomeResult } from "@/lib/scoring/types";

interface AssessmentResponse {
  id: string;
  ep: EPResult;
  fip: FIPResult;
  lti?: LoanToIncomeResult;
}

export default function AssessPage() {
  const [result, setResult] = useState<AssessmentResponse | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    setFormData(data);

    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Assessment failed. Please try again.");
      const json = await res.json() as AssessmentResponse;
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setFormData(null);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">New Credit Assessment</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Enter student and programme details to generate EP and FIP scorecards.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {!result ? (
        <AssessmentForm onSubmit={handleSubmit} loading={loading} />
      ) : (
        <ResultCard
          result={result}
          formData={formData!}
          onNewAssessment={handleReset}
        />
      )}
    </div>
  );
}
