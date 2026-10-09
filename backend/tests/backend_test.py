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
