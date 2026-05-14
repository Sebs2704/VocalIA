"""
Recomendación de canciones.

Flujo:
  1. Weka subprocess (modelo .model original via Java CLI)
  2. sklearn MLP (equivalente entrenado con mismos datos ARFF)
  3. Reglas de overlap como último recurso

El score de COMPATIBILIDAD que se muestra al usuario NO es la probabilidad
raw del MLP (eso da distribuciones 75%/17%/2% imposibles de interpretar).
En su lugar se usa un score de overlap real entre las frecuencias del
usuario y las del catálogo de canciones.
"""
import json
import logging
import pickle
import unicodedata
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)

MODELS_DIR   = Path(__file__).parent / "models"
MLP_PATH     = MODELS_DIR / "mlp_songs.pkl"
CATALOG_PATH = Path(__file__).parent.parent / "data" / "songs_catalog.json"

# ── Mapas de artistas por sexo (normalizados sin tildes) ──────────────────────
_MALE_ARTISTS: set[str] = {
    "kevin kaarl", "melendi", "manuel medrano", "alex ubago", "josean log",
    "vicente fernandez", "milo j", "jung kook", "shawn mendes", "michael jackson",
}
_FEMALE_ARTISTS: set[str] = {
    "rihanna", "mitski", "lana del rey", "amy winehouse", "greeicy",
    "shakira", "paquita la del barrio", "laufey", "celia cruz", "adele",
}


def _norm(s: str) -> str:
    return unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode().strip()


def _song_sex(nombre: str) -> str | None:
    """Devuelve 'M', 'F' o None si el artista no está en el catálogo."""
    artist = nombre[nombre.rfind(" - ") + 3:].strip() if " - " in nombre else nombre.strip()
    a = _norm(artist)
    if a in _MALE_ARTISTS:
        return "M"
    if a in _FEMALE_ARTISTS:
        return "F"
    for k in _MALE_ARTISTS:
        if k in a or a in k:
            return "M"
    for k in _FEMALE_ARTISTS:
        if k in a or a in k:
            return "F"
    return None

_bundle_cache: dict | None = None
_songs_cache:  list | None = None


def _load_bundle() -> dict | None:
    global _bundle_cache
    if _bundle_cache is None and MLP_PATH.exists():
        with open(MLP_PATH, "rb") as f:
            _bundle_cache = pickle.load(f)
    return _bundle_cache


def _load_catalog() -> list:
    global _songs_cache
    if _songs_cache is None:
        if CATALOG_PATH.exists():
            with open(CATALOG_PATH, encoding="utf-8") as f:
                _songs_cache = json.load(f)
        else:
            _songs_cache = []
    return _songs_cache


def _catalog_index() -> dict[str, dict]:
    return {s["nombre"]: s for s in _load_catalog()}


def _build_features(u_min: float, u_max: float, u_base: float) -> np.ndarray:
    """
    8 features para el MLP. Garantiza F_min <= F_prom <= F_max.
    Orden igual al ARFF de entrenamiento Weka.
    """
    f_min  = min(u_min, u_base)
    f_max  = max(u_max, u_base)
    f_prom = u_base
    rango  = f_max - f_min
    return np.array([[
        f_min, f_max, f_prom, f_prom,
        f_min, f_max, rango,  rango,
    ]])


def _overlap_score(u_min: float, u_max: float, u_base: float, song: dict) -> float:
    """
    Score real de compatibilidad entre las frecuencias del usuario y la canción.
    Devuelve un valor [0, 1] que tiene sentido como porcentaje de compatibilidad.
    """
    s_min  = song.get("P10",   song.get("F_min",  0))
    s_max  = song.get("P90",   song.get("F_max",  0))
    s_base = song.get("F_prom", 0)

    # Qué tanto se superpone el rango del usuario con el rango de la canción
    rng = s_max - s_min
    if rng > 0:
        ol      = min(u_max, s_max) - max(u_min, s_min)
        overlap = max(0.0, min(1.0, ol / rng))
    else:
        overlap = 0.0

    # Qué tan cerca está la voz base del usuario a la base de la canción
    max_b = max(u_base, s_base)
    if max_b > 0:
        prox = max(0.0, 1.0 - abs(u_base - s_base) / max_b * 2)
    else:
        prox = 0.0

    return 0.65 * overlap + 0.35 * prox


