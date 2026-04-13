from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from datetime import datetime, timezone
import uuid, os, tempfile
import numpy as np
from database import dataset_col

router = APIRouter()

DATASET_DIR = "dataset_audio/grabaciones"
os.makedirs(DATASET_DIR, exist_ok=True)

# ── Frecuencias de referencia (Hz) ──────────────────────────────────────────
NOTE_FREQUENCIES: dict[str, float] = {
    "E2": 82.41,  "G2": 98.00,  "A2": 110.00,
    "C3": 130.81, "D3": 146.83, "F3": 174.61,
    "G3": 196.00, "A3": 220.00, "B3": 246.94,
    "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23,
    "G4": 392.00, "A4": 440.00, "B4": 493.88,
    "C5": 523.25, "D5": 587.33,
}

# Notas repetidas — válidas SOLO si AMBAS instancias pasan
NOTAS_REPETIDAS_MUJER  = {"E4", "A4", "C5"}
NOTAS_REPETIDAS_HOMBRE = {"C3", "F3", "A3", "D4"}

# Umbrales
MIN_DURACION_SEG  = 1.5    # duración cantada (voiced), no duración total del archivo
MIN_INTENSITY_DB  = -20.0  # percentil 75 del RMS (ignora silencios al inicio/fin)
MAX_CENTS_ERROR   = 100.0
MIN_STABILITY_AVG = 0.70

def to_python(obj):
    if isinstance(obj, dict):        return {k: to_python(v) for k, v in obj.items()}
    if isinstance(obj, list):        return [to_python(v) for v in obj]
    if isinstance(obj, np.integer):  return int(obj)
    if isinstance(obj, np.floating): return float(obj)
    if isinstance(obj, np.bool_):    return bool(obj)
    if isinstance(obj, np.ndarray):  return obj.tolist()
    return obj

