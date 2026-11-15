import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BONE_LOSS_FULL_EXERCISE, BONE_LOSS_NO_EXERCISE, CAREER_LIMIT_MSV, PROFILES, project } from "../engine/twin";
import { Card, Icon, SectionTitle } from "../lib/ui";

const AX = { stroke: "#354055", tick: { fill: "#A6B0C3", fontSize: 11, fontFamily: "DM Mono" } };
const TT = { background: "#1B2537", border: "1px solid #354055", borderRadius: 10, fontFamily: "DM Mono", fontSize: 12 };

export function TwinView() {
  const [profileId, setProfileId] = useState("mars");
  const [adherence, setAdherence] = useState(0.8);
  const [shelter, setShelter] = useState(1);
  const profile = PROFILES.find((p) => p.id === profileId)!;
  const pts = useMemo(() => project(profile, adherence, shelter), [profile, adherence, shelter]);
  const total = pts[pts.length - 1].day;
  const [day, setDay] = useState(300);
  const d = Math.min(day, total);
  const at = pts.reduce((best, p) => (Math.abs(p.day - d) < Math.abs(best.day - d) ? p : best), pts[0]);
  const fin = pts[pts.length - 1];
  const pct = (x: number) => `${(x - 100).toFixed(1)} %`;

  return (
    <div>
      <SectionTitle eyebrow="Engine C · physiological twin" title="Mission time machine">
        Move through the mission and see what happens to bones and radiation dose, and how much exercise and the storm shelter change the outcome.
        Rates come straight from NASA Human Research Program evidence reports and the NASA-STD-3001 crew health standard.
      </SectionTitle>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="space-y-5">
          <div>
            <label className="label mb-2 block" htmlFor="profile">Mission profile</label>
            <select id="profile" value={profileId} onChange={(e) => setProfileId(e.target.value)} className="w-full rounded-xl border border-border bg-ink px-3 py-2 text-sm">
              {PROFILES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {profile.segments.map((s) => <li key={s.name}>{s.name}: {s.days} d · {s.mSvPerDay} mSv/day · {s.gravity} g</li>)}
            </ul>
          </div>
          <Slider label="Mission day" value={d} min={0} max={total} step={5} onChange={setDay} display={`Day ${d}`} />
          <Slider label="Exercise adherence (of 2 h/day)" value={adherence} min={0} max={1} step={0.05} onChange={setAdherence} display={`${Math.round(adherence * 100)} %`} icon="exercise" />
          <Slider label="Storm shelter use during solar events" value={shelter} min={0} max={1} step={0.25} onChange={setShelter} display={`${Math.round(shelter * 100)} %`} icon="solar-storm" />

          <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
            <Out label={`Bone at day ${d}`} value={pct(at.boneChosen)} tone={at.boneChosen - 100 <= -6 ? "warning" : at.boneChosen - 100 <= -3 ? "caution" : undefined} />
            <Out label={`Dose at day ${d}`} value={`${at.dose.toFixed(0)} mSv`} sub={`${((at.dose / CAREER_LIMIT_MSV) * 100).toFixed(0)} % of career limit`} tone={at.dose > CAREER_LIMIT_MSV ? "warning" : undefined} />
            <Out label="Bone at end" value={pct(fin.boneChosen)} sub={`no exercise: ${pct(fin.boneNone)}`} />
            <Out label="Dose at end" value={`${fin.dose.toFixed(0)} mSv`} sub={fin.dose > CAREER_LIMIT_MSV ? "exceeds 600 mSv limit" : "within 600 mSv limit"} tone={fin.dose > CAREER_LIMIT_MSV ? "warning" : undefined} />
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="mb-2 flex items-center gap-2"><Icon name="body-bones" size={20} style={{ color: "var(--color-life)" }} /><h2 className="text-lg font-bold">Hip bone density (% of pre-flight)</h2></div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={pts} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
                  <CartesianGrid stroke="#354055" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="day" {...AX} minTickGap={30} />
                  <YAxis {...AX} domain={[(min: number) => Math.floor(min) - 1, 100]} allowDecimals={false} tickFormatter={(v: number) => `${Math.round(v)}`} />
                  <Tooltip contentStyle={TT} labelFormatter={(x) => `Day ${x}`} formatter={(v: number, n: string) => [`${v.toFixed(1)} %`, n === "boneNone" ? "No exercise" : n === "boneFull" ? "Full prescription" : "Your plan"]} />
                  <Line dataKey="boneNone" stroke="#FF949E" strokeDasharray="5 4" dot={false} isAnimationActive={false} />
                  <Line dataKey="boneFull" stroke="#77DEC0" strokeDasharray="5 4" dot={false} isAnimationActive={false} />
                  <Line dataKey="boneChosen" stroke="#D9F86B" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  <ReferenceLine y={97} stroke="#F4C979" strokeOpacity={0.6} strokeDasharray="6 4" />
                  <ReferenceLine x={d} stroke="#F3F2E9" strokeOpacity={0.4} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted">Loss {BONE_LOSS_NO_EXERCISE} %/month without countermeasures, {BONE_LOSS_FULL_EXERCISE} %/month with the full exercise prescription (midpoints of the NASA HRP ranges: 1–1.5 % and 0.3–0.5 %). Partial gravity on Mars is assumed to halve the loss (team assumption: no NASA rate in our sources).</p>
          </Card>
          <Card>
            <div className="mb-2 flex items-center gap-2"><Icon name="radiation" size={20} style={{ color: "var(--color-lavender)" }} /><h2 className="text-lg font-bold">Cumulative radiation dose</h2></div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={pts} margin={{ top: 8, right: 8, bottom: 0, left: -6 }}>
                  <CartesianGrid stroke="#354055" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="day" {...AX} minTickGap={30} />
                  <YAxis {...AX} />
                  <Tooltip contentStyle={TT} labelFormatter={(x) => `Day ${x}`} formatter={(v: number) => [`${v.toFixed(0)} mSv`, "Dose"]} />
                  <Area dataKey="dose" stroke="#B7ACF5" fill="#B7ACF5" fillOpacity={0.18} strokeWidth={2} isAnimationActive={false} />
                  <ReferenceLine y={CAREER_LIMIT_MSV} stroke="#FF949E" strokeDasharray="6 4" label={{ value: "600 mSv career limit", fill: "#FF949E", fontSize: 11, position: "insideTopLeft" }} />
                  <ReferenceLine x={d} stroke="#F3F2E9" strokeOpacity={0.4} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted">Free space 1.4 mSv/day (HRP: 1.3–1.5), planetary surface ~0.5 mSv/day (NASA-STD-3001 Vol. 1 Rev C rationale), career limit 600 mSv (NASA-STD-3001). Solar particle events (+20 mSv each, about every 120 days in free space) are a demo assumption; the shelter cuts them by 70 %.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, display, icon }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; display: string; icon?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-muted">{icon && <Icon name={icon} size={15} />}{label}</span><span className="num text-life">{display}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" aria-label={label} />
    </div>
  );
}
function Out({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "caution" | "warning" }) {
  return (
    <div className="rounded-xl bg-ink/60 p-2.5">
      <div className="label">{label}</div>
      <div className="num text-lg" style={{ color: tone ? `var(--color-${tone})` : undefined }}>{value}</div>
      {sub && <div className="text-[11px] text-muted">{sub}</div>}
    </div>
  );
}
