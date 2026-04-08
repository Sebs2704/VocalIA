from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from datetime import datetime
import uuid, tempfile, os
from database import results_col, recordings_col
from auth_utils import get_current_user

router = APIRouter()

def analyze_pitch_basic(file_path: str) -> dict:
    """
    Análisis básico de pitch con librosa.
    Retorna min_freq, max_freq y una clasificación de rango vocal.
    Se reemplazará con el modelo de IA entrenado cuando esté listo.
    """
    import librosa
    import numpy as np

    y, sr = librosa.load(file_path, sr=None, mono=True)
    # Extraer frecuencia fundamental con pyin
    f0, voiced_flag, _ = librosa.pyin(
        y,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"),
        sr=sr
    )
    voiced_f0 = f0[voiced_flag] if voiced_flag is not None else f0[~np.isnan(f0)]
    if voiced_f0 is None or len(voiced_f0) == 0:
        raise ValueError("No se detectó voz en el audio")

    min_freq = float(np.min(voiced_f0))
    max_freq = float(np.max(voiced_f0))

    # Clasificación básica (se mejorará con el modelo ML)
    vocal_range = classify_range(min_freq, max_freq)
    return {
        "min_freq": round(min_freq, 2),
        "max_freq": round(max_freq, 2),
        "range": vocal_range,
    }

def classify_range(min_f: float, max_f: float) -> str:
    mid = (min_f + max_f) / 2
    # Rangos aproximados en Hz
    if mid < 160:
        return "Bajo"
    elif mid < 220:
        return "Barítono"
    elif mid < 300:
        return "Tenor"
    elif mid < 400:
        return "Contralto"
    elif mid < 500:
        return "Mezzosoprano"
    else:
        return "Soprano"

@router.post("/analyze")
async def analyze_voice(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Se requiere un archivo de audio")

    # Guardar temporalmente
    suffix = os.path.splitext(file.filename)[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        analysis = analyze_pitch_basic(tmp_path)
    except Exception as e:
        os.unlink(tmp_path)
        raise HTTPException(status_code=422, detail=f"Error al analizar audio: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    result_doc = {
        "_id": str(uuid.uuid4()),
        "user_id": current_user["_id"],
        "min_freq": analysis["min_freq"],
        "max_freq": analysis["max_freq"],
        "range": analysis["range"],
        "date": datetime.utcnow(),
    }
    await results_col.insert_one(result_doc)

    return {
        "min_freq": analysis["min_freq"],
        "max_freq": analysis["max_freq"],
        "range": analysis["range"],
        "result_id": result_doc["_id"],
    }
