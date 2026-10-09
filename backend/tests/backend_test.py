"""Backend regression tests for Leverage What Matters API."""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
API = BASE_URL.rstrip("/") + "/api"

DEMO_EMAIL = "demo@leveragewhatmatters.com"
DEMO_PASSWORD = "Leverage8!"


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def demo_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def user_a_session():
    s = requests.Session()
    email = f"TEST_a_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/register", json={"name": "User A", "email": email, "password": "Password123!"})
    assert r.status_code == 200, r.text
    return s, email


@pytest.fixture(scope="module")
def user_b_session():
    s = requests.Session()
    email = f"TEST_b_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/register", json={"name": "User B", "email": email, "password": "Password123!"})
    assert r.status_code == 200, r.text
    return s, email


# ---------- Health ----------
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# ---------- Auth ----------
class TestAuth:
    def test_login_demo(self, demo_session):
        r = demo_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == DEMO_EMAIL

    def test_duplicate_registration(self, user_a_session):
        s, email = user_a_session
        r = requests.post(f"{API}/auth/register", json={"name": "Dup", "email": email, "password": "Password123!"})
        assert r.status_code == 400

    def test_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong_password_xyz"})
        assert r.status_code == 401

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_refresh_issues_new_access(self, user_a_session):
        s, _ = user_a_session
        old_access = s.cookies.get("access_token")
        time.sleep(1.1)
        r = s.post(f"{API}/auth/refresh")
        assert r.status_code == 200
        new_access = s.cookies.get("access_token")
        assert new_access and new_access != old_access

    def test_refresh_without_token(self):
        r = requests.post(f"{API}/auth/refresh")
        assert r.status_code == 401

    def test_logout_clears(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200


# ---------- Analyses ----------
class TestAnalyses:
    def test_list_requires_auth(self):
        r = requests.get(f"{API}/analyses")
        assert r.status_code == 401

    def test_create_and_get(self, user_a_session):
        s, _ = user_a_session
        r = s.post(f"{API}/analyses", json={
            "title": "TEST_Team stalls",
            "challenge": "Why does the team stall before shipping?",
            "current_situation": "Delays",
            "desired_situation": "Smooth shipping",
        })
        assert r.status_code == 200, r.text
        a = r.json()
        assert a["stage"] == "focus"
        assert a["id"].startswith("an_")
        pytest.a_id = a["id"]

        g = s.get(f"{API}/analyses/{a['id']}")
        assert g.status_code == 200
        assert g.json()["title"] == "TEST_Team stalls"

    def test_patch_stage_and_focus(self, user_a_session):
        s, _ = user_a_session
        aid = pytest.a_id
        r = s.patch(f"{API}/analyses/{aid}", json={"stage": "see", "focus_question": "What may be blocking us?"})
        assert r.status_code == 200
        assert r.json()["stage"] == "see"
        assert r.json()["focus_question"] == "What may be blocking us?"

    def test_items_crud(self, user_a_session):
        s, _ = user_a_session
        aid = pytest.a_id
        r = s.post(f"{API}/analyses/{aid}/items", json={"section": "in_scope", "text": "Deploy process", "epistemic": "known"})
        assert r.status_code == 200
        items = r.json()["items"]
        assert any(i["text"] == "Deploy process" for i in items)
        item_id = next(i["id"] for i in items if i["text"] == "Deploy process")

        r = s.patch(f"{API}/analyses/{aid}/items/{item_id}", json={"text": "Deploy process (edited)", "epistemic": "unknown"})
        assert r.status_code == 200
        edited = next(i for i in r.json()["items"] if i["id"] == item_id)
        assert edited["text"] == "Deploy process (edited)"
        assert edited["epistemic"] == "unknown"

        r = s.delete(f"{API}/analyses/{aid}/items/{item_id}")
        assert r.status_code == 200
        assert all(i["id"] != item_id for i in r.json()["items"])

    def test_experiments_and_learnings(self, user_a_session):
        s, _ = user_a_session
        aid = pytest.a_id
        r = s.post(f"{API}/analyses/{aid}/experiments", json={
            "title": "Try pairing", "action": "Pair for 2 days",
            "hypothesis": "Pairing speeds decisions", "signal": "Fewer blockers", "timeframe": "1 week",
        })
        assert r.status_code == 200
        exp_id = r.json()["experiments"][0]["id"]

        r = s.patch(f"{API}/analyses/{aid}/experiments/{exp_id}", json={"status": "running"})
        assert r.status_code == 200
        assert r.json()["experiments"][0]["status"] == "running"

        r = s.post(f"{API}/analyses/{aid}/learnings", json={
            "experiment_id": exp_id, "tried": "Paired for 2 days", "happened": "More alignment",
            "surprised": "", "changed": "", "revise": "",
        })
        assert r.status_code == 200
        assert len(r.json()["learnings"]) == 1

        r = s.delete(f"{API}/analyses/{aid}/experiments/{exp_id}")
        assert r.status_code == 200

    def test_list_shows_counts(self, user_a_session):
        s, _ = user_a_session
        r = s.get(f"{API}/analyses")
        assert r.status_code == 200
        found = [a for a in r.json() if a["id"] == pytest.a_id]
        assert found
        assert "counts" in found[0]
        assert "experiment_count" in found[0]

    def test_user_isolation(self, user_a_session, user_b_session):
        sa, _ = user_a_session
        sb, _ = user_b_session
        aid = pytest.a_id
        # B cannot GET A's analysis
        r = sb.get(f"{API}/analyses/{aid}")
        assert r.status_code == 404
        # B cannot PATCH A's analysis
        r = sb.patch(f"{API}/analyses/{aid}", json={"title": "Hacked"})
        assert r.status_code == 404
        # B cannot delete A's analysis
        r = sb.delete(f"{API}/analyses/{aid}")
        assert r.status_code == 404
        # B cannot add items
        r = sb.post(f"{API}/analyses/{aid}/items", json={"section": "in_scope", "text": "x", "epistemic": "known"})
        assert r.status_code == 404

    def test_delete_analysis(self, user_a_session):
        s, _ = user_a_session
        r = s.delete(f"{API}/analyses/{pytest.a_id}")
        assert r.status_code == 200
        r = s.get(f"{API}/analyses/{pytest.a_id}")
        assert r.status_code == 404


# ---------- Links & Timeline ----------
class TestLinksAndTimeline:
    @pytest.fixture(scope="class")
    def ctx(self, user_a_session, user_b_session):
        sa, _ = user_a_session
        r = sa.post(f"{API}/analyses", json={"title": "TEST_links", "challenge": "C"})
        aid = r.json()["id"]
        ids = []
        for text in ["Alpha", "Beta", "Gamma"]:
            r = sa.post(f"{API}/analyses/{aid}/items", json={"section": "patterns", "text": text, "epistemic": "known"})
            assert r.status_code == 200
            ids.append(next(i["id"] for i in r.json()["items"] if i["text"] == text))
        return {"sa": sa, "sb": user_b_session[0], "aid": aid, "items": ids}

    def test_add_link_ok(self, ctx):
        r = ctx["sa"].post(f"{API}/analyses/{ctx['aid']}/links",
                           json={"from_id": ctx["items"][0], "to_id": ctx["items"][1], "note": "may delay", "epistemic": "unknown"})
        assert r.status_code == 200, r.text
        links = r.json()["links"]
        assert len(links) == 1
        assert links[0]["from_id"] == ctx["items"][0]
        assert links[0]["to_id"] == ctx["items"][1]
        assert links[0]["note"] == "may delay"
        assert links[0]["epistemic"] == "unknown"
        ctx["link_id"] = links[0]["id"]

    def test_duplicate_link_rejected(self, ctx):
        r = ctx["sa"].post(f"{API}/analyses/{ctx['aid']}/links",
                           json={"from_id": ctx["items"][0], "to_id": ctx["items"][1]})
        assert r.status_code == 400
        assert "already exists" in r.json()["detail"].lower()

    def test_same_item_rejected(self, ctx):
        r = ctx["sa"].post(f"{API}/analyses/{ctx['aid']}/links",
                           json={"from_id": ctx["items"][0], "to_id": ctx["items"][0]})
        assert r.status_code == 400

    def test_unknown_item_404(self, ctx):
        r = ctx["sa"].post(f"{API}/analyses/{ctx['aid']}/links",
                           json={"from_id": ctx["items"][0], "to_id": "it_nope"})
        assert r.status_code == 404

    def test_link_user_isolation(self, ctx):
        r = ctx["sb"].post(f"{API}/analyses/{ctx['aid']}/links",
                           json={"from_id": ctx["items"][0], "to_id": ctx["items"][2]})
        assert r.status_code == 404

    def test_delete_link(self, ctx):
        # add a 2nd link
        r = ctx["sa"].post(f"{API}/analyses/{ctx['aid']}/links",
                           json={"from_id": ctx["items"][1], "to_id": ctx["items"][2]})
        assert r.status_code == 200
        lid = next(l["id"] for l in r.json()["links"] if l["from_id"] == ctx["items"][1])
        r = ctx["sa"].delete(f"{API}/analyses/{ctx['aid']}/links/{lid}")
        assert r.status_code == 200
        assert all(l["id"] != lid for l in r.json()["links"])

    def test_delete_item_removes_links(self, ctx):
        # delete item 1 (Beta) - should kill the remaining link from items[0]->items[1]
        r = ctx["sa"].delete(f"{API}/analyses/{ctx['aid']}/items/{ctx['items'][1]}")
        assert r.status_code == 200
        assert all(ctx["items"][1] not in (l["from_id"], l["to_id"]) for l in r.json()["links"])

    def test_timeline_shape(self, ctx):
        r = ctx["sa"].get(f"{API}/analyses/{ctx['aid']}/timeline")
        assert r.status_code == 200
        events = r.json()
        kinds = [e["kind"] for e in events]
        assert kinds[0] == "created"
        for expected in ["item_added", "link_added", "link_removed", "item_removed"]:
            assert expected in kinds, f"missing {expected} in {kinds}"

    def test_timeline_stage_change_no_event(self, ctx):
        before = len(ctx["sa"].get(f"{API}/analyses/{ctx['aid']}/timeline").json())
        r = ctx["sa"].patch(f"{API}/analyses/{ctx['aid']}", json={"stage": "see"})
        assert r.status_code == 200
        after = len(ctx["sa"].get(f"{API}/analyses/{ctx['aid']}/timeline").json())
        assert before == after, "stage-only change must not create events"

    def test_timeline_framing_focus_relabel_events(self, ctx):
        aid = ctx["aid"]
        ctx["sa"].patch(f"{API}/analyses/{aid}", json={"focus_question": "What delays us?"})
        ctx["sa"].patch(f"{API}/analyses/{aid}", json={"title": "TEST_links_v2"})
        # relabel Alpha from known -> unknown
        ctx["sa"].patch(f"{API}/analyses/{aid}/items/{ctx['items'][0]}", json={"epistemic": "unknown"})
        # revise text
        ctx["sa"].patch(f"{API}/analyses/{aid}/items/{ctx['items'][0]}", json={"text": "Alpha revised"})
        kinds = [e["kind"] for e in ctx["sa"].get(f"{API}/analyses/{aid}/timeline").json()]
        for expected in ["focus", "framing", "item_relabelled", "item_revised"]:
            assert expected in kinds, f"missing {expected} in {kinds}"

    def test_timeline_user_isolation(self, ctx):
        r = ctx["sb"].get(f"{API}/analyses/{ctx['aid']}/timeline")
        assert r.status_code == 404


# ---------- Snapshots (Before/After) ----------
class TestSnapshots:
    @pytest.fixture(scope="class")
    def ctx(self, user_a_session):
        s, _ = user_a_session
        r = s.post(f"{API}/analyses", json={"title": "TEST_snaps", "challenge": "C"})
        aid = r.json()["id"]
        # 2 items + 1 link + 1 experiment
        ids = []
        for text in ["Alpha", "Beta"]:
            r = s.post(f"{API}/analyses/{aid}/items", json={"section": "patterns", "text": text, "epistemic": "known"})
            ids.append(next(i["id"] for i in r.json()["items"] if i["text"] == text))
        s.post(f"{API}/analyses/{aid}/links", json={"from_id": ids[0], "to_id": ids[1]})
        r = s.post(f"{API}/analyses/{aid}/experiments", json={"title": "Try X", "action": "a", "hypothesis": "h", "signal": "s", "timeframe": "1w"})
        exp_id = r.json()["experiments"][0]["id"]
        return {"s": s, "aid": aid, "items": ids, "exp": exp_id}

    def test_snapshots_empty_initially(self, ctx):
        r = ctx["s"].get(f"{API}/analyses/{ctx['aid']}/snapshots")
        assert r.status_code == 200
        assert r.json() == []

    def test_learning_creates_snapshot(self, ctx):
        s, aid = ctx["s"], ctx["aid"]
        r = s.post(f"{API}/analyses/{aid}/learnings",
                   json={"experiment_id": ctx["exp"], "tried": "x", "happened": "y", "surprised": "", "changed": "", "revise": ""})
        assert r.status_code == 200
        ctx["le1"] = r.json()["learnings"][-1]["id"]
        r = s.get(f"{API}/analyses/{aid}/snapshots")
        assert r.status_code == 200
        snaps = r.json()
        assert len(snaps) == 1
        snap = snaps[0]
        assert snap["learning_id"] == ctx["le1"]
        assert len(snap["items"]) == 2
        assert len(snap["links"]) == 1
        assert {i["text"] for i in snap["items"]} == {"Alpha", "Beta"}

    def test_second_snapshot_captures_evolved_map(self, ctx):
        s, aid = ctx["s"], ctx["aid"]
        # Mutate map: add item, relabel Alpha, add nothing else
        r = s.post(f"{API}/analyses/{aid}/items", json={"section": "assumptions", "text": "Gamma", "epistemic": "unknown"})
        assert r.status_code == 200
        s.patch(f"{API}/analyses/{aid}/items/{ctx['items'][0]}", json={"epistemic": "unknown"})
        # Record a 2nd learning -> new snapshot should include Gamma
        r = s.post(f"{API}/analyses/{aid}/learnings",
                   json={"experiment_id": None, "tried": "y", "happened": "z", "surprised": "", "changed": "", "revise": ""})
        ctx["le2"] = r.json()["learnings"][-1]["id"]
        snaps = s.get(f"{API}/analyses/{aid}/snapshots").json()
        assert len(snaps) == 2
        assert len(snaps[1]["items"]) == 3
        assert any(i["text"] == "Gamma" for i in snaps[1]["items"])
        # Alpha was relabelled to unknown in second snap
        alpha_in_2 = next(i for i in snaps[1]["items"] if i["text"] == "Alpha")
        assert alpha_in_2["epistemic"] == "unknown"
        # First snapshot still shows Alpha as known
        alpha_in_1 = next(i for i in snaps[0]["items"] if i["text"] == "Alpha")
        assert alpha_in_1["epistemic"] == "known"

    def test_snapshot_filtered_when_learning_deleted(self, ctx):
        s, aid = ctx["s"], ctx["aid"]
        s.delete(f"{API}/analyses/{aid}/learnings/{ctx['le1']}")
        snaps = s.get(f"{API}/analyses/{aid}/snapshots").json()
        assert len(snaps) == 1
        assert snaps[0]["learning_id"] == ctx["le2"]

    def test_snapshots_user_isolation(self, ctx, user_b_session):
        sb, _ = user_b_session
        r = sb.get(f"{API}/analyses/{ctx['aid']}/snapshots")
        assert r.status_code == 404


# ---------- Guide Proposals (link & experiment accept via direct DB inject) ----------
# We insert fake guide_messages to avoid LLM flakiness and test the accept pipeline.
class TestGuideProposalAccept:
    @pytest.fixture(scope="class")
    def ctx(self, user_a_session):
        from pymongo import MongoClient
        import os as _os
        # Read backend .env
        env = {}
        for line in open("/app/backend/.env").read().splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"')
        mc = MongoClient(env["MONGO_URL"])
        dbh = mc[env["DB_NAME"]]
        s, _ = user_a_session
        me = s.get(f"{API}/auth/me").json()
        user_id = me["user_id"]
        r = s.post(f"{API}/analyses", json={"title": "TEST_props", "challenge": "C"})
        aid = r.json()["id"]
        ids = []
        for text in ["Specs", "Engineers"]:
            r = s.post(f"{API}/analyses/{aid}/items", json={"section": "patterns", "text": text, "epistemic": "known"})
            ids.append(next(i["id"] for i in r.json()["items"] if i["text"] == text))
        # Insert fake guide message with 3 proposals: item/link/experiment
        proposals = [
            {"id": "pr_item_1", "type": "item", "section": "assumptions", "text": "People align by osmosis",
             "epistemic": "inferred", "rationale": "plausible", "status": "pending", "item_id": None,
             "from_id": None, "to_id": None, "from_text": "", "to_text": "", "experiment": None},
            {"id": "pr_link_1", "type": "link", "section": None, "text": "Specs may influence Engineers",
             "from_id": ids[0], "to_id": ids[1], "from_text": "Specs", "to_text": "Engineers",
             "epistemic": "inferred", "rationale": "handoff delay", "status": "pending", "item_id": None,
             "experiment": None},
            {"id": "pr_exp_1", "type": "experiment", "section": None, "text": "Pair review for 1 week",
             "epistemic": "unknown", "rationale": "tiny safe check", "status": "pending", "item_id": None,
             "from_id": None, "to_id": None, "from_text": "", "to_text": "",
             "experiment": {"action": "Pair review", "hypothesis": "Reduces rework",
                            "signal": "Fewer late changes", "timeframe": "1 week"}},
        ]
        dbh.guide_messages.insert_one({
            "id": "gm_fake_1", "analysis_id": aid, "user_id": user_id, "role": "assistant",
            "content": "Here's some ideas.", "stage": "see", "proposals": proposals,
            "created_at": "2025-01-01T00:00:00+00:00",
        })
        return {"s": s, "aid": aid, "items": ids, "dbh": dbh}

    def test_accept_item_proposal(self, ctx):
        r = ctx["s"].post(f"{API}/analyses/{ctx['aid']}/guide/proposals/pr_item_1/accept", json={})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "analysis" in data and "message" in data
        assert any(i["text"] == "People align by osmosis" and i["source"] == "guide"
                   for i in data["analysis"]["items"])
        assert next(p for p in data["message"]["proposals"] if p["id"] == "pr_item_1")["status"] == "accepted"

    def test_accept_link_proposal(self, ctx):
        r = ctx["s"].post(f"{API}/analyses/{ctx['aid']}/guide/proposals/pr_link_1/accept", json={})
        assert r.status_code == 200, r.text
        data = r.json()
        links = data["analysis"]["links"]
        link = next((l for l in links if l["from_id"] == ctx["items"][0] and l["to_id"] == ctx["items"][1]), None)
        assert link is not None
        assert link["source"] == "guide"
        # Timeline shows 'Confirmed a Guide link'
        tl = ctx["s"].get(f"{API}/analyses/{ctx['aid']}/timeline").json()
        assert any(e["kind"] == "link_added" and "Confirmed a Guide link" in e["summary"] for e in tl)

    def test_duplicate_link_proposal_accept_rejected(self, ctx):
        # Insert another link proposal duplicating pr_link_1
        ctx["dbh"].guide_messages.insert_one({
            "id": "gm_fake_dup", "analysis_id": ctx["aid"], "user_id": ctx["s"].get(f"{API}/auth/me").json()["user_id"],
            "role": "assistant", "content": "dup", "stage": "see", "created_at": "2025-01-02T00:00:00+00:00",
            "proposals": [{"id": "pr_link_dup", "type": "link", "section": None, "text": "dup",
                           "from_id": ctx["items"][0], "to_id": ctx["items"][1], "from_text": "Specs", "to_text": "Engineers",
                           "epistemic": "inferred", "rationale": "", "status": "pending", "item_id": None, "experiment": None}],
        })
        r = ctx["s"].post(f"{API}/analyses/{ctx['aid']}/guide/proposals/pr_link_dup/accept", json={})
        assert r.status_code == 400
        assert "already exists" in r.json()["detail"].lower()

    def test_accept_experiment_proposal(self, ctx):
        r = ctx["s"].post(f"{API}/analyses/{ctx['aid']}/guide/proposals/pr_exp_1/accept", json={})
        assert r.status_code == 200, r.text
        data = r.json()
        exps = data["analysis"]["experiments"]
        exp = next((e for e in exps if e["title"] == "Pair review for 1 week"), None)
        assert exp is not None
        assert exp["status"] == "planned"
        assert exp["action"] == "Pair review"
        assert exp["hypothesis"] == "Reduces rework"
        assert exp["signal"] == "Fewer late changes"
        assert exp["timeframe"] == "1 week"
        tl = ctx["s"].get(f"{API}/analyses/{ctx['aid']}/timeline").json()
        assert any(e["kind"] == "experiment_added" and "Turned a Guide check" in e["summary"] for e in tl)

    def test_cannot_accept_twice(self, ctx):
        r = ctx["s"].post(f"{API}/analyses/{ctx['aid']}/guide/proposals/pr_item_1/accept", json={})
        assert r.status_code == 400


# ---------- Guide (basic non-LLM endpoints) ----------
class TestGuide:
    def test_list_guide_messages_empty(self, demo_session):
        r = demo_session.get(f"{API}/analyses")
        assert r.status_code == 200
        if not r.json():
            pytest.skip("No demo analyses")
        aid = r.json()[0]["id"]
        r = demo_session.get(f"{API}/analyses/{aid}/guide/messages")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
