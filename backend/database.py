from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

client = AsyncIOMotorClient(settings.MONGO_URI)
db = client["vocalia"]

# Colecciones
users_col      = db["users"]
recordings_col = db["recordings"]
results_col    = db["results"]
dataset_col    = db["dataset"]