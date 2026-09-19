from datetime import datetime

from pydantic import BaseModel, ConfigDict


class JobCreate(BaseModel):
    client_name: str
    quoted_price_cents: int


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    client_name: str
    quoted_price_cents: int
    status: str
    created_at: datetime
    closed_at: datetime | None


class MaterialCreate(BaseModel):
    name: str
    cost_cents: int
    qty: int = 1


class MaterialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_id: str
    name: str
    cost_cents: int
    qty: int
    created_at: datetime


class TimeEntryCreate(BaseModel):
    hours: float
    note: str | None = None


class TimeEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_id: str
    hours: float
    note: str | None
    created_at: datetime


class JobDetailOut(JobOut):
    materials: list[MaterialOut]
    time_entries: list[TimeEntryOut]
    materials_cost_cents: int
    labor_cost_cents: int
    total_cost_cents: int
    margin_cents: int
    margin_pct: float


class SettingsOut(BaseModel):
    hourly_rate_cents: int
    target_margin_pct: float


class SettingsUpdate(BaseModel):
    hourly_rate_cents: int
    target_margin_pct: float
