from typing import List

from fastapi import APIRouter, Depends, HTTPException

from core import db, now_iso, new_id, get_current_user
from models import (
    Analysis, AnalysisCreate, AnalysisSummary, AnalysisUpdate,
    ItemIn, ItemUpdate, ExperimentIn, ExperimentUpdate, LearningIn,
)

router = APIRouter(prefix="/analyses", tags=["analyses"])


async def load_analysis(analysis_id: str, user_id: str) -> dict:
    doc = await db.analyses.find_one({"id": analysis_id, "user_id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return doc


async def save_and_return(analysis_id: str, user_id: str, update: dict) -> Analysis:
    update.setdefault("$set", {})["updated_at"] = now_iso()
    await db.analyses.update_one({"id": analysis_id, "user_id": user_id}, update)
    return Analysis(**await load_analysis(analysis_id, user_id))


def _summary(doc: dict) -> AnalysisSummary:
    counts = {"known": 0, "inferred": 0, "unknown": 0}
    for item in doc.get("items", []):
        counts[item["epistemic"]] += 1
    return AnalysisSummary(
        **doc, counts=counts,
        experiment_count=len(doc.get("experiments", [])),
        learning_count=len(doc.get("learnings", [])),
    )


@router.get("", response_model=List[AnalysisSummary])
async def list_analyses(user: dict = Depends(get_current_user)):
    docs = await db.analyses.find({"user_id": user["user_id"]}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    return [_summary(d) for d in docs]


@router.post("", response_model=Analysis)
async def create_analysis(body: AnalysisCreate, user: dict = Depends(get_current_user)):
    ts = now_iso()
    analysis = Analysis(id=new_id("an_"), user_id=user["user_id"], **body.model_dump(), created_at=ts, updated_at=ts)
    await db.analyses.insert_one(analysis.model_dump())
    return analysis


@router.get("/{analysis_id}", response_model=Analysis)
async def get_analysis(analysis_id: str, user: dict = Depends(get_current_user)):
    return Analysis(**await load_analysis(analysis_id, user["user_id"]))


@router.patch("/{analysis_id}", response_model=Analysis)
async def update_analysis(analysis_id: str, body: AnalysisUpdate, user: dict = Depends(get_current_user)):
    await load_analysis(analysis_id, user["user_id"])
    return await save_and_return(analysis_id, user["user_id"], {"$set": body.model_dump(exclude_none=True)})


@router.delete("/{analysis_id}")
async def delete_analysis(analysis_id: str, user: dict = Depends(get_current_user)):
    res = await db.analyses.delete_one({"id": analysis_id, "user_id": user["user_id"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Analysis not found")
    await db.guide_messages.delete_many({"analysis_id": analysis_id})
    return {"ok": True}


def _set_sub(prefix: str, body, extra: dict = None) -> dict:
    fields = {f"{prefix}.$.{k}": v for k, v in body.model_dump(exclude_unset=True).items()}
    fields.update(extra or {})
    return {"$set": fields}


async def _require_sub(analysis_id: str, user_id: str, field: str, sub_id: str):
    if not await db.analyses.find_one({"id": analysis_id, "user_id": user_id, f"{field}.id": sub_id}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="Not found")


@router.post("/{analysis_id}/items", response_model=Analysis)
async def add_item(analysis_id: str, body: ItemIn, user: dict = Depends(get_current_user)):
    await load_analysis(analysis_id, user["user_id"])
    ts = now_iso()
    item = {"id": new_id("it_"), **body.model_dump(), "source": "user", "created_at": ts, "updated_at": ts}
    return await save_and_return(analysis_id, user["user_id"], {"$push": {"items": item}})


@router.patch("/{analysis_id}/items/{item_id}", response_model=Analysis)
async def update_item(analysis_id: str, item_id: str, body: ItemUpdate, user: dict = Depends(get_current_user)):
    await _require_sub(analysis_id, user["user_id"], "items", item_id)
    update = _set_sub("items", body, {"items.$.updated_at": now_iso()})
    await db.analyses.update_one({"id": analysis_id, "user_id": user["user_id"], "items.id": item_id}, update)
    return await save_and_return(analysis_id, user["user_id"], {})


@router.delete("/{analysis_id}/items/{item_id}", response_model=Analysis)
async def delete_item(analysis_id: str, item_id: str, user: dict = Depends(get_current_user)):
    await load_analysis(analysis_id, user["user_id"])
    return await save_and_return(analysis_id, user["user_id"], {"$pull": {"items": {"id": item_id}}})


@router.post("/{analysis_id}/experiments", response_model=Analysis)
async def add_experiment(analysis_id: str, body: ExperimentIn, user: dict = Depends(get_current_user)):
    await load_analysis(analysis_id, user["user_id"])
    ts = now_iso()
    exp = {"id": new_id("ex_"), **body.model_dump(), "created_at": ts, "updated_at": ts}
    return await save_and_return(analysis_id, user["user_id"], {"$push": {"experiments": exp}})


@router.patch("/{analysis_id}/experiments/{exp_id}", response_model=Analysis)
async def update_experiment(analysis_id: str, exp_id: str, body: ExperimentUpdate, user: dict = Depends(get_current_user)):
    await _require_sub(analysis_id, user["user_id"], "experiments", exp_id)
    update = _set_sub("experiments", body, {"experiments.$.updated_at": now_iso()})
    await db.analyses.update_one({"id": analysis_id, "user_id": user["user_id"], "experiments.id": exp_id}, update)
    return await save_and_return(analysis_id, user["user_id"], {})


@router.delete("/{analysis_id}/experiments/{exp_id}", response_model=Analysis)
async def delete_experiment(analysis_id: str, exp_id: str, user: dict = Depends(get_current_user)):
    await load_analysis(analysis_id, user["user_id"])
    return await save_and_return(analysis_id, user["user_id"], {"$pull": {"experiments": {"id": exp_id}}})


@router.post("/{analysis_id}/learnings", response_model=Analysis)
async def add_learning(analysis_id: str, body: LearningIn, user: dict = Depends(get_current_user)):
    await load_analysis(analysis_id, user["user_id"])
    entry = {"id": new_id("le_"), **body.model_dump(), "created_at": now_iso()}
    return await save_and_return(analysis_id, user["user_id"], {"$push": {"learnings": entry}})


@router.delete("/{analysis_id}/learnings/{learning_id}", response_model=Analysis)
async def delete_learning(analysis_id: str, learning_id: str, user: dict = Depends(get_current_user)):
    await load_analysis(analysis_id, user["user_id"])
    return await save_and_return(analysis_id, user["user_id"], {"$pull": {"learnings": {"id": learning_id}}})
