"""Genera una tripulación SINTÉTICA de 4 astronautas en una misión a Marte.

Todo lo generado aquí es sintético y va marcado como tal. Sirve para la demo y para
probar los motores; no representa a ninguna persona real.

Cómo se construye (ver SUPUESTOS abajo):
  1. Línea base de sangre de cada astronauta = media pre-vuelo REAL de un tripulante de
     Inspiration4 (C001..C004, NASA OSDR). Signos vitales base: valores clínicos normales.
  2. Ruido diario = variabilidad intrapersonal REAL medida en Inspiration4.
  3. Deriva espacial = tasas publicadas por NASA (hueso, radiación, sueño) + supuestos
     marcados donde no hay dato en los documentos descargados.
  4. Contramedidas: la adherencia al ejercicio cambia la pérdida ósea.
  5. Eventos inyectados para la demo (emergencia cardíaca, salud conductual, fiebre,
     tormenta solar).

Uso:  python3 generar_sintetico.py   (semilla fija -> siempre el mismo resultado)
Salidas: datos/sinteticos/mision_marte.json + vitales_diarios.csv + sangre.csv
"""
import csv
import json
import math
import random
import statistics as st
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
REALES = json.loads((RAIZ / "datos" / "reales" / "inspiration4.json").read_text())
CV = json.loads((RAIZ / "datos" / "reales" / "variabilidad_intrapersonal.json").read_text())["cv_intra"]
SALIDA = RAIZ / "datos" / "sinteticos"
rnd = random.Random(2026)

# ------------------------------------------------------------------ misión
MISION = {
    "nombre": "Synthetic Mars Mission (demo)",
    "fases": [
        {"id": "preflight", "desde": -60, "hasta": -1, "entorno": "Earth", "gravedad_g": 1.0,
         "radiacion_mSv_dia": 0.0, "retraso_com_s": 0},
        {"id": "transit", "desde": 0, "hasta": 179, "entorno": "Mars transit (free space)", "gravedad_g": 0.0,
         "radiacion_mSv_dia": 1.4, "retraso_com_s": None},
        {"id": "surface", "desde": 180, "hasta": 209, "entorno": "Mars surface", "gravedad_g": 0.38,
         "radiacion_mSv_dia": 0.7, "retraso_com_s": None},
    ],
    "limite_radiacion_carrera_mSv": 600,
}


def fase(dia):
    return next(f for f in MISION["fases"] if f["desde"] <= dia <= f["hasta"])


def retraso_comunicacion_s(dia):
    """Retraso de una vía Tierra–nave. Lineal de ~0 a ~20 min durante el tránsito (simplificación:
    el valor real depende de las posiciones orbitales y varía entre ~3 y ~22 min)."""
    if dia < 0:
        return 0
    if dia >= 180:
        return 20 * 60
    return round(5 + (20 * 60 - 5) * dia / 180)


# ------------------------------------------------------------------ astronautas
ASTRONAUTAS = [
    {"id": "AST-1", "rol": "Commander", "semilla_real": "C001", "adherencia_ejercicio": 0.9,
     "vitales_base": {"fc": 60, "pas": 118, "pad": 76, "fr": 14, "spo2": 98, "temp": 36.7}, "animo_base": 4.3},
    {"id": "AST-2", "rol": "Pilot", "semilla_real": "C002", "adherencia_ejercicio": 0.8,
     "vitales_base": {"fc": 64, "pas": 114, "pad": 72, "fr": 15, "spo2": 98, "temp": 36.6}, "animo_base": 4.1},
    {"id": "AST-3", "rol": "Flight Engineer", "semilla_real": "C003", "adherencia_ejercicio": 0.85,
     "vitales_base": {"fc": 66, "pas": 124, "pad": 80, "fr": 14, "spo2": 97, "temp": 36.8}, "animo_base": 4.0},
    {"id": "AST-4", "rol": "Mission Specialist", "semilla_real": "C004", "adherencia_ejercicio": 0.35,
     "vitales_base": {"fc": 58, "pas": 112, "pad": 70, "fr": 13, "spo2": 99, "temp": 36.7}, "animo_base": 4.4},
]

RUIDO_VITALES = {"fc": 4.0, "pas": 5.0, "pad": 4.0, "fr": 1.0, "spo2": 0.7, "temp": 0.15}
SANGRE_PCBA = ["glucosa", "sodio", "potasio", "hematocrito", "hemoglobina", "bun", "creatinina"]  # cada 7 días
SANGRE_HEMOCUE = ["leucocitos", "linfocitos"]  # cada 14 días

