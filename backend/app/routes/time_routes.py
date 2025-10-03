from fastapi import APIRouter
from datetime import datetime, timezone, timedelta

# Tehran timezone: UTC+3:30
TEHRAN_TZ = timezone(timedelta(hours=3, minutes=30))

router = APIRouter(prefix="/time", tags=["time"])


@router.get("/now")
async def get_now():
    now = datetime.now(TEHRAN_TZ)
    return {"now": now.isoformat()}


