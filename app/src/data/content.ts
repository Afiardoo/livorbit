// Medical content shown to the crew. Every item names the real ISS device (CHeCS Medical Hardware Catalog,
// NASA 2011) and the NASA Human Research Program source. Thresholds: NEWS2 for vitals, clinical ranges for labs,
// and team-defined thresholds where marked.
import type { Level } from "./mission";

export type SystemId = "heart" | "lungs" | "mind" | "metabolism" | "immune" | "bones" | "muscle" | "eyes";

export interface Indicator {
  id: string;
  name: string;
  unit: string;
  icon: string;
  device: string;
  how: string[];
  why: string;
  actions: { caution: string; warning: string };
  system: SystemId;
  min?: number; max?: number; step?: number;
  /** level from the absolute value (independent of the personal baseline) */
  level: (v: number) => Level;
  thresholdNote: string;
}

const lvl = (warnLo: number | null, cauLo: number | null, cauHi: number | null, warnHi: number | null) => (v: number): Level => {
  if ((warnLo !== null && v <= warnLo) || (warnHi !== null && v >= warnHi)) return "WARNING";
  if ((cauLo !== null && v <= cauLo) || (cauHi !== null && v >= cauHi)) return "CAUTION";
  return "NOMINAL";
};

export const INDICATORS: Indicator[] = [
  {
    id: "pas", name: "Blood pressure (systolic)", unit: "mmHg", icon: "blood-pressure", system: "heart",
    device: "Automatic Blood Pressure Cuff (ABPC) or BP/ECG monitor · range 20–280 mmHg, ±3 mmHg",
    how: ["Rest 5 minutes, strapped in a seated position.", "Wrap the cuff on the bare upper arm, 2 cm above the elbow, at heart level.", "Press start. Do not talk or move for 1 minute.", "Record systolic and diastolic values."],
    why: "In microgravity, fluids shift toward the head and blood volume drops. The heart and vessels adapt, which raises the risk of arrhythmias, clots and fainting on landing (NASA HRP, Risk of Cardiovascular Adaptations).",
    actions: {
      caution: "Re-measure in 15 minutes. Hydrate. Avoid strenuous exercise until the value stabilizes. Log symptoms (dizziness, headache, chest discomfort).",
      warning: "Stop all activity and secure the crewmember. Re-measure with the second device. If chest pain, confusion or fainting: open Emergency mode and notify the flight surgeon.",
    },
    min: 60, max: 220, step: 1, level: lvl(90, 100, 160, 220), thresholdNote: "NEWS2: ≤90 or ≥220 = 3 points; 91–100 = 2 points. ≥160 flagged by team.",
  },
  {
    id: "fc", name: "Heart rate", unit: "bpm", icon: "heart-rate", system: "heart",
    device: "Heart Rate Monitor 2 (chest strap + watch) or ABPC · 40–200 bpm, ±5 %",
    how: ["Measure at rest, before exercise or caffeine.", "Wear the chest strap or use the ABPC reading.", "Sit still for 1 minute and record the value."],
    why: "Heart rate reflects fluid shifts, stress, fever and fitness. A sustained rise above your own baseline can precede a cardiac event (NASA HRP cardiovascular evidence report).",
    actions: {
      caution: "Rest 10 minutes and re-measure. Check temperature and hydration. Note palpitations or chest discomfort.",
      warning: "Secure the crewmember, measure blood pressure and SpO₂, and prepare the AED. If symptomatic, open Emergency mode.",
    },
    min: 30, max: 200, step: 1, level: lvl(40, 50, 111, 131), thresholdNote: "NEWS2: ≤40 or ≥131 = 3 points; 111–130 = 2 points.",
  },
  {
    id: "spo2", name: "Blood oxygen (SpO₂)", unit: "%", icon: "spo2", system: "lungs",
    device: "Pulse oximeter (Advanced Life Support Pack)",
    how: ["Warm the hand and remove nail polish.", "Clip the oximeter on the index finger.", "Wait for a stable reading (about 30 seconds)."],
    why: "Low oxygen can come from cabin atmosphere problems (CO₂ build-up, O₂ drop), lung issues or a cardiac event (NASA HRP, Risk of Hypoxia; OCHMO habitable atmosphere brief).",
    actions: {
      caution: "Re-measure on another finger. Check cabin CO₂ and O₂ monitors. Breathe slowly for 2 minutes.",
      warning: "Give oxygen (Respiratory Support Pack / Variable Oxygen System). Check cabin atmosphere. Notify the flight surgeon.",
    },
    min: 70, max: 100, step: 1, level: lvl(91, 93, null, null), thresholdNote: "NEWS2 scale 1: ≤91 = 3 points; 92–93 = 2 points.",
  },
  {
    id: "fr", name: "Respiration rate", unit: "/min", icon: "respiration", system: "lungs",
    device: "Count breaths for 60 s, or a smart shirt (Bio-Monitor / Astroskin, CSA)",
    how: ["Sit still and breathe normally.", "Count chest rises for a full minute (or read the smart shirt)."],
    why: "Fast breathing is one of the earliest signs that someone is getting worse, often before blood pressure falls (NEWS2).",
    actions: { caution: "Re-count in 15 minutes and check SpO₂ and temperature.", warning: "Check airway and SpO₂, give oxygen if needed, notify the flight surgeon." },
    min: 4, max: 40, step: 1, level: lvl(8, null, 21, 25), thresholdNote: "NEWS2: ≤8 or ≥25 = 3 points; 21–24 = 2 points.",
  },
  {
    id: "temp", name: "Body temperature", unit: "°C", icon: "temperature", system: "immune",
    device: "Oral disposable thermometer (Ambulatory Medical Pack)",
    how: ["Do not eat or drink for 15 minutes before.", "Place the thermometer under the tongue and close the mouth.", "Read after the color dots stop changing (about 1 minute)."],
    why: "The immune system changes in spaceflight and latent viruses (such as herpes viruses) can reactivate. Fever is the first visible sign of infection (NASA HRP, Risk of Altered Immune Response).",
    actions: {
      caution: "Rest, hydrate, re-measure in 4 hours. Wear a mask near crewmates. Check lymphocytes at the next blood draw.",
      warning: "Isolate in your crew quarters if possible, notify the flight surgeon, and follow the ISS Medical Checklist for fever.",
    },
    min: 34, max: 42, step: 0.1, level: lvl(35.0, 36.0, 38.1, 39.1), thresholdNote: "NEWS2: ≤35.0 = 3 points; ≥39.1 = 2 points; 38.1–39.0 = 1 point (flagged as caution).",
  },
  {
    id: "glucosa", name: "Blood glucose", unit: "mg/dL", icon: "glucose", system: "metabolism",
    device: "Portable Clinical Blood Analyzer (PCBA) with EC8+ cartridge · 65 µL drop, 2 minutes · range 20–450 mg/dL",
    how: ["Run the Level 1 control solution first.", "Clean the fingertip, prick, and fill a capillary tube (65 µL).", "Load the EC8+ cartridge and insert it into the PCBA.", "Wait 120 s and record glucose (and the other values)."],
    why: "Spaceflight stress hormones and inactivity change how the body handles sugar. In real NASA data from Inspiration4, glucose rose in all 4 crewmembers after only 3 days in space (+24 % on average).",
    actions: {
      caution: "Repeat at the next scheduled draw. Review meals and exercise. If low: eat fast carbohydrates and re-test in 15 minutes.",
      warning: "If below 54 mg/dL: give fast sugar immediately, re-test in 15 minutes, notify the flight surgeon. If above 250 mg/dL: notify the flight surgeon.",
    },
    min: 20, max: 450, step: 1, level: lvl(54, 69, 181, 251), thresholdNote: "<70 low, <54 critically low; >180 high, >250 very high (clinical guidance).",
  },
  {
    id: "sueno_h", name: "Sleep", unit: "h", icon: "sleep", system: "mind",
    device: "Sleep log, or a wrist actigraph (NASA Standard Measures)",
    how: ["Right after waking, log the hours actually slept.", "Rate sleep quality from 1 to 5."],
    why: "Crews sleep about 6–7 hours in flight. Chronic sleep loss slows reactions and increases errors (NASA HRP, Risk from Inadequate Sleep).",
    actions: { caution: "Protect the next sleep period: dim lights, no screens 1 h before, keep the schedule.", warning: "Talk with the crew medical officer. Review workload with the ground team." },
    min: 0, max: 12, step: 0.1, level: (v) => (v < 4 ? "WARNING" : v < 5.5 ? "CAUTION" : "NOMINAL"), thresholdNote: "Team threshold for one night: <5.5 h caution, <4 h warning. Repeated short nights are caught by the personal-normal and trend engines.",
  },
  {
    id: "animo_1a5", name: "Mood", unit: "/5", icon: "mood", system: "mind",
    device: "Self-report (30-second check-in)",
    how: ["Pick the face that matches how you feel right now.", "Be honest: this is for you, not a performance review."],
    why: "Isolation, confinement and distance from Earth can lead to behavioral health problems (NASA HRP, Risk of Behavioral Conditions). Small daily changes are easier to fix than a crisis.",
    actions: { caution: "Schedule a private family call. Take a window break to look at Earth. Share a meal with the crew.", warning: "Talk to the crew medical officer and request a private conference with the ground psychologist." },
    min: 1, max: 5, step: 1, level: (v) => (v <= 1 ? "WARNING" : v <= 2 ? "CAUTION" : "NOMINAL"), thresholdNote: "Team threshold: 2 = caution, 1 = warning.",
  },
];

