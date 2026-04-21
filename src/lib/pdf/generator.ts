import jsPDF from "jspdf";
import type { EPResult, FIPResult } from "@/lib/scoring/types";
import { formatInr } from "@/lib/utils";

interface GeneratePDFArgs {
  result: { id: string; ep: EPResult; fip: FIPResult };
  formData: Record<string, unknown>;
}

function formatCurrencySimple(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-IN")}`;
}

export function generatePDF({ result, formData }: GeneratePDFArgs) {
  const { ep, fip } = result;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = 210;
  const margin = 20;
  let y = margin;

  const riskColors: Record<string, [number, number, number]> = {
    Low: [22, 163, 74],
    Medium: [202, 138, 4],
    High: [234, 88, 12],
    "Very High": [220, 38, 38],
  };

  // ─── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, W, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("FinZ Finance", margin, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Credit Underwriting Assessment Report", margin, 19);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}`, W - margin, 12, { align: "right" });
  doc.text(`Assessment ID: ${result.id}`, W - margin, 19, { align: "right" });

  y = 38;

  // ─── Student Summary ────────────────────────────────────────────────────────
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`Student: ${formData.studentName}`, margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${formData.undergradDegree} · ${formData.undergradInstitution} (${formData.undergradTier}) → ${formData.targetDegree} ${formData.targetCourse} @ ${formData.destinationUniversity}, ${formData.destinationCountry}`,
    margin, y
  );
  y += 10;

  // ─── Score Summary Box ──────────────────────────────────────────────────────
  const epColor = riskColors[ep.riskBand] ?? [100, 100, 100];
  doc.setFillColor(...epColor);
  doc.roundedRect(margin, y, 80, 28, 3, 3, "F");
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin + 85, y, 85, 28, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("EMPLOYABILITY SCORE (EP)", margin + 5, y + 8);
  doc.setFontSize(22);
  doc.text(`${ep.score}/100`, margin + 5, y + 22);
  doc.setFontSize(9);
  doc.text(`Risk Band: ${ep.riskBand}`, margin + 45, y + 22);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("FUTURE INCOME (FIP) — YEAR 1", margin + 90, y + 8);
  doc.setFontSize(12);
  doc.text(formatCurrencySimple(fip.year1Local, fip.currency), margin + 90, y + 17);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`≈ ${formatInr(fip.year1Inr)}`, margin + 90, y + 24);

  y += 36;

  // ─── Income Trajectory ──────────────────────────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, W - 2 * margin, 22, "F");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");

  const cols = [
    { label: "Year 1", local: fip.year1Local, inr: fip.year1Inr },
    { label: "Year 3", local: fip.year3Local, inr: fip.year3Inr },
    { label: "Year 5", local: fip.year5Local, inr: fip.year5Inr },
  ];
  const colW = (W - 2 * margin) / 3;
  cols.forEach((col, i) => {
    const cx = margin + i * colW + colW / 2;
    doc.text(col.label, cx, y + 7, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(formatCurrencySimple(col.local, fip.currency), cx, y + 14, { align: "center" });
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(formatInr(col.inr), cx, y + 20, { align: "center" });
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
  });

  y += 30;

  // ─── EP Breakdown Table ─────────────────────────────────────────────────────
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Employability Predictor — Score Breakdown", margin, y);
  y += 6;

  // Table header
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, W - 2 * margin, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text("Factor", margin + 2, y + 5);
  doc.text("Wt.", margin + 90, y + 5, { align: "right" });
  doc.text("Score", margin + 115, y + 5, { align: "right" });
  doc.text("Weighted", margin + 165, y + 5, { align: "right" });
  y += 7;

  ep.breakdown.forEach((item, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, W - 2 * margin, 12, "F");
    }
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(item.factor, margin + 2, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    const rationale = item.rationale.length > 70 ? item.rationale.slice(0, 70) + "..." : item.rationale;
    doc.text(rationale, margin + 2, y + 10);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${(item.weight * 100).toFixed(0)}%`, margin + 90, y + 8, { align: "right" });
    doc.text(`${item.rawScore}`, margin + 115, y + 8, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(`${item.weightedScore}`, margin + 165, y + 8, { align: "right" });
    y += 12;
  });

  // Total row
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, W - 2 * margin, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL EP SCORE", margin + 2, y + 6);
  doc.text(`${ep.score}`, margin + 165, y + 6, { align: "right" });
  y += 14;

  // ─── Summary ────────────────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  const summaryLines = doc.splitTextToSize(ep.summary, W - 2 * margin);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 5 + 6;

  // ─── FIP Breakdown ──────────────────────────────────────────────────────────
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Future Income Predictor — Calculation Breakdown", margin, y);
  y += 6;

  fip.breakdown.slice(0, 5).forEach((item, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, W - 2 * margin, 12, "F");
    }
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(item.component, margin + 2, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(item.rationale, margin + 2, y + 10);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    const valStr = item.type === "base"
      ? formatCurrencySimple(item.value, fip.currency)
      : `× ${item.value.toFixed(2)}`;
    doc.text(valStr, W - margin, y + 8, { align: "right" });
    y += 12;
  });

  // ─── Footer ─────────────────────────────────────────────────────────────────
  y = 280;
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.setFont("helvetica", "normal");
  doc.text("Data Sources: " + fip.dataSource, margin, y);
  doc.text("Confidential — FinZ Finance Credit Underwriting. For internal use only.", margin, y + 4);
  doc.text(`Page 1`, W - margin, y, { align: "right" });

  doc.save(`FinZ-Assessment-${formData.studentName as string}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
