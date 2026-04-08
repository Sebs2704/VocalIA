from fastapi import APIRouter, Depends
from database import results_col
from auth_utils import get_current_user

router = APIRouter()

@router.get("/")
async def get_history(current_user: dict = Depends(get_current_user)):
    cursor = results_col.find(
        {"user_id": current_user["_id"]},
        sort=[("date", -1)],
        limit=20
    )
    docs = await cursor.to_list(length=20)
    for d in docs:
        d["id"] = d.pop("_id")
        d["date"] = d["date"].isoformat()
    return docs
