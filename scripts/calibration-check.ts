/// <reference types="node" />
/**
 * Calibration smoke-test for the scoring engine.
 *
 * Runs a canonical set of assessment profiles through computeEP / computeFIP
 * and checks that:
 *  - the shape is intact (no crash, breakdown rows match expected factors);
 *  - EP scores and Year-1 local salaries stay within sensible bounds;
 *  - the LIVE / SNAPSHOT / HEURISTIC mix is non-empty for every profile.
 *
 * This is a smoke-test, not a regression test of exact numbers — live APIs
 * and FX feeds make exact comparisons flaky. Once a calibration / outcomes
 * backfitting pipeline exists, tighten the bounds.
 *
 * Usage:
 *   npx tsx scripts/calibration-check.ts
 *
 * Exit code 0 = all profiles passed, 1 = at least one failure.
 */

import { computeEP, computeFIP } from "../src/lib/scoring/engine";
import type { AssessmentInput } from "../src/lib/scoring/types";

interface Profile {
  name: string;
  input: AssessmentInput;
  expect: {
    epRange: [number, number];
    year1LocalRange: [number, number];
    riskBands?: Array<"Low" | "Medium" | "High" | "Very High">;
  };
}

const PROFILES: Profile[] = [
  {
    name: "T50 US MS CS, strong academics",
    input: {
      studentName: "Test",
      nationality: "Indian",
      undergradInstitution: "IIT Bombay",
      undergradTier: "TIER_1",
      undergradDegree: "BTech",
      undergradMajor: "Computer Science",
      undergradCgpa: 9.2,
      greScore: 328,
      workExperienceYears: 2,
      destinationCountry: "US",
      destinationUniversity: "Carnegie Mellon University",
      targetDegree: "MS",
      targetCourse: "Computer Science",
      isStem: true,
      programDurationMonths: 24,
      targetCity: "Pittsburgh",
    },
    expect: {
      epRange: [65, 100],
      year1LocalRange: [100000, 300000],
      riskBands: ["Low", "Medium"],
    },
  },
  {
    name: "UK MBA, mid-tier profile",
    input: {
      studentName: "Test",
      nationality: "Indian",
      undergradInstitution: "Delhi University",
      undergradTier: "TIER_2",
      undergradDegree: "BCom",
      undergradMajor: "Finance",
      undergradCgpa: 7.5,
      gmatScore: 680,
      workExperienceYears: 4,
      destinationCountry: "UK",
      destinationUniversity: "Warwick Business School",
      targetDegree: "MBA",
      targetCourse: "MBA",
      isStem: false,
      programDurationMonths: 12,
    },
    expect: {
      epRange: [40, 85],
      year1LocalRange: [30000, 120000],
    },
  },
  {
    name: "Canada MS DS, T100 university",
    input: {
      studentName: "Test",
      nationality: "Indian",
      undergradInstitution: "NIT Trichy",
      undergradTier: "TIER_2",
      undergradDegree: "BTech",
      undergradMajor: "IT",
      undergradCgpa: 8.3,
      greScore: 315,
      workExperienceYears: 1,
      destinationCountry: "Canada",
      destinationUniversity: "University of Toronto",
      targetDegree: "MS",
      targetCourse: "Data Science",
      isStem: true,
      programDurationMonths: 18,
      targetCity: "Toronto",
    },
    expect: {
      epRange: [55, 95],
      year1LocalRange: [50000, 160000],
    },
  },
  {
    name: "Weak profile, non-STEM, unranked university",
    input: {
      studentName: "Test",
      nationality: "Indian",
      undergradInstitution: "Unknown College",
      undergradTier: "OTHERS",
      undergradDegree: "BA",
      undergradMajor: "Liberal Arts",
      undergradCgpa: 6.0,
      workExperienceYears: 0,
      destinationCountry: "US",
      destinationUniversity: "Unknown University",
      targetDegree: "MA",
      targetCourse: "Liberal Arts",
      isStem: false,
      programDurationMonths: 24,
    },
    expect: {
      epRange: [0, 55],
      year1LocalRange: [20000, 100000],
      riskBands: ["High", "Very High"],
    },
  },
];

interface ProfileResult {
  profile: string;
  pass: boolean;
  notes: string[];
}

function withinRange(n: number, [lo, hi]: [number, number]): boolean {
  return n >= lo && n <= hi;
}

async function checkProfile(p: Profile): Promise<ProfileResult> {
  const notes: string[] = [];
  let pass = true;

  try {
    const [ep, fip] = await Promise.all([computeEP(p.input), computeFIP(p.input)]);

    if (!withinRange(ep.score, p.expect.epRange)) {
      pass = false;
      notes.push(`EP score ${ep.score} outside expected ${p.expect.epRange.join("–")}`);
    } else {
      notes.push(`EP score ${ep.score} (${ep.riskBand})`);
    }

    if (p.expect.riskBands && !p.expect.riskBands.includes(ep.riskBand)) {
      pass = false;
      notes.push(`Risk band ${ep.riskBand} not in expected {${p.expect.riskBands.join(", ")}}`);
    }

    if (!withinRange(fip.year1Local, p.expect.year1LocalRange)) {
      pass = false;
      notes.push(
        `Year 1 local ${fip.year1Local} ${fip.currency} outside expected ${p.expect.year1LocalRange.join("–")}`,
      );
    } else {
      notes.push(`Year 1 ${fip.year1Local.toLocaleString()} ${fip.currency}`);
    }

    if (ep.breakdown.length === 0) {
      pass = false;
      notes.push("EP breakdown is empty");
    }
    if (fip.breakdown.length === 0) {
      pass = false;
      notes.push("FIP breakdown is empty");
    }

    const mix = { live: 0, snapshot: 0, heuristic: 0 } as Record<string, number>;
    for (const b of [...ep.breakdown, ...fip.breakdown]) {
      if (b.dataKind) mix[b.dataKind]++;
    }
    notes.push(`Data mix — live: ${mix.live}, snapshot: ${mix.snapshot}, heuristic: ${mix.heuristic}`);
  } catch (err) {
    pass = false;
    notes.push(`Threw: ${(err as Error).message}`);
  }

  return { profile: p.name, pass, notes };
}

async function main() {
  console.log("Running calibration smoke-test…\n");
  const results = await Promise.all(PROFILES.map(checkProfile));

  let anyFailed = false;
  for (const r of results) {
    const icon = r.pass ? "PASS" : "FAIL";
    console.log(`[${icon}] ${r.profile}`);
    for (const n of r.notes) console.log(`       ${n}`);
    if (!r.pass) anyFailed = true;
  }

  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} profiles passed.`);
  process.exit(anyFailed ? 1 : 0);
}

main().catch((err) => {
  console.error("calibration-check crashed:", err);
  process.exit(1);
});
