import { useEffect, useMemo, useState } from "react";
import { useApp } from "../state";
import { CREW, vitalsAt } from "../data/mission";
import { assess } from "../engine/assess";
import { asset, Card, dayLabel, formatDelay, Icon, Status } from "../lib/ui";

// Chest pain / collapse protocol. Built on basic and advanced life-support principles (AHA guidelines, the same
// ones the ISS AED follows) and restricted to equipment that exists in the ISS Crew Health Care System:
// Crew Medical Restraint System, LIFEPAK 1000 AED, Advanced Life Support Pack, Respiratory Support Pack, ABPC.
// It never gives drug doses: medication decisions follow the ISS Medical Checklist and the flight surgeon.

interface Node {
  id: string; title: string; body?: string; icon: string; tone?: "warning" | "caution";
  steps?: string[]; equipment?: string[];
  options?: { label: string; next: string }[];
  next?: string; loopTimer?: number;
}

const NODES: Record<string, Node> = {
  start: { id: "start", title: "Is the crewmate responsive?", icon: "emergency", tone: "warning",
    body: "Call their name loudly and tap the shoulders. Shout for the whole crew: this is a medical emergency.",
    options: [{ label: "Yes, awake and talking", next: "awake" }, { label: "No response", next: "breathing" }] },
  breathing: { id: "breathing", title: "Is the crewmate breathing normally?", icon: "respiration", tone: "warning",
    body: "Open the airway (head tilt, chin lift). Look, listen and feel for no more than 10 seconds. Gasping is NOT normal breathing.",
    options: [{ label: "Breathing normally", next: "unconscious" }, { label: "Not breathing / gasping", next: "arrest" }] },
  arrest: { id: "arrest", title: "Cardiac arrest: start CPR now", icon: "cpr", tone: "warning", loopTimer: 120,
    steps: [
      "Secure the crewmate to the Crew Medical Restraint System (CMRS). In microgravity CPR is impossible without restraint.",
      "Rescuer 1: start chest compressions now. 100–120 per minute, 5–6 cm deep, full recoil. Brace your feet or use the restraint straps.",
      "Rescuer 2: bring the AED (LIFEPAK 1000). Turn it on and follow its voice prompts. Attach the pads to dry, bare skin.",
      "Rescuer 3: Ambu bag and oxygen from the Respiratory Support Pack. 30 compressions : 2 breaths.",
      "Swap the compressor every 2 minutes (when the timer ends) to avoid fatigue.",
      "Do not stop compressions except when the AED analyzes or shocks. Nobody touches the patient during a shock.",
    ],
    equipment: ["CMRS restraint", "AED LIFEPAK 1000", "Ambu bag", "Oxygen (RSP)"],
    options: [{ label: "Signs of life returned", next: "rosc" }, { label: "Continue CPR (next 2-min cycle)", next: "arrest" }] },
  rosc: { id: "rosc", title: "Pulse is back: stabilize", icon: "heart-rate", tone: "caution",
    steps: ["Keep the AED pads on.", "Give oxygen to reach SpO₂ ≥ 94 %.", "Measure BP, HR and SpO₂ every 5 minutes (ABPC + pulse oximeter).", "Keep the crewmate restrained and warm.", "Send a report to the flight surgeon now."],
    equipment: ["ABPC", "Pulse oximeter", "Oxygen"], options: [{ label: "Generate report for Earth", next: "report" }] },
  unconscious: { id: "unconscious", title: "Unconscious but breathing", icon: "restraint", tone: "caution",
    steps: ["Secure in the CMRS on the side (recovery position) to protect the airway.", "Attach the pulse oximeter and the ABPC.", "Give oxygen if SpO₂ is below 94 %.", "Have the AED ready next to the patient.", "Re-check breathing every minute. If it stops: start CPR."],
    equipment: ["CMRS restraint", "Pulse oximeter", "ABPC", "Oxygen", "AED ready"],
    options: [{ label: "Breathing stopped", next: "arrest" }, { label: "Stable: report to Earth", next: "report" }] },
  awake: { id: "awake", title: "Awake with chest pain: suspected cardiac event", icon: "heart-rate", tone: "caution",
    steps: [
      "Stop all activity. Secure the crewmate in a comfortable reclined position.",
      "Measure blood pressure and heart rate (ABPC) and SpO₂ (pulse oximeter) now, then every 5 minutes.",
      "If available, record an ECG with the BP/ECG monitor and include it in the report.",
      "Give oxygen only if SpO₂ is below 94 %.",
      "Medications ONLY as written in the ISS Medical Checklist and confirmed with the flight surgeon.",
      "Keep the AED next to the patient, ready to use.",
      "Ask: when did it start, where is the pain, does it spread to the arm, jaw or back, shortness of breath, sweating?",
    ],
    equipment: ["ABPC", "Pulse oximeter", "BP/ECG monitor", "Oxygen", "AED ready", "Advanced Life Support Pack"],
    options: [{ label: "Becomes unresponsive", next: "breathing" }, { label: "Stable: report to Earth", next: "report" }] },
  report: { id: "report", title: "Report for the flight surgeon", icon: "report-earth", body: "" },
};

