import { MISSION } from "../data/mission";
import { asset, Card, Icon, SectionTitle } from "../lib/ui";

const CHAIN = [
  { icon: "checklist", t: "Detect", d: "Daily guided check-ins and wearable streams build each astronaut's personal normal." },
  { icon: "baseline", t: "Interpret", d: "NOMINAL / CAUTION / WARNING per body system, with the reason and the space hazard behind it." },
  { icon: "forecast", t: "Anticipate", d: "Trends and the mission twin show where the body is heading before it becomes an emergency." },
  { icon: "emergency", t: "Act", d: "Step-by-step protocols that only use equipment that is on board." },
  { icon: "report-earth", t: "Communicate", d: "Every alert says \"handle on board\" or \"notify Earth\" (warnings, or cautions that persist 3 days), plus compact reports for a 4–24 minute delay." },
];

const ENGINES = [
  { k: "A", n: "Personal normal", d: "z-score of each value against the astronaut's own baseline. After 14 days in flight the baseline recalibrates from the last 30 days, because the body adapts to space." },
  { k: "B", n: "Trend forecast", d: "Linear trend of the last 7–14 days. Warns when a threshold will be crossed within 7 days, and only if the trend is consistent (R² ≥ 0.6)." },
  { k: "C", n: "Mission twin", d: "Projects bone density and radiation dose with NASA published rates and the effect of countermeasures." },
  { k: "D", n: "NEWS2", d: "National Early Warning Score 2 (Royal College of Physicians, 2017): a clinically validated sum of 7 vital signs that says when to escalate." },
  { k: "I", n: "Immune risk index", d: "Preventive: short sleep + low mood + recent solar particle event + lymphocytes below normal. Three or more together raise a caution before any symptom appears." },
  { k: "S", n: "Signal quality first", d: "A detached electrode, motion or two thermometers that disagree are reported as \"check sensor\", never as a clinical alarm. The bad reading is excluded from all engines." },
];

const CAPTURE = [
  { icon: "checklist", t: "Guided manual entry (today)", d: "The crew reads the onboard devices (ABPC cuff, PCBA blood analyzer, pulse oximeter, thermometer) and enters values with step-by-step instructions." },
  { icon: "heart-rate", t: "Wearables over Bluetooth LE", d: "Standard GATT health profiles: Heart Rate (0x180D), Blood Pressure (0x1810), Health Thermometer (0x1809), Pulse Oximeter (0x1822), Glucose (0x1808). Read in the browser with the Web Bluetooth API, like a smart shirt (CSA Bio-Monitor / Astroskin)." },
  { icon: "vision", t: "Camera-assisted reads (next)", d: "Urine test strips against the color chart, eye-chart self-tests, and guided ultrasound probe placement." },
  { icon: "data-real", t: "Standard medical records", d: "Each measurement is stored as an HL7 FHIR Observation with a LOINC code (e.g. 8867-4 heart rate, 8480-6 systolic BP, 2339-0 glucose), so ground medical systems can read it." },
  { icon: "settings", t: "Local-first storage", d: "Data lives on the crew's device (IndexedDB). Everything works with no connection, as it must on the way to Mars." },
  { icon: "report-earth", t: "Store-and-forward to Earth", d: "Reports queue and sync when the link is available, the model behind NASA's Delay/Disruption Tolerant Networking (DTN)." },
];

const STACK = [
  ["Interface", "React 18 + TypeScript, Vite, Tailwind CSS"],
  ["Charts", "Recharts"],
  ["Engines", "TypeScript in the browser (validated reference in Python 3)"],
  ["Data", "JSON from NASA OSDR (real) and a reproducible synthetic generator"],
  ["Delivery", "Static web app / installable PWA, works offline"],
  ["Design", "livorbit identity: Manrope, DM Mono, hand-authored SVG icons and body map"],
];

