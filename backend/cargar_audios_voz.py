"""
VocalIA — Carga de audios de voz existentes a MongoDB
Ejecutar UNA SOLA VEZ desde la carpeta backend:

    python cargar_audios_voz.py
"""

import asyncio
import os
import uuid
from datetime import datetime
import numpy as np

VOZ_DIR = "dataset_audio/voz"

NOTE_FREQUENCIES: dict[str, float] = {
    "C2": 65.41,  "D2": 73.42,  "E2": 82.41,  "F2": 87.31,
    "G2": 98.00,  "A2": 110.00, "B2": 123.47,
    "C3": 130.81, "D3": 146.83, "E3": 164.81, "F3": 174.61,
    "G3": 196.00, "A3": 220.00, "B3": 246.94,
    "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23,
    "G4": 392.00, "A4": 440.00, "B4": 493.88,
    "C5": 523.25, "D5": 587.33, "E5": 659.25,
}

def to_python(obj):
    """Convierte tipos numpy a tipos Python nativos para MongoDB."""
    if isinstance(obj, dict):
        return {k: to_python(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [to_python(v) for v in obj]
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def cents_deviation(f_real: float, f_ref: float) -> float:
    if f_ref <= 0 or f_real <= 0:
        return 0.0
    return 1200 * np.log2(f_real / f_ref)

def pitch_rating(cents: float) -> str:
    abs_c = abs(cents)
    if abs_c <= 20:    return "Excelente"
    elif abs_c <= 50:  return "Buena"
    elif abs_c <= 100: return "Regular"
    else:              return "Desafinado"

def analyze_audio(file_path: str, nota_ref: str) -> dict:
    import librosa

    y, sr = librosa.load(file_path, sr=22050, mono=True)
    duracion_total = float(len(y) / sr)

    f0, voiced_flag, _ = librosa.pyin(
        y,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C6"),
        sr=sr,
    )
    voiced_f0 = f0[voiced_flag] if voiced_flag is not None else f0[~np.isnan(f0)]

    if voiced_f0 is None or len(voiced_f0) == 0:
        raise ValueError("No se detectó voz")

    median_f0 = float(np.median(voiced_f0))
    mean_f0   = float(np.mean(voiced_f0))
    min_f0    = float(np.min(voiced_f0))
    max_f0    = float(np.max(voiced_f0))
    std_f0    = float(np.std(voiced_f0))

    hop_length   = 512
    duracion_voz = float(len(voiced_f0) * hop_length / sr)
    stability    = float(1 - min(std_f0 / mean_f0, 1)) if mean_f0 > 0 else 0.0
    jitter       = float(np.mean(np.abs(np.diff(voiced_f0))) / mean_f0) if len(voiced_f0) > 1 and mean_f0 > 0 else 0.0

    rms      = librosa.feature.rms(y=y)[0]
    rms_mean = float(np.mean(rms))
    rms_max  = float(np.max(rms))
    db_mean  = float(librosa.amplitude_to_db(np.array([rms_mean]))[0])
    db_max   = float(librosa.amplitude_to_db(np.array([rms_max]))[0])
    vol_ctrl = float(1 - min(float(np.std(rms)) / (rms_mean + 1e-6), 1))

    spectral_centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
    spectral_rolloff  = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr)))
    zcr               = float(np.mean(librosa.feature.zero_crossing_rate(y)))
    signal_power      = float(np.mean(y ** 2))
    noise_est         = float(np.percentile(np.abs(y), 10) ** 2 + 1e-10)
    snr_db            = float(10 * np.log10(signal_power / noise_est + 1e-10))

    mfccs      = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    mfcc_means = [round(float(v), 3) for v in mfccs.mean(axis=1)]

    ref_hz     = NOTE_FREQUENCIES.get(nota_ref)
    comparison = None
    if ref_hz:
        cents = cents_deviation(median_f0, ref_hz)
        comparison = {
            "nota_ref":        nota_ref,
            "ref_hz":          round(ref_hz, 2),
            "detected_hz":     round(median_f0, 2),
            "cents_deviation": round(float(cents), 1),
            "rating":          pitch_rating(cents),
            "en_rango_humano": bool(abs(cents) <= 100),
        }

    result = {
        "pitch": {
            "median_hz":     round(median_f0, 2),
            "mean_hz":       round(mean_f0, 2),
            "min_hz":        round(min_f0, 2),
            "max_hz":        round(max_f0, 2),
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
            "spectral_centroid_hz": round(spectral_centroid, 2),
            "spectral_rolloff_hz":  round(spectral_rolloff, 2),
            "zero_crossing_rate":   round(zcr, 5),
            "snr_db":               round(snr_db, 2),
        },
        "mfcc_means": mfcc_means,
        "comparison": comparison,
    }

    # Convierte TODOS los tipos numpy a Python nativo antes de enviar a MongoDB
    return to_python(result)


async def cargar_todo():
    from database import dataset_col

    carpetas = [
        (os.path.join(VOZ_DIR, "Hombres"), "hombre"),
        (os.path.join(VOZ_DIR, "Mujeres"), "mujer"),
    ]

    total_ok    = 0
    total_error = 0

    for carpeta_path, sexo in carpetas:
        if not os.path.isdir(carpeta_path):
            print(f"⚠️  No encontrada: {carpeta_path}")
            continue

        archivos = [f for f in os.listdir(carpeta_path) if f.endswith(".wav")]
        print(f"\n📁 {carpeta_path} — {len(archivos)} archivos ({sexo})")

        for archivo in sorted(archivos):
            nota      = os.path.splitext(archivo)[0]
            file_path = os.path.join(carpeta_path, archivo)

            existe = await dataset_col.find_one({
                "filename": archivo,
                "sex": sexo,
                "source": "voz_referencia"
            })
            if existe:
                print(f"  ⏭️  Ya existe: {archivo}")
                continue

            try:
                acoustics = analyze_audio(file_path, nota)
                doc = {
                    "_id":            str(uuid.uuid4()),
                    "session_id":     "VOZ_REFERENCIA",
                    "source":         "voz_referencia",
                    "sex":            sexo,
                    "nota":           nota,
                    "intentos":       1,
                    "filename":       archivo,
                    "filepath":       file_path,
                    "file_size":      int(os.path.getsize(file_path)),
                    "submitted_at":   datetime.utcnow(),
                    "labeled":        False,
                    "label":          None,
                    "acoustics":      acoustics,
                    "analysis_error": None,
                }
                await dataset_col.insert_one(doc)
                rating = acoustics["comparison"]["rating"] if acoustics.get("comparison") else "N/A"
                hz     = acoustics["pitch"]["median_hz"]
                stab   = acoustics["estabilidad"]["stability_score"]
                print(f"  ✅ {archivo} → {hz} Hz | estabilidad: {stab} | afinación: {rating}")
                total_ok += 1
            except Exception as e:
                print(f"  ❌ {archivo} → Error: {e}")
                total_error += 1

    print(f"\n{'='*50}")
    print(f"✅ Cargados: {total_ok} | ❌ Errores: {total_error}")
    print(f"{'='*50}")
    print("\n🎤 Listo. Verifica en Atlas → colección 'dataset'")
    print("   Filtro: { \"source\": \"voz_referencia\" }")


if __name__ == "__main__":
    asyncio.run(cargar_todo())