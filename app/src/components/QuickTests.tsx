import { useEffect, useRef, useState } from "react";
import type { Level } from "../data/mission";
import { Icon, Status } from "../lib/ui";

// Two 1-minute screens proposed by the team:
//  · Reaction test: a short version of the Psychomotor Vigilance Task (PVT) used by NASA to measure fatigue.
//    Lapses = responses slower than 500 ms. The full PVT lasts 3–10 minutes; this is a 5-trial screen.
//  · Amsler grid: self-check for central vision changes (linked to SANS, spaceflight-associated neuro-ocular syndrome).

export interface TestResults { reaction?: { medianMs: number; lapses: number; level: Level }; amsler?: { distorted: boolean; level: Level } }

const TRIALS = 5;

export function ReactionTest({ onDone }: { onDone: (r: NonNullable<TestResults["reaction"]>) => void }) {
  const [state, setState] = useState<"idle" | "wait" | "go" | "early" | "done">("idle");
  const [times, setTimes] = useState<number[]>([]);
  const goAt = useRef(0);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const arm = () => {
    setState("wait");
    timer.current = window.setTimeout(() => { goAt.current = performance.now(); setState("go"); }, 1500 + Math.random() * 2500);
  };
  const tap = () => {
    if (state === "idle" || state === "early") return arm();
    if (state === "wait") { if (timer.current) window.clearTimeout(timer.current); return setState("early"); }
    if (state === "go") {
      const t = [...times, Math.round(performance.now() - goAt.current)];
      setTimes(t);
      if (t.length >= TRIALS) {
        const sorted = [...t].sort((a, b) => a - b);
        const medianMs = sorted[Math.floor(sorted.length / 2)];
        const lapses = t.filter((x) => x > 500).length;
        const level: Level = lapses >= 4 ? "WARNING" : lapses >= 2 || medianMs > 400 ? "CAUTION" : "NOMINAL";
        setState("done");
        onDone({ medianMs, lapses, level });
      } else arm();
    }
  };
  const reset = () => { setTimes([]); setState("idle"); };

  const bg = state === "go" ? "var(--color-life)" : state === "early" ? "color-mix(in srgb, var(--color-warning) 25%, transparent)" : "var(--color-ink)";
  return (
    <div>
      <button onClick={tap} disabled={state === "done"} aria-label="Reaction test area"
        className="flex h-32 w-full flex-col items-center justify-center rounded-2xl border border-border text-center transition-colors"
        style={{ background: bg, color: state === "go" ? "var(--color-ink)" : undefined }}>
        <span className="text-lg font-bold">
          {state === "idle" && "Tap to start"}
          {state === "wait" && "Wait for green…"}
          {state === "go" && "TAP NOW"}
          {state === "early" && "Too early. Tap to retry"}
          {state === "done" && "Done"}
        </span>
        <span className="num mt-1 text-xs opacity-70">{times.length}/{TRIALS} {times.length > 0 && `· last ${times[times.length - 1]} ms`}</span>
      </button>
      {state === "done" && <button onClick={reset} className="mt-2 text-xs text-lavender hover:underline">Repeat test</button>}
    </div>
  );
}

export function AmslerGrid({ onAnswer, answer }: { onAnswer: (r: NonNullable<TestResults["amsler"]>) => void; answer?: boolean }) {
  const n = 16;
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      <svg viewBox="0 0 160 160" className="h-36 w-36 shrink-0 rounded-lg bg-moon" role="img" aria-label="Amsler grid">
        {Array.from({ length: n + 1 }, (_, i) => (
          <g key={i} stroke="#111827" strokeWidth={0.6}>
            <line x1={i * 10} y1={0} x2={i * 10} y2={160} />
            <line x1={0} y1={i * 10} x2={160} y2={i * 10} />
          </g>
        ))}
        <circle cx={80} cy={80} r={2.6} fill="#111827" />
      </svg>
      <div className="text-sm">
        <p className="text-moon/80">Hold the screen at reading distance. Cover one eye and look only at the center dot. Then switch eyes.</p>
        <p className="mt-2 font-semibold">Are any lines wavy, blurred or missing?</p>
        <div className="mt-2 flex gap-2">
          <button onClick={() => onAnswer({ distorted: false, level: "NOMINAL" })} className={`rounded-xl border px-4 py-1.5 ${answer === false ? "border-life text-life" : "border-border"}`}>No, all straight</button>
          <button onClick={() => onAnswer({ distorted: true, level: "WARNING" })} className={`rounded-xl border px-4 py-1.5 ${answer === true ? "border-warning text-warning" : "border-border"}`}>Yes</button>
        </div>
      </div>
    </div>
  );
}

export function TestSummary({ r }: { r: TestResults }) {
  if (!r.reaction && !r.amsler) return null;
  return (
    <div className="mt-3 space-y-2 text-sm">
      {r.reaction && (
        <div className="flex items-center gap-2"><Icon name="timer" size={15} /> Reaction <span className="num">{r.reaction.medianMs} ms</span>
          <span className="text-muted">· {r.reaction.lapses} lapse{r.reaction.lapses === 1 ? "" : "s"}</span><span className="ml-auto"><Status level={r.reaction.level} size="sm" /></span></div>
      )}
      {r.amsler && (
        <div className="flex items-center gap-2"><Icon name="vision" size={15} /> Vision grid <span className="text-muted">· {r.amsler.distorted ? "distortion reported" : "normal"}</span>
          <span className="ml-auto"><Status level={r.amsler.level} size="sm" /></span></div>
      )}
      {r.reaction && r.reaction.level !== "NOMINAL" && <p className="text-xs text-muted">Fatigue: take a break, postpone critical tasks{r.reaction.level === "WARNING" ? ", no spacewalks or robotic operations, notify Earth" : ""}.</p>}
      {r.amsler?.distorted && <p className="text-xs" style={{ color: "var(--color-warning)" }}>Any vision change is reported to Earth (possible SANS). Schedule an eye ultrasound.</p>}
    </div>
  );
}