def hz_to_note_name(hz: float) -> str:
    if hz <= 0: return "?"
    semitones = round(12 * np.log2(hz / 440.0))
    notes  = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
    midi   = semitones + 69
    octave = (midi // 12) - 1
    return f"{notes[midi % 12]}{octave}"

def cents_deviation(f_real: float, f_ref: float) -> float:
    if f_ref <= 0 or f_real <= 0: return 0.0
    return float(1200 * np.log2(f_real / f_ref))

def _invalid_reasons(duracion: float, db: float, abs_cents: float) -> list:
    r = []
    if duracion  < MIN_DURACION_SEG: r.append(f"Duración insuficiente ({duracion:.1f}s < {MIN_DURACION_SEG}s)")
    if db        < MIN_INTENSITY_DB: r.append(f"Intensidad baja ({db:.1f} dB < {MIN_INTENSITY_DB} dB)")
    if abs_cents > MAX_CENTS_ERROR:  r.append(f"Desafinación alta ({abs_cents:.0f} ¢ > {MAX_CENTS_ERROR} ¢)")
    return r

def analyze_sample(file_path: str, nota_ref: str) -> dict:
    import librosa

    hop_length = 512  # valor por defecto de pyin y rms

    y, sr = librosa.load(file_path, sr=22050, mono=True)
    duracion = float(len(y) / sr)

    f0, voiced_flag, _ = librosa.pyin(
        y,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C6"),
        sr=sr,
        hop_length=hop_length,
    )
    voiced_f0 = f0[voiced_flag] if voiced_flag is not None else f0[~np.isnan(f0)]
    if voiced_f0 is None or len(voiced_f0) == 0:
        raise ValueError("No se detectó voz en el audio")

    median_f0 = float(np.median(voiced_f0))
    mean_f0   = float(np.mean(voiced_f0))
    std_f0    = float(np.std(voiced_f0))
    stability = float(1 - min(std_f0 / mean_f0, 1)) if mean_f0 > 0 else 0.0

    # Duración real cantada (frames con voz detectada), no la duración total del archivo
    voiced_duracion = float(np.sum(voiced_flag) * hop_length / sr) if voiced_flag is not None else duracion

    # Percentil 75 del RMS para ignorar silencios al inicio/fin de la grabación.
    # El promedio simple penaliza micrófonos débiles porque los frames mudos
    # arrastran el valor hacia abajo.
    rms     = librosa.feature.rms(y=y, hop_length=hop_length)[0]
    db_mean = float(librosa.amplitude_to_db(np.array([float(np.percentile(rms, 75))]))[0])

    ref_hz = NOTE_FREQUENCIES.get(nota_ref, 0.0)
    cents  = cents_deviation(median_f0, ref_hz) if ref_hz > 0 else 999.0
    is_valid = bool(
        voiced_duracion >= MIN_DURACION_SEG and
        db_mean         >= MIN_INTENSITY_DB and
        abs(cents)      <= MAX_CENTS_ERROR
    )

    return to_python({
        "note_target": nota_ref,
        "audio": {
            "duration":        round(duracion, 2),
            "voiced_duration": round(voiced_duracion, 2),
            "file_url":        "",
        },
        "analysis": {
            "detected_note":   hz_to_note_name(median_f0),
            "frequency":       round(median_f0, 2),
            "ref_frequency":   round(ref_hz, 2),
            "cents_deviation": round(cents, 1),
            "pitch_stability": round(stability, 3),
            "intensity_db":    round(db_mean, 2),
            "is_valid":        is_valid,
            "invalid_reasons": _invalid_reasons(voiced_duracion, db_mean, abs(cents)),
        },
    })

def build_session_document(session_id: str, sex: str, samples: list) -> dict:
    notas_rep = NOTAS_REPETIDAS_MUJER if sex == "mujer" else NOTAS_REPETIDAS_HOMBRE

    # Agrupar por nota
    por_nota: dict[str, list] = {}
    for s in samples:
        por_nota.setdefault(s["note_target"], []).append(s)

    samples_finales = []
    for nota, instancias in sorted(por_nota.items(), key=lambda x: NOTE_FREQUENCIES.get(x[0], 0)):
        if nota in notas_rep and len(instancias) >= 2:
            ambas_validas = all(i["analysis"]["is_valid"] for i in instancias)
            freq_prom  = round(float(np.mean([i["analysis"]["frequency"]       for i in instancias])), 2)
            stab_prom  = round(float(np.mean([i["analysis"]["pitch_stability"] for i in instancias])), 3)
            db_prom    = round(float(np.mean([i["analysis"]["intensity_db"]    for i in instancias])), 2)
            dur_prom   = round(float(np.mean([i["audio"]["duration"]           for i in instancias])), 2)
            samples_finales.append({
                "note_target":   nota,
                "repeticiones":  len(instancias),
                "audio":         {"duration": dur_prom, "file_url": instancias[0]["audio"]["file_url"]},
                "analysis": {
                    "detected_note":   instancias[0]["analysis"]["detected_note"],
                    "frequency":       freq_prom,
                    "ref_frequency":   instancias[0]["analysis"]["ref_frequency"],
                    "cents_deviation": instancias[0]["analysis"]["cents_deviation"],
                    "pitch_stability": stab_prom,
                    "intensity_db":    db_prom,
                    "is_valid":        ambas_validas,
                    "invalid_reasons": [] if ambas_validas else ["Una o ambas repeticiones no válidas"],
                },
            })
        else:
            s = dict(instancias[0])
            s["repeticiones"] = 1
            samples_finales.append(s)

    validas       = [s for s in samples_finales if s["analysis"]["is_valid"]]
    freqs_validas = [s["analysis"]["frequency"] for s in validas]
    notas_validas = [s["note_target"]           for s in validas]

    range_based_on: str
    if freqs_validas:
        min_freq  = round(min(freqs_validas), 2)
        max_freq  = round(max(freqs_validas), 2)
        min_note  = notas_validas[freqs_validas.index(min(freqs_validas))]
        max_note  = notas_validas[freqs_validas.index(max(freqs_validas))]
        range_based_on = "valid_notes_only"
    else:
        # Fallback: derive range from the target notes that were attempted,
        # sorted by their reference frequency.
        notas_intentadas = sorted(
            por_nota.keys(), key=lambda n: NOTE_FREQUENCIES.get(n, 0)
        )
        if notas_intentadas:
            min_note  = notas_intentadas[0]
            max_note  = notas_intentadas[-1]
            min_freq  = round(NOTE_FREQUENCIES.get(min_note, 0.0), 2)
            max_freq  = round(NOTE_FREQUENCIES.get(max_note, 0.0), 2)
        else:
            min_freq = max_freq = 0.0
            min_note = max_note = "N/A"
        range_based_on = "all_attempted_notes"

    stabilities   = [s["analysis"]["pitch_stability"] for s in samples_finales]
    avg_stability = round(float(np.mean(stabilities)), 3) if stabilities else 0.0
    estado        = "valido" if avg_stability >= MIN_STABILITY_AVG else "invalido"

    return to_python({
        "_id": session_id,
        "user_info": {
            "sexo":                   sex,
            "rango_vocal_referencia": None,
        },
        "samples": samples_finales,
        "range_detected": {
            "min_note":  min_note,
            "max_note":  max_note,
            "min_freq":  min_freq,
            "max_freq":  max_freq,
            "based_on":  range_based_on,
        },
        "features": {
            "min_freq":      min_freq,
            "max_freq":      max_freq,
            "avg_stability": avg_stability,
        },
        "stats": {
            "total_samples":   len(samples_finales),
            "valid_samples":   len(validas),
            "invalid_samples": len(samples_finales) - len(validas),
            "avg_stability":   avg_stability,
            "estado":          estado,
        },
        "created_at": datetime.now(timezone.utc),
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

    sample_data    = None
    analysis_error = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        sample_data = analyze_sample(tmp_path, nota)
        sample_data["audio"]["file_url"] = dest
        os.unlink(tmp_path)
    except Exception as e:
        analysis_error = str(e)

    # Acumular muestra en MongoDB (funciona con múltiples workers)
    if sample_data:
        await dataset_col.update_one(
            {"_id": session_id, "status": "collecting"},
            {
                "$setOnInsert": {
                    "user_info": {"sexo": sex, "rango_vocal_referencia": None},
                    "created_at": datetime.now(timezone.utc),
                },
                "$push": {"samples_raw": sample_data},
            },
            upsert=True,
        )

    response = {
        "sample_id": sample_id,
        "message":   "Muestra recibida",
        "nota":      nota,
    }
    if sample_data:
        response["analysis"] = sample_data["analysis"]
    if analysis_error:
        response["analysis_warning"] = analysis_error

    # Última nota → leer todas las muestras acumuladas y guardar documento final
    if es_ultima:
        pending = await dataset_col.find_one({"_id": session_id, "status": "collecting"})
        samples = pending.get("samples_raw", []) if pending else []

        doc = build_session_document(session_id, sex, samples)
        await dataset_col.replace_one({"_id": session_id}, doc, upsert=True)

        response["session_complete"] = True
        response["estado"]           = doc["stats"]["estado"]
        response["range_detected"]   = doc["range_detected"]
        response["stats"]            = doc["stats"]

    return response


@router.get("/stats")
async def dataset_stats():
    filtro_final = {"status": {"$exists": False}}  # excluir sesiones en curso
    total     = await dataset_col.count_documents(filtro_final)
    validos   = await dataset_col.count_documents({"stats.estado": "valido"})
    invalidos = await dataset_col.count_documents({"stats.estado": "invalido"})
    hombre    = await dataset_col.count_documents({**filtro_final, "user_info.sexo": "hombre"})
    mujer     = await dataset_col.count_documents({**filtro_final, "user_info.sexo": "mujer"})

    return {
        "total_sesiones":     total,
        "sesiones_validas":   validos,
        "sesiones_invalidas": invalidos,
        "por_sexo":           {"hombre": hombre, "mujer": mujer},
    }