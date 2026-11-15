"""Corre los motores sobre la misión sintética y mide si detectan los eventos inyectados.

Para cada evento: ¿qué motor alertó primero y con cuántos días de anticipación?
Fuera de los eventos: ¿cuántas falsas alarmas hubo?

Salida: datos/sinteticos/_validacion_sintetico.md y datos/sinteticos/alertas.json (la app puede usarlas)
"""
import json
import statistics as st
from pathlib import Path

from motores import desviacion_personal, linea_base_adaptativa, news2, tendencia

RAIZ = Path(__file__).resolve().parent.parent
D = json.loads((RAIZ / "datos" / "sinteticos" / "mision_marte.json").read_text())
CV = json.loads((RAIZ / "datos" / "reales" / "variabilidad_intrapersonal.json").read_text())["cv_intra"]

# Ventanas donde un evento es real (cualquier alerta de ese astronauta ahí es verdadera)
RELEVANTES = {"AST-3": ("fc", "pas", "NEWS2", "glucosa", "sueno_h"), "AST-2": ("animo_1a5", "sueno_h"),
              "AST-1": ("temp", "fc", "NEWS2", "linfocitos")}
VENTANAS = {"AST-3": [(141, 154)], "AST-2": [(110, 165)], "AST-1": [(70, 73)]}
AFECTA = {"electrode_off": "fc", "motion": "fc", "temp_mismatch": "temp"}
UMBRALES_TENDENCIA = {"fc": (">", 100), "pas": (">", 140), "animo_1a5": ("<", 2.5), "sueno_h": ("<", 5.5)}


def en_evento(ast, dia):
    return any(a <= dia <= b for a, b in VENTANAS.get(ast, []))


