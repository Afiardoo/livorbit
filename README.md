# livorbit · Life, in every orbit.

**Health monitoring and emergency guidance for astronauts on long-duration missions.**
NASA Space Apps Challenge 2026 · Challenge: *Create Health Monitoring Software for Astronauts on Space Missions*.

🚀 **Live app:** https://afiardoo.github.io/livorbit/

## The problem
On Earth, when something goes wrong in your body, a doctor measures, interprets and treats. In deep space that chain breaks:
the doctor is up to 24 minutes away (one way), the astronaut is not a doctor, and what is "normal" for the body changes in microgravity.

## What livorbit does
1. **Detect:** most data arrives on its own (smart shirt and wristband). The crew only spends 2 minutes each morning (blood-pressure cuff, sleep, mood) and gives one drop of blood a week, using devices that already fly on the ISS.
2. **Interpret:** NOMINAL / CAUTION / WARNING per body system, against each astronaut's **own normal**, which recalibrates once in flight.
3. **Anticipate:** trends and a mission twin show where the body is heading (bone loss and radiation over a Mars mission).
4. **Act:** a chest-pain or collapse protocol aware of the Earth signal delay, using only on-board equipment.
5. **Communicate:** a compact report for the flight surgeon.

## Repository
| Folder | Content |
|---|---|
| `app/` | The web app (React, TypeScript, Vite, Tailwind, Recharts). Fully client-side and works offline. |
| `herramientas/` | Python reference engines, synthetic mission generator and validation scripts. Code comments are in Spanish. |
| `datos/reales/` | Real NASA OSDR data (Inspiration4 blood panels), converted to JSON. |
| `datos/sinteticos/` | Synthetic 4-person, 270-day Mars mission (every record flagged `sintetico: true`). |
| `VALIDATION.md` | How the engines were validated, with honest results. |

## NASA and partner data
- **NASA OSDR** OSD-575 (comprehensive metabolic panel and cytokines) and OSD-569 (complete blood count), from the SpaceX Inspiration4 mission.
- **NASA Human Research Program:** the 5 hazards, 17 risk pages and evidence reports (bone, cardiovascular, sleep, behavioral health, immune, SANS, radiation).
- **NASA-STD-3001 Vol. 1 Rev C:** the 600 mSv career radiation limit and the surface dose rate.
- **ISS CHeCS Medical Hardware Catalog (NASA, 2011):** the devices and measurement ranges the crew uses.
- **CSA:** Bio-Monitor / Astroskin smart shirt, and radiation monitoring.
- The challenge is authored by the **Brazilian Space Agency**.

## Run locally
```bash
cd app && npm install && npm run dev
```
Reproduce the data and validation:
```bash
cd herramientas && python3 datos_reales.py && python3 validar_reales.py && python3 generar_sintetico.py && python3 validar_sintetico.py
```

## Use of AI
AI assistants helped with research, code and the illustrations. Each generated illustration carries a visible "AI-generated" watermark. The logo, icons and body map are hand-authored SVG.

## Disclaimer
Training and research prototype. Not a medical device and not clinically validated. It does not give drug doses and does not replace the ISS Medical Checklist or the flight surgeon.
