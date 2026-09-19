from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

from db import Base, engine
import models  # noqa: F401  (registers models on Base before create_all)
from routes.jobs import router as jobs_router
from routes.settings import router as settings_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Margyn API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")
api_router.include_router(jobs_router)
api_router.include_router(settings_router)


@api_router.get("/")
def root():
    return {"message": "Margyn API"}


app.include_router(api_router)
