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
