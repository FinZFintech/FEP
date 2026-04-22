# Outcomes Feedback Loop

> **Purpose**: Close the prediction–reality gap by recording what actually happened to each applicant and feeding that signal back into the scoring engine.

## The Problem

Every FIP score is a prediction: "we estimate this student will earn $X in Year 1." But right now we never learn whether that prediction was right. Without ground truth, we cannot:
- Know whether our multipliers are calibrated correctly
- Detect drift when labour markets move
- Show counsellors or students a track record ("our Year-1 predictions are within ±12% on average")

---

## Step 1 — Capture Ground Truth: `ActualOutcome` Table

Add one table to the Prisma schema:

```prisma
model ActualOutcome {
  id              String   @id @default(cuid())
  assessmentId    String   @unique
  assessment      Assessment @relation(fields: [assessmentId], references: [id])

  // What actually happened
  actualYear1SalaryLocal  Float?   // local currency
  actualYear1SalaryCurrency String? // ISO 4217
  actualYear1SalaryInr    Float?   // converted at time of entry
  employedWithinMonths    Int?     // months from graduation to first job
  employerCountry         String?  // may differ from study destination
  employerCity            String?
  actualJobTitle          String?

  // Metadata
  dataSource   String   // "counsellor_entry" | "email_survey" | "public_form"
  enteredBy    String?  // userId of counsellor, or null for self-reported
  enteredAt    DateTime @default(now())
  notes        String?
}
```

One row per assessment, entered after the student graduates and finds work (typically 12–24 months after the assessment date).

---

## Step 2 — Data Collection Channels

### A. Counsellor Entry (highest quality, lowest volume)
- Add an "Record Outcome" button to the assessment history detail page (admin/counsellor role only)
- Simple form: actual salary, currency, months-to-employment, job title, city
- Counsellors who stay in touch with students post-placement fill this in

### B. Email Automation (medium quality, medium volume)
- 12 months after assessment date, trigger an automated email to the student
- Link to a short form (3 questions: got a job? salary? city?)
- Requires student email capture at assessment time (not currently collected)

### C. Public Self-Report Form (low quality, high volume, optional)
- A `/outcomes` page where any past applicant can submit their result by entering their assessment ID
- No auth required; sanity-check the salary range before storing

---

## Step 3 — Monthly Recalibration Pipeline

Once there are ~50 outcomes in the database, run a monthly job:

```
scripts/recalibrate.ts
```

For each outcome:
1. Re-run the scoring engine with the same inputs (frozen at assessment time via `methodologyVersion`)
2. Compare `predictedYear1SalaryInr` vs `actualYear1SalaryInr`
3. Compute error: `(predicted - actual) / actual`

Aggregate statistics:
- **MAPE** (Mean Absolute Percentage Error) per country
- **MAPE** per course
- **Bias** (signed): are we systematically over- or under-predicting?
- **Trend**: is MAPE improving or worsening over time?

If MAPE for any country/course exceeds a threshold (e.g. 25%), flag it for manual review and open a GitHub issue.

Multiplier adjustments (done manually by a human reviewing the report, not auto-applied):
- If US CS Year-1 is consistently over by 15%, reduce the `uniPremium` or `cityMult` for that cohort
- If UK MBA is consistently under, check whether ONS ASHE data needs updating

---

## Step 4 — UI Changes

### 4a. Predicted vs Actual on Historical Assessments
On the assessment history detail page, if an `ActualOutcome` exists:
- Show a new "Outcome" section below the FIP card
- Display: actual salary (INR), predicted salary (INR), error %
- Green if within ±15%, amber if ±15–30%, red if >30%

### 4b. Counsellor Dashboard — Cohort MAPE
A new admin page `/admin/outcomes`:
- Table: cohort (country × course) | n predictions | n actuals | MAPE | bias | last updated
- Sortable by MAPE (worst first)
- Link to individual outlier assessments for drill-down
- Export to CSV for offline analysis

### 4c. Trust Signal on Assessment Card (stretch)
Once n ≥ 30 for a cohort, show on the FIP card:
> "Based on 47 past students: actual Year-1 salaries were within 11% of this estimate on average."

This is a strong trust signal for students and parents.

---

## Effort Estimates

| Task | Effort |
|------|--------|
| Prisma schema + migration | 2 h |
| Counsellor entry form (admin UI) | 4 h |
| Predicted-vs-actual display on history page | 3 h |
| Email automation (12-month trigger) | 1 day |
| `scripts/recalibrate.ts` | 1 day |
| `/admin/outcomes` dashboard | 1 day |
| Trust signal on FIP card | 3 h |
| **Total MVP (schema + entry + display)** | **~1 day** |
| **Total full system** | **~5 days** |

---

## Minimum Viable Slice (Start Here)

3–4 hours of work that delivers immediate value:

1. **Schema** — Add `ActualOutcome` table, run `prisma migrate dev`
2. **Counsellor entry** — "Record Outcome" button + form on the history detail page (admin role guard)
3. **Display** — Show predicted vs actual (and % error) on the history detail page when an outcome exists

This alone closes the most important gap: counsellors can start recording outcomes today, and the data accumulates silently until there are enough records to compute meaningful MAPE statistics.

---

## When to Revisit

Remind yourself of this document when:
- The user asks "what next?" — suggest the outcomes feedback loop MVP as a high-leverage 3–4 hour investment
- The `ActualOutcome` table has ≥ 20 rows — time to run the first MAPE report
- Any MAPE exceeds 25% — time to re-examine multipliers for that cohort
- PR #8 (FRED + crosswalk) and the ONS/StatCan/Eurostat follow-up PRs are merged — outcomes data will make the new live sources' accuracy measurable

---

*Created: 2026-04-22. Methodology version context: 2026.04.2.*
