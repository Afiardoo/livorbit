// Turns raw measurements into what the crew sees: a status per body system, an overall status and alerts.
import { CV_INTRA, FIRST_DAY, bloodSeries, bloodVariables, latestBlood, MISSION, spaceWeatherAt, type Level, type VitalRecord } from "../data/mission";
import { INDICATOR, BLOOD_LABELS, SYSTEMS, type SystemId } from "../data/content";
import { adaptiveBaseline, news2, personalDeviation, pointsLevel, trend, worst, type News2 } from "./engines";

export type Overrides = Record<string, Record<number, Partial<VitalRecord>>>;

export interface Reason { level: Level; text: string; engine: "A" | "B" | "C" | "D" | "I" | "range"; system?: SystemId; notify?: "earth" | "onboard" }
export interface SystemStatus { level: Level; reasons: Reason[] }
export interface Assessment {
  day: number;
  vitals: VitalRecord;
  news2: News2;
  systems: Record<SystemId, SystemStatus>;
  overall: Level;
  alerts: Reason[];
  manual: boolean;
  /** Readings discarded because the sensor, not the body, is the problem. */
  sensor: string[];
}

/** Synthetic series for one astronaut, with any check-in values the user entered merged on top. */
export function rawSeries(id: string, overrides: Overrides): VitalRecord[] {
  const base = MISSION.vitales.filter((v) => v.astronauta === id);
  const o = overrides[id];
  if (!o) return base;
  return base.map((v) => (o[v.dia] ? { ...v, ...o[v.dia], calidad: "ok" as const } : v));
}

/** Signal quality first: a detached electrode, motion or two thermometers that disagree are sensor problems,
 *  not clinical alarms. For the engines, the bad reading is replaced by the last valid one. */
