# Validation of the livorbit health engines

Reproduce everything with `cd herramientas && python3 datos_reales.py && python3 validar_reales.py && python3 generar_sintetico.py && python3 validar_sintetico.py`.

## Engines
| Engine | What it does |
|---|---|
| A · Personal normal | z-score of each value against the astronaut's own baseline. After 14 days in flight the baseline recalibrates from the last 30 days, excluding the 3 most recent. |
| B · Trend | Linear trend of the last 7–14 days. It warns if a threshold will be crossed within 7 days, and only when the trend is consistent (R² ≥ 0.6). |
| C · Mission twin | Bone density and radiation dose from NASA published rates. |
| D · NEWS2 | National Early Warning Score 2 (Royal College of Physicians, 2017). |
| I · Immune risk index | 3 or more of: short sleep, low mood, recent solar particle event, lymphocytes below the personal normal. |
| S · Signal quality | Sensor faults are reported as "check sensor" and excluded, never raised as clinical alarms. |

## A. Real data (Inspiration4, NASA OSDR OSD-575 / OSD-569)
4 crewmembers × 7 time points (L-92, L-44, L-3, R+1, R+45, R+82, R+194), 17 blood markers with reference ranges.

**What the data shows (day after return vs. pre-flight mean):** lymphocytes −27 % on average (3 of 4 crew), glucose +24 % (all 4), monocytes +25 % (all 4). One crewmember (C003) changed the most in most markers; another (C004) barely changed.

**Engine A on real data:**
- **False alarms before flight** (leave-one-out, so there is no true change): 28 of 204 tests (13.7 %), and 17 of those (8.3 %) at warning level.
- **Day after return:** the personal engine flagged 7 changes, versus 6 for the population reference range. 5 of the personal flags were invisible to the range (for example, platelets +49 % in C003, still "normal" in range).
- **Limit:** with only 3 pre-flight samples, the personal normal is imprecise. Very noisy markers (lymphocytes vary about 27 % within a person) can hide large changes.

**Design decision:** the personal engine is used *together with* clinical ranges, never instead of them, and the app asks for a frequent routine so each astronaut's normal becomes precise.

## B. Synthetic Mars mission (events known in advance)
4 astronauts, 60 pre-flight days, 180 days of transit and 30 days on Mars. Blood baselines are seeded from the real Inspiration4 crew, noise from their real variability (capped at 8 %, assuming standardized in-flight draws), and drifts from NASA rates.

| Event | Astronaut | Problem starts | Critical day | First alert | Engines that fired |
|---|---|---|---|---|---|
| Chest pain and collapse | AST-3 | 141 | 147 | day 144 (3 days before) | personal heart rate and blood pressure, sleep, glucose, BP trend, NEWS2 |
| Gradual mood and sleep decline | AST-2 | 110 | 140 | day 119 (21 days before) | personal mood and sleep, mood and sleep trends |
| Fever with low lymphocytes | AST-1 | 70 | 71 | day 71 (same day) | personal temperature and heart rate |

**Sensor faults (signal quality first):** 5 of 5 days with an injected sensor fault (detached ECG electrode, motion artifact, thermometers disagreeing by more than 1 °C) were reported as "check sensor" and excluded from the engines. One unrelated low-temperature caution occurred on one of those days.

**Key finding:** comparing in-flight data with the Earth baseline produced false alarms on **23.7 %** of astronaut-days, because the body adapts to space (for example, blood pressure drops). Recalibrating the personal normal in flight cut false alarms to **8.9 %** of days, all at caution level, without missing any event.

**Engine C at day 209:** bone density −3.2 % with 90 % exercise adherence vs. −6.2 % with 35 %; radiation 293 mSv (49 % of the 600 mSv career limit).

This is a technical check of the engines on injected events, **not a clinical validation**.

## Main assumptions
| Topic | Value | Source |
|---|---|---|
| Bone loss | −1.25 %/month without exercise, −0.4 %/month with full exercise | NASA HRP evidence report: −1 to −1.5 % and −0.3 to −0.5 % |
| Radiation | 1.4 mSv/day in transit, 0.5–0.7 mSv/day on the surface, 600 mSv career limit | HRP radiation reports; NASA-STD-3001 Vol. 1 Rev C |
| Sleep | Mean 6.6 h in flight | HRP sleep evidence report (crews about 6.4–6.9 h) |
| Lymphocytes in flight | −20 %, partial recovery | Informed by Inspiration4 (−27 % at R+1) |
| Blood pressure and heart rate in flight | −6 mmHg, −3 bpm | Team assumption |
| Mood | Slow decline from isolation | Team assumption |
| Partial gravity on Mars | Halves the bone loss | Team assumption |
| Solar storm (days 94–98) | Real timing of the May 2024 storm from NASA DONKI (G5, Kp 9, 14 SEP events); +24 mSv over 4 days | Timing: real (DONKI). Dose magnitude: demo assumption |
| Sensor faults | Electrode off (AST-1, days 40–41), motion (AST-2, day 60), thermometer mismatch (AST-4, days 165–166) | Demo scenario |