export function AboutView() {
  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Methods & technology" title="How livorbit works">
        On Earth, when something goes wrong in your body, a doctor measures, interprets and treats. In deep space that chain breaks:
        the doctor is minutes away, the astronaut is not a doctor, and what is "normal" for the body changes. livorbit rebuilds the chain on board.
      </SectionTitle>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {CHAIN.map((c, i) => (
          <Card key={c.t}>
            <div className="flex items-center gap-2"><span className="num text-xs text-muted">0{i + 1}</span><Icon name={c.icon} size={20} style={{ color: "var(--color-life)" }} /></div>
            <div className="mt-2 font-bold">{c.t}</div>
            <p className="mt-1 text-sm text-muted">{c.d}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-3 text-xl font-bold">Four health engines</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {ENGINES.map((e) => (
            <div key={e.k} className="flex gap-3 rounded-xl bg-ink/60 p-3">
              <span className="num flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-life font-bold text-ink">{e.k}</span>
              <div><div className="font-bold">{e.n}</div><p className="text-sm text-muted">{e.d}</p></div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Num v="3 / 3" l="Injected clinical events detected (cardiac, behavioral, fever); 5 / 5 sensor faults reported as sensor, not alarm" />
          <Num v="3 days" l="Early warning before the simulated collapse" />
          <Num v="23.7 → 9 %" l="Days with a false alarm, after recalibrating the normal in flight" />
        </div>
        <p className="mt-3 text-xs text-muted">This is a technical check of the engines on simulated events, not a clinical validation.</p>
      </Card>

      <Card>
        <h2 className="mb-1 text-xl font-bold">How patient data is captured</h2>
        <p className="mb-4 text-sm text-muted">From what is possible today with ISS equipment, to how livorbit connects to sensors and to the ground.</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {CAPTURE.map((c) => (
            <div key={c.t} className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-2 font-bold"><Icon name={c.icon} size={18} style={{ color: "var(--color-lavender)" }} />{c.t}</div>
              <p className="mt-1.5 text-sm text-muted">{c.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 overflow-x-auto scroll-thin">
          <div className="flex min-w-[720px] items-stretch gap-2 text-center text-xs">
            {["Onboard devices & wearables", "Guided entry / Bluetooth LE", "FHIR Observations (local, offline)", "Engines A · B · C · D", "Crew UI: status, trends, emergency", "Store-and-forward report → Earth"].map((s, i, arr) => (
              <div key={s} className="flex flex-1 items-center gap-2">
                <div className="flex-1 rounded-xl border border-border bg-ink/60 px-2 py-3">{s}</div>
                {i < arr.length - 1 && <span className="text-life">→</span>}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-xl font-bold">Data: real, synthetic and assumed</h2>
          <ul className="space-y-2 text-sm">
            <li><span className="font-bold text-life">Real · </span>NASA OSDR OSD-575 and OSD-569 (Inspiration4 blood panels with reference ranges).</li>
            <li><span className="font-bold text-life">Real · </span>ISS medical equipment and measurement ranges: CHeCS Medical Hardware Catalog (NASA, 2011).</li>
            <li><span className="font-bold text-life">Real · </span>NASA DONKI space weather: the May 2024 storm (G5, Kp 9, 14 solar particle events), replayed on mission days 94–98.</li>
            <li><span className="font-bold text-lavender">Synthetic · </span>A 4-person, 270-day Mars mission. Blood baselines seeded from the real Inspiration4 crew; noise from their real variability; drifts from NASA rates.</li>
          </ul>
          <div className="label mb-2 mt-4">Assumptions in the simulation</div>
          <div className="max-h-72 overflow-y-auto scroll-thin rounded-xl border border-border">
            <table className="w-full text-xs">
              <tbody>
                {MISSION.supuestos.map((s) => (
                  <tr key={s.tema} className="border-b border-border last:border-0">
                    <td className="p-2 font-semibold">{s.tema}</td><td className="p-2">{s.valor}</td>
                    <td className="p-2"><span className="rounded-full border border-border px-1.5 py-0.5 font-mono text-[10px]" style={{ color: s.tipo === "NASA" || s.tipo === "Real" ? "var(--color-life)" : s.tipo === "Supuesto" ? "var(--color-caution)" : "var(--color-lavender)" }}>{s.tipo === "Supuesto" ? "Assumption" : s.tipo === "Supuesto informado" ? "Informed assumption" : s.tipo}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 text-xl font-bold">Technology</h2>
          <table className="w-full text-sm">
            <tbody>{STACK.map(([k, v]) => <tr key={k} className="border-b border-border last:border-0"><td className="label py-2 pr-3">{k}</td><td className="py-2">{v}</td></tr>)}</tbody>
          </table>
          <h3 className="mb-2 mt-5 font-bold">Limits we are honest about</h3>
          <ul className="space-y-1.5 text-sm text-muted">
            <li>• Not a diagnostic device and not clinically validated. It supports, never replaces, the flight surgeon.</li>
            <li>• No drug doses: medication follows the ISS Medical Checklist.</li>
            <li>• Vital-sign data in the demo is simulated; real astronaut vital signs are private medical data.</li>
            <li>• 4 real crewmembers are far too few to train a diagnostic AI, so we did not.</li>
          </ul>
          <h3 className="mb-2 mt-5 font-bold">Use of AI tools</h3>
          <p className="text-sm text-muted">AI assistants helped with research, code and the generated illustrations (each carries a visible "AI-generated" watermark). The concept, decisions and validation are the team's.</p>
        </Card>
      </div>

      <Card className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <img src={asset("illustrations/earth-remote-clinic.jpg")} alt="" className="h-36 w-full rounded-xl object-cover sm:w-64" />
        <div>
          <div className="label mb-1 text-life">Beyond space</div>
          <h2 className="text-xl font-bold">From Mars to remote clinics on Earth</h2>
          <p className="mt-1 text-sm text-muted">The same problem exists at home: a community 8 hours from the nearest hospital faces the same "distance to care" as a crew on the way to Mars. livorbit's personal normals, early warnings and guided protocols work offline, on any device.</p>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 text-lg font-bold">Sources</h2>
        <ul className="grid gap-1 text-sm text-lavender md:grid-cols-2">
          {[
            ["NASA OSDR · Inspiration4 datasets", "https://osdr.nasa.gov/bio/repo/data/studies/OSD-575"],
            ["NASA Human Research Program · 5 hazards", "https://www.nasa.gov/hrp/hazards/"],
            ["NASA HRP · Risks of human spaceflight", "https://www.nasa.gov/hrp/risks/"],
            ["NASA-STD-3001 Vol. 1 Rev C · Crew health", "https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_1"],
            ["NASA HRP evidence reports", "https://humanresearchroadmap.nasa.gov/evidence/"],
            ["CSA · Bio-Monitor (Astroskin)", "https://www.asc-csa.gc.ca/eng/sciences/astroskin.asp"],
            ["CSA · Monitoring radiation for astronaut health", "https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp"],
            ["NASA DONKI · space weather database", "https://kauai.ccmc.gsfc.nasa.gov/DONKI/"],
            ["Royal College of Physicians · NEWS2", "https://www.rcp.ac.uk/improving-care/resources/national-early-warning-score-news-2/"],
          ].map(([l, u]) => <li key={u}><a href={u} target="_blank" rel="noreferrer" className="hover:underline">{l} ↗</a></li>)}
        </ul>
      </Card>
    </div>
  );
}

function Num({ v, l }: { v: string; l: string }) {
  return <div className="rounded-xl bg-ink/60 p-3"><div className="num text-2xl text-life">{v}</div><p className="mt-1 text-xs text-muted">{l}</p></div>;
}
