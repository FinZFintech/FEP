# `/api/assess` — External integration guide

This document is what you hand to a partner system that needs to submit
assessment payloads programmatically.

---

## 1. Endpoint

- **Method:** `POST`
- **URL:** `<base-url>/api/assess`
  - `base-url` is the deployed app origin (whatever `NEXTAUTH_URL` is set to,
    e.g. `https://app.finz.finance`).
- **Content-Type:** `application/json`

---

## 2. Authentication

Machine callers authenticate with an **API key** supplied by Finz. Pass it in
one of these headers on every request:

```
Authorization: Bearer fep_live_XXXXXXXXXXXXXXXXXXXXXXXX
```

or

```
X-API-Key: fep_live_XXXXXXXXXXXXXXXXXXXXXXXX
```

- Keys look like `fep_live_` + 32 URL-safe characters.
- Each key is tied to a Finz user; assessments created via the key are
  attributed to that user for audit.
- Keys are bearer credentials: anyone holding the key can call the API.
  **Never** embed them in client-side code, mobile apps, or public repos.
- A revoked key returns `401 Invalid or revoked API key`.

### What Finz shares with you

1. The **base URL** of the environment (prod / sandbox).
2. One **API key** per integrating environment. The raw key is shown
   **once** at mint time and cannot be retrieved again — store it in your
   secret manager immediately.

### What you share with Finz

1. The **name / purpose** of each key you want (e.g. `"Partner LMS — prod"`).
2. A **Finz user email** the key should act on behalf of. That user must
   have signed in at `/login` at least once so the record exists.
3. The **source IPs** or egress CIDRs you'll call from (optional today; used
   if/when we add IP allow-listing).

### Rotating a key

1. Ask Finz to mint a new key.
2. Roll your client to the new key.
3. Ask Finz to revoke the old key.

---

## 3. Request body

`application/json`. Validation is strict (zod). Unknown fields are ignored;
missing required fields return HTTP 400 with a detailed `details` array.

### Required fields

| Field | Type | Notes |
|---|---|---|
| `studentName` | string | |
| `nationality` | string | e.g. `"Indian"` |
| `undergradInstitution` | string | |
| `undergradTier` | string | e.g. `"Tier 1"` |
| `undergradDegree` | string | e.g. `"B.Tech"` |
| `undergradMajor` | string | |
| `undergradCgpa` | number | on the institution's native scale |
| `workExperienceYears` | integer ≥ 0 | |
| `destinationCountry` | string | e.g. `"USA"` |
| `destinationUniversity` | string | |
| `targetDegree` | string | e.g. `"MS"`, `"MBA"` |
| `targetCourse` | string | |
| `isStem` | boolean | |
| `programDurationMonths` | integer ≥ 1 | |

### Optional legacy fields

`greScore` (int), `gmatScore` (int), `targetCity` (string), `loanAmountInr`
(number ≥ 0), `notes` (string).

### Optional composite scoring inputs (Framework Jan-2026)

Supplying **any** of these enables the composite score in the response.

**Applicant credit & income**
`applicantCibilScore` (0–900), `applicantCrifScore` (0–900),
`applicantAnnualSalary` (≥ 0), `applicantAnnualOther` (≥ 0),
`applicantExistingEmis` (number[] max 3, each ≥ 0),
`applicantFutureEmiInr` (≥ 0), `isNewToCredit` (bool),
`isNtcEligibleTransition` (bool), `averageBankBalance3moInr` (≥ 0).

**Savings / skin-in-the-game (§15)**
`tuitionFeesInr`, `livingExpensesInr`, `totalCostOfAttInr`, `scholarshipInr`,
`mutualFundInr`, `fdInr`, `bankSavingsInr`, `otherSavingsInr` — all numbers ≥ 0.

**Penalty flags (§4.2)**
`addressPincode` (string — checked against negative pincode list),
`documentAuthenticityStatus` — one of `VERIFIED | PARTIAL | MISMATCH | FORGERY | UNVERIFIABLE`,
`admissionVisaFlightStatus` — one of `ALL_CONFIRMED | VISA_IN_PROCESS | CONDITIONAL | LIKELY_REJECT | FAKE`,
`socialMediaRedFlag`, `creditDefault15PlusDpd`, `creditDefaultWriteOff`,
`creditOverdueAbove3k`, `earlyEmiBounceHistory`, `consultantBlacklistHit`
— all boolean.

