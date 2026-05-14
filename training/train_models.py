"""
VocalIA — Entrena el MLP de clasificación de rango vocal.

Features: [min_freq, max_freq, base_freq]  →  6 rangos vocales
Si no se provee un CSV real, genera datos sintéticos automáticamente.
El modelo se guarda en ../backend/ml/models/ para que el backend lo use.

Uso:
    python train_models.py
    python train_models.py --data-csv ./data/real_data.csv
    python train_models.py --output-dir ../backend/ml/models --samples 200
"""
import argparse
import os
import csv
import pickle
import numpy as np
from pathlib import Path
from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, accuracy_score

from generate_data import generate_dataset


def load_csv(path: str):
    X, y = [], []
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            X.append([float(row["min_freq"]), float(row["max_freq"]), float(row["base_freq"])])
            y.append(row["label"])
    return np.array(X), np.array(y)


def train_mlp(X_train, X_test, y_train, y_test, le, scaler, output_dir: str) -> float:
    os.makedirs(output_dir, exist_ok=True)

    mlp = MLPClassifier(
        hidden_layer_sizes=(128, 64, 32),
        activation="relu",
        max_iter=800,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.1,
    )
    mlp.fit(X_train, y_train)

    y_pred = mlp.predict(X_test)
    acc    = accuracy_score(y_test, y_pred)

    print(f"\n{'═'*55}")
    print(f"  MLP (Red Neuronal)")
    print(f"  Accuracy test: {acc:.2%}")
    print(f"{'─'*55}")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    bundle   = {"model": mlp, "scaler": scaler, "label_encoder": le}
    out_path = os.path.join(output_dir, "mlp.pkl")
    with open(out_path, "wb") as f:
        pickle.dump(bundle, f)
    print(f"  Guardado: {out_path}")

    return acc


def main(data_csv: str | None, output_dir: str, n_samples: int):
    print("VocalIA — Entrenamiento MLP\n")

    if data_csv and os.path.exists(data_csv):
        print(f"Cargando datos reales: {data_csv}")
        X, y = load_csv(data_csv)
    else:
        if data_csv:
            print(f"No se encontro {data_csv}. Usando datos sinteticos.")
        else:
            print(f"Generando {n_samples} muestras sinteticas por clase...")
        raw = generate_dataset(n_per_class=n_samples)
        X   = np.array([[d["min_freq"], d["max_freq"], d["base_freq"]] for d in raw])
        y   = np.array([d["label"] for d in raw])
    print(f"   → {len(X)} muestras totales, {len(set(y))} clases\n")

    le     = LabelEncoder()
    y_enc  = le.fit_transform(y)
    scaler = StandardScaler()
    X_scl  = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scl, y_enc, test_size=0.2, random_state=42, stratify=y_enc
    )

    acc = train_mlp(X_train, X_test, y_train, y_test, le, scaler, output_dir)

    print(f"\n{'═'*55}")
    print(f"  Accuracy final: {acc:.2%}")
    print(f"  Modelos en:     {os.path.abspath(output_dir)}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="VocalIA MLP trainer")
    parser.add_argument("--data-csv",   default=None,
                        help="CSV real con columnas min_freq,max_freq,base_freq,label")
    parser.add_argument("--output-dir", default="../backend/ml/models",
                        help="Carpeta donde guardar el .pkl")
    parser.add_argument("--samples",    type=int, default=150,
                        help="Muestras sinteticas por clase (si no hay CSV real)")
    args = parser.parse_args()
    main(args.data_csv, args.output_dir, args.samples)
