import json
import logging
import os
import re
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

from core import db, now_iso, new_id, get_current_user
from models import SECTIONS, Analysis, GuideMessage, GuideMessageIn, ProposalAccept
from routes_analyses import load_analysis, save_and_return

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

Reply format (labels in capitals, each on its own line; omit a label if empty, but ALWAYS end the text with QUESTION):
YOU TOLD ME: ...
I'M WONDERING: ...
WE DON'T KNOW YET: ...
QUESTION: ...

Optionally after the text, include proposals exactly like this:
<<<PROPOSALS
[{"section": "<one of: in_scope, out_of_scope, patterns, relationships, assumptions, stakeholders, loops, boundaries, leverage>", "text": "<concise item, max 140 chars>", "epistemic": "inferred|unknown|known", "rationale": "<why, max 120 chars>"}]
PROPOSALS>>>
When the user shares a new concrete fact in chat that is not yet in the analysis, propose it as "known" in the fitting section. Otherwise only propose when it genuinely helps."""

SECTION_LABELS = {
    "in_scope": "Inside scope", "out_of_scope": "Outside scope but influencing", "patterns": "Patterns over time",
    "relationships": "Relationships", "assumptions": "Assumptions", "stakeholders": "Stakeholders",
    "loops": "Possible feedback loops", "boundaries": "System boundaries", "leverage": "Possible leverage",
}


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
            lines += [f"  - [{i['epistemic'].upper()}{', from guide' if i['source'] == 'guide' else ''}] {i['text']}" for i in items]
    for e in analysis.get("experiments", []):
        lines.append(f"Experiment ({e['status']}): {e['title']} | action: {e['action']} | testing: {e['hypothesis']} | signal: {e['signal']}")
    for le in analysis.get("learnings", []):
        lines.append(f"Learning: tried {le['tried']} | happened {le['happened']} | surprised {le['surprised']} | changed {le['changed']} | revise {le['revise']}")
    transcript = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in history[-16:]) or "(no prior conversation)"
    return f"{SYSTEM_PROMPT}\n\nThe user is currently viewing the {stage.upper()} stage.\n\nCURRENT ANALYSIS (user-owned):\n" + "\n".join(lines) + f"\n\nCONVERSATION SO FAR:\n{transcript}"


def _parse(full: str):
    match = PROPOSAL_RE.search(full)
    content = full.split("<<<PROPOSALS")[0].strip()
    proposals = []
    if match:
        try:
            raw = json.loads(match.group(1))
        except json.JSONDecodeError:
            raw = []
        for p in raw[:3] if isinstance(raw, list) else []:
            if isinstance(p, dict) and p.get("section") in SECTIONS and p.get("text"):
                proposals.append({
                    "id": new_id("pr_"), "section": p["section"], "text": str(p["text"])[:600],
                    "epistemic": p.get("epistemic") if p.get("epistemic") in ("known", "inferred", "unknown") else "inferred",
                    "rationale": str(p.get("rationale", ""))[:300], "status": "pending", "item_id": None,
                })
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
        content, proposals = _parse(full)
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


@router.post("/proposals/{proposal_id}/accept")
async def accept_proposal(analysis_id: str, proposal_id: str, body: ProposalAccept, user: dict = Depends(get_current_user)):
    await load_analysis(analysis_id, user["user_id"])
    proposal = await _find_proposal(analysis_id, proposal_id)
    ts = now_iso()
    item = {
        "id": new_id("it_"), "section": proposal["section"], "text": body.text or proposal["text"],
        "note": proposal.get("rationale", ""), "epistemic": body.epistemic or proposal["epistemic"],
        "source": "guide", "created_at": ts, "updated_at": ts,
    }
    analysis: Analysis = await save_and_return(analysis_id, user["user_id"], {"$push": {"items": item}})
    await db.guide_messages.update_one(
        {"analysis_id": analysis_id, "proposals.id": proposal_id},
        {"$set": {"proposals.$.status": "accepted", "proposals.$.item_id": item["id"]}},
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