def _enrich_with_overlap(
    ranked_names: list[str],
    u_min: float, u_max: float, u_base: float,
    idx: dict[str, dict],
) -> list[dict]:
    """
    Dada una lista de nombres de canciones ya ordenados por el modelo,
    calcula el score de overlap real para cada una y las devuelve
    ordenadas por ese score (preservando el filtrado del modelo).
    """
    results = []
    for name in ranked_names:
        meta  = idx.get(name, {})
        score = _overlap_score(u_min, u_max, u_base, meta)
        results.append({
            "nombre":         name,
            "freq_min":       meta.get("F_min", 0),
            "freq_max":       meta.get("F_max", 0),
            "freq_base":      meta.get("F_prom", 0),
            "bpm":            meta.get("bpm", 0),
            "compatibilidad": round(score * 100, 1),
        })
    # Re-ordenar por overlap score (el modelo seleccionó las canciones,
    # el overlap score determina el porcentaje que ve el usuario)
    results.sort(key=lambda x: x["compatibilidad"], reverse=True)
    return results


# ── API pública ───────────────────────────────────────────────────────────────
def get_top_songs(
    u_min: float, u_max: float, u_base: float,
    n: int = 3,
    sex_filter: str | None = None,   # "M", "F" o None
) -> tuple[list, str]:
    """
    Retorna (canciones, modelo_usado).
    Prioridad: 1) Weka subprocess  2) sklearn MLP  3) overlap puro
    El porcentaje de compatibilidad siempre es el score de overlap real.
    """
    catalog = _load_catalog()
    if not catalog:
        return [], "none"

    idx = _catalog_index()

    # Cuántos candidatos pedirle al modelo (más para luego re-rankear por overlap)
    candidates = n * 4

    # 1) Weka subprocess (modelo .model original entrenado en Weka)
    try:
        from ml.weka_bridge import predict_top_songs as weka_predict, is_available as weka_ok  # noqa
        if weka_ok():
            weka_pairs = weka_predict(u_min, u_max, u_base, candidates, sex_filter=sex_filter)
            if weka_pairs:
                names = [name for name, _ in weka_pairs]
                return _enrich_with_overlap(names, u_min, u_max, u_base, idx)[:n], "weka"
            else:
                logger.warning("Weka is_available=True pero predict devolvió lista vacía")
        else:
            logger.info("Weka no disponible (Java/JAR/modelo no encontrado), usando sklearn")
    except Exception as exc:
        logger.error("Excepción al llamar Weka: %s", exc, exc_info=True)

    # 2) sklearn MLP (equivalente entrenado con el mismo ARFF)
    bundle = _load_bundle()
    if bundle is not None:
        features = _build_features(u_min, u_max, u_base)
        X_sc     = bundle["scaler"].transform(features)
        proba    = bundle["model"].predict_proba(X_sc)[0]
        classes  = bundle["label_encoder"].classes_
        pairs    = list(zip(classes, proba))
        if sex_filter:
            pairs = [(c, p) for c, p in pairs if _song_sex(c) in (sex_filter, None)]
        top   = sorted(pairs, key=lambda x: x[1], reverse=True)[:candidates]
        names = [name for name, _ in top]
        return _enrich_with_overlap(names, u_min, u_max, u_base, idx)[:n], "sklearn"

    # 3) Fallback: overlap puro sobre todo el catálogo
    filtered_catalog = (
        [s for s in catalog if _song_sex(s["nombre"]) in (sex_filter, None)]
        if sex_filter else catalog
    )
    scored = []
    for song in filtered_catalog:
        score = _overlap_score(u_min, u_max, u_base, song)
        scored.append({
            "nombre":         song["nombre"],
            "freq_min":       song.get("F_min", 0),
            "freq_max":       song.get("F_max", 0),
            "freq_base":      song.get("F_prom", 0),
            "bpm":            song.get("bpm", 0),
            "compatibilidad": round(score * 100, 1),
        })
    scored.sort(key=lambda x: x["compatibilidad"], reverse=True)
    return scored[:n], "rules"


def load_songs() -> list:
    """Catálogo completo para la API /songs/."""
    return [
        {
            "nombre":    s["nombre"],
            "freq_min":  s.get("F_min", 0),
            "freq_max":  s.get("F_max", 0),
            "freq_base": s.get("F_prom", 0),
            "bpm":       s.get("bpm", 0),
        }
        for s in _load_catalog()
    ]


def reload_songs() -> list:
    global _bundle_cache, _songs_cache
    _bundle_cache = None
    _songs_cache  = None
    return load_songs()
