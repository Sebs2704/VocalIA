from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from datetime import datetime, timezone
import uuid, os, tempfile, subprocess
import numpy as np
from database import dataset_col

router = APIRouter()

DATASET_DIR = "dataset_audio/grabaciones"
os.makedirs(DATASET_DIR, exist_ok=True)

NOTE_FREQUENCIES: dict[str, float] = {
    "E2": 82.41,  "G2": 98.00,  "A2": 110.00,
    "C3": 130.81, "D3": 146.83, "F3": 174.61,
    "G3": 196.00, "A3": 220.00, "B3": 246.94,
    "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23,
    "G4": 392.00, "A4": 440.00, "B4": 493.88,
    "C5": 523.25, "D5": 587.33,
}

# Los 3 parámetros de validación por nota
MIN_DURACION_SEG  = 0.5     # duración mínima con voz detectada
MIN_INTENSITY_DB  = -55.0   # intensidad mínima (permisivo para micrófonos normales)
MAX_CENTS_ERROR   = 400.0   # desviación máxima en cents (~3-4 semitonos)
MIN_STABILITY_AVG = 0.10    # estabilidad mínima para sesión válida


def to_python(obj):
    if isinstance(obj, dict):        return {k: to_python(v) for k, v in obj.items()}
    if isinstance(obj, list):        return [to_python(v) for v in obj]
    if isinstance(obj, np.integer):  return int(obj)
    if isinstance(obj, np.floating): return float(obj)
    if isinstance(obj, np.bool_):    return bool(obj)
    if isinstance(obj, np.ndarray):  return obj.tolist()
    return obj


def load_audio(file_path: str, sr: int = 22050):
    import soundfile as sf
    try:
        y, file_sr = sf.read(file_path, always_2d=False)
        if y.ndim > 1:
            y = y.mean(axis=1)
        y = y.astype(np.float32)
        if file_sr != sr:
            import librosa
            y = librosa.resample(y, orig_sr=file_sr, target_sr=sr)
        return y, sr
    except Exception:
        pass
    import imageio_ffmpeg
    result = subprocess.run(
        [imageio_ffmpeg.get_ffmpeg_exe(), "-i", file_path,
         "-f", "f32le", "-ac", "1", "-ar", str(sr), "-loglevel", "quiet", "-"],
        capture_output=True,
    )
    if result.returncode != 0 or len(result.stdout) == 0:
        raise ValueError("No se pudo decodificar el audio")
    return np.frombuffer(result.stdout, dtype=np.float32).copy(), sr


def pitch_rating(cents: float) -> str:
    a = abs(cents)
    if a <= 20:  return "Excelente"
    if a <= 50:  return "Buena"
    if a <= 100: return "Regular"
    return "Desafinado"


def hz_to_note_name(hz: float) -> str:
    if hz <= 0: return "?"
    semitones = round(12 * np.log2(hz / 440.0))
    notes = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
    midi  = semitones + 69
    return f"{notes[midi % 12]}{(midi // 12) - 1}"


