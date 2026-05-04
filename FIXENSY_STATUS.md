# Fixensy Platform Status

Last updated: 2026-05-03

## Final Certification

Fixensy workflow is certified against:

- `FIXENSY_MASTER_PROMPT.md`
- `FIXENSY_PLAN.md`
- `FIXENSY_E2E_PROMPT.md`

Final E2E result:

```text
PASS_TOTAL 52/52 100.0%
```

The test run used real HTTP requests against `http://127.0.0.1:8080`, Django session login with CSRF, PostgreSQL, and separate sessions for Super Admin, Admin, Annotator, and Reviewer.

## Certified Workflows

| Area | Status |
| --- | --- |
| PostgreSQL database | Certified |
| Super Admin login and organization access | Certified |
| Super Admin admin invite link | Certified |
| Super Admin maintenance mode | Certified |
| Super Admin admin suspend/unsuspend | Certified |
| Super Admin delete cascade | Certified |
| Super Admin storage tracking | Certified |
| Super Admin secrecy | Certified |
| Super Admin hidden from tenant org pages | Certified |
| Admin organization access | Certified |
| Admin invite link for annotator/reviewer | Certified |
| Admin cannot create Admin role | Certified |
| Fixensy template v2 project/task workflow | Certified |
| Role-filtered task assignment | Certified |
| Annotator assigned-task isolation | Certified |
| Annotator submit to reviewer | Certified |
| Reviewer pending-review isolation | Certified |
| Reviewer approve workflow | Certified |
| Reviewer reject with reason | Certified |
| Rejected task returns to annotator | Certified |
| Live assignment tracking | Certified |
| Task release and reassignment | Certified |
| Per-member suspend | Certified |
| Hard delete of tenant users and their org-scoped data | Certified |
| Single-task export | Certified |

## Final E2E Matrix

```text
[PASS] A1 Super Admin login
[PASS] A2 Super Admin GET /organization
[PASS] A3 Admin login
[PASS] A4 Admin GET /organization
[PASS] A5 Annotator login
[PASS] A6 Annotator GET /organization redirects
[PASS] A7 Reviewer login
[PASS] A8 Reviewer GET /organization redirects
[PASS] B1 Super Admin admins list excludes superusers
[PASS] B2 Super Admin admin invite absolute URL
[PASS] B3 Maintenance initially disabled
[PASS] B4 Maintenance ON blocks admin but not superadmin
[PASS] B5 Maintenance OFF restored
[PASS] B6 Super Admin suspends admin org
[PASS] B7 Super Admin unsuspends admin org
[PASS] B8 Non-superuser rejected from Super Admin endpoints
[PASS] C1 Admin /api/users excludes superuser
[PASS] C2 Admin /api/super-admin/* denied
[PASS] C3 Seeder/status do not leak Super Admin secret
[PASS] D1 Admin invite absolute token URL
[PASS] D2 Anonymous signup role=annotator joins as annotator
[PASS] D3 Anonymous signup role=admin forced to annotator
[PASS] D4 Admin cannot assign Admin role via org PATCH
[PASS] D5 Annotator cannot generate invite
[PASS] E0 Admin assigns tasks to Annotator + Reviewer
[PASS] E1 Annotator sees pending/rejected assigned tasks only
[PASS] E2 Reviewer sees only pending_review tasks
[PASS] E3 Admin sees all project tasks
[PASS] E4 Assign form role-filtered
[PASS] E4b Assign form limited to valid project collaborators
[PASS] F1 Annotator submit moves task to pending_review
[PASS] F2 Reviewer approve completes task
[PASS] F3 Reviewer reject returns task to annotator
[PASS] F4 Annotator cannot reject task
[PASS] F5 Reject requires reason
[PASS] F6 Reject reason max length enforced
[PASS] F7 Rejected task returns with rejection_reason exposed
[PASS] G1 assigned_at populated immediately
[PASS] G2 started_at populated on draft save
[PASS] G3 completed_at populated on reviewer approve
[PASS] G4 working_seconds increases then freezes
[PASS] H1 Release deletes assignment, preserves annotations, blocks access
[PASS] H2 Released task can be reassigned
[PASS] I1 Admin suspends annotator member
[PASS] I2 Suspended annotator blocked on next request
[PASS] I3 Cannot self-suspend
[PASS] I4 Cannot suspend org owner
[PASS] I5 Reviewer cannot suspend members
[PASS] J1 Super Admin list returns storage_bytes
[PASS] J2 Super Admin delete cascades org/members/projects/tasks
[PASS] K1 Single-task export route reachable
[PASS] K2 Single-task export contains annotation result
```

## Credentials Policy

Super Admin credentials are not stored in this file. They are provisioned only through environment variables:

- `FIXENSY_SUPERADMIN_EMAIL`
- `FIXENSY_SUPERADMIN_PASSWORD`

Do not copy Super Admin credentials into source, docs, templates, commits, or logs.

## Server

Certified server URL:

```text
http://127.0.0.1:8080
```
