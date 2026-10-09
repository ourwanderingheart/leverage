import json
import logging
import os
import re
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

from core import db, now_iso, new_id, get_current_user
from models import SECTIONS, SECTION_LABELS, Analysis, GuideMessage, GuideMessageIn, ProposalAccept
from routes_analyses import load_analysis, save_and_return, log_event

router = APIRouter(prefix="/analyses/{analysis_id}/guide", tags=["guide"])
logger = logging.getLogger(__name__)

PROPOSAL_RE = re.compile(r"<<<PROPOSALS\s*(.*?)\s*(?:PROPOSALS>>>|$)", re.DOTALL)

SYSTEM_PROMPT = """You are the Guide inside "Leverage What Matters", an AI-guided thinking platform.
Philosophy: Human thinks. AI structures. Human decides.
You are NOT an answer engine. You help one person slow down, understand a complex situation, surface patterns and assumptions, notice where change MAY have influence, design small testable experiments, and learn from what happens.

The Leverage 8 Method (movements of better thinking, not a checklist; people move back and forth):
L Locate the Challenge, E Examine Patterns, V View the System, E Expose Assumptions, R Reveal Relationships, A Assess Leverage, G Generate Experiments, E Evaluate Learning.
Visible journey: Focus (L) -> See (E,V,E,R) -> Decide (A,G) -> Learn (E).

Rules:
- Ask exactly ONE thoughtful question per reply. Never a list of questions.
- Do not recommend solutions, especially in Focus. Never prescribe a final answer.
- Never rank leverage points or use scores, percentages or fake precision.
- Use cautious causal language ("may", "might be contributing", "one possibility is").
- Treat any system picture as a working hypothesis.
- Under YOU TOLD ME only reflect things the user explicitly said (in the analysis or chat). Never present your inferences as facts.
- You cannot change the analysis. You may PROPOSE up to 3 additions; the user decides whether to add them.
- Proposals: epistemic "known" ONLY if restating something the user explicitly said in chat that is not yet in the analysis; "inferred" for your hypotheses; "unknown" for things that need checking.
- Keep it short and warm: under 170 words before proposals. Plain text, no markdown headings, no bullet lists.
- If the user asks how they could check an item, suggest ONE small, low-cost way to verify it (who to ask, what to observe, what quick data to look at), framed tentatively; name what would count as a sign either way; then ask your one question.

Reply format (labels in capitals, each on its own line; omit a label if empty, but ALWAYS end the text with QUESTION):
YOU TOLD ME: ...
I'M WONDERING: ...
WE DON'T KNOW YET: ...
QUESTION: ...

Optionally after the text, include proposals (max 3) exactly like this — a JSON array mixing any of these three types:
<<<PROPOSALS
[{"type": "item", "section": "<one of: in_scope, out_of_scope, patterns, relationships, assumptions, stakeholders, loops, boundaries, leverage>", "text": "<concise item, max 140 chars>", "epistemic": "inferred|unknown|known", "rationale": "<why, max 120 chars>"},
 {"type": "link", "from_id": "<id of an EXISTING item>", "to_id": "<id of another EXISTING item>", "epistemic": "inferred|unknown|known", "rationale": "<how A may influence B, max 120 chars>"},
 {"type": "experiment", "title": "<short name>", "action": "<if we try...>", "hypothesis": "<we're testing whether...>", "signal": "<we'll watch for...>", "timeframe": "<e.g. one week>", "rationale": "<why this is a small safe check>"}]
PROPOSALS>>>
When the user shares a new concrete fact in chat that is not yet in the analysis, propose it as "known" in the fitting section.
Link proposals mean "A may influence B": only use item ids listed in the analysis, never link an item to itself, never repeat an existing link, and use "inferred" unless the user explicitly said it.
When the user asks how they could check an item, ALWAYS include exactly one "experiment" proposal that captures that small check.
Otherwise only propose when it genuinely helps."""


