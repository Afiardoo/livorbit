import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { useApp } from "../state";
import { CREW, FIRST_DAY, MISSION, phaseAt, spaceWeatherAt, type VitalRecord } from "../data/mission";
import { assess, series, type Assessment } from "../engine/assess";
import { summary, topInsights } from "../engine/insights";
import { INDICATOR } from "../data/content";
import { asset, dayLabel, Icon, LEVEL_COLOR, Status } from "../lib/ui";

export const ENGINE_NAME = { A: "Personal normal", B: "Trend", C: "Mission twin", D: "NEWS2", I: "Immune index", range: "Threshold" } as const;

export function CrewView() {
  const { day, overrides, open } = useApp();
  const crew = useMemo(() => CREW.map((a) => ({ a, r: assess(a.id, day, overrides) })), [day, overrides]);
  const phase = phaseAt(day);
  const img = day < 0 ? "hero-crew" : phase.id === "transit" ? "env-mars-transit" : "env-mars-surface";
  const attention = crew.filter((c) => c.r.overall === "CAUTION" || c.r.overall === "WARNING").length;
  const emergency = crew.find((c) => c.r.news2.level === "WARNING");

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl">
        <img src={asset(`illustrations/${img}.jpg`)} alt="" className="absolute inset-0 h-full w-full object-cover object-right-bottom" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-transparent" />
        <div className="relative max-w-xl px-6 py-10 sm:px-10 sm:py-14">
          <div className="label mb-3 text-life">{dayLabel(day)} · {day < 0 ? "Pre-flight" : phase.id === "transit" ? "Mars transit" : "Mars surface"}</div>
          <h1 className="text-3xl font-bold leading-[1.1] sm:text-[44px]">
            {attention === 0 ? "The whole crew is nominal." : attention === 1 ? "One crewmember needs a look." : `${attention} crewmembers need a look.`}
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-moon/75">Each astronaut is compared with their own normal, every day, so small changes are seen long before they become emergencies.</p>
        </div>
      </section>

      <SpaceWeatherBanner day={day} />

      {emergency && (
        <button onClick={() => open("emergency", emergency.a.id)} className="pulse-warning flex w-full items-center gap-4 rounded-2xl bg-warning p-4 text-left text-ink">
          <Icon name="emergency" size={30} />
          <span className="flex-1 font-bold">{emergency.a.id} meets emergency criteria. Open the emergency guide.</span>
          <span className="text-xl">→</span>
        </button>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {crew.map(({ a, r }) => <CrewCard key={a.id} id={a.id} role={a.rol} r={r} onOpen={() => open("astronaut", a.id)} />)}
      </div>
    </div>
  );
}

function CrewCard({ id, role, r, onOpen }: { id: string; role: string; r: Assessment; onOpen: () => void }) {
  const { overrides } = useApp();
  const top = topInsights(r, 1)[0];
  const metric: keyof VitalRecord = top?.metric && INDICATOR[top.metric as string] ? top.metric : "fc";
  const ind = INDICATOR[metric as string];
  const idx = r.day - FIRST_DAY;
  const data = series(id, overrides).slice(Math.max(0, idx - 30), idx + 1).map((x) => ({ d: x.dia, v: x[metric] as number }));
  const color = LEVEL_COLOR[r.overall === "NODATA" ? "NOMINAL" : r.overall];
  const value = r.vitals[metric] as number;

  return (
    <button onClick={onOpen} className="card group overflow-hidden p-0 text-left transition-transform hover:-translate-y-0.5"
      style={r.overall === "WARNING" ? { borderColor: "var(--color-warning)" } : undefined}>
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)` }}>
            <img src={asset("logo/livorbit-symbol.svg")} alt="" className="h-6 w-6" />
          </span>
          <div>
            <div className="text-lg font-bold leading-tight">{id}</div>
            <div className="text-sm text-muted">{role}</div>
          </div>
        </div>
        <Status level={r.overall} />
      </div>
      <p className="min-h-[3rem] px-5 pt-4 text-[15px] leading-snug">
        {r.sensor.length > 0 && <span className="mr-2 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink" style={{ background: "var(--color-lavender)" }}>Check sensor</span>}
        {summary(r)}
      </p>
      <div className="flex items-end justify-between px-5 pt-2">
        <div className="label">{ind?.name ?? "Heart rate"} · last 30 days</div>
        <div className="num text-lg">{ind?.step && ind.step < 1 ? value.toFixed(1) : value} <span className="text-xs text-muted">{ind?.unit}</span></div>
      </div>
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={color} stopOpacity={0.35} />
                <stop offset="1" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#g-${id})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </button>
  );
}

function SpaceWeatherBanner({ day }: { day: number }) {
  const w = spaceWeatherAt(day);
  const cw = MISSION.clima_espacial;
  const inWindow = day >= cw.dia_inicio_replay && day <= cw.dia_inicio_replay + 8;
  if (!inWindow || !w.recentSep) return null;
  const kp = w.gst.length ? Math.max(...w.gst.map((g) => g.kp_max)) : null;
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-4" style={{ borderColor: "var(--color-caution)", background: "color-mix(in srgb, var(--color-caution) 10%, transparent)" }}>
      <Icon name="solar-storm" size={30} style={{ color: "var(--color-caution)" }} />
      <div className="min-w-[220px] flex-1">
        <div className="font-bold">Solar storm{w.sep.length ? ` · ${w.sep.length} solar particle event${w.sep.length > 1 ? "s" : ""} today` : " · particle radiation elevated"}{kp ? ` · geomagnetic Kp ${kp}` : ""}</div>
        <div className="text-sm text-moon/75">Whole crew: go to the storm shelter during the peak, postpone spacewalks, log dosimeter readings. Notify Earth.</div>
      </div>
      <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-life" title={cw.fuente}>Real NASA DONKI · May 2024 replay</span>
    </div>
  );
}
