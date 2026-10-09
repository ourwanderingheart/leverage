from typing import List

from fastapi import APIRouter, Depends, HTTPException

from core import db, now_iso, new_id, get_current_user
from models import (
    Analysis, AnalysisCreate, AnalysisSummary, AnalysisUpdate,
    ItemIn, ItemUpdate, ExperimentIn, ExperimentUpdate, LearningIn, LinkIn, TimelineEvent,
    SECTION_LABELS, EPISTEMIC_LABELS,
)

FRAMING_LABELS = {"title": "name", "challenge": "challenge", "current_situation": "current situation", "desired_situation": "desired situation"}

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


async def log_event(analysis_id: str, user_id: str, kind: str, summary: str, **detail):
    await db.analysis_events.insert_one({
        "id": new_id("ev_"), "analysis_id": analysis_id, "user_id": user_id,
        "kind": kind, "summary": summary, "detail": detail, "created_at": now_iso(),
    })


def _find(doc: dict, field: str, sub_id: str) -> dict:
    found = next((x for x in doc.get(field, []) if x["id"] == sub_id), None)
    if not found:
        raise HTTPException(status_code=404, detail="Not found")
    return found


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
    doc = await load_analysis(analysis_id, user["user_id"])
    changes = body.model_dump(exclude_none=True)
    changed = [k for k, v in changes.items() if k != "stage" and doc.get(k, "") != v]
    framing = [FRAMING_LABELS[k] for k in changed if k in FRAMING_LABELS]
    if framing:
        await log_event(analysis_id, user["user_id"], "framing", f"Revised the {', '.join(framing)}",
                        **{k: {"before": doc.get(k, ""), "after": changes[k]} for k in changed if k in FRAMING_LABELS})
    if "focus_question" in changed:
        await log_event(analysis_id, user["user_id"], "focus",
                        "Rewrote what you're trying to understand" if doc.get("focus_question") else "Named what you're trying to understand",
                        before=doc.get("focus_question", ""), after=changes["focus_question"])
    return await save_and_return(analysis_id, user["user_id"], {"$set": changes})