SUPUESTOS = [
    {"tema": "Pérdida ósea", "valor": "−1.25 %/mes sin ejercicio; −0.4 %/mes con ejercicio completo",
     "fuente": "NASA HRP Evidence Report 'Osteo': −1 a −1.5 %/mes; con contramedidas −0.3 a −0.5 %/mes", "tipo": "NASA"},
    {"tema": "Radiación tránsito", "valor": "1.4 mSv/día", "fuente": "Informe de radiación HRP: 1.3–1.5 mSv/día en espacio libre", "tipo": "NASA"},
    {"tema": "Radiación superficie", "valor": "0.7 mSv/día", "fuente": "Informe HRP: < 0.9 mSv/día en superficie planetaria", "tipo": "NASA"},
    {"tema": "Límite de carrera", "valor": "600 mSv", "fuente": "NASA-STD-3001 Vol. 1 Rev C", "tipo": "NASA"},
    {"tema": "Sueño", "valor": "media 6.6 h, DE 0.7 h", "fuente": "Informe HRP de sueño: tripulaciones ~6.4–6.9 h", "tipo": "NASA"},
    {"tema": "Línea base de sangre", "valor": "media pre-vuelo real de C001–C004", "fuente": "NASA OSDR OSD-575/OSD-569", "tipo": "Real"},
    {"tema": "Ruido de sangre", "valor": "CV intrapersonal real por variable, máximo 8 %", "fuente": "Inspiration4 pre-vuelo; el tope de 8 % asume extracciones estandarizadas en vuelo (ayunas, misma hora)", "tipo": "Supuesto informado"},
    {"tema": "Linfocitos en vuelo", "valor": "−20 % las primeras semanas, recuperación parcial a −10 %",
     "fuente": "Inspiration4 R+1 −27 % (media); informe inmune HRP (desregulación inmune)", "tipo": "Supuesto informado"},
    {"tema": "Glucosa en vuelo", "valor": "+8 %", "fuente": "Inspiration4 R+1 +24 % (incluye estrés de reentrada); se asume menor en crucero", "tipo": "Supuesto informado"},
    {"tema": "Hematocrito", "valor": "+4 % inicial por pérdida de plasma, vuelve a +1 %", "fuente": "Informe cardiovascular HRP (cualitativo)", "tipo": "Supuesto informado"},
    {"tema": "Presión y pulso en vuelo", "valor": "PAS −6 mmHg, FC −3 lpm", "fuente": "Supuesto del equipo (no está en los documentos descargados)", "tipo": "Supuesto"},
    {"tema": "Ánimo", "valor": "descenso lento por aislamiento (−0.002/día)", "fuente": "Supuesto del equipo; ver informe de salud conductual HRP", "tipo": "Supuesto"},
    {"tema": "Tormenta solar (días 94–98)", "valor": "Momentos reales de mayo 2024 (G5, Kp 9; 14 eventos SEP); dosis +24 mSv en 4 días", "fuente": "Tiempos: NASA DONKI (real). Magnitud de dosis: supuesto de demo", "tipo": "Supuesto informado"},
    {"tema": "Fallas de sensor", "valor": "Electrodo suelto (AST-1, días 40–41), movimiento (AST-2, día 60), termómetros discrepantes (AST-4, días 165–166)", "fuente": "Escenario de demo, propuesto por el equipo", "tipo": "Supuesto"},
    {"tema": "Retraso de comunicación", "valor": "de ~5 s a 20 min (una vía) durante el tránsito", "fuente": "Simplificación; real ~3–22 min según órbitas", "tipo": "Supuesto"},
]

EVENTOS = [
    {"astronauta": "AST-3", "dia_inicio": 141, "dia_evento": 147, "tipo": "cardiac_emergency",
     "titulo": "Chest pain and collapse",
     "descripcion": "Prodrome days 141–146 (rising HR and BP, poor sleep). Day 147: chest pain, hypotension, tachycardia, low SpO2."},
    {"astronauta": "AST-2", "dia_inicio": 110, "dia_evento": 140, "tipo": "behavioral",
     "titulo": "Gradual mood and sleep decline",
     "descripcion": "Mood and sleep decline days 110–160 (isolation and confinement)."},
    {"astronauta": "AST-1", "dia_inicio": 70, "dia_evento": 71, "tipo": "fever",
     "titulo": "Fever with low lymphocytes",
     "descripcion": "38.3–38.6 °C on days 71–72, compatible with latent viral reactivation."},
    {"astronauta": "ALL", "dia_inicio": 94, "dia_evento": 95, "tipo": "solar_particle_event",
     "titulo": "Solar storm (real May 2024 replay)",
     "descripcion": "Replay of the real May 2024 storm from NASA DONKI: solar particle events May 9–13 and a G5 geomagnetic storm (Kp 9) on May 10. Mission day 94 = 2024-05-09."},
    {"astronauta": "AST-1", "dia_inicio": 40, "dia_evento": 40, "tipo": "sensor_fault",
     "titulo": "ECG electrode detached", "descripcion": "Days 40–41: lead-off signal, heart rate reads 0. Must be reported as a sensor problem, not a clinical alarm."},
    {"astronauta": "AST-2", "dia_inicio": 60, "dia_evento": 60, "tipo": "sensor_fault",
     "titulo": "Motion artifact", "descripcion": "Day 60: heart rate recorded during exercise, flagged as motion."},
    {"astronauta": "AST-4", "dia_inicio": 165, "dia_evento": 165, "tipo": "sensor_fault",
     "titulo": "Thermometers disagree", "descripcion": "Days 165–166: the two skin thermometers differ by more than 1 °C."},
    {"astronauta": "AST-4", "dia_inicio": 0, "dia_evento": 90, "tipo": "low_exercise",
     "titulo": "Low exercise adherence", "descripcion": "35 % adherence: faster modeled bone loss."},
]


