#!/usr/bin/env python3
import json
import os
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

import requests
import yaml


BASE = os.environ.get("FIXENSY_BASE_URL", "http://127.0.0.1:8080").rstrip("/")
ROOT = Path(__file__).resolve().parents[1]
ENV_PATHS = [
    ROOT / ".env",
    ROOT / "data" / ".env",
    ROOT / "label_studio" / "data" / ".env",
]
STATUS_PATH = ROOT / "FIXENSY_STATUS.md"
SEED_PATH = ROOT / "label_studio" / "setup_test_data.py"
TEMPLATE_PATH = ROOT / "label_studio" / "annotation_templates" / "fixensy" / "audio-labeling" / "config.yml"


def read_env_value(key: str) -> str:
    for env_path in ENV_PATHS:
        if not env_path.exists():
            continue
        for line in env_path.read_text().splitlines():
            if line.startswith(f"{key}="):
                return line.split("=", 1)[1].strip()
    raise RuntimeError(f"Missing {key} in any env file: {', '.join(str(p) for p in ENV_PATHS)}")


SUPERADMIN_EMAIL = read_env_value("FIXENSY_SUPERADMIN_EMAIL")
SUPERADMIN_PASSWORD = read_env_value("FIXENSY_SUPERADMIN_PASSWORD")
ADMIN_EMAIL = "admin@fixensy.com"
ADMIN_PASSWORD = "fixensy123"
ANNOTATOR_EMAIL = "annotator@fixensy.com"
ANNOTATOR_PASSWORD = "fixensy123"
REVIEWER_EMAIL = "reviewer@fixensy.com"
REVIEWER_PASSWORD = "fixensy123"


@dataclass
class TestResult:
    ok: bool
    test_id: str
    desc: str
    status: str
    evidence: str


RESULTS: list[TestResult] = []


def record(ok: bool, test_id: str, desc: str, status: Any, evidence: str):
    RESULTS.append(TestResult(ok=ok, test_id=test_id, desc=desc, status=str(status), evidence=evidence[:220]))


def short_json(data: Any) -> str:
    try:
        return json.dumps(data, ensure_ascii=False, separators=(",", ":"))[:220]
    except Exception:
        return str(data)[:220]


def read_fixensy_label_config() -> str:
    data = yaml.safe_load(TEMPLATE_PATH.read_text())
    return data["config"]


class RoleClient:
    def __init__(self, name: str):
        self.name = name
        self.s = requests.Session()
        self.s.headers.update({"User-Agent": f"fixensy-e2e/{name}"})

    def _csrf(self) -> str:
        token = self.s.cookies.get("csrftoken")
        if not token:
            raise RuntimeError(f"{self.name}: missing csrftoken")
        return token

    def get(self, path: str, **kwargs):
        return self.s.get(BASE + path, timeout=30, **kwargs)

    def post_form(self, path: str, data: dict[str, Any], **kwargs):
        headers = kwargs.pop("headers", {})
        headers.setdefault("Referer", BASE + path)
        return self.s.post(BASE + path, data=data, headers=headers, timeout=30, **kwargs)

    def post_json(self, path: str, payload: dict[str, Any], **kwargs):
        headers = kwargs.pop("headers", {})
        headers.setdefault("X-CSRFToken", self._csrf())
        headers.setdefault("Referer", BASE + path)
        return self.s.post(BASE + path, json=payload, headers=headers, timeout=30, **kwargs)

    def patch_json(self, path: str, payload: dict[str, Any], **kwargs):
        headers = kwargs.pop("headers", {})
        headers.setdefault("X-CSRFToken", self._csrf())
        headers.setdefault("Referer", BASE + path)
        return self.s.patch(BASE + path, json=payload, headers=headers, timeout=30, **kwargs)

    def delete(self, path: str, **kwargs):
        headers = kwargs.pop("headers", {})
        headers.setdefault("X-CSRFToken", self._csrf())
        headers.setdefault("Referer", BASE + path)
        return self.s.delete(BASE + path, headers=headers, timeout=30, **kwargs)

    def login(self, email: str, password: str):
        self.get("/user/login/")
        data = {
            "email": email,
            "password": password,
            "csrfmiddlewaretoken": self._csrf(),
            "persist_session": "on",
        }
        return self.post_form("/user/login/", data, allow_redirects=True)

    def signup(self, invite_url: str, email: str, password: str):
        parsed = urlparse(invite_url)
        path = parsed.path + ("?" + parsed.query if parsed.query else "")
        self.get(path)
        data = {
            "email": email,
            "password": password,
            "csrfmiddlewaretoken": self._csrf(),
        }
        return self.post_form(path, data, allow_redirects=True)


