import type { CSSProperties, ReactNode } from "react";
import type { Level } from "../data/mission";

const BASE = import.meta.env.BASE_URL;
export const asset = (path: string) => `${BASE}${path}`;

export const LEVEL_COLOR: Record<Level, string> = {
  NOMINAL: "var(--color-nominal)", CAUTION: "var(--color-caution)", WARNING: "var(--color-warning)", NODATA: "var(--color-muted)",
};
export const LEVEL_ICON: Record<Level, string> = {
  NOMINAL: "status-nominal", CAUTION: "status-caution", WARNING: "status-warning", NODATA: "info",
};
export const LEVEL_TEXT: Record<Level, string> = { NOMINAL: "NOMINAL", CAUTION: "CAUTION", WARNING: "WARNING", NODATA: "NO DATA" };

export function Icon({ name, size = 20, className = "", style, label }: { name: string; size?: number; className?: string; style?: CSSProperties; label?: string }) {
  return (
    <span
      className={`icon ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ ["--icon" as string]: `url(${asset(`icons/${name}.svg`)})`, width: size, height: size, ...style }}
    />
  );
}

/** Status is never conveyed by color alone: icon shape + text label + color. */
export function Status({ level, size = "md", text }: { level: Level; size?: "sm" | "md" | "lg"; text?: string }) {
  const pad = size === "lg" ? "px-3 py-1.5 text-sm" : size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-mono font-medium tracking-wider ${pad}`}
      style={{ color: LEVEL_COLOR[level], background: `color-mix(in srgb, ${LEVEL_COLOR[level]} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${LEVEL_COLOR[level]} 40%, transparent)` }}>
      <Icon name={LEVEL_ICON[level]} size={size === "lg" ? 16 : 13} />
      {text ?? LEVEL_TEXT[level]}
    </span>
  );
}

export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <section className={`card p-4 sm:p-5 ${className}`} style={style}>{children}</section>;
}

export function SectionTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-5">
      {eyebrow && <div className="label mb-1.5">{eyebrow}</div>}
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
      {children && <p className="mt-2 max-w-3xl text-muted leading-relaxed">{children}</p>}
    </header>
  );
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "life" | "lavender" }) {
  const color = tone === "life" ? "var(--color-life)" : tone === "lavender" ? "var(--color-lavender)" : "var(--color-muted)";
  return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
    style={{ color, border: `1px solid color-mix(in srgb, ${color} 45%, transparent)` }}>{children}</span>;
}

export function SyntheticBadge() {
  return <Pill tone="lavender"><Icon name="data-synthetic" size={11} /> Simulated data</Pill>;
}
export function RealBadge() {
  return <Pill tone="life"><Icon name="data-real" size={11} /> Real NASA data</Pill>;
}

export function formatDelay(s: number): string {
  if (s < 1) return "< 1 s";
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60), r = s % 60;
  return r ? `${m} min ${r} s` : `${m} min`;
}

export function dayLabel(day: number): string {
  return day < 0 ? `L${day}` : `Day ${day}`;
}
