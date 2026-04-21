"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { getRiskBandColor, formatInr } from "@/lib/utils";

interface BatchResult {
  studentName: string;
  ep: { score: number; riskBand: string };
  fip: { currency: string; year1Local: number; year1Inr: number };
}

const TEMPLATE_HEADERS = [
  "studentName", "undergradInstitution", "undergradTier", "undergradDegree",
  "undergradMajor", "undergradCgpa", "greScore", "gmatScore", "workExperienceYears",
  "destinationCountry", "destinationUniversity", "targetDegree", "targetCourse",
  "isStem", "programDurationMonths", "targetCity", "loanAmountInr",
];

const EXAMPLE_ROW = [
  "Rahul Sharma", "IIT Bombay", "IIT", "B.Tech", "Computer Science",
  "8.5", "320", "", "1", "US", "Northeastern University", "MS",
  "Data Science", "true", "24", "Boston", "5000000",
];

function downloadTemplate() {
  const csv = [TEMPLATE_HEADERS.join(","), EXAMPLE_ROW.join(",")].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "FinZ-Batch-Template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function downloadResults(results: BatchResult[]) {
  const rows = results.map(r => [
    r.studentName, r.ep.score, r.ep.riskBand,
    `${r.fip.currency} ${r.fip.year1Local}`, formatInr(r.fip.year1Inr),
  ]);
  const csv = [
    ["Student Name", "EP Score", "Risk Band", "FIP Year 1 (Local)", "FIP Year 1 (INR)"].join(","),
    ...rows.map(r => r.join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `FinZ-Batch-Results-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BatchPage() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [results, setResults] = useState<BatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    setResults([]);
    setError(null);
    setParseError(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (!result.data.length) {
          setParseError("CSV file is empty or could not be parsed.");
          return;
        }
        setRows(result.data);
      },
      error: () => setParseError("Failed to parse CSV. Please check the format."),
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) handleFile(file);
  };

  const handleSubmit = async () => {
    if (!rows.length) return;
    setLoading(true);
    setError(null);

    try {
      const parsed = rows.map(r => ({
        ...r,
        undergradCgpa: parseFloat(r.undergradCgpa || "7"),
        greScore: r.greScore ? parseInt(r.greScore) : undefined,
        gmatScore: r.gmatScore ? parseInt(r.gmatScore) : undefined,
        workExperienceYears: parseInt(r.workExperienceYears || "0"),
        isStem: r.isStem?.toLowerCase() === "true",
        programDurationMonths: parseInt(r.programDurationMonths || "24"),
        loanAmountInr: r.loanAmountInr ? parseFloat(r.loanAmountInr) : undefined,
      }));

      const res = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, rows: parsed }),
      });

      if (!res.ok) throw new Error("Batch processing failed. Please try again.");
      const json = await res.json() as { results: BatchResult[] };
      setResults(json.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Batch Upload</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Upload a CSV file to score multiple applicants at once.
        </p>
      </div>

      {/* Template download */}
      <div className="mb-4 flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-blue-800 flex-1">
          Use our CSV template to ensure your data is formatted correctly.
        </p>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Template
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors mb-4"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <svg className="w-10 h-10 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        {rows.length > 0 ? (
          <>
            <p className="text-sm font-semibold text-slate-700">{fileName}</p>
            <p className="text-xs text-slate-400 mt-1">{rows.length} applicants ready to process</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-700">Drop your CSV here or click to browse</p>
            <p className="text-xs text-slate-400 mt-1">Only .csv files are accepted</p>
          </>
        )}
      </div>

      {parseError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{parseError}</div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {rows.length > 0 && !results.length && (
        <div className="flex justify-end mb-6">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing {rows.length} applicants...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Run Batch Assessment ({rows.length} applicants)
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <p className="text-sm font-semibold text-slate-700">{results.length} assessments completed</p>
            <button
              onClick={() => downloadResults(results)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Results CSV
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Student</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">EP Score</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Risk</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">FIP Year 1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.studentName}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-lg font-bold text-slate-900">{r.ep.score}</span>
                    <span className="text-slate-400 text-xs">/100</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getRiskBandColor(r.ep.riskBand)}`}>
                      {r.ep.riskBand}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-semibold text-slate-900">{r.fip.currency} {r.fip.year1Local.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-slate-400">{formatInr(r.fip.year1Inr)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