def analyze_sample(file_path: str, nota_ref: str) -> dict:
    """Análisis completo — mismo esquema que cargar_audios_voz.py."""
    import librosa
    hop_length = 512

    y, sr = load_audio(file_path, sr=22050)
    duracion_total = float(len(y) / sr)

    peak = float(np.max(np.abs(y)))
    if peak > 0:
        y = y * (0.5 / peak)

    f0, voiced_flag, _ = librosa.pyin(
        y, fmin=librosa.note_to_hz("C2"), fmax=librosa.note_to_hz("C6"),
        sr=sr, hop_length=hop_length, beta_parameters=(2, 6), no_trough_prob=0.05,
    )

    voiced_f0   = f0[voiced_flag] if (voiced_flag is not None and voiced_flag.any()) else np.array([])
    active_flag = voiced_flag
    if len(voiced_f0) == 0:
        not_nan     = ~np.isnan(f0)
        voiced_f0   = f0[not_nan]
        active_flag = not_nan
    if len(voiced_f0) == 0:
        raise ValueError("No se detectó pitch en el audio")

    median_f0    = float(np.median(voiced_f0))
    mean_f0      = float(np.mean(voiced_f0))
    std_f0       = float(np.std(voiced_f0))
    duracion_voz = float(np.sum(active_flag) * hop_length / sr)
    stability    = float(1 - min(std_f0 / mean_f0, 1)) if mean_f0 > 0 else 0.0
    jitter       = float(np.mean(np.abs(np.diff(voiced_f0))) / mean_f0) if len(voiced_f0) > 1 and mean_f0 > 0 else 0.0

    rms      = librosa.feature.rms(y=y, hop_length=hop_length)[0]
    rms_mean = float(np.mean(rms))
    rms_max  = float(np.max(rms))
    db_mean  = float(librosa.amplitude_to_db(np.array([float(np.percentile(rms, 75))]))[0])
    db_max   = float(librosa.amplitude_to_db(np.array([rms_max]))[0])
    vol_ctrl = float(1 - min(float(np.std(rms)) / (rms_mean + 1e-6), 1))

    spec_centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
    spec_rolloff  = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr)))
    zcr           = float(np.mean(librosa.feature.zero_crossing_rate(y)))
    sig_power     = float(np.mean(y ** 2))
    noise_est     = float(np.percentile(np.abs(y), 10) ** 2 + 1e-10)
    snr_db        = float(10 * np.log10(sig_power / noise_est + 1e-10))

    mfccs      = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    mfcc_means = [round(float(v), 3) for v in mfccs.mean(axis=1)]

    ref_hz = NOTE_FREQUENCIES.get(nota_ref, 0.0)
    cents  = float(1200 * np.log2(median_f0 / ref_hz)) if ref_hz > 0 and median_f0 > 0 else 999.0

    # ── Los 3 parámetros de validación ──────────────────────────────────────
    param_duracion   = bool(duracion_voz >= MIN_DURACION_SEG)
    param_intensidad = bool(db_mean      >= MIN_INTENSITY_DB)
    param_afinacion  = bool(abs(cents)   <= MAX_CENTS_ERROR)
    is_valid         = param_duracion and param_intensidad and param_afinacion

    reasons = []
    if not param_duracion:
        reasons.append(f"Duración insuficiente ({duracion_voz:.1f}s < {MIN_DURACION_SEG}s)")
    if not param_intensidad:
        reasons.append(f"Volumen bajo ({db_mean:.1f} dB < {MIN_INTENSITY_DB} dB)")
    if not param_afinacion:
        reasons.append(f"Nota incorrecta: se detectó {hz_to_note_name(median_f0)} en lugar de {nota_ref} ({abs(cents):.0f}¢)")

    return to_python({
        "pitch": {
            "median_hz":     round(median_f0, 2),
            "mean_hz":       round(mean_f0, 2),
            "min_hz":        round(float(np.min(voiced_f0)), 2),
            "max_hz":        round(float(np.max(voiced_f0)), 2),
            "std_hz":        round(std_f0, 2),
            "voiced_frames": int(len(voiced_f0)),
        },
        "estabilidad": {
            "stability_score": round(stability, 3),
            "jitter":          round(jitter, 4),
            "duracion_voz_s":  round(duracion_voz, 2),
            "duracion_total_s":round(duracion_total, 2),
        },
        "potencia": {
            "rms_mean":        round(rms_mean, 5),
            "rms_max":         round(rms_max, 5),
            "db_mean":         round(db_mean, 2),
            "db_max":          round(db_max, 2),
            "volumen_control": round(vol_ctrl, 3),
        },
        "nitidez": {
            "spectral_centroid_hz": round(spec_centroid, 2),
            "spectral_rolloff_hz":  round(spec_rolloff, 2),
            "zero_crossing_rate":   round(zcr, 5),
            "snr_db":               round(snr_db, 2),
        },
        "mfcc_means": mfcc_means,
        "comparison": {
            "nota_ref":        nota_ref,
            "ref_hz":          round(ref_hz, 2),
            "detected_hz":     round(median_f0, 2),
            "cents_deviation": round(cents, 1),
            "rating":          pitch_rating(cents),
            "en_rango_humano": bool(abs(cents) <= 100),
        },
        "validacion": {
            "is_valid":          is_valid,
            "param_duracion":    param_duracion,
            "param_intensidad":  param_intensidad,
            "param_afinacion":   param_afinacion,
            "invalid_reasons":   reasons,
        },
    })


