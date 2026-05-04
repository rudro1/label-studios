You are continuing the Fixensy (NetroFix) project — a Label Studio (Community Edition) fork
with custom RBAC + task assignment workflow. Repo path:
/Users/rudro/Downloads/label-studios-develop copy 2/

Read these files first to load full context (in order):
1. FIXENSY_MASTER_PROMPT.md         — product spec (Bengali + English)
2. FIXENSY_PLAN.md                  — step-by-step implementation plan
3. FIXENSY_STATUS.md                — what's done/pending
4. label_studio/setup_test_data.py  — test data seeder

Stack:
- Backend: Django 5.1 / DRF, Python 3.12, PostgreSQL (Docker container 7cf1008af543, db `fixensy`)
- Frontend: React + MobX + LSF editor, monorepo at web/
- Settings module: core.settings.label_studio
- venv: .venv_fixensy

Server is running at: http://localhost:8080
If not running, start it with:
  cd "/Users/rudro/Downloads/label-studios-develop copy 2"
  source .venv_fixensy/bin/activate
  cd label_studio
  env $(grep -v '^#' data/.env | grep -v '^$' | sed 's/=/="/' | sed 's/$/"/' | xargs) \
      python manage.py runserver 0.0.0.0:8080

Credentials:
- Super Admin: stored ONLY in label_studio/data/.env as
  FIXENSY_SUPERADMIN_EMAIL + FIXENSY_SUPERADMIN_PASSWORD
  (read them from .env, never print or commit them)
- Admin:     admin@fixensy.com    / fixensy123
- Annotator: annotator@fixensy.com / fixensy123
- Reviewer:  reviewer@fixensy.com  / fixensy123

================================================================
TASK: Run a full end-to-end test of the Fixensy workflow.
================================================================

Verify each item below by issuing real HTTP requests (curl) against
http://localhost:8080. Use Django session login (POST to /user/login/
with csrfmiddlewaretoken from a prior GET) so the same cookie jar
authenticates subsequent calls. Use a separate cookie jar per role.

For every check, print:
  [PASS] / [FAIL]  <description>  → HTTP <status>  <short evidence>

If anything fails, diagnose root cause from the codebase (do NOT
patch yet — just identify and report). Only after the full test
matrix is reported, list a prioritized fix plan.

----------------------------------------------------------------
TEST MATRIX
----------------------------------------------------------------

A. Auth & Role Access
  A1. Super Admin login                        → 200, session cookie set
  A2. Super Admin GET /organization            → 200 (sees People page)
  A3. Admin login                              → 200
  A4. Admin GET /organization                  → 200
  A5. Annotator login                          → 200
  A6. Annotator GET /organization              → 302 redirect to /projects
  A7. Reviewer login                           → 200
  A8. Reviewer GET /organization               → 302 redirect to /projects

B. Super Admin APIs
  B1. GET  /api/super-admin/admins/            → 200, list excludes superusers
  B2. GET  /api/super-admin/admin-invite/      → 200, returns absolute invite_url
  B3. GET  /api/super-admin/maintenance/       → 200, {enabled: false}
  B4. POST /api/super-admin/maintenance/       (enabled=true)
       → admin login should now hit 503; superadmin should still work
  B5. POST /api/super-admin/maintenance/       (enabled=false) — restore
  B6. POST /api/super-admin/admins/<adminId>/suspend/
       → toggles Organization.is_suspended on admin's org
       → admin's next request should hit 403 "organization suspended"
  B7. Unsuspend (POST again)                   → admin works again
  B8. Same endpoints rejected for non-superusers (403)