export const INDICATOR = Object.fromEntries(INDICATORS.map((i) => [i.id, i])) as Record<string, Indicator>;

export interface BodySystem {
  id: SystemId; svgId: string; name: string; icon: string;
  hazard: string; space: string; countermeasures: string[]; source: { label: string; url: string };
}

export const SYSTEMS: BodySystem[] = [
  { id: "heart", svgId: "sys-heart", name: "Cardiovascular", icon: "body-heart", hazard: "Gravity fields",
    space: "Fluids shift toward the head and plasma volume drops. The heart can become more spherical. Risks: arrhythmias, clots, low blood pressure and fainting on landing.",
    countermeasures: ["Daily aerobic exercise (treadmill or cycle)", "Hydration and salt loading before landing", "Lower-body compression garments"],
    source: { label: "NASA HRP · Risk of Cardiovascular Adaptations", url: "https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/" } },
  { id: "lungs", svgId: "sys-lungs", name: "Respiratory", icon: "body-lungs", hazard: "Hostile closed environment",
    space: "The cabin atmosphere is a machine: CO₂ can build up, oxygen can drop, and dust (on the Moon or Mars) can irritate the lungs.",
    countermeasures: ["Check cabin CO₂ and O₂ monitors", "Good ventilation in sleep quarters", "Oxygen available in the medical kit"],
    source: { label: "NASA HRP · Risk of Hypoxia", url: "https://www.nasa.gov/reference/risk-of-hypoxia/" } },
  { id: "mind", svgId: "sys-mind", name: "Mind & sleep", icon: "body-mind", hazard: "Isolation and confinement",
    space: "Months in a small space, far from family, with a demanding schedule. Mood and sleep slowly decline if nobody is watching.",
    countermeasures: ["Protect 8 hours for sleep", "Regular private calls with family", "Crew meals and leisure time", "Window time: look at Earth"],
    source: { label: "NASA HRP · Risk of Behavioral Conditions", url: "https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/" } },
  { id: "metabolism", svgId: "sys-metabolism", name: "Metabolism & kidneys", icon: "body-metabolism", hazard: "Gravity fields",
    space: "Stress and inactivity change blood sugar control. Bone calcium released into the urine raises the risk of kidney stones.",
    countermeasures: ["Balanced diet with controlled sodium", "Drink enough water to keep urine light", "Regular blood checks with the PCBA"],
    source: { label: "NASA HRP · Risk of Inadequate Food and Nutrition", url: "https://www.nasa.gov/reference/risk-of-inadequate-food-and-nutrition/" } },
  { id: "immune", svgId: "sys-immune", name: "Immune system", icon: "body-immune", hazard: "Space radiation · closed environment",
    space: "Immune cells change and latent viruses can reactivate. In real Inspiration4 data, lymphocytes dropped 27 % on average after only 3 days in space.",
    countermeasures: ["Hand hygiene and clean surfaces", "Sleep and nutrition", "Monitor temperature and lymphocytes"],
    source: { label: "NASA HRP · Risk of Altered Immune Response", url: "https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/" } },
  { id: "bones", svgId: "sys-bones", name: "Bones", icon: "body-bones", hazard: "Gravity fields",
    space: "Without gravity, bones lose about 1 to 1.5 % of hip density per month. With resistance exercise and diet, the loss drops to about 0.3 to 0.5 % per month.",
    countermeasures: ["Resistance exercise every day (ARED)", "Vitamin D and calcium", "Track your exercise minutes"],
    source: { label: "NASA HRP · Risk of Spaceflight-Induced Bone Changes", url: "https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/" } },
  { id: "muscle", svgId: "sys-muscle", name: "Muscles & fitness", icon: "body-muscle", hazard: "Gravity fields",
    space: "Postural muscles weaken quickly; calf strength can fall by about 24 %. Aerobic capacity also declines without training.",
    countermeasures: ["About 2 hours of exercise per day", "Mix resistance and aerobic training", "Fitness tests every month"],
    source: { label: "NASA HRP · Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness", url: "https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/" } },
  { id: "eyes", svgId: "sys-eyes", name: "Eyes (SANS)", icon: "body-eyes", hazard: "Gravity fields",
    space: "About 70 % of long-duration crewmembers show eye changes (optic disc swelling, globe flattening). Vision can blur slowly.",
    countermeasures: ["Monthly vision check with the eye chart", "Report any blurry vision", "Eye ultrasound guided from the ground"],
    source: { label: "NASA HRP · Risk of SANS", url: "https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/" } },
];

export const SYSTEM = Object.fromEntries(SYSTEMS.map((s) => [s.id, s])) as Record<SystemId, BodySystem>;

export const BLOOD_LABELS: Record<string, { name: string; system: SystemId; why: string }> = {
  glucosa: { name: "Glucose", system: "metabolism", why: "Blood sugar control (stress, inactivity)" },
  sodio: { name: "Sodium", system: "metabolism", why: "Hydration and fluid balance" },
  potasio: { name: "Potassium", system: "heart", why: "Heart rhythm stability" },
  hematocrito: { name: "Hematocrit", system: "heart", why: "Fluid loss raises it early in flight" },
  hemoglobina: { name: "Hemoglobin", system: "heart", why: "Oxygen transport ('space anemia')" },
  bun: { name: "Urea nitrogen", system: "metabolism", why: "Kidney function and hydration" },
  creatinina: { name: "Creatinine", system: "metabolism", why: "Kidney function" },
  leucocitos: { name: "White blood cells", system: "immune", why: "Overall immune defense" },
  linfocitos: { name: "Lymphocytes", system: "immune", why: "Immune cells that drop in spaceflight" },
};