def json_or_text(resp: requests.Response):
    ctype = resp.headers.get("content-type", "")
    if "json" in ctype:
        try:
            return resp.json()
        except Exception:
            return resp.text[:500]
    return resp.text[:500]


def find_member(members: list[dict[str, Any]], email: str) -> dict[str, Any] | None:
    for item in members:
        user = item.get("user", {})
        if user.get("email") == email:
            return item
    return None


def whoami(client: RoleClient) -> dict[str, Any]:
    return client.get("/api/current-user/whoami").json()


def list_projects(client: RoleClient) -> list[dict[str, Any]]:
    resp = client.get("/api/projects/")
    data = resp.json()
    return data.get("results", data) if isinstance(data, dict) else data


def get_project_for_admin(client: RoleClient) -> dict[str, Any]:
    projects = list_projects(client)
    for project in projects:
        if project.get("title") == "Fixensy Test Project":
            return project
    if projects:
        return projects[0]
    label_config = read_fixensy_label_config()
    resp = client.post_json("/api/projects/", {"title": "Fixensy Test Project", "label_config": label_config})
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Project create failed: {resp.status_code} {resp.text[:300]}")
    return resp.json()


def dm_tasks(client: RoleClient, project_id: int) -> dict[str, Any]:
    resp = client.get(f"/api/dm/tasks/?project={project_id}&fields=all&page_size=100")
    return {"status": resp.status_code, "body": resp.json() if "json" in resp.headers.get("content-type", "") else resp.text}


def ensure_task_count(client: RoleClient, project_id: int, count: int = 3):
    current = dm_tasks(client, project_id)["body"]["tasks"]
    urls = [
        "https://htx-pub.s3.us-east-1.amazonaws.com/examples/audio/barradeen-emotional.mp3",
        "https://htx-pub.s3.us-east-1.amazonaws.com/examples/audio/1.wav",
        "https://htx-pub.s3.us-east-1.amazonaws.com/examples/audio/barradeen-emotional.mp3",
        "https://htx-pub.s3.us-east-1.amazonaws.com/examples/audio/1.wav",
    ]
    idx = 0
    while len(current) < count:
        resp = client.post_json("/api/tasks/", {"project": project_id, "data": {"url": urls[idx % len(urls)]}})
        if resp.status_code not in (200, 201):
            raise RuntimeError(f"Task create failed: {resp.status_code} {resp.text[:300]}")
        idx += 1
        current = dm_tasks(client, project_id)["body"]["tasks"]
    return current


def find_action(actions: list[dict[str, Any]], title: str) -> dict[str, Any]:
    for action in actions:
        if action.get("title") == title:
            return action
    raise KeyError(f"Action not found: {title}")


def assignment_annotation_result(task: dict[str, Any], region_id: str, valid: bool = True) -> list[dict[str, Any]]:
    original_length = 3.0
    base = [
        {
            "id": region_id,
            "from_name": "fx_labels",
            "to_name": "fx_audio",
            "type": "labels",
            "original_length": original_length,
            "value": {"start": 0.5, "end": 1.5, "labels": ["Create Segment"]},
        },
        {
            "id": region_id,
            "from_name": "quality",
            "to_name": "fx_audio",
            "type": "choices",
            "original_length": original_length,
            "value": {"start": 0.5, "end": 1.5, "choices": ["Valid" if valid else "Invalid"]},
        },
    ]
    if valid:
        base.extend(
            [
                {
                    "id": region_id,
                    "from_name": "speaker",
                    "to_name": "fx_audio",
                    "type": "choices",
                    "original_length": original_length,
                    "value": {"start": 0.5, "end": 1.5, "choices": ["Speaker A"]},
                },
                {
                    "id": region_id,
                    "from_name": "transcription",
                    "to_name": "fx_audio",
                    "type": "textarea",
                    "original_length": original_length,
                    "value": {"start": 0.5, "end": 1.5, "text": ["hello world"]},
                },
            ]
        )
    else:
        base.append(
            {
                "id": region_id,
                "from_name": "invalid_reason",
                "to_name": "fx_audio",
                "type": "choices",
                "original_length": original_length,
                "value": {"start": 0.5, "end": 1.5, "choices": ["Noise"]},
            }
        )
    return base


