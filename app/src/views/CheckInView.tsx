import { useMemo, useState } from "react";
import { useApp } from "../state";
import { CREW, latestBlood, type VitalRecord } from "../data/mission";
import { assess } from "../engine/assess";
import { news2, worst } from "../engine/engines";
import { INDICATOR } from "../data/content";
import { asset, Card, dayLabel, Icon, LEVEL_COLOR, Status } from "../lib/ui";
import { CrewPicker } from "./AstronautView";

const MOODS = ["Very low", "Low", "Okay", "Good", "Great"];
const AUTO: (keyof VitalRecord)[] = ["fc", "spo2", "fr", "temp"];

const WAYS = [
  { icon: "heart-rate", when: "All day · automatic", title: "Smart shirt and wristband", text: "Heart rate, breathing, oxygen, skin temperature, sleep and activity stream over Bluetooth. Nothing to do.", ref: "Like the CSA Bio-Monitor (Astroskin) used on the ISS." },
  { icon: "blood-pressure", when: "Every morning · 2 min", title: "Cuff, sleep and mood", text: "Press start on the blood-pressure cuff (it sends the value itself), confirm last night's sleep, tap a mood face.", ref: "ISS Automatic Blood Pressure Cuff." },
  { icon: "blood-analyzer", when: "Once a week · 5 min", title: "One drop of blood", text: "A finger prick on the handheld blood analyzer. Glucose and 10 other values in 2 minutes. Snap or type the result.", ref: "ISS Portable Clinical Blood Analyzer (PCBA)." },
];

