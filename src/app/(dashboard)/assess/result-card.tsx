"use client";

import { useState } from "react";
import type { EPResult, FIPResult, LoanToIncomeResult } from "@/lib/scoring/types";
import type { CompositeResult } from "@/lib/scoring/composite-engine";
import { AssessmentDetails } from "@/components/assessment/details";

interface ResultCardProps {
  result: {
    id: string;
    ep: EPResult;
    fip: FIPResult;
    lti?: LoanToIncomeResult;
    composite?: CompositeResult | null;
    methodologyVersion?: string;
  };
  formData: Record<string, unknown>;
  onNewAssessment: () => void;
}

export function ResultCard({ result, formData, onNewAssessment }: ResultCardProps) {
  const { ep, fip, lti, composite, methodologyVersion } = result;
  const [exporting, setExporting] = useState(false);
  const studentName = formData.studentName as string;

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const { generatePDF } = await import("@/lib/pdf/generator");
      generatePDF({ result: { ...result, methodologyVersion }, formData });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Assessment: {studentName}</h2>
          <p className="text-sm text-slate-500">
            ID: {result.id} · {new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })}
            {methodologyVersion && (
              <>
                {" · "}
                <span className="text-slate-400">Methodology v{methodologyVersion}</span>
              </>
            )}
          </p>
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

      <AssessmentDetails
        ep={ep}
        fip={fip}
        lti={lti}
        composite={composite}
        methodologyVersion={methodologyVersion}
        formData={formData}
      />
    </div>
  );
}