@router.delete("/{analysis_id}")
async def delete_analysis(analysis_id: str, user: dict = Depends(get_current_user)):
    res = await db.analyses.delete_one({"id": analysis_id, "user_id": user["user_id"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Analysis not found")
    await db.guide_messages.delete_many({"analysis_id": analysis_id})
    await db.analysis_events.delete_many({"analysis_id": analysis_id})
    return {"ok": True}


def _set_sub(prefix: str, body, extra: dict = None) -> dict:
    fields = {f"{prefix}.$.{k}": v for k, v in body.model_dump(exclude_unset=True).items()}
    fields.update(extra or {})
    return {"$set": fields}



def _q(text: str, n: int = 90) -> str:
    return f"“{text if len(text) <= n else text[: n - 1] + '…'}”"


@router.post("/{analysis_id}/items", response_model=Analysis)
async def add_item(analysis_id: str, body: ItemIn, user: dict = Depends(get_current_user)):
    await load_analysis(analysis_id, user["user_id"])
    ts = now_iso()
    item = {"id": new_id("it_"), **body.model_dump(), "source": "user", "created_at": ts, "updated_at": ts}
    await log_event(analysis_id, user["user_id"], "item_added", f"Added {_q(item['text'])} to {SECTION_LABELS[item['section']]}",
                    item_id=item["id"], section=item["section"], epistemic=item["epistemic"], source="user")
    return await save_and_return(analysis_id, user["user_id"], {"$push": {"items": item}})


@router.patch("/{analysis_id}/items/{item_id}", response_model=Analysis)
async def update_item(analysis_id: str, item_id: str, body: ItemUpdate, user: dict = Depends(get_current_user)):
    old = _find(await load_analysis(analysis_id, user["user_id"]), "items", item_id)
    update = _set_sub("items", body, {"items.$.updated_at": now_iso()})
    await db.analyses.update_one({"id": analysis_id, "user_id": user["user_id"], "items.id": item_id}, update)
    uid = user["user_id"]
    if body.text is not None and body.text != old["text"]:
        await log_event(analysis_id, uid, "item_revised", f"Revised an item in {SECTION_LABELS[old['section']]}",
                        item_id=item_id, before=old["text"], after=body.text)
    if body.epistemic is not None and body.epistemic != old["epistemic"]:
        await log_event(analysis_id, uid, "item_relabelled",
                        f"Relabelled {_q(body.text or old['text'])} from {EPISTEMIC_LABELS[old['epistemic']]} to {EPISTEMIC_LABELS[body.epistemic]}",
                        item_id=item_id, **{"from": old["epistemic"], "to": body.epistemic})
    return await save_and_return(analysis_id, uid, {})


@router.delete("/{analysis_id}/items/{item_id}", response_model=Analysis)
async def delete_item(analysis_id: str, item_id: str, user: dict = Depends(get_current_user)):
    old = _find(await load_analysis(analysis_id, user["user_id"]), "items", item_id)
    query = {"id": analysis_id, "user_id": user["user_id"]}
    await db.analyses.update_one(query, {"$pull": {"links": {"from_id": item_id}}})
    await db.analyses.update_one(query, {"$pull": {"links": {"to_id": item_id}}})
    await log_event(analysis_id, user["user_id"], "item_removed", f"Removed {_q(old['text'])} from {SECTION_LABELS[old['section']]}",
                    item_id=item_id, epistemic=old["epistemic"])
    return await save_and_return(analysis_id, user["user_id"], {"$pull": {"items": {"id": item_id}}})


@router.post("/{analysis_id}/links", response_model=Analysis)
async def add_link(analysis_id: str, body: LinkIn, user: dict = Depends(get_current_user)):
    doc = await load_analysis(analysis_id, user["user_id"])
    if body.from_id == body.to_id:
        raise HTTPException(status_code=400, detail="Choose two different items to link.")
    a, b = _find(doc, "items", body.from_id), _find(doc, "items", body.to_id)
    if any(lk["from_id"] == body.from_id and lk["to_id"] == body.to_id for lk in doc.get("links", [])):
        raise HTTPException(status_code=400, detail="That link already exists.")
    link = {"id": new_id("lk_"), **body.model_dump(), "created_at": now_iso()}
    await log_event(analysis_id, user["user_id"], "link_added", f"Linked {_q(a['text'], 50)} may influence {_q(b['text'], 50)}",
                    link_id=link["id"], epistemic=link["epistemic"])
    return await save_and_return(analysis_id, user["user_id"], {"$push": {"links": link}})


@router.delete("/{analysis_id}/links/{link_id}", response_model=Analysis)
async def delete_link(analysis_id: str, link_id: str, user: dict = Depends(get_current_user)):
    doc = await load_analysis(analysis_id, user["user_id"])
    link = _find(doc, "links", link_id)
    names = {i["id"]: i["text"] for i in doc["items"]}
    await log_event(analysis_id, user["user_id"], "link_removed",
                    f"Removed the link {_q(names.get(link['from_id'], '?'), 50)} → {_q(names.get(link['to_id'], '?'), 50)}", link_id=link_id)
    return await save_and_return(analysis_id, user["user_id"], {"$pull": {"links": {"id": link_id}}})


@router.post("/{analysis_id}/experiments", response_model=Analysis)
async def add_experiment(analysis_id: str, body: ExperimentIn, user: dict = Depends(get_current_user)):
    await load_analysis(analysis_id, user["user_id"])
    ts = now_iso()
    exp = {"id": new_id("ex_"), **body.model_dump(), "created_at": ts, "updated_at": ts}
    await log_event(analysis_id, user["user_id"], "experiment_added", f"Designed the experiment {_q(exp['title'])}", experiment_id=exp["id"])
    return await save_and_return(analysis_id, user["user_id"], {"$push": {"experiments": exp}})


@router.patch("/{analysis_id}/experiments/{exp_id}", response_model=Analysis)
async def update_experiment(analysis_id: str, exp_id: str, body: ExperimentUpdate, user: dict = Depends(get_current_user)):
    old = _find(await load_analysis(analysis_id, user["user_id"]), "experiments", exp_id)
    update = _set_sub("experiments", body, {"experiments.$.updated_at": now_iso()})
    await db.analyses.update_one({"id": analysis_id, "user_id": user["user_id"], "experiments.id": exp_id}, update)
    title = body.title or old["title"]
    if body.status and body.status != old["status"]:
        await log_event(analysis_id, user["user_id"], "experiment_status", f"Moved {_q(title)} from {old['status']} to {body.status}",
                        experiment_id=exp_id, **{"from": old["status"], "to": body.status})
    elif any(v is not None and v != old.get(k) for k, v in body.model_dump(exclude_unset=True).items()):
        await log_event(analysis_id, user["user_id"], "experiment_revised", f"Revised the experiment {_q(title)}", experiment_id=exp_id)
    return await save_and_return(analysis_id, user["user_id"], {})


@router.delete("/{analysis_id}/experiments/{exp_id}", response_model=Analysis)
async def delete_experiment(analysis_id: str, exp_id: str, user: dict = Depends(get_current_user)):
    old = _find(await load_analysis(analysis_id, user["user_id"]), "experiments", exp_id)
    await log_event(analysis_id, user["user_id"], "experiment_removed", f"Removed the experiment {_q(old['title'])}", experiment_id=exp_id)
    return await save_and_return(analysis_id, user["user_id"], {"$pull": {"experiments": {"id": exp_id}}})


@router.post("/{analysis_id}/learnings", response_model=Analysis)
async def add_learning(analysis_id: str, body: LearningIn, user: dict = Depends(get_current_user)):
    doc = await load_analysis(analysis_id, user["user_id"])
    entry = {"id": new_id("le_"), **body.model_dump(), "created_at": now_iso()}
    exp = next((x for x in doc.get("experiments", []) if x["id"] == body.experiment_id), None)
    await log_event(analysis_id, user["user_id"], "learning", "Recorded a learning loop",
                    learning_id=entry["id"], experiment=exp["title"] if exp else None,
                    tried=body.tried, changed=body.changed, revise=body.revise)
    return await save_and_return(analysis_id, user["user_id"], {"$push": {"learnings": entry}})


@router.delete("/{analysis_id}/learnings/{learning_id}", response_model=Analysis)
async def delete_learning(analysis_id: str, learning_id: str, user: dict = Depends(get_current_user)):
    await load_analysis(analysis_id, user["user_id"])
    await db.analysis_events.update_many({"analysis_id": analysis_id, "detail.learning_id": learning_id}, {"$set": {"detail.removed": True}})
    return await save_and_return(analysis_id, user["user_id"], {"$pull": {"learnings": {"id": learning_id}}})


@router.get("/{analysis_id}/timeline", response_model=List[TimelineEvent])
async def timeline(analysis_id: str, user: dict = Depends(get_current_user)):
    doc = await load_analysis(analysis_id, user["user_id"])
    events = await db.analysis_events.find({"analysis_id": analysis_id}, {"_id": 0}).sort("created_at", 1).to_list(5000)
    created = {"id": f"ev_start_{analysis_id}", "kind": "created", "summary": f"Started the analysis {_q(doc['title'])}", "created_at": doc["created_at"]}
    return [created, *events]