export function CheckInView() {
  const { astronaut, day, overrides, saveCheckIn, open } = useApp();
  const base = useMemo(() => assess(astronaut, day, overrides).vitals, [astronaut, day, overrides]);
  const glucose = Math.round(latestBlood(astronaut, "glucosa", day)?.valor ?? 90);
  const bloodDay = ((day % 7) + 7) % 7 === 0;
  const a = CREW.find((x) => x.id === astronaut)!;

  const [v, setV] = useState<Record<string, number>>({});
  const [bp, setBp] = useState<"idle" | "measuring" | "done">("idle");
  const [sleepOk, setSleepOk] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);
  const [howFor, setHowFor] = useState<string | null>(null);
  const key = `${astronaut}:${day}`;
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) { setLastKey(key); setV({}); setBp("idle"); setSleepOk(null); setSaved(false); }

  const val = (k: string) => v[k] ?? (k === "glucosa" ? glucose : (base[k as keyof VitalRecord] as number));
  const measureBp = () => { setBp("measuring"); window.setTimeout(() => setBp("done"), 1600); };
  const ready = bp === "done" && sleepOk !== null && v.animo_1a5 !== undefined;

  const n = news2(val("fr"), val("spo2"), val("pas"), val("fc"), val("temp"));
  const keys = ["pas", "fc", "spo2", "fr", "temp", "sueno_h", "animo_1a5", ...(bloodDay ? ["glucosa"] : [])];
  const overall = worst(n.level, ...keys.map((k) => INDICATOR[k].level(val(k))));

  const save = () => {
    const out: Partial<VitalRecord> = {};
    for (const k of ["pas", "fc", "spo2", "fr", "temp", "sueno_h", "animo_1a5"]) (out as Record<string, number>)[k] = val(k);
    saveCheckIn(astronaut, day, out);
    setSaved(true);
  };

  const How = ({ k }: { k: string }) => howFor === k ? (
    <ol className="mt-2 list-decimal space-y-1 rounded-xl bg-ink/60 py-2 pl-8 pr-3 text-xs text-moon/80">{INDICATOR[k].how.map((h) => <li key={h}>{h}</li>)}</ol>
  ) : null;
  const HowBtn = ({ k }: { k: string }) => (
    <button onClick={() => setHowFor(howFor === k ? null : k)} className="text-xs text-lavender hover:underline">{howFor === k ? "Hide" : "How?"}</button>
  );

  return (
    <div className="space-y-7">
      <div className="grid items-center gap-6 md:grid-cols-[1fr_260px]">
        <div>
          <div className="label mb-2 text-life">Daily log · {dayLabel(day)}</div>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Most data arrives on its own.</h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-moon/75">Astronauts are busy and they are not doctors. livorbit asks for as little as possible: a 2-minute morning routine, and one drop of blood a week.</p>
        </div>
        <img src={asset("illustrations/empty-state.jpg")} alt="" className="hidden w-full rounded-2xl md:block" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {WAYS.map((w, i) => (
          <Card key={w.title} className="p-5">
            <div className="flex items-center gap-2"><span className="num flex h-6 w-6 items-center justify-center rounded-full bg-life text-xs font-bold text-ink">{i + 1}</span><span className="label">{w.when}</span></div>
            <div className="mt-3 flex items-center gap-2 font-bold"><Icon name={w.icon} size={20} style={{ color: "var(--color-life)" }} />{w.title}</div>
            <p className="mt-1.5 text-sm text-moon/75">{w.text}</p>
            <p className="mt-2 text-[11px] text-muted">{w.ref}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">This morning · {a.id}</h2>
            <div className="w-full sm:w-auto sm:min-w-[340px]"><CrewPicker /></div>
          </div>

          <Row icon="heart-rate" title="From your smart shirt" tag="Synced 06:30 · automatic">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {AUTO.map((k) => {
                const l = INDICATOR[k as string].level(val(k as string));
                return (
                  <div key={k} className="rounded-xl bg-ink/60 px-3 py-2">
                    <div className="text-[11px] text-muted">{INDICATOR[k as string].name.replace(" (SpO₂)", "")}</div>
                    <div className="num text-lg" style={{ color: l !== "NOMINAL" ? LEVEL_COLOR[l] : undefined }}>{val(k as string)}<span className="ml-1 text-xs text-muted">{INDICATOR[k as string].unit}</span></div>
                  </div>
                );
              })}
            </div>
          </Row>

          <Row icon="blood-pressure" title="Blood pressure" tag="Press start on the cuff" action={<HowBtn k="pas" />}>
            {bp === "idle" && <button onClick={measureBp} className="rounded-xl bg-life px-5 py-2.5 font-bold text-ink">Start cuff</button>}
            {bp === "measuring" && <div className="flex items-center gap-3 text-muted"><span className="h-3 w-3 animate-ping rounded-full bg-life" /> Measuring… stay still</div>}
            {bp === "done" && <div className="flex items-center gap-3"><span className="num text-2xl">{val("pas")}/{base.pad}</span><span className="text-sm text-muted">mmHg · received</span><Status level={INDICATOR.pas.level(val("pas"))} size="sm" /></div>}
            <How k="pas" />
          </Row>

          <Row icon="sleep" title="Sleep" tag="Measured by your wristband" action={<HowBtn k="sueno_h" />}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[15px]">You slept <span className="num text-xl">{val("sueno_h")} h</span>. Right?</span>
              <button onClick={() => setSleepOk(true)} className={`rounded-xl border px-4 py-1.5 text-sm ${sleepOk === true ? "border-life text-life" : "border-border"}`}>Yes</button>
              <input type="number" step={0.1} min={0} max={12} aria-label="Hours slept" placeholder="Edit"
                onChange={(e) => { setV({ ...v, sueno_h: Number(e.target.value) }); setSleepOk(false); }}
                className="num w-20 rounded-xl border border-border bg-ink px-2 py-1.5 text-sm" />
            </div>
            <How k="sueno_h" />
          </Row>

          <Row icon="mood" title="How do you feel?" tag="One tap">
            <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Mood">
              {MOODS.map((m, k) => (
                <button key={m} role="radio" aria-checked={v.animo_1a5 === k + 1} onClick={() => setV({ ...v, animo_1a5: k + 1 })}
                  className={`rounded-xl border py-2 text-center text-[11px] transition-colors ${v.animo_1a5 === k + 1 ? "border-life bg-surface-2 text-moon" : "border-border text-muted"}`}>
                  <div className="num text-xl">{k + 1}</div>{m}
                </button>
              ))}
            </div>
          </Row>

          {bloodDay && (
            <Row icon="blood-analyzer" title="Weekly blood drop" tag="PCBA · 2 minutes" action={<HowBtn k="glucosa" />}>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted">Glucose</span>
                <input type="number" value={val("glucosa")} onChange={(e) => setV({ ...v, glucosa: Number(e.target.value) })} aria-label="Glucose"
                  className="num w-24 rounded-xl border border-border bg-ink px-2 py-1.5" />
                <span className="text-sm text-muted">mg/dL</span>
                <Status level={INDICATOR.glucosa.level(val("glucosa"))} size="sm" />
              </div>
              <How k="glucosa" />
            </Row>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button onClick={save} disabled={!ready || saved} className="rounded-xl bg-life px-6 py-3 font-bold text-ink disabled:opacity-40">
              {saved ? "✓ Logged" : "Save today's log"}
            </button>
            {!ready && <span className="text-sm text-muted">Measure blood pressure, confirm sleep and pick a mood.</span>}
            {saved && <button onClick={() => open("astronaut")} className="text-sm text-lavender hover:underline">See how {a.id} is changing →</button>}
          </div>
        </Card>

        <Card className="h-fit p-5">
          <div className="label mb-3">Result</div>
          {ready ? (
            <>
              <Status level={overall} size="lg" />
              <p className="mt-3 text-sm text-moon/80">{overall === "NOMINAL" ? "Everything is within the normal range. Keep the routine." : overall === "CAUTION" ? "Something is off. Re-measure later today; livorbit will watch the trend." : "Values meet emergency criteria. Open the emergency guide now."}</p>
              <div className="mt-4 rounded-xl bg-ink/60 p-3 text-sm"><span className="text-muted">Early warning score (NEWS2)</span> <span className="num float-right">{n.total}</span></div>
              {n.level === "WARNING" && <button onClick={() => open("emergency")} className="mt-3 w-full rounded-xl bg-warning py-2.5 font-bold text-ink">Emergency guide</button>}
            </>
          ) : (
            <p className="text-sm text-muted">Your result appears here as soon as the morning routine is complete. Data is saved on this device and works offline.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ icon, title, tag, action, children }: { icon: string; title: string; tag: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border-t border-border/70 py-4 first:border-0 first:pt-0">
      <div className="mb-2.5 flex items-center gap-2">
        <Icon name={icon} size={18} style={{ color: "var(--color-life)" }} />
        <span className="font-semibold">{title}</span>
        <span className="text-xs text-muted">· {tag}</span>
        <span className="ml-auto">{action}</span>
      </div>
      {children}
    </div>
  );
}