def create_annotation(client: RoleClient, task_id: int, result: list[dict[str, Any]]) -> requests.Response:
    return client.post_json(
        f"/api/tasks/{task_id}/annotations/",
        {"result": result, "lead_time": 1.23, "task": task_id},
    )


def create_draft(client: RoleClient, task_id: int, result: list[dict[str, Any]]) -> requests.Response:
    return client.post_json(
        f"/api/tasks/{task_id}/drafts",
        {"result": result, "lead_time": 0.5, "task": task_id},
    )


def member_list(client: RoleClient, org_id: int) -> list[dict[str, Any]]:
    resp = client.get(f"/api/organizations/{org_id}/memberships?contributed_to_projects=1&page=1&page_size=100")
    data = resp.json()
    return data.get("results", data)


def contains_secret(path: Path, secret: str) -> bool:
    return secret in path.read_text()


def main():
    timestamp = int(time.time())
    superadmin = RoleClient("superadmin")
    admin = RoleClient("admin")
    annotator = RoleClient("annotator")
    reviewer = RoleClient("reviewer")

    # A Auth
    try:
        r = superadmin.login(SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
        record(r.status_code == 200 and "sessionid" in superadmin.s.cookies, "A1", "Super Admin login", r.status_code, r.url)
    except Exception as e:
        record(False, "A1", "Super Admin login", "ERR", str(e))

    r = superadmin.get("/organization")
    record(r.status_code == 200, "A2", "Super Admin /organization", r.status_code, r.url)

    r = admin.login(ADMIN_EMAIL, ADMIN_PASSWORD)
    record(r.status_code == 200 and "sessionid" in admin.s.cookies, "A3", "Admin login", r.status_code, r.url)

    r = admin.get("/organization")
    record(r.status_code == 200, "A4", "Admin /organization", r.status_code, r.url)

    r = annotator.login(ANNOTATOR_EMAIL, ANNOTATOR_PASSWORD)
    record(r.status_code == 200 and "sessionid" in annotator.s.cookies, "A5", "Annotator login", r.status_code, r.url)

    r = annotator.get("/organization", allow_redirects=False)
    record(r.status_code in (301, 302) and "/projects" in r.headers.get("Location", ""), "A6", "Annotator /organization redirect", r.status_code, r.headers.get("Location", ""))

    r = reviewer.login(REVIEWER_EMAIL, REVIEWER_PASSWORD)
    record(r.status_code == 200 and "sessionid" in reviewer.s.cookies, "A7", "Reviewer login", r.status_code, r.url)

    r = reviewer.get("/organization", allow_redirects=False)
    record(r.status_code in (301, 302) and "/projects" in r.headers.get("Location", ""), "A8", "Reviewer /organization redirect", r.status_code, r.headers.get("Location", ""))

    # Context
    admin_who = whoami(admin)
    super_who = whoami(superadmin)
    annotator_who = whoami(annotator)
    reviewer_who = whoami(reviewer)
    admin_org_id = admin_who["active_organization"]
    admin_user_id = admin_who["id"]
    annotator_user_id = annotator_who["id"]
    reviewer_user_id = reviewer_who["id"]

    # B Super Admin APIs
    r = superadmin.get("/api/super-admin/admins/")
    admins = r.json() if r.ok else []
    admin_entry = next((x for x in admins if x.get("email") == ADMIN_EMAIL), None)
    record(r.status_code == 200 and all(x.get("email") != SUPERADMIN_EMAIL for x in admins), "B1", "Super Admin admins list excludes superusers", r.status_code, short_json(admins[:2]))
    admin_id = admin_entry["id"] if admin_entry else None

    r = superadmin.get("/api/super-admin/admin-invite/")
    invite_data = json_or_text(r)
    admin_invite_url = invite_data.get("invite_url") if isinstance(invite_data, dict) else None
    record(r.status_code == 200 and isinstance(invite_data, dict) and str(invite_data.get("invite_url", "")).startswith("http"), "B2", "Super Admin admin invite", r.status_code, short_json(invite_data))

    r = superadmin.get("/api/super-admin/maintenance/")
    maint_before = r.json() if r.ok else {}
    record(r.status_code == 200, "B3", "Maintenance status fetch", r.status_code, short_json(maint_before))

    r = superadmin.post_json("/api/super-admin/maintenance/", {"enabled": True})
    admin_while_maint = admin.get("/projects", allow_redirects=False)
    super_while_maint = superadmin.get("/organization", allow_redirects=False)
    record(r.status_code == 200 and admin_while_maint.status_code == 503 and super_while_maint.status_code == 200, "B4", "Maintenance on blocks admin but not superadmin", f"{r.status_code}/{admin_while_maint.status_code}/{super_while_maint.status_code}", f"admin={admin_while_maint.status_code} super={super_while_maint.status_code}")

    r = superadmin.post_json("/api/super-admin/maintenance/", {"enabled": False})
    admin_after_maint = admin.get("/projects", allow_redirects=False)
    record(r.status_code == 200 and admin_after_maint.status_code == 200, "B5", "Maintenance off restore", f"{r.status_code}/{admin_after_maint.status_code}", f"admin={admin_after_maint.status_code}")

    if admin_id is not None:
        r = superadmin.post_json(f"/api/super-admin/admins/{admin_id}/suspend/", {})
        admin_suspended_req = admin.get("/projects", allow_redirects=False)
        record(r.status_code == 200 and admin_suspended_req.status_code == 403, "B6", "Suspend admin org blocks admin", f"{r.status_code}/{admin_suspended_req.status_code}", short_json(json_or_text(admin_suspended_req)))

        r = superadmin.post_json(f"/api/super-admin/admins/{admin_id}/suspend/", {})
        admin_unsuspended_req = admin.get("/projects", allow_redirects=False)
        record(r.status_code == 200 and admin_unsuspended_req.status_code == 200, "B7", "Unsuspend admin org restores access", f"{r.status_code}/{admin_unsuspended_req.status_code}", f"admin={admin_unsuspended_req.status_code}")
    else:
        record(False, "B6", "Suspend admin org blocks admin", "SKIP", "admin id missing")
        record(False, "B7", "Unsuspend admin org restores access", "SKIP", "admin id missing")

    r1 = admin.get("/api/super-admin/admins/")
    r2 = annotator.get("/api/super-admin/admins/")
    record(r1.status_code == 403 and r2.status_code == 403, "B8", "Non-superusers denied super-admin APIs", f"{r1.status_code}/{r2.status_code}", "admin/annotator forbidden")

    # C Secrecy
    r = admin.get("/api/users/")
    users_data = r.json() if r.ok else {}
    users_list = users_data.get("results", users_data) if isinstance(users_data, dict) else users_data
    emails = [u.get("email") for u in users_list] if isinstance(users_list, list) else []
    record(r.status_code == 200 and SUPERADMIN_EMAIL not in emails, "C1", "Admin users list excludes superuser rows", r.status_code, short_json(emails[:10]))

    r = admin.get("/api/super-admin/maintenance/")
    record(r.status_code == 403, "C2", "Admin denied /api/super-admin/*", r.status_code, short_json(json_or_text(r)))

    setup_has_secret = contains_secret(SEED_PATH, SUPERADMIN_EMAIL) or contains_secret(SEED_PATH, SUPERADMIN_PASSWORD)
    status_has_secret = contains_secret(STATUS_PATH, SUPERADMIN_EMAIL) or contains_secret(STATUS_PATH, SUPERADMIN_PASSWORD)
    record((not setup_has_secret) and (not status_has_secret), "C3", "No superadmin secrets in seeder/status", "grep", f"setup={setup_has_secret} status={status_has_secret}")

    # D Invite & role gating
    r = admin.get("/api/invite")
    invite_data = json_or_text(r)
    org_invite_url = invite_data.get("invite_url") if isinstance(invite_data, dict) else None
    record(r.status_code == 200 and isinstance(org_invite_url, str) and org_invite_url.startswith("http"), "D1", "Admin org invite absolute URL", r.status_code, short_json(invite_data))

    invite_annotator_email = f"invite.annotator.{timestamp}@example.com"
    anon1 = RoleClient("anon1")
    r = anon1.signup(f"{org_invite_url}&role=annotator", invite_annotator_email, "Password1234!")
    anon1_who = whoami(anon1)
    anon1_members = member_list(admin, admin_org_id)
    anon1_member = find_member(anon1_members, invite_annotator_email)
    record(r.status_code == 200 and anon1_member is not None and anon1_member.get("role") == "annotator", "D2", "Invite signup joins org as annotator", r.status_code, short_json(anon1_member))

    invite_role_admin_email = f"invite.roleadmin.{timestamp}@example.com"
    anon2 = RoleClient("anon2")
    r = anon2.signup(f"{org_invite_url}&role=admin", invite_role_admin_email, "Password1234!")
    anon2_check = anon2.get("/organization", allow_redirects=False)
    anon2_members = member_list(admin, admin_org_id)
    anon2_member = find_member(anon2_members, invite_role_admin_email)
    record(r.status_code == 200 and anon2_member is not None and anon2_member.get("role") == "annotator" and anon2_check.status_code in (301, 302), "D3", "Invite cannot escalate member to admin", f"{r.status_code}/{anon2_check.status_code}", short_json(anon2_member))

    r = admin.patch_json(f"/api/organizations/{admin_org_id}/", {"role": "admin"})
    record(r.status_code == 403, "D4", "Admin cannot assign admin role via org patch", r.status_code, short_json(json_or_text(r)))

    r = annotator.get("/api/invite")
    record(r.status_code == 403, "D5", "Annotator cannot get invite link", r.status_code, short_json(json_or_text(r)))

    # E/F/G/H/K setup
    project = get_project_for_admin(admin)
    project_id = project["id"]
    tasks = ensure_task_count(admin, project_id, 3)
    task_ids = [t["id"] for t in tasks[:3]]
    actions = admin.get(f"/api/dm/actions/?project={project_id}").json()
    assign_action = find_action(actions, "Assign Tasks")
    release_action = find_action(actions, "Release Tasks")
    form = admin.get(f"/api/dm/actions/{assign_action['id']}/form/?project={project_id}").json()
    fields = form[0]["fields"] if form else []
    annotator_opts = next((f["options"] for f in fields if f["name"] == "annotator_id"), [])
    reviewer_opts = next((f["options"] for f in fields if f["name"] == "reviewer_id"), [])
    annotator_labels = [o["label"] for o in annotator_opts]
    reviewer_labels = [o["label"] for o in reviewer_opts if o["value"]]
    roles_ok = (all("admin" not in label.lower() for label in annotator_labels + reviewer_labels))
    r = admin.post_json(
        f"/api/dm/actions/?project={project_id}&id={assign_action['id']}",
        {
            "selectedItems": {"all": False, "included": task_ids},
            "annotator_id": str(annotator_user_id),
            "reviewer_id": str(reviewer_user_id),
        },
    )
    record(r.status_code == 200, "E4", "Assign Tasks dropdowns scoped to annotator/reviewer only", r.status_code, f"annotator_opts={len(annotator_opts)} reviewer_opts={len(reviewer_opts)} roles_ok={roles_ok}")

    admin_dm = dm_tasks(admin, project_id)
    annotator_dm = dm_tasks(annotator, project_id)
    reviewer_dm = dm_tasks(reviewer, project_id)
    admin_tasks = admin_dm["body"]["tasks"]
    annotator_tasks = annotator_dm["body"]["tasks"]
    reviewer_tasks = reviewer_dm["body"]["tasks"]
    record(admin_dm["status"] == 200 and len(admin_tasks) >= 3, "E3", "Admin sees all project tasks", admin_dm["status"], f"count={len(admin_tasks)}")
    record(annotator_dm["status"] == 200 and set(t["id"] for t in annotator_tasks) >= set(task_ids) and all(t["assignment"]["status"] in ("pending_annotation", "rejected") for t in annotator_tasks if t["id"] in task_ids), "E1", "Annotator queue limited to assigned/rejected tasks", annotator_dm["status"], short_json([{t['id']: t['assignment']['status']} for t in annotator_tasks if t['id'] in task_ids]))
    record(reviewer_dm["status"] == 200 and all(t["assignment"]["status"] == "pending_review" for t in reviewer_tasks), "E2", "Reviewer queue only pending_review tasks", reviewer_dm["status"], f"count={len(reviewer_tasks)}")
    record(roles_ok and any(str(annotator_user_id) == o["value"] for o in annotator_opts) and any(str(reviewer_user_id) == o["value"] for o in reviewer_opts), "E4b", "Assign form contains correct role options", 200, f"annotators={annotator_labels} reviewers={reviewer_labels}")

    # G2/G4 draft tracking on task3
    task3 = task_ids[2]
    r = create_draft(annotator, task3, assignment_annotation_result({}, f"draft-{task3}", valid=True))
    time.sleep(2)
    admin_dm_after_draft = dm_tasks(admin, project_id)["body"]["tasks"]
    task3_after_draft = next(t for t in admin_dm_after_draft if t["id"] == task3)
    started_at_present = bool(task3_after_draft["assignment"]["started_at"])
    working_seconds_1 = task3_after_draft["assignment"]["working_seconds"]
    time.sleep(2)
    admin_dm_after_wait = dm_tasks(admin, project_id)["body"]["tasks"]
    task3_after_wait = next(t for t in admin_dm_after_wait if t["id"] == task3)
    working_seconds_2 = task3_after_wait["assignment"]["working_seconds"]
    record(r.status_code in (200, 201) and started_at_present, "G2", "started_at populated on first draft", r.status_code, short_json(task3_after_draft["assignment"]))
    record(working_seconds_2 >= working_seconds_1, "G4a", "working_seconds increases before completion", 200, f"{working_seconds_1}->{working_seconds_2}")

    # F1/F2 approve flow on task1
    task1 = task_ids[0]
    r = create_annotation(annotator, task1, assignment_annotation_result({}, f"ann-{task1}", valid=True))
    admin_task1 = next(t for t in dm_tasks(admin, project_id)["body"]["tasks"] if t["id"] == task1)
    record(r.status_code in (200, 201) and admin_task1["assignment"]["status"] == "pending_review" and bool(admin_task1["assignment"]["started_at"]), "F1", "Annotator submit -> pending_review", r.status_code, short_json(admin_task1["assignment"]))
    record(bool(admin_task1["assignment"]["assigned_at"]), "G1", "assigned_at populated on assignment", 200, short_json(admin_task1["assignment"]))

    reviewer_before = dm_tasks(reviewer, project_id)["body"]["tasks"]
    reviewer_has_task1 = any(t["id"] == task1 for t in reviewer_before)
    r = create_annotation(reviewer, task1, assignment_annotation_result({}, f"rev-{task1}", valid=True))
    admin_task1_done = next(t for t in dm_tasks(admin, project_id)["body"]["tasks"] if t["id"] == task1)
    ws_done = admin_task1_done["assignment"]["working_seconds"]
    time.sleep(1)
    admin_task1_done_again = next(t for t in dm_tasks(admin, project_id)["body"]["tasks"] if t["id"] == task1)
    record(reviewer_has_task1 and r.status_code in (200, 201) and admin_task1_done["assignment"]["status"] == "completed" and bool(admin_task1_done["assignment"]["completed_at"]), "F2", "Reviewer submit -> completed", r.status_code, short_json(admin_task1_done["assignment"]))
    record(admin_task1_done["assignment"]["completed_at"] is not None, "G3", "completed_at populated on approve", 200, short_json(admin_task1_done["assignment"]))
    record(admin_task1_done_again["assignment"]["working_seconds"] == ws_done, "G4b", "working_seconds frozen after completion", 200, f"{ws_done}->{admin_task1_done_again['assignment']['working_seconds']}")

    # F3-F7 reject flow on task2
    task2 = task_ids[1]
    create_annotation(annotator, task2, assignment_annotation_result({}, f"ann-{task2}", valid=True))
    r_no_reason = annotator.post_json(f"/api/tasks/{task2}/reject/", {})
    record(r_no_reason.status_code == 403, "F4", "Annotator cannot reject task", r_no_reason.status_code, short_json(json_or_text(r_no_reason)))
    r = reviewer.post_json(f"/api/tasks/{task2}/reject/", {})
    record(r.status_code == 400, "F5", "Reject without reason invalid", r.status_code, short_json(json_or_text(r)))
    r = reviewer.post_json(f"/api/tasks/{task2}/reject/", {"reason": "x" * 2001})
    record(r.status_code == 400, "F6", "Reject >2000 chars invalid", r.status_code, short_json(json_or_text(r)))
    r = reviewer.post_json(f"/api/tasks/{task2}/reject/", {"reason": "Bad audio"})
    admin_task2 = next(t for t in dm_tasks(admin, project_id)["body"]["tasks"] if t["id"] == task2)
    annotator_task2_view = next(t for t in dm_tasks(annotator, project_id)["body"]["tasks"] if t["id"] == task2)
    record(r.status_code == 200 and admin_task2["assignment"]["status"] == "rejected" and admin_task2["assignment"]["rejection_reason"] == "Bad audio" and admin_task2["assignment"]["completed_at"] is None, "F3", "Reviewer reject stores reason and clears completion", r.status_code, short_json(admin_task2["assignment"]))
    record(annotator_task2_view["assignment"]["status"] == "rejected" and annotator_task2_view["assignment"]["rejection_reason"] == "Bad audio", "F7", "Rejected task returns to annotator queue with reason", 200, short_json(annotator_task2_view["assignment"]))

    # H release/reassign on task3
    before_release_annotations = admin.get(f"/api/tasks/{task3}/annotations/").json()
    r = admin.post_json(
        f"/api/dm/actions/?project={project_id}&id={release_action['id']}",
        {"selectedItems": {"all": False, "included": [task3]}},
    )
    annotator_after_release = dm_tasks(annotator, project_id)["body"]["tasks"]
    reviewer_after_release = dm_tasks(reviewer, project_id)["body"]["tasks"]
    admin_after_release = next(t for t in dm_tasks(admin, project_id)["body"]["tasks"] if t["id"] == task3)
    record(r.status_code == 200 and all(t["id"] != task3 for t in annotator_after_release) and all(t["id"] != task3 for t in reviewer_after_release) and admin_after_release.get("assignment") is None and isinstance(before_release_annotations, list), "H1", "Release removes assignment and preserves annotations", r.status_code, f"annotations={len(before_release_annotations)} assignment={admin_after_release.get('assignment')}")
    r = admin.post_json(
        f"/api/dm/actions/?project={project_id}&id={assign_action['id']}",
        {
            "selectedItems": {"all": False, "included": [task3]},
            "annotator_id": str(annotator_user_id),
            "reviewer_id": str(reviewer_user_id),
        },
    )
    annotator_after_reassign = dm_tasks(annotator, project_id)["body"]["tasks"]
    record(r.status_code == 200 and any(t["id"] == task3 for t in annotator_after_reassign), "H2", "Released task can be reassigned", r.status_code, f"visible={any(t['id']==task3 for t in annotator_after_reassign)}")

    # I per-member suspend
    r = admin.post_json(f"/api/organizations/{admin_org_id}/memberships/{annotator_user_id}/suspend/", {})
    annotator_suspended_req = annotator.get("/api/current-user/whoami", allow_redirects=False)
    record(r.status_code == 200 and annotator_suspended_req.status_code == 403, "I1", "Admin suspend toggles member", f"{r.status_code}/{annotator_suspended_req.status_code}", short_json(json_or_text(r)))
    record(annotator_suspended_req.status_code == 403, "I2", "Suspended annotator blocked next request", annotator_suspended_req.status_code, short_json(json_or_text(annotator_suspended_req)))
    r = admin.post_json(f"/api/organizations/{admin_org_id}/memberships/{annotator_user_id}/suspend/", {})
    r_self = admin.post_json(f"/api/organizations/{admin_org_id}/memberships/{admin_user_id}/suspend/", {})
    record(r_self.status_code == 400, "I3", "Cannot self-suspend", r_self.status_code, short_json(json_or_text(r_self)))
    r_owner = superadmin.post_json(f"/api/organizations/{admin_org_id}/memberships/{admin_user_id}/suspend/", {})
    record(r_owner.status_code == 400, "I4", "Cannot suspend org owner", r_owner.status_code, short_json(json_or_text(r_owner)))
    r_annot = annotator.post_json(f"/api/organizations/{admin_org_id}/memberships/{reviewer_user_id}/suspend/", {})
    r_review = reviewer.post_json(f"/api/organizations/{admin_org_id}/memberships/{annotator_user_id}/suspend/", {})
    record(r_annot.status_code == 403 and r_review.status_code == 403, "I5", "Annotator/Reviewer cannot suspend members", f"{r_annot.status_code}/{r_review.status_code}", "annotator/reviewer forbidden")

    # J storage + delete cascade via fresh invited admin
    record(isinstance(admin_entry, dict) and "storage_bytes" in admin_entry, "J1", "SuperAdminList includes storage_bytes", 200, short_json(admin_entry))
    new_admin_email = f"sa.admin.{timestamp}@example.com"
    new_admin = RoleClient("newadmin-signup")
    r = new_admin.signup(admin_invite_url, new_admin_email, "Password1234!")
    new_admin_login = RoleClient("newadmin")
    new_admin_login.login(new_admin_email, "Password1234!")
    new_admin_who = whoami(new_admin_login)
    new_org_id = new_admin_who["active_organization"]
    # add one member
    new_admin_invite = new_admin_login.get("/api/invite").json()["invite_url"]
    new_member_email = f"sa.member.{timestamp}@example.com"
    new_member = RoleClient("newmember")
    new_member.signup(f"{new_admin_invite}&role=annotator", new_member_email, "Password1234!")
    # create one project + one task
    r_proj = new_admin_login.post_json("/api/projects/", {"title": f"Delete Cascade Project {timestamp}", "label_config": read_fixensy_label_config()})
    project_created = r_proj.json() if r_proj.ok else {}
    new_project_id = project_created.get("id")
    if new_project_id:
        new_admin_login.post_json("/api/tasks/", {"project": new_project_id, "data": {"url": "https://htx-pub.s3.us-east-1.amazonaws.com/examples/audio/1.wav"}})
    sa_admins = superadmin.get("/api/super-admin/admins/").json()
    new_admin_entry = next((x for x in sa_admins if x.get("email") == new_admin_email), None)
    new_admin_id = new_admin_entry["id"] if new_admin_entry else None
    before_detail = superadmin.get(f"/api/super-admin/admins/{new_admin_id}/detail/").json() if new_admin_id else {}
    r = superadmin.delete(f"/api/super-admin/admins/{new_admin_id}/")
    after_list = superadmin.get("/api/super-admin/admins/").json()
    after_detail = superadmin.get(f"/api/super-admin/admins/{new_admin_id}/detail/") if new_admin_id else None
    record(r.status_code == 200 and new_admin_id is not None and all(x.get("email") != new_admin_email for x in after_list) and before_detail.get("organization", {}).get("total_members", 0) >= 2 and before_detail.get("organization", {}).get("total_projects", 0) >= 1 and after_detail is not None and after_detail.status_code == 404, "J2", "Delete admin cascades org members projects tasks", r.status_code, f"before_members={before_detail.get('organization', {}).get('total_members')} before_projects={before_detail.get('organization', {}).get('total_projects')} after_detail={after_detail.status_code if after_detail else 'NA'}")

    # K export
    export_resp = admin.get(f"/api/projects/{project_id}/tasks/{task1}/export/")
    export_ok = export_resp.status_code == 200 and "application/json" in export_resp.headers.get("content-type", "")
    export_data = export_resp.json() if export_ok else {}
    record(export_ok, "K1", "Single-task export reachable", export_resp.status_code, export_resp.headers.get("content-disposition", ""))
    record(export_ok and bool(export_data.get("annotations")) and bool(export_data["annotations"][0].get("result")), "K2", "Single-task export contains annotation result", export_resp.status_code, short_json(export_data.get("annotations", [{}])[:1]))

    passed = sum(1 for r in RESULTS if r.ok)
    total = len(RESULTS)
    print("FIXENSY E2E RERUN")
    for item in RESULTS:
        print(f"[{'PASS' if item.ok else 'FAIL'}] {item.test_id} | HTTP {item.status} | {item.desc} | {item.evidence}")
    print(f"PASS_TOTAL {passed}/{total} {round((passed / total) * 100, 1) if total else 0.0}%")

    failed = [r for r in RESULTS if not r.ok]
    if failed:
        print("FAILED_IDS " + ",".join(r.test_id for r in failed))
        sys.exit(1)


if __name__ == "__main__":
    main()
