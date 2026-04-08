"""
VocalIA — Script de entrenamiento del modelo
Ejecutar cuando tengas suficientes muestras etiquetadas en el dataset.

Requisitos mínimos recomendados:
  - 50+ muestras por clase (Bajo, Barítono, Tenor, Contralto, Mezzosoprano, Soprano)
  - Equilibrio entre sexos

Uso:
  python train.py --data-dir ./dataset_audio --model-out ./models/vocalia_v1.pkl
"""

import argparse
import os
import pickle
import numpy as np
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, confusion_matrix
from feature_extractor import extract_features, features_to_vector

VOCAL_CLASSES = ["Bajo", "Barítono", "Tenor", "Contralto", "Mezzosoprano", "Soprano"]


def load_dataset(data_dir: str, labels_csv: str) -> tuple:
    """
    Carga el dataset desde un CSV con columnas: filename, label
    Ejemplo de labels.csv:
        filename,label
        masculino_abc123.wav,Barítono
        femenino_xyz789.wav,Soprano
    """
    import csv

    X, y = [], []
    errors = 0

    with open(labels_csv, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            path = os.path.join(data_dir, row["filename"])
            if not os.path.exists(path):
                print(f"  ⚠️  No encontrado: {path}")
                errors += 1
                continue
            try:
                features = extract_features(path)
                vec = features_to_vector(features)
                X.append(vec)
                y.append(row["label"])
                print(f"  ✅ {row['filename']} → {row['label']}")
            except Exception as e:
                print(f"  ❌ Error en {row['filename']}: {e}")
                errors += 1

    print(f"\nTotal: {len(X)} muestras cargadas, {errors} errores")
    return np.array(X), np.array(y)


def train(data_dir: str, labels_csv: str, model_out: str):
    print("🎤 VocalIA — Entrenamiento del modelo\n")

    X, y = load_dataset(data_dir, labels_csv)

    if len(X) < 10:
        print("❌ No hay suficientes muestras para entrenar. Necesitas al menos 10.")
        return

    # Codificar etiquetas
    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    # Escalar features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # División train/test
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y_enc, test_size=0.2, random_state=42, stratify=y_enc
    )

    # Modelo: Random Forest (robusto con datasets pequeños)
    # Cuando tengas 500+ muestras, considera pasar a un MLP o SVM
    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        min_samples_split=2,
        random_state=42,
        class_weight="balanced",
    )
    clf.fit(X_train, y_train)

    # Evaluación
    y_pred = clf.predict(X_test)
    print("\n📊 Reporte de clasificación:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # Validación cruzada
    cv_scores = cross_val_score(clf, X_scaled, y_enc, cv=5, scoring="accuracy")
    print(f"CV Accuracy: {cv_scores.mean():.2%} ± {cv_scores.std():.2%}")

    # Guardar modelo + scaler + encoder
    os.makedirs(os.path.dirname(model_out) or ".", exist_ok=True)
    bundle = {"model": clf, "scaler": scaler, "label_encoder": le}
    with open(model_out, "wb") as f:
        pickle.dump(bundle, f)

    print(f"\n✅ Modelo guardado en: {model_out}")
    print(f"   Clases: {list(le.classes_)}")


def predict(audio_path: str, model_path: str) -> dict:
    """Usa el modelo entrenado para predecir el rango vocal de un audio."""
    with open(model_path, "rb") as f:
        bundle = pickle.load(f)

    clf = bundle["model"]
    scaler = bundle["scaler"]
    le = bundle["label_encoder"]

    features = extract_features(audio_path)
    vec = features_to_vector(features).reshape(1, -1)
    vec_scaled = scaler.transform(vec)

    proba = clf.predict_proba(vec_scaled)[0]
    pred_idx = proba.argmax()
    predicted_class = le.inverse_transform([pred_idx])[0]

    return {
        "predicted_range": predicted_class,
        "confidence": round(float(proba[pred_idx]) * 100, 1),
        "probabilities": {
            cls: round(float(p) * 100, 1)
            for cls, p in zip(le.classes_, proba)
        },
        "min_freq": features["pitch_min"],
        "max_freq": features["pitch_max"],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="VocalIA Model Trainer")
    parser.add_argument("--data-dir",   default="./dataset_audio",       help="Carpeta con audios")
    parser.add_argument("--labels-csv", default="./dataset_labels.csv",  help="CSV con etiquetas")
    parser.add_argument("--model-out",  default="./models/vocalia_v1.pkl", help="Archivo de salida del modelo")
    args = parser.parse_args()

    train(args.data_dir, args.labels_csv, args.model_out)
