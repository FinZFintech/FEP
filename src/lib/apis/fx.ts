import { getCached } from "./cache";

// Frankfurter is the ECB-backed FX feed: free, no key, daily rates.
// We fetch EUR-base rates once per call and derive INR cross rates
// from EUR/INR and EUR/<currency>. INR is stable on Frankfurter.
const FRANKFURTER_URL = "https://api.frankfurter.app/latest?from=EUR";

const FALLBACK_RATES: Record<string, number> = {
  USD: parseFloat(process.env.INR_PER_USD ?? "83.5"),
  GBP: parseFloat(process.env.INR_PER_GBP ?? "106.0"),
  CAD: parseFloat(process.env.INR_PER_CAD ?? "61.5"),
  AUD: parseFloat(process.env.INR_PER_AUD ?? "54.0"),
  EUR: parseFloat(process.env.INR_PER_EUR ?? "90.0"),
  NZD: parseFloat(process.env.INR_PER_NZD ?? "50.0"),
  SGD: parseFloat(process.env.INR_PER_SGD ?? "62.0"),
  SEK: parseFloat(process.env.INR_PER_SEK ?? "7.8"),
  INR: 1,
};

export interface ExchangeRateResult {
  currency: string;
  inrPerUnit: number;
  source: string;
  dataKind: "live" | "snapshot" | "heuristic";
  vintage?: string;
  fetchedAt?: string;
}

interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

async function fetchFrankfurterRates(): Promise<FrankfurterResponse | null> {
  return getCached("fx:frankfurter:eur", async () => {
    const res = await fetch(FRANKFURTER_URL, {
      next: { revalidate: 21600 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as FrankfurterResponse;
    if (!json.rates?.INR) return null;
    return json;
  }, 21600 * 1000);
}

export async function getExchangeRate(currency: string): Promise<ExchangeRateResult> {
  if (currency === "INR") {
    return {
      currency,
      inrPerUnit: 1,
      source: "Identity",
      dataKind: "snapshot",
    };
  }

  try {
    const rates = await fetchFrankfurterRates();
    if (rates) {
      const eurInr = rates.rates["INR"];
      if (currency === "EUR") {
        return {
          currency,
          inrPerUnit: eurInr,
          source: `Frankfurter / ECB reference rate (${rates.date})`,
          dataKind: "live",
          vintage: rates.date,
          fetchedAt: new Date().toISOString(),
        };
      }
      const eurPerCur = rates.rates[currency];
      if (eurPerCur && eurPerCur > 0) {
        return {
          currency,
          inrPerUnit: eurInr / eurPerCur,
          source: `Frankfurter / ECB reference rate (${rates.date}, via EUR cross)`,
          dataKind: "live",
          vintage: rates.date,
          fetchedAt: new Date().toISOString(),
        };
      }
    }
  } catch {
    /* fall through to env-var fallback */
  }

  return {
    currency,
    inrPerUnit: FALLBACK_RATES[currency] ?? FALLBACK_RATES.USD,
    source: "Static fallback from INR_PER_* env vars (live feed unavailable)",
    dataKind: "heuristic",
  };
}
