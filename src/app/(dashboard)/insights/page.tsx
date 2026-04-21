"use client";

import { useState } from "react";
import { formatInr } from "@/lib/utils";

const COUNTRIES = ["US", "UK", "Canada", "Australia", "Germany", "France", "Ireland"];

const COURSES_DATA = [
  { name: "Artificial Intelligence", growth: 36, demand: 100, stemUS: true, usSalary: 130000, ukSalary: 65000, caSalary: 100000, auSalary: 115000, deSalary: 70000, frSalary: 60000, ieSalary: 75000, h1bMedian: 140000, h1bP25: 115000, h1bP75: 175000, h1bApps: 42000, blsEmployment: 192000, socCode: "15-2051", outlook: "Bright" },
  { name: "Machine Learning", growth: 36, demand: 100, stemUS: true, usSalary: 140000, ukSalary: 65000, caSalary: 105000, auSalary: 115000, deSalary: 72000, frSalary: 60000, ieSalary: 78000, h1bMedian: 160000, h1bP25: 135000, h1bP75: 200000, h1bApps: 18000, blsEmployment: 92000, socCode: "15-2051", outlook: "Bright" },
  { name: "Data Science", growth: 36, demand: 100, stemUS: true, usSalary: 108020, ukSalary: 55000, caSalary: 90000, auSalary: 105000, deSalary: 62000, frSalary: 52000, ieSalary: 68000, h1bMedian: 140000, h1bP25: 115000, h1bP75: 175000, h1bApps: 42000, blsEmployment: 192000, socCode: "15-2051", outlook: "Bright" },
  { name: "Cybersecurity", growth: 33, demand: 98, stemUS: true, usSalary: 120360, ukSalary: 58000, caSalary: 95000, auSalary: 105000, deSalary: 65000, frSalary: 56000, ieSalary: 70000, h1bMedian: 125000, h1bP25: 100000, h1bP75: 155000, h1bApps: 22000, blsEmployment: 175000, socCode: "15-1212", outlook: "Bright" },
  { name: "Supply Chain Management", growth: 18, demand: 88, stemUS: false, usSalary: 98540, ukSalary: 45000, caSalary: 75000, auSalary: 88000, deSalary: 56000, frSalary: 48000, ieSalary: 58000, h1bMedian: 105000, h1bP25: 85000, h1bP75: 130000, h1bApps: 12000, blsEmployment: 210000, socCode: "13-1081", outlook: "Strong" },
  { name: "Computer Science", growth: 17, demand: 95, stemUS: true, usSalary: 132270, ukSalary: 52000, caSalary: 95000, auSalary: 110000, deSalary: 65000, frSalary: 55000, ieSalary: 70000, h1bMedian: 130000, h1bP25: 105000, h1bP75: 165000, h1bApps: 285000, blsEmployment: 1850000, socCode: "15-1252", outlook: "Bright" },
  { name: "Software Engineering", growth: 17, demand: 95, stemUS: true, usSalary: 132270, ukSalary: 52000, caSalary: 95000, auSalary: 110000, deSalary: 65000, frSalary: 55000, ieSalary: 70000, h1bMedian: 130000, h1bP25: 105000, h1bP75: 165000, h1bApps: 285000, blsEmployment: 1850000, socCode: "15-1252", outlook: "Bright" },
  { name: "Cloud Computing", growth: 15, demand: 88, stemUS: true, usSalary: 126900, ukSalary: 60000, caSalary: 98000, auSalary: 108000, deSalary: 68000, frSalary: 58000, ieSalary: 72000, h1bMedian: 130000, h1bP25: 110000, h1bP75: 160000, h1bApps: 12000, blsEmployment: 180000, socCode: "15-1241", outlook: "Strong" },
  { name: "Health Informatics", growth: 15, demand: 85, stemUS: true, usSalary: 100000, ukSalary: 48000, caSalary: 80000, auSalary: 95000, deSalary: 58000, frSalary: 50000, ieSalary: 62000, h1bMedian: 105000, h1bP25: 85000, h1bP75: 130000, h1bApps: 8000, blsEmployment: 95000, socCode: "15-1211", outlook: "Strong" },
  { name: "Information Systems", growth: 11, demand: 76, stemUS: true, usSalary: 102240, ukSalary: 48000, caSalary: 85000, auSalary: 100000, deSalary: 60000, frSalary: 50000, ieSalary: 65000, h1bMedian: 105000, h1bP25: 85000, h1bP75: 130000, h1bApps: 65000, blsEmployment: 550000, socCode: "15-1211", outlook: "Average" },
  { name: "Mechanical Engineering", growth: 11, demand: 74, stemUS: true, usSalary: 99510, ukSalary: 42000, caSalary: 78000, auSalary: 95000, deSalary: 58000, frSalary: 45000, ieSalary: 55000, h1bMedian: 105000, h1bP25: 85000, h1bP75: 130000, h1bApps: 18000, blsEmployment: 295000, socCode: "17-2141", outlook: "Average" },
  { name: "Biotechnology", growth: 11, demand: 74, stemUS: true, usSalary: 102270, ukSalary: 38000, caSalary: 72000, auSalary: 85000, deSalary: 52000, frSalary: 45000, ieSalary: 55000, h1bMedian: 95000, h1bP25: 72000, h1bP75: 120000, h1bApps: 8000, blsEmployment: 34000, socCode: "19-1021", outlook: "Average" },
  { name: "Biomedical Engineering", growth: 10, demand: 73, stemUS: true, usSalary: 99550, ukSalary: 40000, caSalary: 75000, auSalary: 90000, deSalary: 55000, frSalary: 46000, ieSalary: 56000, h1bMedian: 105000, h1bP25: 85000, h1bP75: 130000, h1bApps: 5000, blsEmployment: 23000, socCode: "17-2031", outlook: "Average" },
  { name: "Electrical Engineering", growth: 9, demand: 72, stemUS: true, usSalary: 104610, ukSalary: 45000, caSalary: 80000, auSalary: 100000, deSalary: 60000, frSalary: 48000, ieSalary: 58000, h1bMedian: 115000, h1bP25: 95000, h1bP75: 140000, h1bApps: 28000, blsEmployment: 190000, socCode: "17-2071", outlook: "Average" },
  { name: "Finance", growth: 9, demand: 72, stemUS: false, usSalary: 96220, ukSalary: 55000, caSalary: 72000, auSalary: 85000, deSalary: 58000, frSalary: 52000, ieSalary: 60000, h1bMedian: 100000, h1bP25: 80000, h1bP75: 130000, h1bApps: 35000, blsEmployment: 330000, socCode: "13-2051", outlook: "Average" },
  { name: "Chemical Engineering", growth: 8, demand: 68, stemUS: true, usSalary: 112100, ukSalary: 45000, caSalary: 82000, auSalary: 98000, deSalary: 60000, frSalary: 48000, ieSalary: 58000, h1bMedian: 115000, h1bP25: 92000, h1bP75: 140000, h1bApps: 6000, blsEmployment: 32000, socCode: "17-2041", outlook: "Average" },
  { name: "Marketing", growth: 8, demand: 65, stemUS: false, usSalary: 140040, ukSalary: 50000, caSalary: 80000, auSalary: 90000, deSalary: 55000, frSalary: 48000, ieSalary: 60000, h1bMedian: 120000, h1bP25: 95000, h1bP75: 155000, h1bApps: 15000, blsEmployment: 350000, socCode: "11-2021", outlook: "Average" },
  { name: "Economics", growth: 7, demand: 65, stemUS: false, usSalary: 115730, ukSalary: 52000, caSalary: 80000, auSalary: 92000, deSalary: 60000, frSalary: 52000, ieSalary: 65000, h1bMedian: 120000, h1bP25: 95000, h1bP75: 155000, h1bApps: 5000, blsEmployment: 19000, socCode: "19-3011", outlook: "Average" },
  { name: "Civil Engineering", growth: 6, demand: 62, stemUS: true, usSalary: 95890, ukSalary: 42000, caSalary: 80000, auSalary: 100000, deSalary: 55000, frSalary: 44000, ieSalary: 52000, h1bMedian: 95000, h1bP25: 78000, h1bP75: 115000, h1bApps: 8000, blsEmployment: 320000, socCode: "17-2051", outlook: "Average" },
  { name: "Public Policy", growth: 6, demand: 55, stemUS: false, usSalary: 73000, ukSalary: 38000, caSalary: 65000, auSalary: 75000, deSalary: 48000, frSalary: 42000, ieSalary: 50000, h1bMedian: null, h1bP25: null, h1bP75: null, h1bApps: null, blsEmployment: 45000, socCode: "11-1031", outlook: "Slow" },
  { name: "MBA", growth: 5, demand: 60, stemUS: false, usSalary: 120000, ukSalary: 65000, caSalary: 95000, auSalary: 105000, deSalary: 70000, frSalary: 65000, ieSalary: 75000, h1bMedian: 125000, h1bP25: 100000, h1bP75: 160000, h1bApps: 55000, blsEmployment: 3500000, socCode: "11-1021", outlook: "Average" },
  { name: "Business Administration", growth: 5, demand: 60, stemUS: false, usSalary: 98100, ukSalary: 48000, caSalary: 78000, auSalary: 90000, deSalary: 58000, frSalary: 50000, ieSalary: 62000, h1bMedian: 125000, h1bP25: 100000, h1bP75: 160000, h1bApps: 55000, blsEmployment: 3500000, socCode: "11-1021", outlook: "Average" },
  { name: "Human Resources", growth: 5, demand: 55, stemUS: false, usSalary: 126230, ukSalary: 48000, caSalary: 75000, auSalary: 88000, deSalary: 52000, frSalary: 46000, ieSalary: 58000, h1bMedian: 115000, h1bP25: 90000, h1bP75: 140000, h1bApps: 10000, blsEmployment: 180000, socCode: "11-3121", outlook: "Average" },
  { name: "Architecture", growth: 5, demand: 58, stemUS: true, usSalary: 93310, ukSalary: 40000, caSalary: 70000, auSalary: 85000, deSalary: 52000, frSalary: 44000, ieSalary: 52000, h1bMedian: null, h1bP25: null, h1bP75: null, h1bApps: null, blsEmployment: 127000, socCode: "17-1011", outlook: "Slow" },
  { name: "Liberal Arts", growth: 4, demand: 40, stemUS: false, usSalary: 60000, ukSalary: 32000, caSalary: 55000, auSalary: 65000, deSalary: 40000, frSalary: 35000, ieSalary: 42000, h1bMedian: null, h1bP25: null, h1bP75: null, h1bApps: null, blsEmployment: 80000, socCode: "25-1099", outlook: "Slow" },
  { name: "Journalism", growth: -3, demand: 25, stemUS: false, usSalary: 55960, ukSalary: 30000, caSalary: 50000, auSalary: 58000, deSalary: 38000, frSalary: 32000, ieSalary: 38000, h1bMedian: null, h1bP25: null, h1bP75: null, h1bApps: null, blsEmployment: 45000, socCode: "27-3023", outlook: "Declining" },
];

