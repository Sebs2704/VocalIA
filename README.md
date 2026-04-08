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

## 🚀 Guía de inicio rápido

### Paso 1 — Configurar MongoDB Atlas
Lee `database/README.md`. En resumen:
1. Crea cuenta en https://mongodb.com/atlas (gratis)
2. Crea cluster M0 gratuito
3. Obtén la connection string
4. Corre `database/init.js` en el shell de Atlas

### Paso 2 — Levantar el backend localmente

```bash
cd backend
cp .env.example .env
# Edita .env y pega tu MONGO_URI y un SECRET_KEY seguro
pip install -r requirements.txt
uvicorn main:app --reload
# Backend corriendo en http://localhost:8000
# Documentación automática en http://localhost:8000/docs
```

### Paso 3 — Levantar el frontend localmente

```bash
cd frontend
cp .env.example .env.local
# Verifica que VITE_API_URL=http://localhost:8000
npm install
npm run dev
# Frontend corriendo en http://localhost:5173
```

### Paso 4 — Despliegue

#### Backend → Render.com
1. Crea cuenta en https://render.com
2. "New Web Service" → conecta tu repo de GitHub
3. Root Directory: `backend`
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. En "Environment Variables" añade `MONGO_URI` y `SECRET_KEY`

#### Frontend → Vercel
1. Crea cuenta en https://vercel.com
2. "New Project" → importa tu repo de GitHub
3. Root Directory: `frontend`
4. En "Environment Variables" añade:
   - `VITE_API_URL` = URL de tu backend en Render (ej: https://vocalia-backend.onrender.com)
5. Deploy

---

## 📊 Estado del proyecto

| Componente    | Estado             | Próximo paso                         |
|---------------|--------------------|--------------------------------------|
| Frontend      | ✅ Listo           | Conectar a backend desplegado        |
| Backend       | ✅ Listo           | Desplegar en Render                  |
| Base de datos | ✅ Lista           | Crear cluster en Atlas               |
| IA - Features | ✅ Lista           | Se activa automáticamente            |
| IA - Modelo   | ⏳ Sin entrenar    | Recolectar 300+ muestras primero     |

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
