"""Convierte los CSV reales de Inspiration4 (NASA OSDR) a un JSON limpio para la app.

Fuentes:
  OSD-575  LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv
  OSD-569  LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv

Salida: datos/reales/inspiration4.json
  { variables: {id: {nombre, unidad, rango:[min,max], panel}},
    tripulantes: {C001: {var: [{t:"L-92", dia:-92, valor:..}, ...]}} }
"""
import csv
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
OSDR = RAIZ / "recursos_nasa" / "08_osdr_datos_biologicos"
SALIDA = RAIZ / "datos" / "reales" / "inspiration4.json"

ARCHIVOS = {
    "CMP": OSDR / "OSD-575_I4_panel_metabolico_y_citoquinas" / "LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv",
    "CBC": OSDR / "OSD-569_I4_sangre_completa_hemograma" / "LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv",
}

# Variables que usará la app: id -> (columna base en el CSV, nombre legible, unidad)
VARIABLES = {
    "glucosa": ("glucose", "Glucose", "mg/dL"),
    "sodio": ("sodium", "Sodium", "mmol/L"),
    "potasio": ("potassium", "Potassium", "mmol/L"),
    "cloro": ("chloride", "Chloride", "mmol/L"),
    "calcio": ("calcium", "Calcium", "mg/dL"),
    "co2": ("carbon_dioxide", "CO2 (bicarbonate)", "mmol/L"),
    "bun": ("urea_nitrogen_bun", "Blood urea nitrogen", "mg/dL"),
    "creatinina": ("creatinine", "Creatinine", "mg/dL"),
    "albumina": ("albumin", "Albumin", "g/dL"),
    "alt": ("alt", "ALT (liver)", "U/L"),
    "ast": ("ast", "AST (liver)", "U/L"),
    "hemoglobina": ("hemoglobin", "Hemoglobin", "g/dL"),
    "hematocrito": ("hematocrit", "Hematocrit", "%"),
    "leucocitos": ("white_blood_cell_count", "White blood cells", "10^3/µL"),
    "linfocitos": ("absolute_lymphocytes", "Lymphocytes", "cells/µL"),
    "neutrofilos": ("absolute_neutrophils", "Neutrophils", "cells/µL"),
    "monocitos_pct": ("monocytes_percent", "Monocytes", "%"),
    "plaquetas": ("platelet_count", "Platelets", "10^3/µL"),
}


def numero(texto):
    try:
        return float(texto)
    except (TypeError, ValueError):
        return None


def columnas(cabecera, base):
    """Devuelve (col_valor, col_min, col_max) para una variable base."""
    valor = next((c for c in cabecera if c.startswith(base + "_value")), None)
    minimo = next((c for c in cabecera if c.startswith(base + "_range_min")), None)
    maximo = next((c for c in cabecera if c.startswith(base) and ("_range_max" in c or c.startswith(base + "_max"))), None)
    return valor, minimo, maximo


def cargar():
    variables, tripulantes = {}, {}
    for panel, ruta in ARCHIVOS.items():
        filas = list(csv.DictReader(open(ruta, encoding="utf-8-sig")))
        cabecera = filas[0].keys()
        for vid, (base, nombre, unidad) in VARIABLES.items():
            cv, cmin, cmax = columnas(cabecera, base)
            if not cv:
                continue
            variables[vid] = {
                "nombre": nombre,
                "unidad": unidad,
                "rango": [numero(filas[0].get(cmin)), numero(filas[0].get(cmax))],
                "panel": panel,
            }
            for fila in filas:
                m = re.match(r"(C00\d)_.*?([LR])([+-]\d+)", fila["Sample Name"])
                tripulante, signo, dias = m.group(1), m.group(2), int(m.group(3))
                valor = numero(fila[cv])
                if valor is None:
                    continue
                dia = dias if signo == "L" else dias  # L-92 -> -92 ; R+1 -> +1 (días respecto al vuelo)
                tripulantes.setdefault(tripulante, {}).setdefault(vid, []).append(
                    {"t": f"{signo}{m.group(3)}", "dia": dia, "valor": valor}
                )
    for t in tripulantes.values():
        for serie in t.values():
            serie.sort(key=lambda p: p["dia"])
    return {
        "fuente": "NASA OSDR OSD-575 / OSD-569, SpaceX Inspiration4 (3-day orbital flight, Sept 2021)",
        "nota": "Real data. Days are relative to launch (L-) and return (R+).",
        "variables": variables,
        "tripulantes": tripulantes,
    }


if __name__ == "__main__":
    datos = cargar()
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(json.dumps(datos, ensure_ascii=False, indent=1))
    n = sum(len(s) for t in datos["tripulantes"].values() for s in t.values())
    print(f"{len(datos['variables'])} variables, {len(datos['tripulantes'])} tripulantes, {n} valores -> {SALIDA}")
