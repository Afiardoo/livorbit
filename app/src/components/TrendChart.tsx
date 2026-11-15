import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { VitalRecord } from "../data/mission";
import { adaptiveBaseline, trend } from "../engine/engines";

/** Caution thresholds drawn on the chart (same values the engines use). */
export const CHART_LIMITS: Record<string, number[]> = {
  fc: [50, 111], pas: [100, 160], spo2: [93], fr: [21], temp: [36.0, 38.1], sueno_h: [5.5], animo_1a5: [2],
};

const AX = { stroke: "#354055", tick: { fill: "#A6B0C3", fontSize: 11, fontFamily: "DM Mono" } };

export function TrendChart({ data, varKey, day, span = 45 }: { data: VitalRecord[]; varKey: keyof VitalRecord; day: number; span?: number }) {
  const rows = useMemo(() => {
    const days = data.map((r) => r.dia);
    const vals = data.map((r) => r[varKey] as number);
    const start = Math.max(0, data.findIndex((r) => r.dia === day) - span);
    const end = data.findIndex((r) => r.dia === day);
    const out: Record<string, number | null | [number, number]>[] = [];
    for (let i = start; i <= end; i++) {
      const b = adaptiveBaseline(days, vals, data[i].dia);
      const win = vals.slice(Math.max(0, i - 6), i + 1);
      const avg = Math.round((win.reduce((a, x) => a + x, 0) / win.length) * 10) / 10;
      out.push({ d: data[i].dia, v: vals[i], avg, band: [b.mean - 2 * b.sd, b.mean + 2 * b.sd], base: b.mean, f: null });
    }
    // forecast: linear trend of the last 7 days, projected 7 days ahead
    const w = 7;
    if (end >= w) {
      const t = trend(days.slice(end - w + 1, end + 1), vals.slice(end - w + 1, end + 1), 0);
      if (t) {
        out[out.length - 1].f = out[out.length - 1].avg as number;
        const last = out[out.length - 1].avg as number;
        for (let k = 1; k <= 7; k++) out.push({ d: day + k, v: null, avg: null, band: null, base: null, f: Math.round((last + t.slope * k) * 10) / 10 });
      }
    }
    return out;
  }, [data, varKey, day, span]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#354055" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="d" {...AX} tickFormatter={(d) => (d < 0 ? `L${d}` : `${d}`)} minTickGap={24} />
          <YAxis {...AX} domain={["auto", "auto"]} width={52} tickFormatter={(v: number) => (Math.abs(v) < 10 ? v.toFixed(1) : Math.round(v).toString())} />
          <Tooltip contentStyle={{ background: "#1B2537", border: "1px solid #354055", borderRadius: 10, fontFamily: "DM Mono", fontSize: 12 }}
            labelFormatter={(d) => `Day ${d}`}
            formatter={(val: unknown, name: string) => {
              const label = name === "v" ? "Daily value" : name === "avg" ? "7-day average" : name === "f" ? "Forecast" : name === "base" ? "Your normal" : "Normal band (±2 SD)";
              const txt = Array.isArray(val) ? `${(val[0] as number).toFixed(1)} – ${(val[1] as number).toFixed(1)}` : typeof val === "number" ? val.toFixed(1) : String(val);
              return [txt, label];
            }} />
          <Area dataKey="band" stroke="none" fill="#B7ACF5" fillOpacity={0.14} isAnimationActive={false} />
          <Line dataKey="base" stroke="#B7ACF5" strokeDasharray="4 4" dot={false} strokeWidth={1.25} isAnimationActive={false} />
          {(CHART_LIMITS[varKey as string] ?? []).map((y) => <ReferenceLine key={y} y={y} stroke="#F4C979" strokeDasharray="6 4" strokeOpacity={0.7} />)}
          <Line dataKey="v" stroke="#D9F86B" strokeOpacity={0.3} strokeWidth={1} dot={false} isAnimationActive={false} />
          <Line dataKey="avg" stroke="#D9F86B" strokeWidth={2.75} dot={false} isAnimationActive={false} />
          <Line dataKey="f" stroke="#D9F86B" strokeDasharray="5 5" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
          <ReferenceLine x={day} stroke="#F3F2E9" strokeOpacity={0.35} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
      <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded bg-life" /> 7-day average</span>
      <span className="flex items-center gap-1.5"><span className="h-px w-4 bg-life/40" /> Daily value</span>
      <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-life" /> 7-day forecast</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-lavender/30" /> Your normal</span>
      <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-caution" /> Limit</span>
    </div>
  );
}
