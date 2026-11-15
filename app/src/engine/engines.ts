// LIVORBIT health engines. TypeScript port of herramientas/motores.py (validated in VALIDACION.md).
//   Engine A  personalDeviation + adaptiveBaseline : compare with the person's own normal, recalibrated in flight
//   Engine B  trend                                : linear trend, days until a threshold is crossed
//   Engine D  news2                                : NEWS2 early-warning score (Royal College of Physicians, 2017)
import type { Level } from "../data/mission";

export const LEVEL_RANK: Record<Level, number> = { NODATA: -1, NOMINAL: 0, CAUTION: 1, WARNING: 2 };
export const worst = (...levels: Level[]): Level =>
  levels.reduce<Level>((a, b) => (LEVEL_RANK[b] > LEVEL_RANK[a] ? b : a), "NODATA");

const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const stdev = (a: number[]) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
};

// ---------------------------------------------------------------- Engine A
export interface Deviation { z: number; changePct: number; level: Level }

/** z-score against the person's baseline. cvIntra = within-person coefficient of variation.
 *  The spread is widened by sqrt(1 + 1/n) because the baseline itself is estimated from few points. */
export function personalDeviation(value: number, base: number, cvIntra: number, nBase = 3, floorCv = 0.03): Deviation {
  const sd = Math.abs(base) * Math.max(cvIntra, floorCv) * Math.sqrt(1 + 1 / nBase);
  const z = sd ? (value - base) / sd : 0;
  const level: Level = Math.abs(z) >= 3 ? "WARNING" : Math.abs(z) >= 2 ? "CAUTION" : "NOMINAL";
  return { z: Math.round(z * 100) / 100, changePct: Math.round(((value - base) / base) * 1000) / 10, level };
}

export interface Baseline { mean: number; sd: number; n: number; adaptive: boolean }

/** Baseline that recalibrates in flight: the body changes in expected ways in space (e.g. blood pressure drops),
 *  so after a 14-day adaptation period we use the last 30 days, excluding the 3 most recent (so an emerging change
 *  is not absorbed). Before that, the pre-flight (Earth) baseline is used. */
export function adaptiveBaseline(days: number[], values: number[], today: number, adaptation = 14, window = 30, exclude = 3): Baseline {
  let sel: number[] = [];
  let adaptive = false;
  if (today >= adaptation) {
    sel = values.filter((_, i) => days[i] >= today - window - exclude && days[i] < today - exclude && days[i] >= adaptation / 2);
    adaptive = sel.length >= 5;
  }
  if (!adaptive) sel = values.filter((_, i) => days[i] < 0);
  return { mean: mean(sel), sd: stdev(sel), n: sel.length, adaptive };
}

// ---------------------------------------------------------------- Engine B
export interface Trend { slope: number; r2: number; daysToThreshold: number | null; current: number }

export function trend(days: number[], values: number[], threshold: number): Trend | null {
  if (days.length < 3) return null;
  const mx = mean(days), my = mean(values);
  const sxx = days.reduce((s, x) => s + (x - mx) ** 2, 0);
  if (!sxx) return null;
  const slope = days.reduce((s, x, i) => s + (x - mx) * (values[i] - my), 0) / sxx;
  const syy = values.reduce((s, y) => s + (y - my) ** 2, 0);
  const r2 = syy ? (slope ** 2 * sxx) / syy : 0;
  const current = my + slope * (days[days.length - 1] - mx);
  const d = slope ? (threshold - current) / slope : -1;
  return { slope, r2, current, daysToThreshold: d > 0 ? Math.round(d * 10) / 10 : null };
}

// ---------------------------------------------------------------- Engine D (NEWS2)
type Table = [number, number][];
const T_RR: Table = [[8, 3], [11, 1], [20, 0], [24, 2], [999, 3]];
const T_SPO2: Table = [[91, 3], [93, 2], [95, 1], [100, 0]];
const T_SBP: Table = [[90, 3], [100, 2], [110, 1], [219, 0], [999, 3]];
const T_HR: Table = [[40, 3], [50, 1], [90, 0], [110, 1], [130, 2], [999, 3]];
const T_TEMP: Table = [[35.0, 3], [36.0, 1], [38.0, 0], [39.0, 1], [99, 2]];
const pts = (v: number, t: Table) => (t.find(([max]) => v <= max) ?? t[t.length - 1])[1];

export interface News2 {
  total: number;
  parts: { respiration: number; spo2: number; oxygen: number; bloodPressure: number; heartRate: number; consciousness: number; temperature: number };
  level: Level;
  response: string;
}

export function news2(rr: number, spo2: number, sbp: number, hr: number, temp: number, onOxygen = false, alert = true): News2 {
  const parts = {
    respiration: pts(rr, T_RR), spo2: pts(spo2, T_SPO2), oxygen: onOxygen ? 2 : 0,
    bloodPressure: pts(sbp, T_SBP), heartRate: pts(hr, T_HR), consciousness: alert ? 0 : 3, temperature: pts(temp, T_TEMP),
  };
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  const single3 = Object.values(parts).some((p) => p === 3);
  let level: Level = "NOMINAL";
  let response = "Routine monitoring.";
  if (total >= 7) { level = "WARNING"; response = "Emergency response: start emergency protocol and notify the flight surgeon now."; }
  else if (total >= 5) { level = "CAUTION"; response = "Urgent review: repeat vitals hourly and notify the flight surgeon."; }
  else if (single3) { level = "CAUTION"; response = "One parameter is extreme: re-measure and review with the crew medical officer."; }
  else if (total >= 1) { response = "Low score: increase monitoring frequency."; }
  return { total, parts, level, response };
}

/** NEWS2 points for one parameter mapped to a level (3 = warning, 2 = caution). */
export const pointsLevel = (p: number): Level => (p >= 3 ? "WARNING" : p >= 2 ? "CAUTION" : "NOMINAL");