def rampa(dia, tau):
    """0 antes del vuelo, sube suavemente hacia 1 con constante de tiempo tau (días)."""
    return 0.0 if dia < 0 else 1 - math.exp(-dia / tau)


def base_sangre(semilla):
    t = REALES["tripulantes"][semilla]
    return {v: st.mean(p["valor"] for p in t[v] if p["t"] in ("L-92", "L-44", "L-3"))
            for v in SANGRE_PCBA + SANGRE_HEMOCUE if v in t}


def deriva_sangre(var, dia):
    if dia < 0:
        return 1.0
    if var == "glucosa":
        return 1 + 0.08 * rampa(dia, 14)
    if var == "linfocitos":
        return 1 - 0.20 * rampa(dia, 7) + 0.10 * rampa(dia - 30, 60) if dia > 30 else 1 - 0.20 * rampa(dia, 7)
    if var == "leucocitos":
        return 1 - 0.10 * rampa(dia, 7)
    if var in ("hematocrito", "hemoglobina"):
        return 1 + 0.04 * rampa(dia, 3) - 0.03 * rampa(dia - 20, 30) if dia > 20 else 1 + 0.04 * rampa(dia, 3)
    return 1.0


def generar():
    vitales, sangre = [], []
    for a in ASTRONAUTAS:
        vb, sb = a["vitales_base"], base_sangre(a["semilla_real"])
        hueso, dosis, animo = 100.0, 0.0, a["animo_base"]
        for dia in range(-60, 210):
            f = fase(dia)
            en_vuelo = dia >= 0
            # --- contramedidas
            ejercicio = 0 if not en_vuelo else max(0, round(rnd.gauss(120 * a["adherencia_ejercicio"], 15)))
            # --- hueso (modelo NASA, % de densidad de cadera respecto a pre-vuelo)
            if en_vuelo:
                perdida_mes = 1.25 - (1.25 - 0.4) * min(ejercicio / 120, 1)
                if f["gravedad_g"] > 0:  # gravedad parcial en Marte: se asume la mitad de la pérdida
                    perdida_mes *= 0.5
                hueso -= perdida_mes / 30
            # --- radiación
            dosis += f["radiacion_mSv_dia"] + {95: 8, 96: 10, 97: 2, 98: 4}.get(dia, 0)  # réplica de mayo 2024 (DONKI)
            # --- vitales
            v = {k: vb[k] + rnd.gauss(0, s) for k, s in RUIDO_VITALES.items()}
            if en_vuelo:
                v["pas"] -= 6 * rampa(dia, 5)
                v["pad"] -= 3 * rampa(dia, 5)
                v["fc"] -= 3 * rampa(dia, 5)
            sueno = rnd.gauss(7.4, 0.5) if not en_vuelo else rnd.gauss(6.6, 0.7)
            animo = a["animo_base"] - (0.002 * dia if en_vuelo else 0) + rnd.gauss(0, 0.3)
            consciente, dolor_toracico, oxigeno = True, False, False

            # --- eventos
            if a["id"] == "AST-3" and 141 <= dia <= 146:
                k = dia - 140
                v["fc"] += 3 * k
                v["pas"] += 3 * k
                sueno -= 0.25 * k
            if a["id"] == "AST-3" and dia == 147:
                v.update({"fc": 128, "pas": 88, "pad": 58, "fr": 26, "spo2": 90, "temp": 36.9})
                consciente, dolor_toracico = False, True
            if a["id"] == "AST-3" and 148 <= dia <= 154:  # estabilizado con oxígeno y tratamiento
                k = dia - 147
                v.update({"fc": 110 - 5 * k + rnd.gauss(0, 3), "pas": 98 + 2 * k + rnd.gauss(0, 3),
                          "spo2": 94 + 0.5 * k, "fr": 22 - k})
                oxigeno = k <= 3
            if a["id"] == "AST-2" and 110 <= dia <= 160:
                k = min(dia - 110, 40)
                animo -= 0.045 * k
                sueno -= 0.035 * k
            if a["id"] == "AST-1" and dia in (71, 72):
                v["temp"] = 38.3 + 0.3 * (dia - 71)
                v["fc"] += 14

            # --- fallas de sensor (no son eventos clínicos)
            calidad, temp_2 = "ok", None
            if a["id"] == "AST-1" and dia in (40, 41):
                v["fc"], calidad = 0, "electrode_off"
            if a["id"] == "AST-2" and dia == 60:
                v["fc"], calidad = 158, "motion"
            if a["id"] == "AST-4" and dia in (165, 166):
                temp_2, v["temp"], calidad = round(v["temp"], 1), 38.9, "temp_mismatch"

            vitales.append({
                "astronauta": a["id"], "dia": dia, "fase": f["id"],
                "fc": round(v["fc"]), "pas": round(v["pas"]), "pad": round(v["pad"]),
                "fr": round(v["fr"]), "spo2": min(100, round(v["spo2"])), "temp": round(v["temp"], 1),
                "sueno_h": round(max(2.5, min(9.5, sueno)), 1),
                "animo_1a5": max(1, min(5, round(animo))),
                "ejercicio_min": ejercicio,
                "hueso_pct_modelado": round(hueso, 2),
                "radiacion_acumulada_mSv": round(dosis, 1),
                "consciente": consciente, "dolor_toracico": dolor_toracico, "oxigeno": oxigeno,
                "retraso_com_s": retraso_comunicacion_s(dia),
                "calidad": calidad, "temp_2": temp_2,
                "sintetico": True,
            })

            # --- sangre
            if dia < 0:  # pre-vuelo: ambos paneles cada 10 días -> 6 tomas de línea base
                dias_pcba = dias_hemocue = dia % 10 == 0
            else:
                dias_pcba = dia % 7 == 0 or (a["id"] == "AST-3" and dia == 147)
                dias_hemocue = dia % 14 == 0 or (a["id"] == "AST-1" and dia == 71)
            for var in SANGRE_PCBA + SANGRE_HEMOCUE:
                if var not in sb:
                    continue
                if (var in SANGRE_PCBA and not dias_pcba) or (var in SANGRE_HEMOCUE and not dias_hemocue):
                    continue
                valor = sb[var] * deriva_sangre(var, dia) * (1 + rnd.gauss(0, min(CV.get(var, 0.05), 0.08)))
                if a["id"] == "AST-3" and dia == 147 and var == "glucosa":
                    valor *= 1.5  # hiperglucemia de estrés
                if a["id"] == "AST-1" and dia == 71 and var == "linfocitos":
                    valor *= 0.6
                info = REALES["variables"][var]
                sangre.append({"astronauta": a["id"], "dia": dia, "variable": var,
                               "valor": round(valor, 2), "unidad": info["unidad"],
                               "dispositivo": "PCBA (EC8+)" if var in SANGRE_PCBA else "HemoCue WBC DIFF",
                               "sintetico": True})
    return vitales, sangre


