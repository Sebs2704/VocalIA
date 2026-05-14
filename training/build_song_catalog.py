"""
VocalIA — Construye songs_catalog.json a partir de features_vocales.csv.

Para cada canción única del dataset asigna features vocales (F_min, F_max, ...)
basándose en el rango vocal conocido del artista.

Uso:
    python build_song_catalog.py
    python build_song_catalog.py --csv ../backend/data/features_vocales.csv
"""
import argparse
import csv
import json
from pathlib import Path
from collections import Counter

CSV_PATH = Path("../backend/data/features_vocales.csv")
OUT_PATH = Path("../backend/data/songs_catalog.json")

# ── Features vocales representativas por artista ───────────────────────────────
# Campos: F_min, F_max, F_prom, F_mediana, P10, P90, rango, rango_efectivo,
#         rango_vocal, bpm
ARTIST_FEATURES: dict[str, dict] = {
    # ── Masculinos ─────────────────────────────────────────────────────────────
    "kevin kaarl": dict(
        F_min=108, F_max=262, F_prom=165, F_mediana=158, P10=108, P90=262,
        rango=154, rango_efectivo=142, rango_vocal="Barítono", bpm=82),
    "melendi": dict(
        F_min=110, F_max=330, F_prom=200, F_mediana=188, P10=110, P90=330,
        rango=220, rango_efectivo=196, rango_vocal="Barítono", bpm=96),
    "manuel medrano": dict(
        F_min=104, F_max=277, F_prom=166, F_mediana=156, P10=104, P90=277,
        rango=173, rango_efectivo=154, rango_vocal="Barítono", bpm=86),
    "alex ubago": dict(
        F_min=118, F_max=370, F_prom=220, F_mediana=207, P10=118, P90=370,
        rango=252, rango_efectivo=224, rango_vocal="Barítono", bpm=88),
    "josean log": dict(
        F_min=98,  F_max=294, F_prom=174, F_mediana=164, P10=98,  P90=294,
        rango=196, rango_efectivo=174, rango_vocal="Barítono", bpm=83),
    "vicente fernandez": dict(
        F_min=118, F_max=349, F_prom=207, F_mediana=196, P10=118, P90=349,
        rango=231, rango_efectivo=205, rango_vocal="Barítono", bpm=79),
    "milo j": dict(
        F_min=155, F_max=440, F_prom=262, F_mediana=248, P10=155, P90=440,
        rango=285, rango_efectivo=254, rango_vocal="Tenor", bpm=100),
    "jung kook": dict(
        F_min=138, F_max=440, F_prom=261, F_mediana=246, P10=138, P90=440,
        rango=302, rango_efectivo=268, rango_vocal="Tenor", bpm=112),
    "shawn mendes": dict(
        F_min=130, F_max=415, F_prom=246, F_mediana=232, P10=130, P90=415,
        rango=285, rango_efectivo=254, rango_vocal="Barítono", bpm=106),
    "michael jackson": dict(
        F_min=154, F_max=523, F_prom=330, F_mediana=310, P10=154, P90=523,
        rango=369, rango_efectivo=328, rango_vocal="Tenor", bpm=116),
    # ── Femeninas ──────────────────────────────────────────────────────────────
    "rihanna": dict(
        F_min=196, F_max=523, F_prom=330, F_mediana=311, P10=196, P90=523,
        rango=327, rango_efectivo=291, rango_vocal="Mezzosoprano", bpm=121),
    "mitski": dict(
        F_min=174, F_max=523, F_prom=294, F_mediana=280, P10=174, P90=523,
        rango=349, rango_efectivo=310, rango_vocal="Mezzosoprano", bpm=94),
    "lana del rey": dict(
        F_min=175, F_max=523, F_prom=294, F_mediana=279, P10=175, P90=523,
        rango=348, rango_efectivo=309, rango_vocal="Mezzosoprano", bpm=76),
    "amy winehouse": dict(
        F_min=155, F_max=440, F_prom=247, F_mediana=234, P10=155, P90=440,
        rango=285, rango_efectivo=254, rango_vocal="Contralto", bpm=103),
    "greeicy": dict(
        F_min=220, F_max=587, F_prom=349, F_mediana=330, P10=220, P90=587,
        rango=367, rango_efectivo=326, rango_vocal="Mezzosoprano", bpm=118),
    "shakira": dict(
        F_min=196, F_max=587, F_prom=349, F_mediana=330, P10=196, P90=587,
        rango=391, rango_efectivo=347, rango_vocal="Mezzosoprano", bpm=113),
    "paquita la del barrio": dict(
        F_min=175, F_max=466, F_prom=294, F_mediana=277, P10=175, P90=466,
        rango=291, rango_efectivo=259, rango_vocal="Contralto", bpm=91),
    "laufey": dict(
        F_min=220, F_max=700, F_prom=415, F_mediana=400, P10=220, P90=700,
        rango=480, rango_efectivo=431, rango_vocal="Soprano", bpm=86),
    "celia cruz": dict(
        F_min=233, F_max=698, F_prom=415, F_mediana=396, P10=233, P90=698,
        rango=465, rango_efectivo=416, rango_vocal="Soprano", bpm=141),
    "adele": dict(
        F_min=175, F_max=587, F_prom=349, F_mediana=330, P10=175, P90=587,
        rango=412, rango_efectivo=368, rango_vocal="Mezzosoprano", bpm=72),
}

# Fallback si no se reconoce el artista
_DEFAULT = dict(
    F_min=150, F_max=420, F_prom=245, F_mediana=230, P10=150, P90=420,
    rango=270, rango_efectivo=240, rango_vocal="Mezzosoprano", bpm=90)


def extract_artist(nombre: str) -> str:
    """Extrae artista del formato 'Cancion - Artista'. Fallback: detecta artista por nombre."""
    parts = nombre.strip().rsplit(" - ", 1)
    if len(parts) > 1:
        return parts[-1].strip().lower()
    # Buscar artista conocido dentro del nombre si no hay separador
    lower = nombre.lower()
    for artist in ARTIST_FEATURES:
        if artist in lower:
            return artist
    return ""


def build(csv_path: Path, out_path: Path) -> None:
    print(f"Leyendo: {csv_path}")
    seen: dict[str, str] = {}
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            nombre = row["Nombre_cancion"].strip()
            if nombre not in seen:
                seen[nombre] = nombre

    catalog = []
    unknown_artists: list[str] = []

    for nombre in seen:
        artist = extract_artist(nombre)
        feats  = ARTIST_FEATURES.get(artist)
        if feats is None:
            # Intentar sin espacios extra o trailing
            artist_stripped = artist.rstrip()
            feats = ARTIST_FEATURES.get(artist_stripped)
        if feats is None:
            unknown_artists.append(f"  artista='{artist}'  cancion='{nombre}'")
            feats = _DEFAULT
        catalog.append({"nombre": nombre, **feats})

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    print(f"\nCatalogo guardado: {out_path.resolve()}")
    print(f"   Total canciones: {len(catalog)}")
    ranges = Counter(s["rango_vocal"] for s in catalog)
    for rng, cnt in sorted(ranges.items(), key=lambda x: -x[1]):
        print(f"   {rng:20s}: {cnt}")

    if unknown_artists:
        print(f"\nADVERTENCIA: {len(unknown_artists)} artistas sin perfil (usaron fallback):")
        for u in unknown_artists[:20]:
            print(u)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv",    default=str(CSV_PATH))
    parser.add_argument("--output", default=str(OUT_PATH))
    args = parser.parse_args()
    build(Path(args.csv), Path(args.output))