**Insurance (§25)**
`insuranceBundle` — one of `LIFE_ACC_HEALTH | LIFE_ACC | CREDIT_LIFE_ONLY | DECLINED | NONE`.

**Co-applicants** (array, up to 3)
```json
{
  "relation": "FATHER" | "MOTHER" | "SPOUSE" | "SIBLING" | "GUARDIAN",
  "occupationType": "PRIVATE" | "GOVT" | "SELF_EMPLOYED" | "NOT_WORKING" | "RETIRED" | "FARMER",
  "cibilScore": 0-900,          // optional
  "crifScore": 0-900,           // optional
  "annualSalary": number >= 0,  // optional
  "annualRental": number >= 0,  // optional
  "annualOther":  number >= 0,  // optional
  "existingEmis": number[] (max 3, each >= 0)  // optional
}
```

---

## 4. Response

### 200 OK

```json
{
  "id": "ckxyz...",
  "ep": {
    "score": 78.4,
    "riskBand": "Low",
    "riskColor": "#…",
    "breakdown": [ /* factor rows */ ],
    "summary": "…"
  },
  "fip": {
    "currency": "USD",
    "year1Local": 85000,
    "year3Local": 102000,
    "year5Local": 125000,
    "year1Inr": 7097500,
    "year3Inr": 8517000,
    "year5Inr": 10437500,
    "fx": { /* rate + provenance */ },
    "returnScenario": { /* … */ },
    "breakdown": [ /* … */ ]
  },
  "lti": { "year1": 0.82, "year3": 0.68 },        // only if loanAmountInr supplied
  "composite": {                                   // only if composite inputs supplied
    "compositeScore": 72.1,
    "decision": "APPROVE",
    "breakdown": { /* detailed factor tree */ }
  },
  "methodologyVersion": "2026.05.0",
  "ruleSetVersion": "2026-04-published"
}
```

### Error responses

| Status | Body | When |
|---|---|---|
| `400` | `{ "error": "Invalid input", "details": [...] }` | Payload failed schema validation. `details` is a zod issue array. |
| `401` | `{ "error": "Unauthorised" }` | No API key and no session cookie. |
| `401` | `{ "error": "Invalid or revoked API key" }` | Header present but key doesn't match or has been revoked. |

---

## 5. Minimal example

```bash
curl -X POST https://app.finz.finance/api/assess \
  -H "Authorization: Bearer fep_live_XXXXXXXXXXXXXXXXXXXXXXXX" \
  -H "Content-Type: application/json" \
  -d '{
    "studentName": "Aditi Rao",
    "nationality": "Indian",
    "undergradInstitution": "IIT Bombay",
    "undergradTier": "Tier 1",
    "undergradDegree": "B.Tech",
    "undergradMajor": "Computer Science",
    "undergradCgpa": 8.9,
    "workExperienceYears": 2,
    "destinationCountry": "USA",
    "destinationUniversity": "Carnegie Mellon University",
    "targetDegree": "MS",
    "targetCourse": "Computer Science",
    "isStem": true,
    "programDurationMonths": 24,
    "loanAmountInr": 5000000
  }'
```

---

## 6. Operational notes

- **Rate limiting:** not yet enforced at the app layer. Please keep sustained
  traffic under ~5 requests/second per key; batch larger backfills with us
  first.
- **CORS:** the endpoint is not configured for cross-origin browser calls.
  Call it from your backend, not from a browser in a different origin.
- **Idempotency:** every POST creates a fresh `Assessment` row. There is no
  server-side dedup today. If your caller retries, supply your own
  idempotency discipline (e.g. de-dupe on your side by the returned `id`).
- **Versioning:** the response includes `methodologyVersion` and
  `ruleSetVersion`. Log these alongside the assessment `id` so you can tie
  historical decisions to the exact rule set that produced them.

---

## 7. For Finz operators — minting / revoking keys

All key management is DB-backed. Raw keys are never stored; only the
SHA-256 hash.

```bash
# Mint (the raw key is printed ONCE)
npx tsx scripts/mint-api-key.ts ops@finz.finance "Partner LMS — prod"

# List all keys (optionally scoped to one user)
npx tsx scripts/revoke-api-key.ts --list
npx tsx scripts/revoke-api-key.ts --list ops@finz.finance

# Revoke by id or by the prefix shown in --list
npx tsx scripts/revoke-api-key.ts ckxyz123...
npx tsx scripts/revoke-api-key.ts fep_live_Ab
```

The `lastUsedAt` column on `ApiKey` is updated best-effort on every
successful auth; use it to spot stale keys.