@router.post("/submit", status_code=201)
async def submit_sample(
    file: UploadFile = File(...),
    sex: str = Form(...),
    session_id: str = Form(...),
    nota: str = Form(...),
    intentos: int = Form(1),
    es_ultima: bool = Form(False),
):
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Se requiere archivo de audio")

    sample_id = str(uuid.uuid4())
    suffix    = os.path.splitext(file.filename)[1] or ".webm"
    filename  = f"{session_id}_{nota}_{sample_id}{suffix}"
    carpeta   = os.path.join(DATASET_DIR, sex, session_id)
    os.makedirs(carpeta, exist_ok=True)
    dest      = os.path.join(carpeta, filename)

    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)

    pitch_data     = None
    analysis_error = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        pitch_data = analyze_sample(tmp_path, nota)
        os.unlink(tmp_path)
    except Exception as e:
        analysis_error = str(e)

    # ── Muestra a acumular en el documento de sesión ────────────────────────
    sample_entry = to_python({
        "sample_id":      sample_id,
        "nota":           nota,
        "intentos":       intentos,
        "filename":       filename,
        "filepath":       dest,
        "file_size":      len(content),
        "submitted_at":   datetime.now(timezone.utc),
        "pitch":          pitch_data,
        "analysis_error": analysis_error,
    })

    # Un solo documento por sesión — se va acumulando con $push
    await dataset_col.update_one(
        {"_id": session_id},
        {
            "$setOnInsert": {
                "source":       "web_recording",
                "sex":          sex,
                "labeled":      False,
                "label":        None,
                "created_at":   datetime.now(timezone.utc),
            },
            "$push": {"samples": sample_entry},
        },
        upsert=True,
    )

    # Respuesta para el frontend (feedback en tiempo real)
    response: dict = {"sample_id": sample_id, "message": "Muestra recibida", "nota": nota}
    if pitch_data:
        v = pitch_data["validacion"]
        response["analysis"] = {
            "detected_note":   hz_to_note_name(pitch_data["pitch"]["median_hz"]),
            "frequency":       pitch_data["pitch"]["median_hz"],
            "ref_frequency":   pitch_data["comparison"]["ref_hz"],
            "cents_deviation": pitch_data["comparison"]["cents_deviation"],
            "pitch_stability": pitch_data["estabilidad"]["stability_score"],
            "intensity_db":    pitch_data["potencia"]["db_mean"],
            "is_valid":        v["is_valid"],
            "invalid_reasons": v["invalid_reasons"],
        }
    if analysis_error:
        response["analysis_warning"] = analysis_error

    # ── Última nota: finalizar el documento con stats y rango ───────────────
    if es_ultima:
        doc = await dataset_col.find_one({"_id": session_id})
        samples = doc.get("samples", []) if doc else []

        # Notas válidas (las que pasaron los 3 parámetros)
        notas_validas = [
            s["nota"] for s in samples
            if s.get("pitch") and s["pitch"]["validacion"]["is_valid"]
        ]
        # Ordenar por frecuencia de referencia
        notas_validas_ord = sorted(
            set(notas_validas),
            key=lambda n: NOTE_FREQUENCIES.get(n, 0)
        )

        freqs_validas = [NOTE_FREQUENCIES[n] for n in notas_validas_ord if n in NOTE_FREQUENCIES]
        if freqs_validas:
            min_note   = notas_validas_ord[0]
            max_note   = notas_validas_ord[-1]
            min_freq   = round(freqs_validas[0], 2)
            max_freq   = round(freqs_validas[-1], 2)
            based_on   = "valid_notes_only"
        else:
            all_notas  = sorted({s["nota"] for s in samples}, key=lambda n: NOTE_FREQUENCIES.get(n, 0))
            min_note   = all_notas[0]  if all_notas else "N/A"
            max_note   = all_notas[-1] if all_notas else "N/A"
            min_freq   = round(NOTE_FREQUENCIES.get(min_note, 0.0), 2)
            max_freq   = round(NOTE_FREQUENCIES.get(max_note, 0.0), 2)
            based_on   = "all_attempted_notes"

        stabilities = [
            s["pitch"]["estabilidad"]["stability_score"]
            for s in samples if s.get("pitch")
        ]
        avg_stability = round(float(np.mean(stabilities)), 3) if stabilities else 0.0
        estado        = "valido" if avg_stability >= MIN_STABILITY_AVG else "invalido"

        await dataset_col.update_one(
            {"_id": session_id},
            {"$set": {
                "range_detected": {
                    "min_note": min_note, "max_note": max_note,
                    "min_freq": min_freq, "max_freq": max_freq,
                    "based_on": based_on,
                },
                "valid_notes": notas_validas_ord,
                "stats": {
                    "total_samples":   len(samples),
                    "valid_samples":   len(notas_validas),
                    "invalid_samples": len(samples) - len(notas_validas),
                    "avg_stability":   avg_stability,
                    "estado":          estado,
                },
                "finished_at": datetime.now(timezone.utc),
            }},
        )

        response["session_complete"] = True
        response["estado"]           = estado
        response["range_detected"]   = {
            "min_note": min_note, "max_note": max_note,
            "min_freq": min_freq, "max_freq": max_freq,
            "based_on": based_on,
        }
        response["valid_notes"] = notas_validas_ord
        response["stats"]       = {
            "total_samples":   len(samples),
            "valid_samples":   len(notas_validas),
            "invalid_samples": len(samples) - len(notas_validas),
            "avg_stability":   avg_stability,
            "estado":          estado,
        }

    return response


@router.get("/stats")
async def dataset_stats():
    total    = await dataset_col.count_documents({"source": "web_recording", "finished_at": {"$exists": True}})
    validos  = await dataset_col.count_documents({"stats.estado": "valido"})
    invalidos= await dataset_col.count_documents({"stats.estado": "invalido"})
    hombre   = await dataset_col.count_documents({"source": "web_recording", "sex": "hombre", "finished_at": {"$exists": True}})
    mujer    = await dataset_col.count_documents({"source": "web_recording", "sex": "mujer",  "finished_at": {"$exists": True}})
    return {
        "total_sesiones":     total,
        "sesiones_validas":   validos,
        "sesiones_invalidas": invalidos,
        "por_sexo":           {"hombre": hombre, "mujer": mujer},
    }