C. Secrecy (Master Prompt rule 3)
  C1. /api/users/        as Admin              → response excludes superuser rows
  C2. /api/super-admin/* as Admin              → 403
  C3. grep label_studio/setup_test_data.py and FIXENSY_STATUS.md
       → must NOT contain superadmin email or password

D. Org-level Invite & Role Gating
  D1. Admin: GET /api/invite                   → 200, absolute URL with token
  D2. Anonymous: POST /user/signup/?token=<X>&role=annotator  (new email)
       → new user joins org as annotator
  D3. Anonymous: POST /user/signup/?token=<X>&role=admin  (new email)
       → role must NOT become admin (forced down to annotator)
  D4. Admin PATCH /api/organizations/<id>      with role=admin
       → 403 "Only Super Admin can assign the Admin role."
  D5. Annotator GET /api/invite                → 403

E. Task Assignment Flow
  Setup: as Admin, create a project (or reuse "Fixensy Test Project")
  with at least 2 tasks, then run "Assign Tasks" DM action picking
  Annotator + Reviewer.
  E1. Annotator: GET /api/dm/tasks?project=<id>
       → only sees tasks where assignment.status in
         {pending_annotation, rejected}
  E2. Reviewer: GET /api/dm/tasks?project=<id>
       → only sees tasks where assignment.status = pending_review
  E3. Admin: GET same                          → sees all tasks
  E4. Assign Tasks dropdown via DM API
       → annotator dropdown contains ONLY annotators
       → reviewer dropdown contains ONLY reviewers
       → org owner / admin role NEVER appears in either list

F. Annotation → Review → Reject loop
  F1. Annotator submits annotation             → assignment.status = pending_review
       → assignment.started_at set
  F2. Reviewer submits annotation (approve)    → assignment.status = completed
       → assignment.completed_at set
  F3. Setup another task, annotator submits, then:
       Reviewer POST /api/tasks/<pk>/reject/   body {"reason": "Bad audio"}
       → 200, assignment.status = rejected, rejection_reason saved,
         completed_at cleared
  F4. POST /api/tasks/<pk>/reject/ from Annotator → 403
  F5. POST without reason                      → 400
  F6. POST reason >2000 chars                  → 400
  F7. Annotator: GET /api/dm/tasks?project=<id>
       → rejected task is back in their queue with rejection_reason exposed
       in `assignment.rejection_reason`

G. Live Tracking
  G1. assigned_at  populated immediately on assignment
  G2. started_at   populated when annotator first saves a draft/annotation
  G3. completed_at populated on reviewer approve, NULL while in flight
  G4. working_seconds increases over time before completion, frozen after

H. Release Task
  H1. Admin runs DM action "Release Tasks" on a task
       → corresponding TaskAssignment row deleted
       → annotator/reviewer can no longer access that task
       → existing annotations preserved
  H2. Released task can be re-assigned cleanly

I. Per-Member Suspend
  I1. POST /api/organizations/<orgId>/memberships/<annotatorUserId>/suspend/
       as Admin                                → 200, is_suspended toggles
  I2. Annotator next request                   → 403 "account suspended"
  I3. Cannot self-suspend (own user_pk)        → 400
  I4. Cannot suspend org owner                 → 400
  I5. Annotator/Reviewer attempting same call  → 403

J. Storage tracking + Delete cascade
  J1. SuperAdminListAPI returns storage_bytes per admin
  J2. Super Admin DELETE /api/super-admin/admins/<adminId>/
       → org + members + projects + tasks all gone (verify counts)

K. Single-task export (Phase 1 commit)
  K1. data_export/single_task_export.py route is reachable for completed task
  K2. Export contains the annotation result

----------------------------------------------------------------
DELIVERABLE
----------------------------------------------------------------
1. Tabular report: [PASS/FAIL]  test-id  evidence  http-status
2. Aggregate %   PASS / total
3. Failed-test diagnosis: file:line of the cause + minimal patch sketch
4. Master Prompt completion %  (compare against FIXENSY_MASTER_PROMPT.md
   sections: Super Admin / Admin / Annotator / Reviewer workflows)

Constraints:
- Do NOT modify code on this run unless explicitly told.
- Do NOT print super admin password anywhere.
- Use parallel curl calls where independent to speed up.
- Reuse existing endpoints; do not invent new ones.
- If a test depends on another's output (e.g. created task id),
  chain sequentially.
- Bengali/English mixed messages are fine; final report in English.

Begin.
