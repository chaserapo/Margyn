from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db import get_db
from models import Settings
from schemas import SettingsOut, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


def get_or_create_settings(db: Session) -> Settings:
    settings = db.get(Settings, 1)
    if settings is None:
        settings = Settings(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("", response_model=SettingsOut)
def read_settings(db: Session = Depends(get_db)):
    return get_or_create_settings(db)


@router.put("", response_model=SettingsOut)
def update_settings(data: SettingsUpdate, db: Session = Depends(get_db)):
    settings = get_or_create_settings(db)
    settings.hourly_rate_cents = data.hourly_rate_cents
    settings.target_margin_pct = data.target_margin_pct
    db.commit()
    db.refresh(settings)
    return settings
