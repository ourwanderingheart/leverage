import logging
import os

from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from core import client, db
import routes_auth
import routes_analyses
import routes_guide

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

app = FastAPI(title="Leverage What Matters API")
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"service": "Leverage What Matters", "status": "ok"}


api.include_router(routes_auth.router)
api.include_router(routes_analyses.router)
api.include_router(routes_guide.router)
app.include_router(api)

origins = [o.strip() for o in os.environ["CORS_ORIGINS"].split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[] if "*" in origins else origins,
    allow_origin_regex=".*" if "*" in origins else None,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token")
    await db.login_attempts.create_index("identifier")
    await db.analyses.create_index([("user_id", 1), ("updated_at", -1)])
    await db.analyses.create_index("id", unique=True)
    await db.guide_messages.create_index([("analysis_id", 1), ("created_at", 1)])
    await db.analysis_events.create_index([("analysis_id", 1), ("created_at", 1)])
    await db.map_snapshots.create_index([("analysis_id", 1), ("created_at", 1)])
    await routes_auth.seed_demo_user()


@app.on_event("shutdown")
async def shutdown():
    client.close()
