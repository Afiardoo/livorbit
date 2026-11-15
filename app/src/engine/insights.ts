// Turns engine reasons into short, plain-language headlines for the crew and the doctor.
import type { VitalRecord } from "../data/mission";
import type { Assessment, Reason } from "./assess";

export interface Insight { title: string; detail: string; level: Reason["level"]; metric: keyof VitalRecord | null; trend: boolean }

const RULES: [RegExp, string, keyof VitalRecord | null][] = [
  [/Chest pain/i, "Chest pain", "fc"],
  [/Not alert/i, "Not responding", null],
  [/Heart rate/i, "Heart rate above normal", "fc"],
  [/Systolic|pressure/i, "Blood pressure changing", "pas"],
  [/SpO/i, "Low blood oxygen", "spo2"],
  [/Respiration/i, "Breathing fast", "fr"],
  [/supplemental oxygen/i, "On oxygen", "spo2"],
  [/temperature/i, "Temperature out of range", "temp"],
  [/Sleep/i, "Sleeping less than usual", "sueno_h"],
  [/Mood/i, "Mood lower than usual", "animo_1a5"],
  [/Glucose/i, "Blood sugar out of range", null],
  [/Lymphocytes|White blood/i, "Immune cells low", null],
  [/bone/i, "Bone loss ahead of plan", null],
  [/Exercise/i, "Not enough exercise", "ejercicio_min"],
];

export function toInsight(r: Reason): Insight {
  const hit = RULES.find(([re]) => re.test(r.text));
  const trend = r.engine === "B";
  let title = hit ? hit[1] : r.text;
  if (trend && hit) title = `${hit[1].replace(/ than usual| above normal| changing| out of range/, "")} trending toward its limit`;
  if (/Body temperature 3[89]/.test(r.text) || /Temperature 3[89]/.test(r.text)) title = "Fever";
  return { title, detail: r.text, level: r.level, metric: hit ? hit[2] : null, trend };
}

/** Up to `max` insights, most severe first, without duplicate titles. */
export function topInsights(a: Assessment, max = 3): Insight[] {
  const seen = new Set<string>();
  const out: Insight[] = [];
  const sorted = [...a.alerts].sort((x, y) => (y.level === "WARNING" ? 1 : 0) - (x.level === "WARNING" ? 1 : 0));
  for (const r of sorted) {
    const i = toInsight(r);
    if (seen.has(i.title)) continue;
    seen.add(i.title);
    out.push(i);
    if (out.length >= max) break;
  }
  return out;
}

export function summary(a: Assessment): string {
  const top = topInsights(a, 2);
  if (a.overall === "WARNING" && a.news2.level === "WARNING") return "Emergency criteria met. Start the emergency guide.";
  if (!top.length) return "All systems within this astronaut's normal.";
  return top.map((t) => t.title).join(" · ");
}