const CURRENCY_MAP: Record<string, string> = {
  US: "USD", UK: "GBP", Canada: "CAD", Australia: "AUD", Germany: "EUR", France: "EUR", Ireland: "EUR",
};

const SALARY_KEY_MAP: Record<string, string> = {
  US: "usSalary", UK: "ukSalary", Canada: "caSalary", Australia: "auSalary", Germany: "deSalary", France: "frSalary", Ireland: "ieSalary",
};

const INR_RATES: Record<string, number> = {
  USD: 83.5, GBP: 106, CAD: 61.5, AUD: 54, EUR: 90,
};

function getOutlookColor(outlook: string): string {
  if (outlook === "Bright") return "text-green-700 bg-green-50 border-green-200";
  if (outlook === "Strong") return "text-blue-700 bg-blue-50 border-blue-200";
  if (outlook === "Average") return "text-yellow-700 bg-yellow-50 border-yellow-200";
  if (outlook === "Slow") return "text-orange-700 bg-orange-50 border-orange-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function getDemandColor(score: number): string {
  if (score >= 90) return "#16a34a";
  if (score >= 70) return "#2563eb";
  if (score >= 50) return "#ca8a04";
  return "#dc2626";
}

export default function InsightsPage() {
  const [selectedCountry, setSelectedCountry] = useState("US");
  const [sortBy, setSortBy] = useState<"demand" | "salary" | "growth">("demand");

  const sortedCourses = [...COURSES_DATA].sort((a, b) => {
    if (sortBy === "demand") return b.demand - a.demand;
    if (sortBy === "growth") return b.growth - a.growth;
    const keyA = SALARY_KEY_MAP[selectedCountry] as keyof typeof a;
    const keyB = SALARY_KEY_MAP[selectedCountry] as keyof typeof b;
    return (b[keyB] as number) - (a[keyA] as number);
  });

  const currency = CURRENCY_MAP[selectedCountry];
  const salaryKey = SALARY_KEY_MAP[selectedCountry] as keyof (typeof COURSES_DATA)[0];
  const inrRate = INR_RATES[currency];

  const topCourses = sortedCourses.slice(0, 5);
  const avgGrowth = Math.round(COURSES_DATA.reduce((s, c) => s + c.growth, 0) / COURSES_DATA.length);
  const brightCount = COURSES_DATA.filter((c) => c.outlook === "Bright").length;
  const stemCount = COURSES_DATA.filter((c) => c.stemUS).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Course Insights & Market Intelligence</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Salary benchmarks, demand signals, and employment outlook across {COURSES_DATA.length} courses and 7 countries.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Bright Outlook Courses", value: `${brightCount}`, sub: "O*NET designation" },
          { label: "STEM-Eligible (US)", value: `${stemCount}/${COURSES_DATA.length}`, sub: "3-year OPT" },
          { label: "Avg 10-yr Job Growth", value: `${avgGrowth}%`, sub: "BLS projections" },
          { label: "Highest H1B Salary", value: "$160K", sub: "ML Engineer median" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
            <p className="text-xs text-slate-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Country:</span>
          <div className="flex gap-1">
            {COUNTRIES.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCountry(c)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  selectedCountry === c ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-semibold text-slate-500 uppercase">Sort:</span>
          {(["demand", "salary", "growth"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                sortBy === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s === "demand" ? "Demand Score" : s === "salary" ? "Salary" : "Job Growth"}
            </button>
          ))}
        </div>
      </div>

      {/* Top 5 Highlight */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Top 5 Highest-Demand Courses for {selectedCountry}</h2>
        <div className="grid grid-cols-5 gap-4">
          {topCourses.map((c, i) => (
            <div key={c.name} className="text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: getDemandColor(c.demand) }}>
                {i + 1}
              </div>
              <p className="text-xs font-semibold text-slate-900 leading-tight">{c.name}</p>
              <p className="text-xs text-slate-400 mt-1">
                {currency} {((c[salaryKey] as number) / 1000).toFixed(0)}K
              </p>
              <p className="text-xs text-green-600">{c.growth > 0 ? "+" : ""}{c.growth}% growth</p>
            </div>
          ))}
        </div>
      </div>

      {/* Full Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Course</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Demand</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">10yr Growth</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Salary ({currency})</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Salary (INR)</th>
                {selectedCountry === "US" && (
                  <>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">H1B Median</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">H1B Range</th>
                  </>
                )}
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">STEM</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Outlook</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedCourses.map((c) => {
                const localSalary = c[salaryKey] as number;
                return (
                  <tr key={c.name} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-2">
                          <div className="h-2 rounded-full" style={{ width: `${c.demand}%`, backgroundColor: getDemandColor(c.demand) }} />
                        </div>
                        <span className="text-xs font-semibold" style={{ color: getDemandColor(c.demand) }}>{c.demand}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold ${c.growth > 15 ? "text-green-600" : c.growth > 5 ? "text-blue-600" : c.growth >= 0 ? "text-yellow-600" : "text-red-600"}`}>
                        {c.growth > 0 ? "+" : ""}{c.growth}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {currency} {localSalary.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {formatInr(localSalary * inrRate)}
                    </td>
                    {selectedCountry === "US" && (
                      <>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {c.h1bMedian ? `$${(c.h1bMedian / 1000).toFixed(0)}K` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-500">
                          {c.h1bP25 && c.h1bP75 ? `$${(c.h1bP25 / 1000).toFixed(0)}K – $${(c.h1bP75 / 1000).toFixed(0)}K` : "—"}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-center">
                      {c.stemUS ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">STEM</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getOutlookColor(c.outlook)}`}>
                        {c.outlook}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-200 text-xs text-slate-400">
          Sources: BLS Occupational Employment Statistics 2024 | BLS Employment Projections 2023-2033 | DOL OFLC H1B LCA Disclosures FY2025 | O*NET v30.2 | HESA LEO 2023 | Stats Canada LFS 2024 | QILT GOS 2024 | OECD Education at a Glance 2024
        </div>
      </div>
    </div>
  );
}
