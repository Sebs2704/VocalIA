from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from datetime import datetime
import uuid, os, tempfile
import numpy as np
from database import dataset_col

router = APIRouter()

DATASET_DIR = "dataset_audio/grabaciones"
os.makedirs(DATASET_DIR, exist_ok=True)

# ── Frecuencias de referencia por nota (Hz) ──────────────────────────────────
NOTE_FREQUENCIES: dict[str, float] = {
    "C2": 65.41,  "D2": 73.42,  "E2": 82.41,  "F2": 87.31,
    "G2": 98.00,  "A2": 110.00, "B2": 123.47,
    "C3": 130.81, "D3": 146.83, "E3": 164.81, "F3": 174.61,
    "G3": 196.00, "A3": 220.00, "B3": 246.94,
    "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23,
    "G4": 392.00, "A4": 440.00, "B4": 493.88,
    "C5": 523.25, "D5": 587.33, "E5": 659.25,
}

def cents_deviation(f_real: float, f_ref: float) -> float:
    """Desviación en cents: 100 cents = 1 semitono."""
    if f_ref <= 0 or f_real <= 0:
        return 0.0
    return 1200 * np.log2(f_real / f_ref)

def pitch_rating(cents: float) -> str:
    """
    Calificación humana de afinación.
    Margen ±50 cents = dentro del semitono (aceptable para voz humana).
    """
    abs_cents = abs(cents)
    if abs_cents <= 20:
        return "Excelente"
    elif abs_cents <= 50:
        return "Buena"
    elif abs_cents <= 100:
        return "Regular"
    else:
        return "Desafinado"

def analyze_pitch(file_path: str, nota_ref: str) -> dict:
    """
    Analiza el pitch de la grabación y lo compara con la nota de referencia.
    Usa librosa.pyin (probabilistic YIN) para extracción robusta de F0.
    """
    import librosa

    y, sr = librosa.load(file_path, sr=None, mono=True)

    # pyin: más robusto que yin para voces
    f0, voiced_flag, voiced_probs = librosa.pyin(
        y,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C6"),
        sr=sr,
    )

    # Solo frames con voz detectada
    voiced_f0 = f0[voiced_flag] if voiced_flag is not None else f0[~np.isnan(f0)]

    if voiced_f0 is None or len(voiced_f0) == 0:
        raise ValueError("No se detectó voz en el audio")

    median_f0  = float(np.median(voiced_f0))
    mean_f0    = float(np.mean(voiced_f0))
    min_f0     = float(np.min(voiced_f0))
    max_f0     = float(np.max(voiced_f0))
    # Estabilidad: menor std relativa = más estable
    stability  = float(1 - min(np.std(voiced_f0) / mean_f0, 1)) if mean_f0 > 0 else 0.0

    # Comparación con nota de referencia
    ref_hz = NOTE_FREQUENCIES.get(nota_ref)
    comparison = None
    if ref_hz:
        cents = cents_deviation(median_f0, ref_hz)
        comparison = {
            "nota_ref": nota_ref,
            "ref_hz": round(ref_hz, 2),
            "detected_hz": round(median_f0, 2),
            "cents_deviation": round(cents, 1),
            "rating": pitch_rating(cents),
            "en_rango_humano": abs(cents) <= 100,  # ±1 semitono = margen humano
        }

    return {
        "median_hz": round(median_f0, 2),
        "mean_hz": round(mean_f0, 2),
        "min_hz": round(min_f0, 2),
        "max_hz": round(max_f0, 2),
        "stability": round(stability, 3),   # 0–1 (1 = perfectamente estable)
        "voiced_frames": int(len(voiced_f0)),
        "comparison": comparison,
    }


@router.post("/submit", status_code=201)
async def submit_sample(
    file: UploadFile = File(...),
    sex: str = Form(...),           # "hombre" | "mujer"
    session_id: str = Form(...),    # ID anónimo generado en el frontend
    nota: str = Form(...),          # Ej: "A4"
    intentos: int = Form(1),
):
    """
    Recibe una grabación anónima guiada por nota.
    - Guarda el audio como .webm (luego se puede convertir a .wav con ffmpeg).
    - Analiza el pitch y lo compara con la nota de referencia.
    - Todos los audios de una sesión comparten session_id (trazabilidad).
    """
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Se requiere un archivo de audio")

    sample_id = str(uuid.uuid4())
    suffix = os.path.splitext(file.filename)[1] or ".webm"
    filename = f"{session_id}_{nota}_{sample_id}{suffix}"

    # Carpeta organizada por sesión y sexo
    carpeta = os.path.join(DATASET_DIR, sex, session_id)
    os.makedirs(carpeta, exist_ok=True)
    dest = os.path.join(carpeta, filename)

    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)

    # Análisis de pitch (en archivo temporal para librosa)
    pitch_data = None
    analysis_error = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        pitch_data = analyze_pitch(tmp_path, nota)
        os.unlink(tmp_path)
    except Exception as e:
        analysis_error = str(e)

    doc = {
        "_id": sample_id,
        "session_id": session_id,
        "sex": sex,
        "nota": nota,
        "intentos": intentos,
        "filename": filename,
        "filepath": dest,
        "file_size": len(content),
        "submitted_at": datetime.utcnow(),
        "labeled": False,
        "label": None,
        # Análisis de frecuencia
        "pitch": pitch_data,
        "analysis_error": analysis_error,
    }
    await dataset_col.insert_one(doc)

    response = {
        "sample_id": sample_id,
        "message": "Muestra guardada correctamente",
    }
    if pitch_data and pitch_data.get("comparison"):
        response["analysis"] = pitch_data["comparison"]
    if analysis_error:
        response["analysis_warning"] = f"Audio guardado, pero análisis falló: {analysis_error}"

    return response


@router.get("/stats")
async def dataset_stats():
    """Estadísticas del dataset para el panel de administración."""
    total    = await dataset_col.count_documents({})
    labeled  = await dataset_col.count_documents({"labeled": True})
    hombre   = await dataset_col.count_documents({"sex": "hombre"})
    mujer    = await dataset_col.count_documents({"sex": "mujer"})

    # Conteo por nota
    pipeline_nota = [
        {"$group": {"_id": "$nota", "total": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]
    por_nota = await dataset_col.aggregate(pipeline_nota).to_list(length=100)

    # Promedio de desviación en cents por nota
    pipeline_afinacion = [
        {"$match": {"pitch.comparison.cents_deviation": {"$exists": True}}},
        {"$group": {
            "_id": "$nota",
            "avg_cents": {"$avg": "$pitch.comparison.cents_deviation"},
            "avg_stability": {"$avg": "$pitch.stability"},
        }},
        {"$sort": {"_id": 1}},
    ]
    afinacion = await dataset_col.aggregate(pipeline_afinacion).to_list(length=100)

    # Sesiones únicas
    sesiones = await dataset_col.distinct("session_id")

    return {
        "total_muestras": total,
        "sesiones_unicas": len(sesiones),
        "etiquetadas": labeled,
        "sin_etiquetar": total - labeled,
        "por_sexo": {"hombre": hombre, "mujer": mujer},
        "por_nota": {item["_id"]: item["total"] for item in por_nota},
        "afinacion_por_nota": {
            item["_id"]: {
                "avg_cents_deviation": round(item["avg_cents"], 1),
                "avg_stability": round(item["avg_stability"], 3),
            }
            for item in afinacion
        },
    }