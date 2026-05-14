"""
Carga el modelo MLP entrenado y predice el rango vocal.
Si el modelo no existe, usa clasificación por reglas como fallback.
"""
import pickle
import numpy as np
from pathlib import Path

MODELS_DIR = Path(__file__).parent / "models"
MLP_PATH   = MODELS_DIR / "mlp.pkl"

_cached_model: dict | None = None


def _rule_based(min_freq: float, max_freq: float, base_freq: float) -> str:
    mid = (min_freq + max_freq) / 2
    if mid < 170:
        if base_freq < 140:  return "Bajo"
        if base_freq < 190:  return "Barítono"
        return "Tenor"
    else:
        if base_freq < 220:  return "Contralto"
        if base_freq < 310:  return "Mezzosoprano"
        return "Soprano"


def _load_model() -> dict | None:
    global _cached_model
    if _cached_model is None and MLP_PATH.exists():
        with open(MLP_PATH, "rb") as f:
            _cached_model = pickle.load(f)
    return _cached_model


def get_model() -> dict | None:
    return _load_model()


def predict_range(min_freq: float, max_freq: float, base_freq: float) -> dict:
    """
    Predice el rango vocal con el MLP.
    Returns:
        {
            "final_range": str,
            "models": {
                "MLP (Red Neuronal)": {"prediction": str, "confidence": float|None, "available": bool}
            }
        }
    """
    bundle   = _load_model()
    features = np.array([[min_freq, max_freq, base_freq]])

    if bundle is not None:
        X_scaled  = bundle["scaler"].transform(features)
        proba     = bundle["model"].predict_proba(X_scaled)[0]
        idx       = int(proba.argmax())
        predicted = bundle["label_encoder"].inverse_transform([idx])[0]
        model_result = {
            "prediction": predicted,
            "confidence": round(float(proba[idx]) * 100, 1),
            "available":  True,
        }
        final = predicted
    else:
        rule_pred    = _rule_based(min_freq, max_freq, base_freq)
        model_result = {
            "prediction": rule_pred,
            "confidence": None,
            "available":  False,
            "note":       "Modelo no entrenado — usando clasificación por reglas",
        }
        final = rule_pred

    return {
        "final_range": final,
        "models": {"MLP (Red Neuronal)": model_result},
    }


def reload_models():
    """Fuerza recarga del modelo desde disco (útil tras reentrenamiento)."""
    global _cached_model
    _cached_model = None
    return _load_model()
