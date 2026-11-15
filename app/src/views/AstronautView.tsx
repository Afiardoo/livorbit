import { useCallback, useMemo, useState } from "react";
import { useApp } from "../state";
import { CREW, CV_INTRA, MISSION, bloodSeries, latestBlood, type VitalRecord } from "../data/mission";
import { assess, fmt, series } from "../engine/assess";
import { personalDeviation } from "../engine/engines";
import { summary, topInsights } from "../engine/insights";
import { BLOOD_LABELS, INDICATOR, SYSTEM, type SystemId } from "../data/content";
import { BodyMap } from "../components/BodyMap";
import { ChartLegend, TrendChart } from "../components/TrendChart";
import { Card, dayLabel, Icon, LEVEL_COLOR, Status } from "../lib/ui";

export function CrewPicker() {
  const { astronaut, setAstronaut, day, overrides } = useApp();
  return (
    <div className="flex gap-1 rounded-2xl bg-surface/60 p-1" role="tablist" aria-label="Crewmember">
      {CREW.map((a) => {
        const lvl = assess(a.id, day, overrides).overall;
        const on = a.id === astronaut;
        return (
          <button key={a.id} role="tab" aria-selected={on} onClick={() => setAstronaut(a.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${on ? "bg-surface-2 text-moon" : "text-muted hover:text-moon"}`}>
            <span className="h-2 w-2 rounded-full" style={{ background: LEVEL_COLOR[lvl] }} />{a.id}
          </button>
        );
      })}
    </div>
  );
}

const METRICS: { key: keyof VitalRecord; label: string; icon: string }[] = [
  { key: "fc", label: "Heart rate", icon: "heart-rate" },
  { key: "pas", label: "Blood pressure", icon: "blood-pressure" },
  { key: "spo2", label: "Oxygen", icon: "spo2" },
  { key: "temp", label: "Temperature", icon: "temperature" },
  { key: "sueno_h", label: "Sleep", icon: "sleep" },
  { key: "animo_1a5", label: "Mood", icon: "mood" },
];

export function AstronautView() {
  const { astronaut, day, overrides, open } = useApp();
  const r = useMemo(() => assess(astronaut, day, overrides), [astronaut, day, overrides]);
  const data = useMemo(() => series(astronaut, overrides), [astronaut, overrides]);
  const insights = topInsights(r, 3);
  const [sys, setSys] = useState<SystemId | null>(null);
  const [metric, setMetric] = useState<keyof VitalRecord>("fc");
  const onSelect = useCallback((id: SystemId) => setSys((s) => (s === id ? null : id)), []);
  const a = CREW.find((x) => x.id === astronaut)!;
  const s = sys ? SYSTEM[sys] : null;
  const st = sys ? r.systems[sys] : null;
  const value = r.vitals[metric] as number;
  const ind = INDICATOR[metric as string];

  return (
    <div className="space-y-6">
      <CrewPicker />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label mb-1">{a.rol} · {dayLabel(day)}</div>
          <h1 className="text-3xl font-bold sm:text-4xl">{a.id}</h1>
          <p className="mt-2 text-lg text-moon/80">{summary(r)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border px-3 py-1.5 font-mono text-xs text-muted" title="National Early Warning Score 2">NEWS2 {r.news2.total}</span>
          <Status level={r.overall} size="lg" />
        </div>
      </div>

      {r.news2.level === "WARNING" && (
        <button onClick={() => open("emergency", astronaut)} className="pulse-warning flex w-full items-center gap-3 rounded-2xl bg-warning p-4 text-left font-bold text-ink">
          <Icon name="emergency" size={26} /> Open the emergency guide <span className="ml-auto text-xl">→</span>
        </button>
      )}

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <Card className="p-5">
          <BodyMap statuses={r.systems} selected={sys} onSelect={onSelect} />
          {s && st ? (
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-2"><span className="font-bold">{s.name}</span><Status level={st.level} size="sm" /></div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.space}</p>
              <div className="mt-2 text-sm"><span className="text-life">Protect it: </span>{s.countermeasures[0]}</div>
              <a href={s.source.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-lavender hover:underline">{s.source.label} ↗</a>
            </div>
          ) : (
            <p className="mt-3 text-center text-xs text-muted">Tap a body system to learn what space does to it.</p>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="label mb-3">What changed</div>
            {insights.length === 0 ? (
              <div className="flex items-center gap-3 text-moon/80"><Icon name="status-nominal" size={22} style={{ color: "var(--color-nominal)" }} /> Nothing unusual. Every measurement is within {a.id}'s normal.</div>
            ) : (
              <ul className="space-y-2">
                {insights.map((i) => (
                  <li key={i.title}>
                    <button onClick={() => i.metric && setMetric(i.metric)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-ink/60"
                      style={{ background: `color-mix(in srgb, ${LEVEL_COLOR[i.level]} 9%, transparent)` }}>
                      <Icon name={i.level === "WARNING" ? "status-warning" : i.trend ? "forecast" : "status-caution"} size={20} style={{ color: LEVEL_COLOR[i.level] }} />
                      <span className="flex-1"><span className="font-semibold">{i.title}</span><span className="block text-xs text-muted">{i.detail}</span></span>
                      {i.metric && <span className="text-xs text-lavender">See trend →</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex flex-wrap gap-1.5">
              {METRICS.map((m) => (
                <button key={m.key} onClick={() => setMetric(m.key)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${metric === m.key ? "bg-life text-ink" : "bg-ink/60 text-muted hover:text-moon"}`}>
                  <Icon name={m.icon} size={14} />{m.label}
                </button>
              ))}
            </div>
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="text-lg font-bold">{ind.name} over time</h2>
              <span className="num text-2xl">{ind.step && ind.step < 1 ? value.toFixed(1) : value} <span className="text-sm text-muted">{ind.unit}</span></span>
            </div>
            <TrendChart data={data} varKey={metric} day={day} span={90} />
            <ChartLegend />
          </Card>

          <LastBlood id={astronaut} day={day} />
        </div>
      </div>
    </div>
  );
}

function LastBlood({ id, day }: { id: string; day: number }) {
  const rows = ["glucosa", "hemoglobina", "linfocitos"].map((v) => {
    const last = latestBlood(id, v, day);
    const info = MISSION.variables_sangre[v];
    if (!last || !info) return null;
    const pre = bloodSeries(id, v).filter((x) => x.dia < 0).map((x) => x.valor);
    const dev = personalDeviation(last.valor, pre.reduce((s, x) => s + x, 0) / pre.length, CV_INTRA[v] ?? 0.05, pre.length);
    return { v, last, info, dev };
  }).filter(Boolean) as { v: string; last: { valor: number; dia: number }; info: { unidad: string }; dev: { changePct: number; z: number } }[];
  if (!rows.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-border/60 px-5 py-3 text-sm">
      <span className="flex items-center gap-2 text-muted"><Icon name="blood-analyzer" size={16} /> Last blood test · {dayLabel(rows[0].last.dia)}</span>
      {rows.map(({ v, last, info, dev }) => (
        <span key={v}>{BLOOD_LABELS[v].name} <span className="num">{fmt(last.valor)}</span> <span className="text-xs text-muted">{info.unidad}</span>
          <span className="num ml-1 text-xs" style={{ color: Math.abs(dev.z) >= 3 ? "var(--color-caution)" : "var(--color-muted)" }}>{dev.changePct > 0 ? "+" : ""}{dev.changePct}%</span></span>
      ))}
    </div>
  );
}