const ROLES = [
  { role: "Leader (CMO)", task: "Decides, reads the protocol aloud, talks to Earth" },
  { role: "Compressions / patient", task: "CPR or continuous patient monitoring" },
  { role: "Equipment", task: "AED, oxygen, Advanced Life Support Pack" },
  { role: "Recorder", task: "Times, vitals, actions taken (this log)" },
];

export function EmergencyView() {
  const { astronaut, setAstronaut, day } = useApp();
  const patient = astronaut;
  const r = useMemo(() => assess(patient, day), [patient, day]);
  const delay = vitalsAt(patient, day)?.retraso_com_s ?? 0;
  const [node, setNode] = useState("start");
  const [log, setLog] = useState<{ t: number; text: string }[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [cycleStart, setCycleStart] = useState<number | null>(null);
  const others = CREW.filter((c) => c.id !== patient);

  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 500); return () => window.clearInterval(t); }, []);

  const elapsed = startedAt ? Math.floor((now - startedAt) / 1000) : 0;
  const n = NODES[node];
  const autonomy = delay < 5 ? { label: "Ground-guided", text: "Mission Control can follow in real time. Call the flight surgeon now and follow their lead." }
    : delay < 120 ? { label: "Ground-assisted", text: "Short delay. Act now; the flight surgeon will join with a few seconds of lag." }
    : { label: "Autonomous", text: `A question to Earth and its answer take ${formatDelay(delay * 2)}. The crew must act alone; livorbit guides every step and sends the report.` };

  const go = (next: string, label: string) => {
    if (!startedAt) setStartedAt(Date.now());
    setLog((l) => [...l, { t: startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0, text: label }]);
    if (NODES[next].loopTimer) setCycleStart(Date.now());
    setNode(next);
  };
  const reset = () => { setNode("start"); setLog([]); setStartedAt(null); setCycleStart(null); };
  const cycleLeft = cycleStart && n.loopTimer ? Math.max(0, n.loopTimer - Math.floor((now - cycleStart) / 1000)) : null;

  const report = useMemo(() => {
    const v = r.vitals;
    return [
      `LIVORBIT MEDICAL REPORT · ${patient} · mission ${dayLabel(day)}`,
      `Event: chest pain / collapse protocol · elapsed ${mmss(elapsed)}`,
      `Vitals: HR ${v.fc} bpm · BP ${v.pas}/${v.pad} mmHg · SpO2 ${v.spo2}% · RR ${v.fr}/min · T ${v.temp} C · alert: ${v.consciente ? "yes" : "no"}`,
      `NEWS2: ${r.news2.total} (${r.news2.level})`,
      `Prior alerts: ${r.alerts.slice(0, 3).map((a) => a.text).join(" | ") || "none"}`,
      "Actions:",
      ...log.map((l) => `  +${mmss(l.t)} ${l.text}`),
      `Signal delay one-way: ${formatDelay(delay)} · expected reply in ${formatDelay(delay * 2)}`,
    ].join("\n");
  }, [r, patient, day, elapsed, log, delay]);

  return (
    <div>
      <div className="relative mb-5 overflow-hidden rounded-[20px] border" style={{ borderColor: "var(--color-warning)" }}>
        <img src={asset("illustrations/emergency-scene.jpg")} alt="" className="absolute inset-0 h-full w-full object-cover object-right-bottom opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/40" />
        <div className="relative grid gap-4 p-5 sm:p-6 md:grid-cols-[1.3fr_1fr]">
          <div>
            <div className="label mb-1 text-warning">Emergency mode · chest pain or collapse</div>
            <h1 className="text-2xl font-bold sm:text-3xl">Act first. Earth is {formatDelay(delay)} away.</h1>
            <p className="mt-2 max-w-xl text-sm text-muted">{autonomy.text}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="label">Patient</span>
              {CREW.map((c) => (
                <button key={c.id} onClick={() => { setAstronaut(c.id); reset(); }}
                  className={`rounded-lg border px-2.5 py-1 font-mono text-xs ${c.id === patient ? "border-warning text-warning" : "border-border text-muted"}`}>{c.id}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 self-end">
            <Box label="Autonomy level" value={autonomy.label} />
            <Box label="Elapsed" value={mmss(elapsed)} />
            <Box label="Signal one-way" value={formatDelay(delay)} />
            <Box label="NEWS2 now" value={`${r.news2.total}`} sub={r.news2.level} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card style={{ borderColor: n.tone === "warning" ? "var(--color-warning)" : n.tone === "caution" ? "var(--color-caution)" : undefined }}>
          {node !== "report" ? (
            <>
              <div className="flex items-center gap-3">
                <Icon name={n.icon} size={34} style={{ color: n.tone === "warning" ? "var(--color-warning)" : "var(--color-caution)" }} />
                <h2 className="text-2xl font-bold">{n.title}</h2>
              </div>
              {n.body && <p className="mt-3 text-lg leading-relaxed">{n.body}</p>}
              {cycleLeft !== null && (
                <div className="mt-4 flex items-center gap-4 rounded-xl bg-ink p-3">
                  <Icon name="timer" size={26} style={{ color: "var(--color-life)" }} />
                  <div><div className="label">CPR cycle · swap compressor at 0:00</div><div className="num text-3xl text-life">{mmss(cycleLeft)}</div></div>
                </div>
              )}
              {n.steps && (
                <ol className="mt-4 space-y-2.5">
                  {n.steps.map((s, k) => (
                    <li key={s} className="flex gap-3 rounded-xl bg-ink/60 p-3 text-[15px] leading-snug">
                      <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-life text-xs font-bold text-ink">{k + 1}</span>{s}
                    </li>
                  ))}
                </ol>
              )}
              {n.equipment && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {n.equipment.map((e) => <span key={e} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted">{e}</span>)}
                </div>
              )}
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {n.options?.map((o) => (
                  <button key={o.label} onClick={() => go(o.next, o.label)}
                    className="rounded-2xl border-2 px-4 py-4 text-left text-lg font-bold transition-colors hover:bg-surface-2"
                    style={{ borderColor: NODES[o.next].tone === "warning" ? "var(--color-warning)" : "var(--color-border)" }}>
                    {o.label} →
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3"><Icon name="report-earth" size={32} style={{ color: "var(--color-lavender)" }} /><h2 className="text-2xl font-bold">Report for the flight surgeon</h2></div>
              <p className="mt-2 text-sm text-muted">Compact text so it travels fast on a limited deep-space link. Expected reply in {formatDelay(delay * 2)}.</p>
              <pre className="num mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-ink p-4 text-xs leading-relaxed text-moon/90">{report}</pre>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => navigator.clipboard?.writeText(report)} className="rounded-xl bg-life px-4 py-2 font-bold text-ink">Copy report</button>
                <button onClick={reset} className="rounded-xl border border-border px-4 py-2">Restart protocol</button>
              </div>
            </>
          )}
          <p className="mt-5 border-t border-border pt-3 text-xs text-muted">
            Training prototype based on AHA basic and advanced life-support principles and ISS equipment (CHeCS catalog). It does not give drug doses and does not replace the ISS Medical Checklist or the flight surgeon.
          </p>
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 flex items-center gap-2 font-bold"><Icon name="crew-roles" size={18} /> Crew roles</h3>
            <ul className="space-y-2 text-sm">
              {ROLES.map((ro, k) => (
                <li key={ro.role} className="rounded-xl bg-ink/60 p-2.5">
                  <div className="flex justify-between"><span className="font-semibold">{ro.role}</span><span className="num text-life">{others[k]?.id ?? "livorbit (auto)"}</span></div>
                  <div className="text-xs text-muted">{ro.task}</div>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h3 className="mb-2 flex items-center gap-2 font-bold"><Icon name="heart-rate" size={18} /> Patient now · {patient}</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <V l="HR" v={`${r.vitals.fc}`} /><V l="BP" v={`${r.vitals.pas}/${r.vitals.pad}`} /><V l="SpO₂" v={`${r.vitals.spo2}%`} />
              <V l="RR" v={`${r.vitals.fr}`} /><V l="Temp" v={`${r.vitals.temp}`} /><V l="Alert" v={r.vitals.consciente ? "yes" : "no"} />
            </div>
            <div className="mt-3"><Status level={r.news2.level} text={`NEWS2 ${r.news2.total} · ${r.news2.level}`} /></div>
            {day !== 147 && patient === "AST-3" && <p className="mt-2 text-xs text-muted">Tip: set the mission clock to Day 147 to see AST-3's simulated collapse.</p>}
          </Card>
          <Card>
            <h3 className="mb-2 flex items-center gap-2 font-bold"><Icon name="timer" size={18} /> Action log</h3>
            {log.length === 0 ? <p className="text-sm text-muted">Every decision is time-stamped here and goes into the report.</p> : (
              <ul className="num space-y-1 text-xs">{log.map((l, i) => <li key={i}><span className="text-life">+{mmss(l.t)}</span> {l.text}</li>)}</ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
function Box({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="rounded-xl border border-border bg-ink/70 p-3"><div className="label">{label}</div><div className="num mt-1 text-lg">{value}</div>{sub && <div className="text-[11px] text-muted">{sub}</div>}</div>;
}
function V({ l, v }: { l: string; v: string }) {
  return <div className="rounded-lg bg-ink/60 p-2"><div className="label">{l}</div><div className="num">{v}</div></div>;
}
