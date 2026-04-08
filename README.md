# 🎤 VocalIA

Plataforma de análisis de rango vocal con inteligencia artificial.

```
VocalIA/
├── frontend/     React + Vite + Tailwind (lo que tienes ahora, mejorado)
├── backend/      FastAPI + JWT + MongoDB
├── ai-model/     Python: extracción de features + entrenamiento
└── database/     Scripts de inicialización MongoDB Atlas
```

---

## 📊 Estado del proyecto

| Componente    | Estado             | Próximo paso                         |
|---------------|--------------------|--------------------------------------|
| Frontend      | ✅ Listo           | Conectar a backend desplegado        |
| Backend       | ✅ Listo           | Desplegar en Render                  |
| Base de datos | ✅ Lista           | Crear cluster en Atlas               |
| IA - Features | ✅ Lista           | Se activa automáticamente            |
| IA - Modelo   | ⏳ Sin entrenar    | Recolectar muestras primero           |

---

## 🤖 Flujo de entrenamiento de la IA

```
1. Usuarios graban voz en /dataset/submit
         ↓
2. Audios guardados en backend/dataset_audio/
   + metadatos en MongoDB colección "dataset"
         ↓
3. Tú etiquetas: crear ai-model/dataset_labels.csv
         ↓
4. python ai-model/train.py
         ↓
5. Modelo guardado en ai-model/models/vocalia_v1.pkl
         ↓
6. Integrar modelo en backend/routes/voice.py
```

---

## 📡 API Endpoints

| Método | Ruta                | Auth | Descripción                    |
|--------|---------------------|------|--------------------------------|
| POST   | /auth/signup        | No   | Registro de usuario            |
| POST   | /auth/login         | No   | Login → retorna JWT            |
| POST   | /voice/analyze      | Sí   | Analiza audio → rango vocal    |
| POST   | /dataset/submit     | No   | Envía muestra anónima          |
| GET    | /dataset/stats      | No   | Stats del dataset              |
| GET    | /history/           | Sí   | Historial de análisis          |

Documentación interactiva: `http://localhost:8000/docs`