def main():
    alertas = []
    for a in D["astronautas"]:
        aid = a["id"]
        vit = [dict(r) for r in D["vitales"] if r["astronauta"] == aid]
        # --- Calidad de señal: una lectura con falla de sensor NO es una alerta clínica.
        # Se reporta como "revisar sensor" y, para los motores, se reemplaza por la última lectura válida.
        for i, r in enumerate(vit):
            if r.get("calidad", "ok") != "ok":
                var = AFECTA[r["calidad"]]
                alertas.append({"astronauta": aid, "dia": r["dia"], "motor": f"S-sensor:{r['calidad']}", "nivel": "SENSOR",
                                "detalle": f"{var} reading {r[var]} discarded ({r['calidad']})"})
                r[var] = vit[i - 1][var]
        pre = [r for r in vit if r["dia"] < 0]

        # --- Motor D: NEWS2 diario
        for r in vit:
            n = news2(r["fr"], r["spo2"], r["pas"], r["fc"], r["temp"], r["oxigeno"], r["consciente"])
            if n["nivel"] != "NOMINAL":
                alertas.append({"astronauta": aid, "dia": r["dia"], "motor": "D-NEWS2", "nivel": n["nivel"],
                                "detalle": f"NEWS2={n['total']} {n['partes']}"})

        # --- Motor A sobre vitales: media de 3 días vs línea base ADAPTATIVA (se recalibra en vuelo)
        dias_v = [r["dia"] for r in vit]
        # fc, pas, temp: media de 3 días. Sueño y ánimo: media de 7 días y solo alertan si BAJAN.
        for var, w in (("fc", 3), ("pas", 3), ("temp", 3), ("sueno_h", 7), ("animo_1a5", 7)):
            valores = [r[var] for r in vit]
            for i in range(w - 1, len(vit)):
                if vit[i]["dia"] < 0:
                    continue
                mu, sd, n = linea_base_adaptativa(dias_v, valores, vit[i]["dia"])
                cv = sd / mu / (w ** 0.5)  # ruido de una media de w días
                m = st.mean(valores[i - w + 1:i + 1])
                res = desviacion_personal(m, mu, cv, n_base=n, piso_cv=0)
                solo_baja = var in ("sueno_h", "animo_1a5")
                if res["nivel"] == "WARNING" and not (solo_baja and res["z"] > 0):
                    alertas.append({"astronauta": aid, "dia": vit[i]["dia"], "motor": f"A-personal:{var}",
                                    "nivel": "CAUTION", "detalle": f"{w}-day mean {m:.1f} vs baseline {mu:.1f} (z={res['z']})"})

        # --- Motor B: tendencias (avisa si cruzará el umbral en <= 7 días y la tendencia es consistente, R² >= 0.6)
        for var, (signo, umbral) in UMBRALES_TENDENCIA.items():
            ventana = 7 if var in ("fc", "pas") else 14
            # sueño y ánimo son ruidosos: la tendencia se calcula sobre la media móvil de 7 días
            suav = 1 if var in ("fc", "pas") else 7
            serie_v = [st.mean(r[var] for r in vit[max(0, j - suav + 1):j + 1]) for j in range(len(vit))]
            for i in range(ventana, len(vit)):
                if vit[i]["dia"] < 0:
                    continue
                dias_t = [r["dia"] for r in vit[i - ventana + 1:i + 1]]
                t = tendencia(dias_t, serie_v[i - ventana + 1:i + 1], umbral, ventana)
                yendo = t and ((signo == ">" and t["pendiente"] > 0) or (signo == "<" and t["pendiente"] < 0))
                if yendo and t["r2"] >= 0.6 and t["dias_hasta_umbral"] is not None and t["dias_hasta_umbral"] <= 7:
                    alertas.append({"astronauta": aid, "dia": vit[i]["dia"], "motor": f"B-tendencia:{var}",
                                    "nivel": "CAUTION", "detalle": f"crosses {signo}{umbral} in ~{t['dias_hasta_umbral']} days"})

        # --- Motor A sobre sangre: línea base = 6 tomas pre-vuelo
        sangre = [s for s in D["sangre"] if s["astronauta"] == aid]
        for var in {s["variable"] for s in sangre}:
            serie = [s for s in sangre if s["variable"] == var]
            base = [s["valor"] for s in serie if s["dia"] < 0]
            for s in serie:
                if s["dia"] < 0:
                    continue
                res = desviacion_personal(s["valor"], st.mean(base), CV.get(var, 0.05), n_base=len(base))
                if res["nivel"] == "WARNING":
                    alertas.append({"astronauta": aid, "dia": s["dia"], "motor": f"A-sangre:{var}", "nivel": "CAUTION",
                                    "detalle": f"{s['valor']} {s['unidad']} ({res['cambio_pct']:+.0f} % vs baseline, z={res['z']})"})

    # ---------------- informe
    lineas = ["## B. Validación con la misión sintética (los eventos se conocen de antemano)", ""]
    lineas += ["| Evento | Astronauta | Inicio del problema | Día crítico | Primera alerta | Días antes del día crítico | Motores que alertaron |",
               "|---|---|---|---|---|---|---|"]
    for ev in D["eventos"]:
        if ev["astronauta"] not in VENTANAS or ev["tipo"] == "sensor_fault":
            continue
        a0, b0 = VENTANAS[ev["astronauta"]][0]
        hits = sorted((x for x in alertas if x["astronauta"] == ev["astronauta"] and a0 <= x["dia"] <= b0
                       and any(v in x["motor"] for v in RELEVANTES[ev["astronauta"]])), key=lambda x: x["dia"])
        if hits:
            motores = sorted({h["motor"].split(":")[0] + (":" + h["motor"].split(":")[1] if ":" in h["motor"] else "") for h in hits})
            ant = ev["dia_evento"] - hits[0]["dia"]
            lineas.append(f"| {ev['titulo']} | {ev['astronauta']} | {ev['dia_inicio']} | {ev['dia_evento']} | día {hits[0]['dia']} "
                          f"({hits[0]['motor']}) | {ant:+d} días | {', '.join(motores)} |")
        else:
            lineas.append(f"| {ev['titulo']} | {ev['astronauta']} | {ev['dia_inicio']} | {ev['dia_evento']} | **no detectado** | — | — |")

    sensores = [x for x in alertas if x["nivel"] == "SENSOR"]
    fallas = [(r["astronauta"], r["dia"]) for r in D["vitales"] if r.get("calidad", "ok") != "ok"]
    clinicas_en_fallas = [x for x in alertas if x["nivel"] != "SENSOR" and (x["astronauta"], x["dia"]) in fallas]
    lineas += ["", f"**Fallas de sensor:** {len({(x['astronauta'], x['dia']) for x in sensores})} de {len(fallas)} días con falla "
               f"identificados como 'revisar sensor'; alertas clínicas falsas en esos días: {len(clinicas_en_fallas)}.", ""]
    alertas_clinicas = [x for x in alertas if x["nivel"] != "SENSOR"]
    falsas = [x for x in alertas_clinicas if x["dia"] >= 0 and not en_evento(x["astronauta"], x["dia"])]
    dias_vuelo = sum(1 for r in D["vitales"] if r["dia"] >= 0)
    por_motor = {}
    for x in falsas:
        por_motor[x["motor"].split(":")[0]] = por_motor.get(x["motor"].split(":")[0], 0) + 1
    dias_con_falsa = len({(x["astronauta"], x["dia"]) for x in falsas})
    lineas += ["", f"**Falsas alarmas** (fuera de los eventos): {len(falsas)} alertas en {dias_con_falsa} de "
               f"{dias_vuelo} días-astronauta de vuelo ({dias_con_falsa / dias_vuelo * 100:.1f} %). Por motor: "
               + ", ".join(f"{k}: {v}" for k, v in sorted(por_motor.items())), ""]

    fin = {a["id"]: [r for r in D["vitales"] if r["astronauta"] == a["id"]][-1] for a in D["astronautas"]}
    lineas += ["**Motor C (gemelo fisiológico) al final de la misión (día 209):**", "",
               "| Astronauta | Adherencia al ejercicio | Densidad ósea modelada | Radiación acumulada | % del límite de carrera (600 mSv) |",
               "|---|---|---|---|---|"]
    for a in D["astronautas"]:
        r = fin[a["id"]]
        lineas.append(f"| {a['id']} | {a['adherencia_ejercicio'] * 100:.0f} % | {r['hueso_pct_modelado'] - 100:+.1f} % | "
                      f"{r['radiacion_acumulada_mSv']:.0f} mSv | {r['radiacion_acumulada_mSv'] / 6:.0f} % |")
    texto = "\n".join(lineas) + "\n"
    (RAIZ / "datos" / "sinteticos" / "_validacion_sintetico.md").write_text(texto)
    (RAIZ / "datos" / "sinteticos" / "alertas.json").write_text(json.dumps(alertas, ensure_ascii=False))
    print(texto)
    # detalle de falsas alarmas para revisar
    for x in falsas[:15]:
        print("  FALSA", x["astronauta"], x["dia"], x["motor"], x["detalle"][:90])


if __name__ == "__main__":
    main()
