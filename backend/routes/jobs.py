from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models import Job, MaterialLine, TimeEntry
from routes.settings import get_or_create_settings
from schemas import (
    JobCreate,
    JobDetailOut,
    JobOut,
    MaterialCreate,
    MaterialOut,
    TimeEntryCreate,
    TimeEntryOut,
)

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _get_job_or_404(db: Session, job_id: str) -> Job:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


def _to_detail(job: Job, hourly_rate_cents: int) -> JobDetailOut:
    materials_cost = sum(m.cost_cents * m.qty for m in job.materials)
    total_hours = sum(t.hours for t in job.time_entries)
    labor_cost = round(total_hours * hourly_rate_cents)
    total_cost = materials_cost + labor_cost
    margin_cents = job.quoted_price_cents - total_cost
    margin_pct = (margin_cents / job.quoted_price_cents * 100) if job.quoted_price_cents else 0.0

    return JobDetailOut(
        id=job.id,
        client_name=job.client_name,
        quoted_price_cents=job.quoted_price_cents,
        status=job.status,
        created_at=job.created_at,
        closed_at=job.closed_at,
        materials=[MaterialOut.model_validate(m) for m in job.materials],
        time_entries=[TimeEntryOut.model_validate(t) for t in job.time_entries],
        materials_cost_cents=materials_cost,
        labor_cost_cents=labor_cost,
        total_cost_cents=total_cost,
        margin_cents=margin_cents,
        margin_pct=margin_pct,
    )


@router.get("", response_model=list[JobOut])
def list_jobs(db: Session = Depends(get_db)):
    return db.query(Job).order_by(Job.created_at.desc()).all()


@router.post("", response_model=JobOut)
def create_job(data: JobCreate, db: Session = Depends(get_db)):
    job = Job(client_name=data.client_name, quoted_price_cents=data.quoted_price_cents)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("/{job_id}", response_model=JobDetailOut)
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = _get_job_or_404(db, job_id)
    settings = get_or_create_settings(db)
    return _to_detail(job, settings.hourly_rate_cents)


@router.post("/{job_id}/close", response_model=JobOut)
def close_job(job_id: str, db: Session = Depends(get_db)):
    job = _get_job_or_404(db, job_id)
    job.status = "closed"
    job.closed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(job)
    return job


@router.post("/{job_id}/materials", response_model=MaterialOut)
def add_material(job_id: str, data: MaterialCreate, db: Session = Depends(get_db)):
    job = _get_job_or_404(db, job_id)
    if job.status == "closed":
        raise HTTPException(status_code=400, detail="Job is closed")
    material = MaterialLine(job_id=job.id, **data.model_dump())
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.post("/{job_id}/time-entries", response_model=TimeEntryOut)
def add_time_entry(job_id: str, data: TimeEntryCreate, db: Session = Depends(get_db)):
    job = _get_job_or_404(db, job_id)
    if job.status == "closed":
        raise HTTPException(status_code=400, detail="Job is closed")
    entry = TimeEntry(job_id=job.id, **data.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