def _context(analysis: dict, history: List[dict], stage: str) -> str:
    lines = [
        f"Title: {analysis['title']}",
        f"Challenge (user): {analysis['challenge']}",
        f"Current situation (user): {analysis.get('current_situation') or '(not provided)'}",
        f"Desired situation (user): {analysis.get('desired_situation') or '(not provided)'}",
        f"What they are trying to understand (user): {analysis.get('focus_question') or '(not provided)'}",
    ]
    for key, label in SECTION_LABELS.items():
        items = [i for i in analysis.get("items", []) if i["section"] == key]
        if items:
            lines.append(f"{label}:")
            lines += [f"  - (id {i['id']}) [{i['epistemic'].upper()}{', from guide' if i['source'] == 'guide' else ''}] {i['text']}" for i in items]
    names = {i["id"]: i["text"] for i in analysis.get("items", [])}
    for lk in analysis.get("links", []):
        lines.append(f"Link [{lk['epistemic'].upper()}]: {names.get(lk['from_id'], '?')} -> may influence -> {names.get(lk['to_id'], '?')}{' (' + lk['note'] + ')' if lk.get('note') else ''}")
    for e in analysis.get("experiments", []):
        lines.append(f"Experiment ({e['status']}): {e['title']} | action: {e['action']} | testing: {e['hypothesis']} | signal: {e['signal']}")
    for le in analysis.get("learnings", []):
        lines.append(f"Learning: tried {le['tried']} | happened {le['happened']} | surprised {le['surprised']} | changed {le['changed']} | revise {le['revise']}")
    transcript = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in history[-16:]) or "(no prior conversation)"
    return f"{SYSTEM_PROMPT}\n\nThe user is currently viewing the {stage.upper()} stage.\n\nCURRENT ANALYSIS (user-owned):\n" + "\n".join(lines) + f"\n\nCONVERSATION SO FAR:\n{transcript}"


EPISTEMICS = ("known", "inferred", "unknown")
EXP_FIELDS = ("action", "hypothesis", "signal", "timeframe")


def _proposal(p: dict, names: dict, links: set):
    base = {"id": new_id("pr_"), "rationale": str(p.get("rationale", ""))[:300], "status": "pending", "item_id": None,
            "epistemic": p.get("epistemic") if p.get("epistemic") in EPISTEMICS else "inferred"}
    kind = p.get("type", "item")
    if kind == "item" and p.get("section") in SECTIONS and p.get("text"):
        return {**base, "type": "item", "section": p["section"], "text": str(p["text"])[:600]}
    if kind == "link":
        a, b = p.get("from_id"), p.get("to_id")
        if a in names and b in names and a != b and (a, b) not in links:
            return {**base, "type": "link", "from_id": a, "to_id": b, "from_text": names[a], "to_text": names[b],
                    "text": f"{names[a]} may influence {names[b]}"}
    if kind == "experiment" and p.get("title"):
        return {**base, "type": "experiment", "epistemic": "unknown", "text": str(p["title"])[:200],
                "experiment": {k: str(p.get(k, ""))[:1500] for k in EXP_FIELDS}}
    return None


def _parse(full: str, analysis: dict):
    match = PROPOSAL_RE.search(full)
    content = full.split("<<<PROPOSALS")[0].strip()
    names = {i["id"]: i["text"] for i in analysis.get("items", [])}
    links = {(lk["from_id"], lk["to_id"]) for lk in analysis.get("links", [])}
    proposals = []
    if match:
        try:
            raw = json.loads(match.group(1))
        except json.JSONDecodeError:
            raw = []
        for p in raw[:3] if isinstance(raw, list) else []:
            if isinstance(p, dict) and (prop := _proposal(p, names, links)):
                proposals.append(prop)
    return content, proposals


@router.get("/messages", response_model=List[GuideMessage])
async def list_messages(analysis_id: str, user: dict = Depends(get_current_user)):
    await load_analysis(analysis_id, user["user_id"])
    return await db.guide_messages.find({"analysis_id": analysis_id}, {"_id": 0}).sort("created_at", 1).to_list(500)


