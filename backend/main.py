from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from routes import auth, voice, history, dataset, songs, social
from seed_artists import seed_artists

app = FastAPI(
    title="VocalIA API",
    description="Backend para análisis de voz y clasificación vocal",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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
app.include_router(songs.router,   prefix="/songs",   tags=["Songs"])
app.include_router(social.router,  prefix="/social",  tags=["Social"])

@app.on_event("startup")
async def startup():
    from database import client
    try:
        await client.admin.command("ping")
        print("MongoDB connection: OK")
    except Exception as e:
        print(f"MongoDB connection FAILED: {type(e).__name__}: {e}")
    try:
        await seed_artists()
    except Exception as e:
        print(f"WARNING: seed_artists failed on startup: {e}")


@app.get("/")
def root():
    return {"status": "VocalIA API running 🎤"}