def main():
    vitales, sangre = generar()
    SALIDA.mkdir(parents=True, exist_ok=True)
    paquete = {
        "aviso": "SYNTHETIC DATA for demonstration. Blood baselines seeded from real NASA OSDR Inspiration4 crew; "
                 "drifts from NASA HRP evidence reports and labeled assumptions.",
        "mision": MISION,
        "astronautas": ASTRONAUTAS,
        "variables_sangre": {v: REALES["variables"][v] for v in SANGRE_PCBA + SANGRE_HEMOCUE if v in REALES["variables"]},
        "eventos": EVENTOS,
        "clima_espacial": {"dia_inicio_replay": 94, "fecha_inicio_replay": "2024-05-09",
                           **json.loads((RAIZ / "datos" / "reales" / "donki_mayo_2024.json").read_text())},
        "supuestos": SUPUESTOS,
        "vitales": vitales,
        "sangre": sangre,
    }
    (SALIDA / "mision_marte.json").write_text(json.dumps(paquete, ensure_ascii=False))
    for nombre, filas in (("vitales_diarios.csv", vitales), ("sangre.csv", sangre)):
        with open(SALIDA / nombre, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=filas[0].keys())
            w.writeheader()
            w.writerows(filas)
    print(f"{len(vitales)} registros de vitales, {len(sangre)} de sangre -> {SALIDA}")


if __name__ == "__main__":
    main()
