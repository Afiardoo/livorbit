import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { I4, CV_INTRA } from "../data/mission";
import { personalDeviation } from "../engine/engines";
import { Card, RealBadge, SectionTitle, Status } from "../lib/ui";

const ORDER = ["L-92", "L-44", "L-3", "R+1", "R+45", "R+82", "R+194"];
const COLORS = ["#D9F86B", "#B7ACF5", "#77DEC0", "#F4C979"];
const AX = { stroke: "#354055", tick: { fill: "#A6B0C3", fontSize: 11, fontFamily: "DM Mono" } };
const PRE = ["L-92", "L-44", "L-3"];

export function DataLabView() {
  const [v, setV] = useState("glucosa");
  const info = I4.variables[v];
  const crew = Object.keys(I4.tripulantes).sort();
  const rows = useMemo(() => ORDER.map((t) => {
    const row: Record<string, number | string> = { t };
    for (const c of crew) { const p = I4.tripulantes[c][v]?.find((x) => x.t === t); if (p) row[c] = p.valor; }
    return row;
  }), [v, crew]);

  const r1 = crew.map((c) => {
    const s = I4.tripulantes[c][v] ?? [];
    const pre = s.filter((x) => PRE.includes(x.t)).map((x) => x.valor);
    const post = s.find((x) => x.t === "R+1")?.valor;
    if (pre.length < 3 || post === undefined) return null;
    const base = pre.reduce((a, x) => a + x, 0) / 3;
    const dev = personalDeviation(post, base, CV_INTRA[v] ?? 0.05, 3);
    const [lo, hi] = info.rango;
    return { c, base, post, dev, out: (lo !== null && post < lo) || (hi !== null && post > hi) };
  }).filter(Boolean) as { c: string; base: number; post: number; dev: ReturnType<typeof personalDeviation>; out: boolean }[];

  return (
    <div>
      <SectionTitle eyebrow="NASA Open Science Data Repository" title="What real astronaut data taught us">
        SpaceX Inspiration4 (2021, 3 days in orbit) is the first open human dataset from a commercial spaceflight. We used its blood panels
        (OSD-575 metabolic panel, OSD-569 complete blood count) to design and test our engines: 4 crewmembers × 7 time points, each with clinical reference ranges.
      </SectionTitle>
      <div className="mb-5 flex flex-wrap gap-2"><RealBadge /></div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Finding big="−27 %" title="Lymphocytes" text="Average drop the day after landing (3 of 4 crewmembers). The immune system reacts even to a 3-day flight." />
        <Finding big="+24 %" title="Glucose" text="Rose in all 4 crewmembers after 3 days. Stress and inactivity change how the body handles sugar." />
        <Finding big="4 ≠ 4" title="Different bodies" text="C003 showed the largest change in most markers (glucose +44 %, lymphocytes −48 %) while C004 barely changed. One-size-fits-all ranges miss this." />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">{info.nombre} <span className="text-muted font-normal">({info.unidad})</span></h2>
            <select value={v} onChange={(e) => setV(e.target.value)} className="rounded-xl border border-border bg-ink px-3 py-1.5 text-sm" aria-label="Blood marker">
              {Object.entries(I4.variables).map(([k, x]) => <option key={k} value={k}>{x.nombre}</option>)}
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
                <CartesianGrid stroke="#354055" strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="t" {...AX} />
                <YAxis {...AX} domain={["auto", "auto"]} />
                {info.rango[0] !== null && info.rango[1] !== null && <ReferenceArea y1={info.rango[0]} y2={info.rango[1]} fill="#77DEC0" fillOpacity={0.07} />}
                <ReferenceArea x1="L-3" x2="R+1" fill="#B7ACF5" fillOpacity={0.12} label={{ value: "3-day flight", fill: "#B7ACF5", fontSize: 11, position: "insideTop" }} />
                <Tooltip contentStyle={{ background: "#1B2537", border: "1px solid #354055", borderRadius: 10, fontFamily: "DM Mono", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12, fontFamily: "DM Mono" }} />
                {crew.map((c, i) => <Line key={c} dataKey={c} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted">Green band: clinical reference range from the dataset ({info.rango[0]}–{info.rango[1]} {info.unidad}). L = days before launch, R = days after return.</p>
        </Card>

        <Card>
          <h2 className="mb-1 text-lg font-bold">Day after return (R+1)</h2>
          <p className="mb-3 text-xs text-muted">Engine A compares each value with that person's own 3 pre-flight samples. The population range only flags values outside the green band.</p>
          <table className="w-full text-sm">
            <thead><tr className="label text-left"><th className="py-1 font-normal">Crew</th><th className="font-normal">Change</th><th className="font-normal">Personal</th><th className="font-normal">Range</th></tr></thead>
            <tbody>
              {r1.map((x) => (
                <tr key={x.c} className="border-t border-border">
                  <td className="py-2 font-mono">{x.c}</td>
                  <td className="num">{x.dev.changePct > 0 ? "+" : ""}{x.dev.changePct} %</td>
                  <td><Status level={x.dev.level === "WARNING" ? "CAUTION" : x.dev.level} size="sm" text={`z ${x.dev.z > 0 ? "+" : ""}${x.dev.z}`} /></td>
                  <td>{x.out ? <Status level="CAUTION" size="sm" text="out" /> : <span className="text-xs text-muted">in range</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="mb-3 text-lg font-bold">Validation on real data (honest results)</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Metric value="7 vs 6" label="Changes flagged at R+1: personal engine vs population range. 5 of the personal flags were invisible to the range." />
          <Metric value="13.7 %" label="False-alarm rate before flight (8.3 % at warning level). With only 3 baseline samples, the personal normal is still imprecise." />
          <Metric value="27 %" label="Within-person variation of lymphocytes: a 48 % drop can still hide in the noise. Lesson: measure more often." />
        </div>
        <p className="mt-3 text-sm text-muted">Design decision: livorbit uses the personal engine <span className="text-moon">together with</span> the clinical ranges, never instead of them, and asks for a routine of frequent measurements so each astronaut's normal becomes precise. Reproducible in <span className="num">herramientas/validar_reales.py</span>.</p>
      </Card>
    </div>
  );
}

function Finding({ big, title, text }: { big: string; title: string; text: string }) {
  return <Card><div className="num text-4xl text-life">{big}</div><div className="mt-1 font-bold">{title}</div><p className="mt-1 text-sm text-muted">{text}</p></Card>;
}
function Metric({ value, label }: { value: string; label: string }) {
  return <div className="rounded-xl bg-ink/60 p-3"><div className="num text-2xl text-lavender">{value}</div><p className="mt-1 text-xs text-muted">{label}</p></div>;
}