export const SENSOR_FIELD: Record<string, keyof VitalRecord> = { electrode_off: "fc", motion: "fc", temp_mismatch: "temp" };
export const SENSOR_TEXT: Record<string, string> = {
  electrode_off: "ECG electrode detached: heart rate reads 0. Re-attach the electrode; this is not a clinical alarm.",
  motion: "Heart rate recorded while moving (motion artifact). Re-measure at rest.",
  temp_mismatch: "The two thermometers disagree by more than 1 °C. Check sensor contact before trusting the value.",
};
const cache = new Map<string, VitalRecord[]>();
export function series(id: string, overrides: Overrides): VitalRecord[] {
  const key = `${id}:${JSON.stringify(overrides[id] ?? {})}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const raw = rawSeries(id, overrides);
  const clean = raw.map((r) => ({ ...r }));
  clean.forEach((r, i) => {
    if (r.calidad !== "ok" && i > 0) { const f = SENSOR_FIELD[r.calidad]; (r as unknown as Record<string, number>)[f] = clean[i - 1][f] as number; }
  });
  cache.set(key, clean);
  return clean;
}

const VITAL_WINDOWS: { id: keyof VitalRecord; w: number; onlyDown?: boolean }[] = [
  { id: "fc", w: 3 }, { id: "pas", w: 3 }, { id: "temp", w: 3 }, { id: "sueno_h", w: 7, onlyDown: true }, { id: "animo_1a5", w: 7, onlyDown: true },
];
const TREND_RULES: { id: keyof VitalRecord; dir: 1 | -1; threshold: number; window: number; smooth: number; label: string }[] = [
  { id: "fc", dir: 1, threshold: 100, window: 7, smooth: 1, label: "heart rate above 100 bpm" },
  { id: "pas", dir: 1, threshold: 140, window: 7, smooth: 1, label: "systolic pressure above 140 mmHg" },
  { id: "sueno_h", dir: -1, threshold: 5.5, window: 14, smooth: 7, label: "sleep below 5.5 h" },
  { id: "animo_1a5", dir: -1, threshold: 2.5, window: 14, smooth: 7, label: "mood below 2.5 / 5" },
];

export function assess(id: string, day: number, overrides: Overrides = {}, shallow = false): Assessment {
  const s = series(id, overrides);
  const idx = day - FIRST_DAY;
  const v = s[idx];
  const raw = rawSeries(id, overrides)[idx];
  const sensor = raw.calidad !== "ok" ? [SENSOR_TEXT[raw.calidad]] : [];
  const systems = Object.fromEntries(SYSTEMS.map((x) => [x.id, { level: "NOMINAL" as Level, reasons: [] as Reason[] }])) as Record<SystemId, SystemStatus>;
  const add = (sys: SystemId, r: Reason) => { r.system = sys; systems[sys].reasons.push(r); systems[sys].level = worst(systems[sys].level, r.level); };

  // ---- Engine D: NEWS2 on today's vitals
  const n = news2(v.fr, v.spo2, v.pas, v.fc, v.temp, v.oxigeno, v.consciente);
  const p = n.parts;
  if (p.heartRate >= 2) add("heart", { level: pointsLevel(p.heartRate), text: `Heart rate ${v.fc} bpm (NEWS2 +${p.heartRate})`, engine: "D" });
  if (p.bloodPressure >= 2) add("heart", { level: pointsLevel(p.bloodPressure), text: `Systolic pressure ${v.pas} mmHg (NEWS2 +${p.bloodPressure})`, engine: "D" });
  if (p.spo2 >= 2) add("lungs", { level: pointsLevel(p.spo2), text: `SpO₂ ${v.spo2} % (NEWS2 +${p.spo2})`, engine: "D" });
  if (p.respiration >= 2) add("lungs", { level: pointsLevel(p.respiration), text: `Respiration ${v.fr}/min (NEWS2 +${p.respiration})`, engine: "D" });
  if (p.oxygen) add("lungs", { level: "CAUTION", text: "On supplemental oxygen", engine: "D" });
  if (!v.consciente) add("mind", { level: "WARNING", text: "Not alert / unresponsive", engine: "D" });
  if (v.dolor_toracico) add("heart", { level: "WARNING", text: "Chest pain reported", engine: "range" });

  // ---- absolute thresholds for each indicator
  for (const ind of ["temp", "sueno_h", "animo_1a5"]) {
    const val = v[ind as keyof VitalRecord] as number;
    const l = INDICATOR[ind].level(val);
    if (l !== "NOMINAL") add(INDICATOR[ind].system, { level: l, text: `${INDICATOR[ind].name} ${val} ${INDICATOR[ind].unit}`, engine: "range" });
  }

  // ---- Engine A: personal deviation against the adaptive baseline (in-flight only)
  if (day >= 0) {
    const days = s.map((r) => r.dia);
    for (const { id: key, w, onlyDown } of VITAL_WINDOWS) {
      if (idx < w - 1) continue;
      const values = s.map((r) => r[key] as number);
      const b = adaptiveBaseline(days, values, day);
      const cv = b.sd / b.mean / Math.sqrt(w);
      const m = values.slice(idx - w + 1, idx + 1).reduce((a, x) => a + x, 0) / w;
      const d = personalDeviation(m, b.mean, cv, b.n, 0);
      if (d.level === "WARNING" && !(onlyDown && d.z > 0)) {
        const ind = INDICATOR[key as string];
        add(ind.system, { level: "CAUTION", engine: "A",
          text: `${ind.name}: ${w}-day mean ${m.toFixed(1)} vs your ${b.adaptive ? "in-flight" : "pre-flight"} normal ${b.mean.toFixed(1)} (${d.changePct > 0 ? "+" : ""}${d.changePct} %)` });
      }
    }
    // ---- Engine B: trends
    for (const t of TREND_RULES) {
      if (idx < t.window) continue;
      const sm = s.map((_, j) => { const a = s.slice(Math.max(0, j - t.smooth + 1), j + 1); return a.reduce((x, r) => x + (r[t.id] as number), 0) / a.length; });
      const tr = trend(days.slice(idx - t.window + 1, idx + 1), sm.slice(idx - t.window + 1, idx + 1), t.threshold);
      if (tr && tr.r2 >= 0.6 && Math.sign(tr.slope) === t.dir && tr.daysToThreshold !== null && tr.daysToThreshold <= 7) {
        const ind = INDICATOR[t.id as string];
        add(ind.system, { level: "CAUTION", engine: "B", text: `Trend: ${t.label} in about ${Math.max(1, Math.round(tr.daysToThreshold))} days if nothing changes` });
      }
    }
  }

  // ---- Blood (PCBA / HemoCue): personal baseline (6 pre-flight draws) + absolute range
  for (const variable of bloodVariables(id)) {
    const last = latestBlood(id, variable, day);
    if (!last || day - last.dia > 14) continue;
    const info = MISSION.variables_sangre[variable];
    const label = BLOOD_LABELS[variable];
    if (!label || !info) continue;
    const pre = bloodSeries(id, variable).filter((r) => r.dia < 0).map((r) => r.valor);
    if (pre.length >= 3 && last.dia >= 0) {
      const d = personalDeviation(last.valor, pre.reduce((a, x) => a + x, 0) / pre.length, CV_INTRA[variable] ?? 0.05, pre.length);
      if (d.level === "WARNING")
        add(label.system, { level: "CAUTION", engine: "A", text: `${label.name} ${fmt(last.valor)} ${info.unidad} on day ${last.dia}: ${d.changePct > 0 ? "+" : ""}${d.changePct} % vs your pre-flight normal` });
    }
    const [lo, hi] = info.rango;
    if (variable === "glucosa") {
      const l = INDICATOR.glucosa.level(last.valor);
      if (l !== "NOMINAL") add("metabolism", { level: l, engine: "range", text: `Glucose ${fmt(last.valor)} mg/dL (day ${last.dia})` });
    } else if ((lo !== null && last.valor < lo * 0.95) || (hi !== null && last.valor > hi * 1.05)) {
      // Only values clearly outside the range (>5 % beyond the limit): single borderline lab values are common noise.
      add(label.system, { level: "CAUTION", engine: "range", text: `${label.name} ${fmt(last.valor)} ${info.unidad} clearly outside the reference range (${lo}–${hi})` });
    }
  }

  // ---- Engine C: modeled bone and exercise
  const bone = v.hueso_pct_modelado - 100;
  if (bone <= -6) add("bones", { level: "WARNING", engine: "C", text: `Modeled hip bone density ${bone.toFixed(1)} % vs pre-flight` });
  else if (bone <= -3) add("bones", { level: "CAUTION", engine: "C", text: `Modeled hip bone density ${bone.toFixed(1)} % vs pre-flight` });
  if (day >= 7) {
    const week = s.slice(idx - 6, idx + 1).reduce((a, r) => a + r.ejercicio_min, 0) / 7;
    if (week < 30) add("muscle", { level: "WARNING", engine: "C", text: `Exercise ${week.toFixed(0)} min/day this week (target 120)` });
    else if (week < 60) add("muscle", { level: "CAUTION", engine: "C", text: `Exercise ${week.toFixed(0)} min/day this week (target 120)` });
  }

  // ---- Immune risk index (preventive): several small stressors together, before any symptom.
  if (day >= 7) {
    const wk = s.slice(idx - 6, idx + 1);
    const factors: string[] = [];
    if (wk.reduce((a, r) => a + r.sueno_h, 0) / 7 < 6) factors.push("short sleep");
    if (wk.reduce((a, r) => a + r.animo_1a5, 0) / 7 <= 3.2) factors.push("low mood / stress");
    if (spaceWeatherAt(day).recentSep) factors.push("recent solar particle event");
    const ly = latestBlood(id, "linfocitos", day);
    const lyPre = bloodSeries(id, "linfocitos").filter((r) => r.dia < 0).map((r) => r.valor);
    if (ly && ly.dia >= 0 && lyPre.length && ly.valor < 0.85 * (lyPre.reduce((a, x) => a + x, 0) / lyPre.length)) factors.push("lymphocytes below your normal");
    if (factors.length >= 3) add("immune", { level: "CAUTION", engine: "I", text: `Immune risk elevated: ${factors.join(" + ")}. Prioritize sleep, hygiene and rest before symptoms appear.` });
  }

  systems.eyes.level = "NODATA";
  systems.eyes.reasons.push({ level: "NODATA", engine: "range", text: "No eye measurement in this dataset. Monthly vision check recommended." });

  const overall = worst(n.level, ...Object.values(systems).map((x) => x.level));
  const alerts = Object.values(systems).flatMap((x) => x.reasons).filter((r) => r.level === "CAUTION" || r.level === "WARNING")
    .sort((a, b) => (b.level === "WARNING" ? 1 : 0) - (a.level === "WARNING" ? 1 : 0));

  // ---- Escalation rule: WARNING -> notify Earth now. CAUTION -> handle on board, unless the same body system
  //      has stayed at CAUTION or worse for 3 days in a row (persistence), then notify Earth.
  if (!shallow) {
    const prev = [1, 2].map((k) => (day - k >= FIRST_DAY ? assess(id, day - k, overrides, true) : null));
    for (const r of alerts) {
      const persistent = r.system && prev.every((p) => p && (p.systems[r.system!].level === "CAUTION" || p.systems[r.system!].level === "WARNING"));
      r.notify = r.level === "WARNING" || persistent ? "earth" : "onboard";
    }
  }
  return { day, vitals: v, news2: n, systems, overall, alerts, manual: Boolean(overrides[id]?.[day]), sensor };
}

export const fmt = (x: number) => (Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 10 ? x.toFixed(1) : x.toFixed(2));

/** First day each astronaut reached a given level (used for the mission timeline markers). */
export function statusTimeline(id: string, overrides: Overrides): Level[] {
  const out: Level[] = [];
  for (let d = FIRST_DAY; d <= MISSION.vitales.filter((v) => v.astronauta === id).slice(-1)[0].dia; d++) out.push(assess(id, d, overrides).overall);
  return out;
}
