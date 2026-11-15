import { useEffect, useState, type ReactNode } from "react";
import { useApp, type View } from "../state";
import { FIRST_DAY, LAST_DAY, MISSION, phaseAt, vitalsAt } from "../data/mission";
import { asset, dayLabel, formatDelay, Icon } from "../lib/ui";

const MAIN: { id: View; label: string; icon: string; warn?: boolean }[] = [
  { id: "crew", label: "Crew", icon: "crew-roles" },
  { id: "astronaut", label: "Health", icon: "body-heart" },
  { id: "checkin", label: "Daily log", icon: "checklist" },
  { id: "emergency", label: "Emergency", icon: "emergency", warn: true },
];
const MORE: { id: View; label: string; icon: string }[] = [
  { id: "twin", label: "Mission twin", icon: "time-machine" },
  { id: "data", label: "NASA data", icon: "data-real" },
  { id: "about", label: "How it works", icon: "info" },
];

export function Shell({ children }: { children: ReactNode }) {
  const { view, setView } = useApp();
  const item = (n: { id: View; label: string; icon: string; warn?: boolean }, small = false) => {
    const on = view === n.id;
    return (
      <button key={n.id} onClick={() => setView(n.id)} aria-current={on ? "page" : undefined}
        className={`flex w-full items-center gap-3 rounded-xl px-3 text-left font-semibold transition-colors ${small ? "py-2 text-[13px]" : "py-2.5 text-sm"} ${on ? "bg-surface text-moon" : "text-muted hover:text-moon"}`}>
        <Icon name={n.icon} size={small ? 16 : 19} style={{ color: n.warn ? "var(--color-warning)" : on ? "var(--color-life)" : undefined }} />
        {n.label}
      </button>
    );
  };
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border/60 px-4 py-6 lg:flex">
        <button onClick={() => setView("crew")} className="mb-10 px-2" aria-label="livorbit home">
          <img src={asset("logo/livorbit-lockup-dark.svg")} alt="livorbit" className="h-8 w-auto" />
        </button>
        <nav className="flex flex-col gap-1" aria-label="Main">{MAIN.map((n) => item(n))}</nav>
        <div className="label mb-2 mt-8 px-3">Behind the science</div>
        <nav className="flex flex-col" aria-label="More">{MORE.map((n) => item(n, true))}</nav>
        <p className="mt-auto px-3 text-[11px] leading-relaxed text-muted">Simulated mission data. Supports, never replaces, the flight surgeon.</p>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-10">
        <MissionClock />
        <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-ink-2/95 px-2 py-1.5 backdrop-blur lg:hidden" aria-label="Main">
        {[...MAIN, { id: "about" as View, label: "More", icon: "info" }].map((n) => (
          <button key={n.id} onClick={() => setView(n.id)} aria-current={view === n.id ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] font-semibold ${view === n.id ? "text-moon" : "text-muted"}`}>
            <Icon name={n.icon} size={21} style={{ color: "warn" in n && n.warn ? "var(--color-warning)" : view === n.id ? "var(--color-life)" : undefined }} />
            {n.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

const MARKS = MISSION.eventos.filter((e) => e.tipo !== "low_exercise").map((e) => ({ day: e.dia_evento, label: e.titulo }));

function MissionClock() {
  const { day, setDay } = useApp();
  const [playing, setPlaying] = useState(false);
  const phase = phaseAt(day);
  const delay = vitalsAt("AST-1", day)?.retraso_com_s ?? 0;
  const place = day < 0 ? "On Earth" : phase.id === "transit" ? "En route to Mars" : "On Mars";
  const pct = (d: number) => ((d - FIRST_DAY) / (LAST_DAY - FIRST_DAY)) * 100;

  useEffect(() => {
    if (!playing) return;
    if (day >= LAST_DAY) { setPlaying(false); return; }
    const t = window.setTimeout(() => setDay(day + 1), 220);
    return () => window.clearTimeout(t);
  }, [playing, day, setDay]);

  return (
    <div className="z-20 border-b border-border/60 bg-ink/85 backdrop-blur lg:sticky lg:top-0">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5 sm:px-6 lg:px-10">
        <img src={asset("logo/livorbit-symbol.svg")} alt="" className="h-7 w-7 lg:hidden" />
        <div className="flex items-baseline gap-2.5">
          <span className="num text-2xl font-medium text-life">{dayLabel(day)}</span>
          <span className="text-sm text-muted">{place}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted" title="One-way signal delay to Mission Control">
          <Icon name="comm-delay" size={15} style={{ color: "var(--color-lavender)" }} />
          Earth <span className="num text-lavender">{formatDelay(delay)}</span>
        </div>
        <div className="flex min-w-[260px] flex-1 items-center gap-3">
          <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause mission" : "Play mission"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-life text-[11px] text-ink">{playing ? "❚❚" : "▶"}</button>
          <div className="relative flex-1">
            <input type="range" min={FIRST_DAY} max={LAST_DAY} value={day} onChange={(e) => setDay(Number(e.target.value))} className="w-full" aria-label="Mission day" />
            <div className="pointer-events-none absolute inset-x-0 -bottom-2 h-2">
              <span className="absolute h-2 w-px bg-muted/60" style={{ left: `${pct(0)}%` }} />
              {MARKS.map((m) => (
                <button key={m.day + m.label} title={`${dayLabel(m.day)} · ${m.label}`} aria-label={`Go to ${dayLabel(m.day)}: ${m.label}`}
                  onClick={() => setDay(m.day)} className="pointer-events-auto absolute -top-0.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-ink"
                  style={{ left: `${pct(m.day)}%`, background: m.day === day ? "var(--color-life)" : "var(--color-lavender)" }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
