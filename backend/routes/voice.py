"""
Endpoints de análisis vocal:

  POST /voice/extract-freq   → recibe UN audio y retorna la frecuencia detectada
  POST /voice/analyze        → recibe {min_freq, max_freq, base_freq} como JSON,
                               clasifica el rango (reglas estáticas) y recomienda
                               las 3 canciones más compatibles con los modelos ML.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Header, Form
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import uuid, os, tempfile, subprocess
import numpy as np

from database import results_col, artists_col, users_col
from config import settings
from ml.song_matcher import get_top_songs

router = APIRouter()

logger = __import__("logging").getLogger(__name__)


# ── Auth opcional ──────────────────────────────────────────────────────────────
async def _optional_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    from jose import jwt
    from database import users_col
    try:
        token = authorization.split(" ", 1)[1]
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        uid = payload.get("sub")
        return await users_col.find_one({"_id": uid}) if uid else None
    except Exception:
        return None


# ── Carga de audio robusta ────────────────────────────────────────────────────
def _load_audio(file_path: str, sr: int = 22050):
    import librosa
    # librosa.load handles webm/opus via soundfile + audioread/ffmpeg internally
    try:
        y, _ = librosa.load(file_path, sr=sr, mono=True)
        return y, sr
    except Exception:
        pass
    # Manual ffmpeg fallback (pipe:1 is more portable than "-" on Windows)
    import imageio_ffmpeg
    result = subprocess.run(
        [imageio_ffmpeg.get_ffmpeg_exe(), "-i", file_path,
         "-f", "f32le", "-ac", "1", "-ar", str(sr), "-loglevel", "quiet", "pipe:1"],
        capture_output=True,
    )
    if result.returncode != 0 or len(result.stdout) == 0:
        raise ValueError("No se pudo decodificar el audio")
    return np.frombuffer(result.stdout, dtype=np.float32).copy(), sr


# ── Extracción de frecuencia según tipo de grabación ─────────────────────────
def _extract_freq(file_path: str, tipo: str) -> dict:
    """
    tipo = "min"  → percentil 10 de los frames con voz (nota más baja)
    tipo = "max"  → percentil 90 de los frames con voz (nota más alta)
    tipo = "base" → media   de los frames con voz (frase natural)

    Siempre retorna un dict con la frecuencia principal + estadísticas completas
    de los frames sonoros de esa grabación: p10, p90, mediana, rango.
    """
    import librosa
    y, sr = _load_audio(file_path)

    hop_length   = 512
    frame_length = 2048

    f0, voiced_flag, _ = librosa.pyin(
        y,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"),
        sr=sr,
        hop_length=hop_length,
        frame_length=frame_length,
    )

    # Filtro por energía: sólo frames donde el usuario realmente vocaliza.
    # Sin esto, el ruido de fondo (ventilador, AC ~100-130 Hz) domina voiced_flag.
    rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
    n   = min(len(f0), len(rms))
    f0  = f0[:n]
    rms = rms[:n]
    vf  = voiced_flag[:n] if voiced_flag is not None else np.ones(n, dtype=bool)

    # Umbral adaptativo: frames con energía en el 40 % superior
    energy_thresh  = np.percentile(rms, 60)
    high_energy    = rms >= energy_thresh
    voiced_f0      = f0[vf & high_energy & ~np.isnan(f0)]

    # Fallback progresivo si el filtro es demasiado estricto
    if len(voiced_f0) < 3:
        voiced_f0 = f0[vf & ~np.isnan(f0)]
    if len(voiced_f0) < 3:
        voiced_f0 = f0[~np.isnan(f0)]
    if len(voiced_f0) == 0:
        raise ValueError("No se detectó voz. Graba más cerca del micrófono.")

    p10     = round(float(np.percentile(voiced_f0, 10)), 2)
    p90     = round(float(np.percentile(voiced_f0, 90)), 2)
    mediana = round(float(np.median(voiced_f0)),         2)
    media   = round(float(np.mean(voiced_f0)),           2)
    rango   = round(p90 - p10, 2)

    if tipo == "min":
        freq = p10
    elif tipo == "max":
        freq = p90
    else:
        freq = media   # "base"

    return {
        "frequency": freq,
        "p10":       p10,
        "p90":       p90,
        "mediana":   mediana,
        "media":     media,
        "rango":     rango,
    }


# ── Mapeo Hz → nombre de nota (para el feedback) ─────────────────────────────
def _hz_to_note(hz: float) -> str:
    if hz <= 0:
        return "?"
    semitones = round(12 * np.log2(hz / 440.0))
    notes = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
    midi  = semitones + 69
    return f"{notes[midi % 12]}{(midi // 12) - 1}"


# ── ENDPOINT 1: extrae frecuencia de UNA grabación ───────────────────────────
@router.post("/extract-freq")
async def extract_freq(
    file: UploadFile = File(...),
    tipo: str = Form("base"),   # "min" | "max" | "base"
):
    if tipo not in ("min", "max", "base"):
        raise HTTPException(status_code=400, detail="tipo debe ser 'min', 'max' o 'base'")

    ext = os.path.splitext(file.filename)[1] if file.filename else ".wav"
    if not ext:
        ext = ".wav"

    content = await file.read()
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        stats = _extract_freq(tmp_path, tipo)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Error al procesar audio: {e}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    freq = stats["frequency"]
    return {
        "frequency": freq,
        "nota":      _hz_to_note(freq),
        "tipo":      tipo,
        "p10":       stats["p10"],
        "p90":       stats["p90"],
        "mediana":   stats["mediana"],
        "media":     stats["media"],
        "rango":     stats["rango"],
    }


# ── ENDPOINT 2: clasifica y recomienda a partir de las 3 frecuencias ─────────
class AnalyzeRequest(BaseModel):
    min_freq:  float
    max_freq:  float
    base_freq: float
    # Estadísticas adicionales provenientes de la grabación "base"
    median_freq:    Optional[float] = None  # mediana de los frames sonoros (base)
    p10_base:       Optional[float] = None  # percentil 10 de la grabación base
    p90_base:       Optional[float] = None  # percentil 90 de la grabación base
    rango_base:     Optional[float] = None  # rango (p90-p10) de la grabación base
    sex_filter:     Optional[str]   = None  # "M", "F" o None → enruta al modelo correcto


@router.post("/analyze")
async def analyze_voice(
    data: AnalyzeRequest,
    authorization: Optional[str] = Header(None),
):
    current_user          = await _optional_user(authorization)
    top_songs, model_used = get_top_songs(
        data.min_freq, data.max_freq, data.base_freq,
        sex_filter=data.sex_filter,
    )

    # Campos derivados siempre calculables
    rango_efectivo = round(data.max_freq - data.min_freq, 2)
    rango          = rango_efectivo  # span total min→max

    result_id  = None
    voice_range = None
    if current_user:
        result_id = str(uuid.uuid4())
        voice_range = {
            "min_freq":  data.min_freq,
            "max_freq":  data.max_freq,
            "base_freq": data.base_freq,
            "min_note":  _hz_to_note(data.min_freq),
            "max_note":  _hz_to_note(data.max_freq),
            "base_note": _hz_to_note(data.base_freq),
        }
        await results_col.insert_one({
            "_id":           result_id,
            "user_id":       current_user["_id"],
            "min_freq":      data.min_freq,
            "max_freq":      data.max_freq,
            "base_freq":     data.base_freq,
            "p10":           data.min_freq,
            "p90":           data.max_freq,
            "f_mediana":     data.median_freq,
            "p10_base":      data.p10_base,
            "p90_base":      data.p90_base,
            "rango_base":    data.rango_base,
            "rango_efectivo": rango_efectivo,
            "rango":          rango,
            "model_used":    model_used,
            "date":          datetime.utcnow(),
        })
        await users_col.update_one(
            {"_id": current_user["_id"]},
            {"$set": {"voice_range": voice_range}},
        )

    return {
        "min_freq":    data.min_freq,
        "max_freq":    data.max_freq,
        "base_freq":   data.base_freq,
        "top_songs":   top_songs,
        "model_used":  model_used,
        "saved":       current_user is not None,
        "result_id":   result_id,
        "voice_range": voice_range,
    }


# ── ENDPOINT 3: artista más similar ──────────────────────────────────────────
class ArtistMatchRequest(BaseModel):
    base_freq:   float
    min_freq:    float
    max_freq:    float
    median_freq: Optional[float] = None
    sex:         Optional[str]   = None  # "M" | "F" — None = comparar todos


def _artist_similarity(base_freq: float, min_freq: float, max_freq: float,
                        median_freq: Optional[float], artist: dict) -> float:
    """
    Devuelve un score de similitud 0-1 entre los datos del usuario y un artista.
    Pesos: F_prom 40%, P10 25%, P90 25%, F_mediana 10% (si disponible).
    """
    def feat_score(user_val: float, artist_val: float) -> float:
        denom = max(user_val, artist_val)
        if denom == 0:
            return 1.0
        return max(0.0, 1.0 - abs(user_val - artist_val) / denom)

    if median_freq is not None:
        score = (
            feat_score(base_freq,   artist["F_prom"])    * 0.40
            + feat_score(min_freq,  artist["P10"])        * 0.25
            + feat_score(max_freq,  artist["P90"])        * 0.25
            + feat_score(median_freq, artist["F_mediana"]) * 0.10
        )
    else:
        score = (
            feat_score(base_freq, artist["F_prom"]) * 0.50
            + feat_score(min_freq, artist["P10"])   * 0.25
            + feat_score(max_freq, artist["P90"])   * 0.25
        )
    return score


@router.post("/artist-match")
async def artist_match(data: ArtistMatchRequest):
    query: dict = {}
    if data.sex in ("M", "F"):
        query["sex"] = data.sex

    artists = await artists_col.find(query).to_list(length=100)
    if not artists:
        raise HTTPException(status_code=404, detail="No hay datos de artistas en la base de datos")

    best_artist = None
    best_score  = -1.0
    all_scores  = []

    for artist in artists:
        score = _artist_similarity(
            data.base_freq, data.min_freq, data.max_freq, data.median_freq, artist
        )
        all_scores.append(score)
        if score > best_score:
            best_score  = score
            best_artist = artist

    return {
        "artista":        best_artist["_id"],
        "genero_musical": best_artist["genero_musical"],
        "sex":            best_artist["sex"],
        "score":          round(best_score * 100, 1),
    }


# ── ENDPOINT DE DIAGNÓSTICO ───────────────────────────────────────────────────
@router.get("/debug-weka")
async def debug_weka():
    """
    Diagnóstico del bridge Weka. Llama a GET /voice/debug-weka para ver
    el estado de Java, el JAR y hacer una predicción de prueba.
    """
    from ml.weka_bridge import diagnose
    return diagnose()
