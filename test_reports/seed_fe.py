"""Seed deterministic state in the demo user for frontend testing of iter 3 features."""
import os
import requests
from pymongo import MongoClient

BASE = "https://system-leverage-2.preview.emergentagent.com"
API = BASE + "/api"

env = {}
for line in open("/app/backend/.env").read().splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"')
dbh = MongoClient(env["MONGO_URL"])[env["DB_NAME"]]

s = requests.Session()
r = s.post(f"{API}/auth/login", json={"email": "demo@leveragewhatmatters.com", "password": "Leverage8!"})
assert r.status_code == 200, r.text
me = s.get(f"{API}/auth/me").json()
uid = me["user_id"]

# Clean previous TEST_iter3 analyses for this user
for a in s.get(f"{API}/analyses").json():
    if a["title"].startswith("TEST_iter3"):
        s.delete(f"{API}/analyses/{a['id']}")

r = s.post(f"{API}/analyses", json={
    "title": "TEST_iter3",
    "challenge": "Specs arrive late and engineers start without them.",
})
aid = r.json()["id"]
# Add 2 patterns items
ids = {}
for text in ["Specs arrive in the last week", "Engineers start work before specs are final"]:
    r = s.post(f"{API}/analyses/{aid}/items", json={"section": "patterns", "text": text, "epistemic": "unknown"})
    ids[text] = next(i["id"] for i in r.json()["items"] if i["text"] == text)

# Record a learning first so compare has a snapshot (loop 1)
r = s.post(f"{API}/analyses/{aid}/experiments", json={
    "title": "Prototype pairing", "action": "Pair for 2 days",
    "hypothesis": "Reduces churn", "signal": "Fewer re-asks", "timeframe": "1 week"})
exp_id = r.json()["experiments"][0]["id"]
r = s.post(f"{API}/analyses/{aid}/learnings", json={
    "experiment_id": exp_id, "tried": "Paired for two days",
    "happened": "Felt faster", "surprised": "", "changed": "", "revise": ""})
le1 = r.json()["learnings"][-1]["id"]

# Now mutate map: add an assumption + relabel one item + add a link
r = s.post(f"{API}/analyses/{aid}/items", json={"section": "assumptions", "text": "People align by osmosis", "epistemic": "unknown"})
new_item = next(i["id"] for i in r.json()["items"] if i["text"] == "People align by osmosis")
s.patch(f"{API}/analyses/{aid}/items/{ids['Specs arrive in the last week']}", json={"epistemic": "known"})
s.post(f"{API}/analyses/{aid}/links", json={"from_id": ids["Specs arrive in the last week"], "to_id": ids["Engineers start work before specs are final"], "note": "late specs cause rework"})

# Inject deterministic guide message with link + experiment proposals
proposals = [
    {"id": "pr_fe_link", "type": "link", "section": None, "text": "A may influence B",
     "from_id": ids["Specs arrive in the last week"], "to_id": new_item,
     "from_text": "Specs arrive in the last week", "to_text": "People align by osmosis",
     "epistemic": "inferred", "rationale": "late specs force osmosis", "status": "pending", "item_id": None,
     "experiment": None},
    {"id": "pr_fe_exp", "type": "experiment", "section": None, "text": "Shadow a sprint planning",
     "epistemic": "unknown", "rationale": "small, low cost check", "status": "pending", "item_id": None,
     "from_id": None, "to_id": None, "from_text": "", "to_text": "",
     "experiment": {"action": "Sit in on 1 planning", "hypothesis": "spec timing visible",
                    "signal": "spec readiness noted", "timeframe": "1 week"}},
]
dbh.guide_messages.insert_one({
    "id": "gm_fe_seed", "analysis_id": aid, "user_id": uid, "role": "assistant",
    "content": "Here are two suggestions.", "stage": "see", "proposals": proposals,
    "created_at": "2025-01-01T00:00:00+00:00",
})

print(f"ANALYSIS_ID={aid}")
print(f"LE1={le1}")
