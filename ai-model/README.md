# 🤖 VocalIA — Módulo de IA

## Estado actual: Recolección de datos
El modelo aún no está entrenado. El flujo actual es:

```
Usuario graba voz
       ↓
POST /dataset/submit  ← guarda en MongoDB + disco
       ↓
Tú etiquetas las muestras (labels.csv)
       ↓
python train.py  ← entrena el modelo
       ↓
Modelo .pkl disponible para inferencia en el backend
```

## Flujo futuro (cuando tengas 300+ muestras)

```
Usuario graba voz
       ↓
POST /voice/analyze
       ↓
feature_extractor.py → vector de 22 features
       ↓
modelo .pkl → predict_proba
       ↓
JSON con rango vocal + confianza
```

## Instalar dependencias

```bash
pip install -r requirements.txt
```

## Etiquetar muestras (cuando tengas audios)

Crea `dataset_labels.csv`:
```csv
filename,label
masculino_abc123.wav,Barítono
femenino_xyz789.wav,Soprano
masculino_def456.wav,Tenor
```

Las etiquetas válidas son:
- `Bajo` (hombre, grave)
- `Barítono` (hombre, medio)
- `Tenor` (hombre, agudo)
- `Contralto` (mujer, grave)
- `Mezzosoprano` (mujer, medio)
- `Soprano` (mujer, agudo)

## Entrenar

```bash
python train.py \
  --data-dir ../backend/dataset_audio \
  --labels-csv ./dataset_labels.csv \
  --model-out ./models/vocalia_v1.pkl
```

## Usar el modelo en el backend

Cuando el modelo esté entrenado, edita `backend/routes/voice.py`:

```python
# Reemplaza analyze_pitch_basic() con:
from ai_model.train import predict

result = predict(tmp_path, "ai-model/models/vocalia_v1.pkl")
```
