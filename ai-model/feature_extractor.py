"""
VocalIA — Extractor de características de audio
Usado tanto para entrenamiento como para inferencia básica.
"""

import numpy as np
import librosa


def extract_features(file_path: str) -> dict:
    """
    Extrae características acústicas relevantes para clasificar la voz.
    Retorna un dict con todas las features necesarias para el modelo.
    """
    y, sr = librosa.load(file_path, sr=22050, mono=True, duration=15)

    # ── Frecuencia fundamental (pitch) ──────────────────────────────
    f0, voiced_flag, _ = librosa.pyin(
        y,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"),
        sr=sr,
    )
    voiced_f0 = f0[voiced_flag] if voiced_flag is not None else f0[~np.isnan(f0)]

    if len(voiced_f0) == 0:
        raise ValueError("No se detectó voz en el audio")

    pitch_mean   = float(np.mean(voiced_f0))
    pitch_std    = float(np.std(voiced_f0))
    pitch_min    = float(np.min(voiced_f0))
    pitch_max    = float(np.max(voiced_f0))
    pitch_median = float(np.median(voiced_f0))

    # ── MFCCs (timbre) ───────────────────────────────────────────────
    mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    mfcc_means = mfccs.mean(axis=1).tolist()   # 13 valores

    # ── Espectro ─────────────────────────────────────────────────────
    spectral_centroid = float(librosa.feature.spectral_centroid(y=y, sr=sr).mean())
    spectral_rolloff  = float(librosa.feature.spectral_rolloff(y=y, sr=sr).mean())
    zcr               = float(librosa.feature.zero_crossing_rate(y).mean())
    rms               = float(librosa.feature.rms(y=y).mean())

    return {
        "pitch_mean":         pitch_mean,
        "pitch_std":          pitch_std,
        "pitch_min":          pitch_min,
        "pitch_max":          pitch_max,
        "pitch_median":       pitch_median,
        "mfcc_means":         mfcc_means,
        "spectral_centroid":  spectral_centroid,
        "spectral_rolloff":   spectral_rolloff,
        "zero_crossing_rate": zcr,
        "rms":                rms,
    }


def features_to_vector(features: dict) -> np.ndarray:
    """
    Convierte el dict de features en un vector 1D para el modelo ML.
    Orden: [pitch_mean, pitch_std, pitch_min, pitch_max, pitch_median,
            mfcc_0..12, spectral_centroid, spectral_rolloff, zcr, rms]
    Total: 5 + 13 + 4 = 22 features
    """
    vec = [
        features["pitch_mean"],
        features["pitch_std"],
        features["pitch_min"],
        features["pitch_max"],
        features["pitch_median"],
        *features["mfcc_means"],          # 13 valores
        features["spectral_centroid"],
        features["spectral_rolloff"],
        features["zero_crossing_rate"],
        features["rms"],
    ]
    return np.array(vec, dtype=np.float32)
