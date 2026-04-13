from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from routes import auth, voice, history, dataset

app = FastAPI(
    title="VocalIA API",
    description="Backend para análisis de voz y clasificación vocal",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8080",       # ← tu frontend actual
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
        "https://tu-frontend.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir audios de piano desde dataset_audio/voz/
PIANO_DIR = os.path.join(os.path.dirname(__file__), "dataset_audio", "voz")
if os.path.isdir(PIANO_DIR):
    app.mount("/audio/piano", StaticFiles(directory=PIANO_DIR), name="piano_audio")

app.include_router(auth.router,    prefix="/auth",    tags=["Auth"])
app.include_router(voice.router,   prefix="/voice",   tags=["Voice"])
app.include_router(history.router, prefix="/history", tags=["History"])
app.include_router(dataset.router, prefix="/dataset", tags=["Dataset"])

@app.get("/")
def root():
    return {"status": "VocalIA API running 🎤"}