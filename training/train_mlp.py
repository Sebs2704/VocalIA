"""
VocalIA — Entrena MLP de compatibilidad canción-voz.

Input features (8):  diff_F_min, diff_F_max, diff_F_prom, diff_F_mediana,
                     diff_P10,   diff_P90,   diff_rango,  diff_rango_efectivo
Label:               0 = incompatible | 1 = compatible

Output: ../backend/ml/models/mlp_compat.pkl

Uso:
    python train_mlp.py
    python train_mlp.py --csv ../backend/data/features_vocales.csv
"""
import argparse
import csv
import pickle
import numpy as np
from pathlib import Path
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, roc_auc_score

FEAT_COLS = [
    "diff_F_min", "diff_F_max", "diff_F_prom", "diff_F_mediana",
    "diff_P10",   "diff_P90",   "diff_rango",  "diff_rango_efectivo",
]


def load_data(path: Path):
    X, y = [], []
    skipped = 0
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            try:
                X.append([float(row[c]) for c in FEAT_COLS])
                y.append(int(row["label"]))
            except (KeyError, ValueError):
                skipped += 1
    if skipped:
        print(f"  ADVERTENCIA: {skipped} filas descartadas (datos faltantes)")
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int32)


def train(csv_path: Path, out_path: Path) -> None:
    print("VocalIA -- Entrenamiento MLP Compatibilidad\n")

    print(f"Cargando: {csv_path}")
    X, y = load_data(csv_path)
    pos = y.sum()
    print(f"   {len(X)} pares  |  {pos} compatibles ({pos/len(y):.1%})  |  {len(y)-pos} incompatibles\n")

    scaler = StandardScaler()
    X_sc   = scaler.fit_transform(X)

    X_tr, X_te, y_tr, y_te = train_test_split(
        X_sc, y, test_size=0.2, random_state=42, stratify=y
    )

    print("Entrenando MLP  128 -> 64 -> 32 ...")
    mlp = MLPClassifier(
        hidden_layer_sizes=(128, 64, 32),
        activation="relu",
        solver="adam",
        learning_rate_init=1e-3,
        max_iter=600,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.1,
        n_iter_no_change=25,
        verbose=False,
    )
    mlp.fit(X_tr, y_tr)

    y_pred  = mlp.predict(X_te)
    y_proba = mlp.predict_proba(X_te)[:, list(mlp.classes_).index(1)]
    acc     = accuracy_score(y_te, y_pred)
    auc     = roc_auc_score(y_te, y_proba)

    print(f"\n{'='*55}")
    print(f"  Accuracy : {acc:.2%}")
    print(f"  ROC-AUC  : {auc:.4f}   (iteraciones: {mlp.n_iter_})")
    print(f"{'-'*55}")
    print(classification_report(y_te, y_pred, target_names=["Incompatible", "Compatible"]))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    bundle = {
        "model":    mlp,
        "scaler":   scaler,
        "features": FEAT_COLS,
        "classes":  list(mlp.classes_),
    }
    with open(out_path, "wb") as f:
        pickle.dump(bundle, f)
    print(f"  Guardado: {out_path.resolve()}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv",    default="../backend/data/features_vocales.csv")
    parser.add_argument("--output", default="../backend/ml/models/mlp_compat.pkl")
    args = parser.parse_args()
    train(Path(args.csv), Path(args.output))
