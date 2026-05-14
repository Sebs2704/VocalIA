"""
Genera datos de entrenamiento sintéticos para el clasificador de rango vocal.
Features: [min_freq, max_freq, base_freq]  →  label: rango vocal

Uso:
    python generate_data.py [--samples 150] [--out ./data/synthetic.csv]
"""
import argparse
import csv
import os
import numpy as np
from collections import Counter

# Perfiles de frecuencia por rango vocal (Hz)
# Fuentes: literatura foniatría + tablas ANSI de rangos vocales
RANGE_PROFILES = {
    "Bajo": {
        "min_freq":  (65.0,  130.0),
        "max_freq":  (196.0, 330.0),
        "base_freq": (90.0,  165.0),
    },
    "Barítono": {
        "min_freq":  (98.0,  165.0),
        "max_freq":  (262.0, 392.0),
        "base_freq": (130.0, 210.0),
    },
    "Tenor": {
        "min_freq":  (130.0, 220.0),
        "max_freq":  (349.0, 523.0),
        "base_freq": (175.0, 295.0),
    },
    "Contralto": {
        "min_freq":  (130.0, 220.0),
        "max_freq":  (330.0, 523.0),
        "base_freq": (155.0, 255.0),
    },
    "Mezzosoprano": {
        "min_freq":  (155.0, 262.0),
        "max_freq":  (440.0, 698.0),
        "base_freq": (195.0, 340.0),
    },
    "Soprano": {
        "min_freq":  (220.0, 350.0),
        "max_freq":  (587.0, 1047.0),
        "base_freq": (295.0, 520.0),
    },
}


def generate_dataset(n_per_class: int = 150, seed: int = 42) -> list:
    np.random.seed(seed)
    data = []

    for label, profile in RANGE_PROFILES.items():
        for _ in range(n_per_class):
            min_f  = np.random.uniform(*profile["min_freq"])
            max_f  = np.random.uniform(*profile["max_freq"])
            base_f = np.random.uniform(*profile["base_freq"])

            # Restricciones lógicas: base_freq debe estar entre min y max
            base_f = np.clip(base_f, min_f + 5, max_f - 5)

            data.append({
                "min_freq":  round(float(min_f),  2),
                "max_freq":  round(float(max_f),  2),
                "base_freq": round(float(base_f), 2),
                "label":     label,
            })

    np.random.shuffle(data)
    return data


def save_csv(data: list, path: str):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["min_freq", "max_freq", "base_freq", "label"])
        writer.writeheader()
        writer.writerows(data)
    print(f"✅ Dataset guardado en: {path}  ({len(data)} muestras)")
    counts = Counter(d["label"] for d in data)
    for label, n in sorted(counts.items()):
        print(f"   {label:15s}: {n}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=150, help="Muestras por clase")
    parser.add_argument("--out",     default="./data/synthetic.csv")
    args = parser.parse_args()

    data = generate_dataset(n_per_class=args.samples)
    save_csv(data, args.out)
