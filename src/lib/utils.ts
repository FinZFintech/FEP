import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatInr(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)} L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function getRiskBandColor(band: string): string {
  switch (band) {
    case "Low": return "text-green-700 bg-green-50 border-green-200";
    case "Medium": return "text-yellow-700 bg-yellow-50 border-yellow-200";
    case "High": return "text-orange-700 bg-orange-50 border-orange-200";
    case "Very High": return "text-red-700 bg-red-50 border-red-200";
    default: return "text-slate-700 bg-slate-50 border-slate-200";
  }
}