@router.post("/messages")
async def send_message(analysis_id: str, body: GuideMessageIn, user: dict = Depends(get_current_user)):
    analysis = await load_analysis(analysis_id, user["user_id"])
    history = await db.guide_messages.find({"analysis_id": analysis_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    user_msg = GuideMessage(id=new_id("gm_"), analysis_id=analysis_id, role="user", content=body.content,
                            stage=body.stage, created_at=now_iso())
    await db.guide_messages.insert_one({**user_msg.model_dump(), "user_id": user["user_id"]})

    chat = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=f"{analysis_id}-{user_msg.id}",
        system_message=_context(analysis, history, body.stage),
    ).with_model(os.environ["GUIDE_MODEL_PROVIDER"], os.environ["GUIDE_MODEL_NAME"])

    async def events():
        yield f"data: {json.dumps({'type': 'user', 'message': user_msg.model_dump()})}\n\n"
        full = ""
        try:
            async for ev in chat.stream_message(UserMessage(text=body.content)):
                if isinstance(ev, TextDelta):
                    full += ev.content
                    yield f"data: {json.dumps({'type': 'delta', 'content': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception as exc:  # noqa: BLE001
            logger.exception("Guide stream failed")
            yield f"data: {json.dumps({'type': 'error', 'detail': str(exc)[:200]})}\n\n"
            return
        content, proposals = _parse(full, analysis)
        msg = GuideMessage(id=new_id("gm_"), analysis_id=analysis_id, role="assistant", content=content,
                           stage=body.stage, proposals=proposals, created_at=now_iso())
        await db.guide_messages.insert_one({**msg.model_dump(), "user_id": user["user_id"]})
        yield f"data: {json.dumps({'type': 'done', 'message': msg.model_dump()})}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


async def _find_proposal(analysis_id: str, proposal_id: str):
    msg = await db.guide_messages.find_one({"analysis_id": analysis_id, "proposals.id": proposal_id}, {"_id": 0})
    proposal = next((p for p in (msg or {}).get("proposals", []) if p["id"] == proposal_id), None)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if proposal["status"] != "pending":
        raise HTTPException(status_code=400, detail="This proposal was already handled")
    return proposal


def _accepted_record(proposal: dict, body: ProposalAccept, doc: dict, ts: str):
    kind = proposal.get("type", "item")
    epistemic = body.epistemic or proposal["epistemic"]
    if kind == "link":
        names = {i["id"]: i["text"] for i in doc.get("items", [])}
        if proposal["from_id"] not in names or proposal["to_id"] not in names:
            raise HTTPException(status_code=400, detail="One of the linked items no longer exists.")
        if any(lk["from_id"] == proposal["from_id"] and lk["to_id"] == proposal["to_id"] for lk in doc.get("links", [])):
            raise HTTPException(status_code=400, detail="That link already exists.")
        link = {"id": new_id("lk_"), "from_id": proposal["from_id"], "to_id": proposal["to_id"], "note": proposal.get("rationale", ""),
                "epistemic": epistemic, "source": "guide", "created_at": ts}
        summary = f"Confirmed a Guide link: “{names[link['from_id']][:50]}” may influence “{names[link['to_id']][:50]}”"
        return "links", link, "link_added", summary, {"link_id": link["id"], "epistemic": epistemic, "source": "guide"}
    if kind == "experiment":
        exp = {"id": new_id("ex_"), "title": body.text or proposal["text"], **(proposal.get("experiment") or {}),
               "leverage_item_id": None, "status": "planned", "created_at": ts, "updated_at": ts}
        summary = f"Turned a Guide check into the experiment “{exp['title'][:90]}”"
        return "experiments", exp, "experiment_added", summary, {"experiment_id": exp["id"], "source": "guide"}
    item = {"id": new_id("it_"), "section": proposal["section"], "text": body.text or proposal["text"],
            "note": proposal.get("rationale", ""), "epistemic": epistemic, "source": "guide", "created_at": ts, "updated_at": ts}
    summary = f"Confirmed a Guide proposal: “{item['text'][:90]}” in {SECTION_LABELS[item['section']]}"
    return "items", item, "guide_confirmed", summary, {"item_id": item["id"], "section": item["section"], "epistemic": epistemic, "source": "guide"}


@router.post("/proposals/{proposal_id}/accept")
async def accept_proposal(analysis_id: str, proposal_id: str, body: ProposalAccept, user: dict = Depends(get_current_user)):
    doc = await load_analysis(analysis_id, user["user_id"])
    proposal = await _find_proposal(analysis_id, proposal_id)
    field, record, kind, summary, detail = _accepted_record(proposal, body, doc, now_iso())
    analysis: Analysis = await save_and_return(analysis_id, user["user_id"], {"$push": {field: record}})
    await log_event(analysis_id, user["user_id"], kind, summary, **detail)
    await db.guide_messages.update_one(
        {"analysis_id": analysis_id, "proposals.id": proposal_id},
        {"$set": {"proposals.$.status": "accepted", "proposals.$.item_id": record["id"]}},
    )
    message = await db.guide_messages.find_one({"proposals.id": proposal_id}, {"_id": 0})
    return {"analysis": analysis, "message": GuideMessage(**message)}


@router.post("/proposals/{proposal_id}/dismiss", response_model=GuideMessage)
async def dismiss_proposal(analysis_id: str, proposal_id: str, user: dict = Depends(get_current_user)):
    await load_analysis(analysis_id, user["user_id"])
    await _find_proposal(analysis_id, proposal_id)
    await db.guide_messages.update_one(
        {"analysis_id": analysis_id, "proposals.id": proposal_id},
        {"$set": {"proposals.$.status": "dismissed"}},
    )
    return GuideMessage(**await db.guide_messages.find_one({"proposals.id": proposal_id}, {"_id": 0}))
