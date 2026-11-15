// Typed access to the synthetic mission and the real NASA OSDR data.
import missionRaw from "./mision_marte.json";
import i4Raw from "./inspiration4.json";
import cvRaw from "./variabilidad_intrapersonal.json";

export type Level = "NOMINAL" | "CAUTION" | "WARNING" | "NODATA";

export interface VitalRecord {
  astronauta: string;
  dia: number;
  fase: "preflight" | "transit" | "surface";
  fc: number; pas: number; pad: number; fr: number; spo2: number; temp: number;
  sueno_h: number; animo_1a5: number; ejercicio_min: number;
  hueso_pct_modelado: number; radiacion_acumulada_mSv: number;
  consciente: boolean; dolor_toracico: boolean; oxigeno: boolean;
  retraso_com_s: number; sintetico: boolean;
}
export interface BloodRecord {
  astronauta: string; dia: number; variable: string; valor: number; unidad: string; dispositivo: string; sintetico: boolean;
}
export interface Astronaut {
  id: string; rol: string; semilla_real: string; adherencia_ejercicio: number;
  vitales_base: Record<string, number>; animo_base: number;
}
export interface MissionEvent { astronauta: string; dia_inicio: number; dia_evento: number; tipo: string; titulo: string; descripcion: string }
export interface Assumption { tema: string; valor: string; fuente: string; tipo: string }
export interface Phase { id: string; desde: number; hasta: number; entorno: string; gravedad_g: number; radiacion_mSv_dia: number }

interface MissionFile {
  aviso: string;
  mision: { nombre: string; fases: Phase[]; limite_radiacion_carrera_mSv: number };
  astronautas: Astronaut[];
  variables_sangre: Record<string, { nombre: string; unidad: string; rango: [number | null, number | null] }>;
  eventos: MissionEvent[];
  supuestos: Assumption[];
  vitales: VitalRecord[];
  sangre: BloodRecord[];
}

export const MISSION = missionRaw as unknown as MissionFile;
export const CV_INTRA = (cvRaw as { cv_intra: Record<string, number> }).cv_intra;

export interface I4File {
  fuente: string;
  variables: Record<string, { nombre: string; unidad: string; rango: [number | null, number | null]; panel: string }>;
  tripulantes: Record<string, Record<string, { t: string; dia: number; valor: number }[]>>;
}
export const I4 = i4Raw as unknown as I4File;

export const FIRST_DAY = -60;
export const LAST_DAY = 209;
export const CREW = MISSION.astronautas;

// Index vitals and blood by astronaut for fast lookup.
const vitalsBy: Record<string, VitalRecord[]> = {};
for (const v of MISSION.vitales) (vitalsBy[v.astronauta] ??= []).push(v);
Object.values(vitalsBy).forEach((a) => a.sort((x, y) => x.dia - y.dia));

const bloodBy: Record<string, Record<string, BloodRecord[]>> = {};
for (const b of MISSION.sangre) ((bloodBy[b.astronauta] ??= {})[b.variable] ??= []).push(b);
Object.values(bloodBy).forEach((m) => Object.values(m).forEach((a) => a.sort((x, y) => x.dia - y.dia)));

export function vitalsSeries(id: string): VitalRecord[] { return vitalsBy[id] ?? []; }
export function vitalsAt(id: string, day: number): VitalRecord | undefined {
  const s = vitalsBy[id]; if (!s) return undefined;
  return s[day - FIRST_DAY];
}
export function bloodSeries(id: string, variable: string): BloodRecord[] { return bloodBy[id]?.[variable] ?? []; }
export function bloodVariables(id: string): string[] { return Object.keys(bloodBy[id] ?? {}); }
export function latestBlood(id: string, variable: string, day: number): BloodRecord | undefined {
  const s = bloodSeries(id, variable); let last: BloodRecord | undefined;
  for (const r of s) { if (r.dia <= day) last = r; else break; }
  return last;
}
export function phaseAt(day: number): Phase {
  return MISSION.mision.fases.find((f) => day >= f.desde && day <= f.hasta) ?? MISSION.mision.fases[0];
}
export function eventsFor(id: string): MissionEvent[] {
  return MISSION.eventos.filter((e) => e.astronauta === id || e.astronauta === "ALL");
}
