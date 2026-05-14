from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

client = AsyncIOMotorClient(
    settings.MONGO_URI,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=10000,
    socketTimeoutMS=20000,
    maxPoolSize=10,
    retryWrites=True,
    retryReads=True,
)
db = client["vocalia"]

# Colecciones
users_col      = db["users"]
recordings_col = db["recordings"]
results_col    = db["results"]
dataset_col    = db["dataset"]
posts_col      = db["posts"]
follows_col    = db["follows"]
notifs_col     = db["notifications"]
resets_col     = db["password_resets"]
artists_col    = db["artists"]
comments_col   = db["comments"]