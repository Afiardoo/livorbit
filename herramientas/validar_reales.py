"""Valida el Motor A (desviación personal) con los datos reales de Inspiration4.

Preguntas:
  1. Falsas alarmas: con datos pre-vuelo (sin cambio real), ¿cuántas veces alerta?
     Prueba "dejar uno fuera": la línea base usa 2 tomas pre-vuelo y se evalúa la tercera.
  2. Detección: en R+1 (el día después de volver), ¿qué cambios detecta
     frente al método clásico de "fuera del rango normal"?

La variabilidad intrapersonal (cv_intra) de cada tripulante se estima con los OTROS
tres tripulantes, para no evaluar con los mismos datos con los que se calibró.

Salidas:
  datos/reales/variabilidad_intrapersonal.json  (la usa el generador sintético y la app)
  VALIDACION.md (sección de datos reales)
"""
import json
import statistics as st
from pathlib import Path

from motores import desviacion_personal, fuera_de_rango

RAIZ = Path(__file__).resolve().parent.parent
DATOS = json.loads((RAIZ / "datos" / "reales" / "inspiration4.json").read_text())
PRE = ["L-92", "L-44", "L-3"]


def serie(trip, var):
    return {p["t"]: p["valor"] for p in DATOS["tripulantes"][trip].get(var, [])}


def cv_de(trip, var):
    v = serie(trip, var)
    pre = [v[t] for t in PRE if t in v]
    if len(pre) < 3 or st.mean(pre) == 0:
        return None
    return st.stdev(pre) / st.mean(pre)  # desviación muestral (n-1)


def cv_agrupado(var, excluir=None):
    cvs = [cv_de(t, var) for t in DATOS["tripulantes"] if t != excluir]
    cvs = [c for c in cvs if c is not None]
    return st.mean(cvs) if cvs else None


def main():
    tripulantes = sorted(DATOS["tripulantes"])
    variables = DATOS["variables"]

    # Variabilidad agrupada con toda la tripulación (para usos posteriores)
    variabilidad = {v: round(cv_agrupado(v), 4) for v in variables if cv_agrupado(v) is not None}
    (RAIZ / "datos" / "reales" / "variabilidad_intrapersonal.json").write_text(
        json.dumps({"nota": "Pooled within-person coefficient of variation, Inspiration4 pre-flight (L-92, L-44, L-3)",
                    "cv_intra": variabilidad}, indent=1))

    # 1. Falsas alarmas pre-vuelo
    pruebas = alertas = graves = 0
    for trip in tripulantes:
        for var in variables:
            v = serie(trip, var)
            cv = cv_agrupado(var, excluir=trip)
            if cv is None or not all(t in v for t in PRE):
                continue
            for prueba in PRE:
                base = st.mean(v[t] for t in PRE if t != prueba)
                r = desviacion_personal(v[prueba], base, cv, n_base=2)
                pruebas += 1
                alertas += r["nivel"] != "NOMINAL"
                graves += r["nivel"] == "WARNING"
    tasa_falsas = alertas / pruebas * 100

    # 2. Detección en R+1
    filas, n_personal, n_rango = [], 0, 0
    for var in variables:
        for trip in tripulantes:
            v = serie(trip, var)
            cv = cv_agrupado(var, excluir=trip)
            if cv is None or "R+1" not in v or not all(t in v for t in PRE):
                continue
            r = desviacion_personal(v["R+1"], st.mean(v[t] for t in PRE), cv, n_base=3)
            rango = fuera_de_rango(v["R+1"], variables[var]["rango"])
            n_personal += r["nivel"] != "NOMINAL"
            n_rango += rango
            if r["nivel"] != "NOMINAL" or rango:
                filas.append((var, trip, v["R+1"], r, rango))

    # Informe
    lineas = [
        "## A. Validación con datos reales (Inspiration4, NASA OSDR)",
        "",
        f"**Falsas alarmas pre-vuelo:** {alertas} de {pruebas} pruebas ({tasa_falsas:.1f} %) en total; "
        f"solo {graves} ({graves / pruebas * 100:.1f} %) fueron WARNING. "
        "Antes del vuelo no hubo exposición espacial, así que cualquier alerta ahí es falsa.",
        "",
        f"**Día después del regreso (R+1):** el detector personal marcó **{n_personal}** cambios; "
        f"el método clásico de 'fuera del rango normal' marcó **{n_rango}**.",
        "",
        "| Variable | Tripulante | Valor R+1 | Cambio vs su base | z | Detector personal | ¿Fuera de rango normal? |",
        "|---|---|---|---|---|---|---|",
    ]
    for var, trip, valor, r, rango in sorted(filas, key=lambda f: -abs(f[3]["z"])):
        u = variables[var]["unidad"]
        lineas.append(f"| {variables[var]['nombre']} | {trip} | {valor:g} {u} | {r['cambio_pct']:+.0f} % | "
                      f"{r['z']:+.1f} | {r['nivel']} | {'sí' if rango else 'no'} |")
    solo_personal = sum(1 for f in filas if f[3]["nivel"] != "NOMINAL" and not f[4])
    lineas += [
        "",
        f"**{solo_personal}** de esos cambios **no** habrían sido detectados con el rango normal "
        "poblacional: el valor seguía 'normal' en general, pero era anormal para esa persona.",
        "",
        "Método: puntuación z = (valor − media pre-vuelo de la persona) / (media × CV intrapersonal). "
        "La dispersión se amplía por √(1+1/n) porque la línea base tiene pocas tomas. CAUTION si |z| ≥ 2, WARNING si |z| ≥ 3. El CV de cada tripulante se calcula con los otros tres.",
        "",
    ]
    (RAIZ / "datos" / "reales" / "_validacion_reales.md").write_text("\n".join(lineas))
    print("\n".join(lineas))


if __name__ == "__main__":
    main()
