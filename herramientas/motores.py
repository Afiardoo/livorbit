"""Motores de análisis de salud (versión de referencia en Python).

La app web usará la misma lógica portada a JavaScript. Aquí se valida con datos reales y sintéticos.

  Motor A  desviacion_personal  -> compara una medición con la línea base de la persona
  Motor B  tendencia            -> proyecta cuándo una serie cruzará un umbral
  Motor D  news2                -> puntaje de alerta temprana (NEWS2, Royal College of Physicians 2017)
  (El Motor C, gemelo fisiológico, vive en generar_sintetico.py: son las tasas de NASA.)
"""
import statistics as st

# ---------------------------------------------------------------- Motor A
NIVELES = [(3.0, "WARNING"), (2.0, "CAUTION")]


def linea_base(valores):
    """Media de las mediciones de referencia (pre-vuelo)."""
    return st.mean(valores)


def desviacion_personal(valor, base, cv_intra, n_base=3, piso_cv=0.03):
    """Puntuación z respecto a la normalidad de la persona.

    cv_intra: variabilidad natural de esa variable dentro de una misma persona
              (coeficiente de variación, p. ej. 0.11 = 11 %). Se estima de los datos
              reales pre-vuelo agrupando a toda la tripulación, porque 3 tomas por
              persona son muy pocas para estimar su propia desviación.
    n_base:   cuántas mediciones forman la línea base. Con pocas mediciones la media
              también es incierta, así que la dispersión esperada se amplía por
              sqrt(1 + 1/n_base) (error de predicción de una nueva observación).
    """
    sd = abs(base) * max(cv_intra, piso_cv) * (1 + 1 / n_base) ** 0.5
    z = (valor - base) / sd if sd else 0.0
    nivel = next((n for umbral, n in NIVELES if abs(z) >= umbral), "NOMINAL")
    return {"z": round(z, 2), "cambio_pct": round((valor - base) / base * 100, 1), "nivel": nivel}


def fuera_de_rango(valor, rango):
    lo, hi = rango
    return (lo is not None and valor < lo) or (hi is not None and valor > hi)


# ---------------------------------------------------------------- Motor B
def tendencia(dias, valores, umbral, ventana=7):
    """Regresión lineal sobre las últimas `ventana` mediciones.

    Devuelve la pendiente por día y en cuántos días se cruzará `umbral`
    (None si la tendencia no va hacia el umbral o es despreciable).
    """
    x, y = dias[-ventana:], valores[-ventana:]
    if len(x) < 3:
        return None
    mx, my = st.mean(x), st.mean(y)
    sxx = sum((a - mx) ** 2 for a in x)
    if sxx == 0:
        return None
    pendiente = sum((a - mx) * (b - my) for a, b in zip(x, y)) / sxx
    syy = sum((b - my) ** 2 for b in y)
    r2 = (pendiente ** 2 * sxx / syy) if syy else 0.0  # qué tan consistente es la tendencia (0–1)
    actual = my + pendiente * (x[-1] - mx)
    if pendiente == 0 or (umbral - actual) / pendiente <= 0:
        return {"pendiente": pendiente, "r2": r2, "dias_hasta_umbral": None}
    return {"pendiente": pendiente, "r2": r2, "dias_hasta_umbral": round((umbral - actual) / pendiente, 1)}


def linea_base_adaptativa(dias, valores, dia_actual, adaptacion=14, ventana=30, excluir=3):
    """Línea base que se recalibra en vuelo.

    El cuerpo cambia de forma esperada en el espacio (p. ej., baja la presión). Comparar
    siempre con la Tierra generaría falsas alarmas. Pasado el periodo de adaptación, la base
    es la media de los últimos `ventana` días, sin contar los `excluir` más recientes
    (para no "absorber" un cambio que está empezando).
    Devuelve (media, desviación, n).
    """
    if dia_actual < adaptacion:
        sel = [v for d, v in zip(dias, valores) if d < 0]
    else:
        sel = [v for d, v in zip(dias, valores) if dia_actual - ventana - excluir <= d < dia_actual - excluir and d >= adaptacion // 2]
    if len(sel) < 5:
        sel = [v for d, v in zip(dias, valores) if d < 0]
    return st.mean(sel), st.stdev(sel), len(sel)


# ---------------------------------------------------------------- Motor D
def _puntos(valor, tabla):
    for limite, puntos in tabla:
        if valor <= limite:
            return puntos
    return tabla[-1][1]


# Tablas NEWS2 (escala 1 de SpO2). Cada par = (valor máximo del tramo, puntos).
TABLA_FR = [(8, 3), (11, 1), (20, 0), (24, 2), (999, 3)]
TABLA_SPO2 = [(91, 3), (93, 2), (95, 1), (100, 0)]
TABLA_PAS = [(90, 3), (100, 2), (110, 1), (219, 0), (999, 3)]
TABLA_FC = [(40, 3), (50, 1), (90, 0), (110, 1), (130, 2), (999, 3)]
TABLA_TEMP = [(35.0, 3), (36.0, 1), (38.0, 0), (39.0, 1), (99, 2)]


def news2(fr, spo2, pas, fc, temp, oxigeno=False, consciente=True):
    partes = {
        "respiracion": _puntos(fr, TABLA_FR),
        "spo2": _puntos(spo2, TABLA_SPO2),
        "oxigeno": 2 if oxigeno else 0,
        "presion": _puntos(pas, TABLA_PAS),
        "pulso": _puntos(fc, TABLA_FC),
        "conciencia": 0 if consciente else 3,
        "temperatura": _puntos(temp, TABLA_TEMP),
    }
    total = sum(partes.values())
    if total >= 7:
        nivel = "WARNING"  # NEWS2 alto: respuesta de emergencia
    elif total >= 5 or max(partes.values()) == 3:
        nivel = "CAUTION"  # NEWS2 medio / un parámetro extremo: evaluación urgente
    else:
        nivel = "NOMINAL"
    return {"total": total, "partes": partes, "nivel": nivel}
