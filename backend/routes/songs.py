from fastapi import APIRouter
from ml.song_matcher import load_songs, reload_songs

router = APIRouter()


@router.get("/")
def get_songs():
    songs = load_songs()
    return {"songs": songs, "total": len(songs)}


@router.get("/stats")
def get_stats():
    songs = load_songs()
    return {"total": len(songs)}


@router.post("/reload")
def force_reload():
    songs = reload_songs()
    return {"message": "Catálogo recargado", "total": len(songs)}
