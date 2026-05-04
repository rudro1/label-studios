# Fixensy Codebase — Completion Audit (2 May 2026)

## 📊 Overall Estimate
- **Backend Foundations:** 70-75% ✅
- **Frontend/UI:** 35-40% ⚠️
- **End-to-End Workflow:** 45-50% ⚠️

---

## ✅ FULLY DONE (100% — Ready to Use)

### 1. Database & Models
- **PostgreSQL Setup** — hardcoded in [label_studio/core/settings/label_studio.py](label_studio/core/settings/label_studio.py)
- **TaskAssignment Model** — [label_studio/tasks/models.py:1618](label_studio/tasks/models.py#L1618)
  - Fields: `task`, `annotator`, `reviewer`, `status`, `created_at`, `updated_at`
  - Status choices: `pending_annotation` → `pending_review` → `completed` / `rejected`
  - Unique constraint: one assignment per (task, annotator)

### 2. Authentication & User Setup
- **Super Admin** — created by seeder [label_studio/setup_test_data.py:20](label_studio/setup_test_data.py#L20)
- **Admin (Org Owner)** — created by seeder
- **Annotator & Reviewer** — created with correct roles
- **4-User Test Data** — seeder creates all users + org + project

### 3. Invite System
- **Absolute URL Generation** — [label_studio/organizations/api.py:419](label_studio/organizations/api.py#L419)
  - Uses `request.build_absolute_uri()` (no more `undefined`)
  - Works for both org invite and token reset

### 4. Task Isolation (RBAC)
- **Data Manager Filter** — [label_studio/data_manager/api.py:352](label_studio/data_manager/api.py#L352)
  - Annotators see only `pending_annotation` and `rejected` tasks
  - Reviewers see only `pending_review` tasks
  - Admins & Super Admin see ALL tasks

### 5. Task Assignment Action
- **Form & Handler** — [label_studio/data_manager/actions/assign_tasks.py:10](label_studio/data_manager/actions/assign_tasks.py#L10)
  - Admin can select tasks → "Assign Tasks" action
  - Dropdown for Annotator selection
  - Optional Reviewer selection
  - Creates/updates `TaskAssignment` records

### 6. Rejection Loop (State Machine)
- **Signal Handler** — [label_studio/tasks/models.py:1634](label_studio/tasks/models.py#L1634)
  - Annotator submits → `pending_review` (sent to reviewer)
  - Reviewer submits with rejection keywords → `rejected` (sent back to annotator)
  - Reviewer submits without rejection → `completed`

### 7. Organization Management
- **Org Suspension Field** — [label_studio/organizations/models.py:113](label_studio/organizations/models.py#L113)
  - `is_suspended` boolean field exists
  - Soft delete for members works ([organizations/models.py](organizations/models.py))

### 8. Maintenance Mode Middleware
- **Middleware** — [label_studio/core/middleware.py:266](label_studio/core/middleware.py#L266)
  - Checks `maintenance_mode_enabled` cache key
  - Returns 503 to all non-superusers
  - Super Admin always bypasses

### 9. Organization Permission Logic
- **SuperUser Bypass** — [label_studio/organizations/models.py:166](label_studio/organizations/models.py#L166)
  - `has_permission()` now returns `True` for `is_superuser`
  - Super Admin can access any org page

### 10. Organization Page Access Control
- **View Check** — [label_studio/organizations/views.py:9](label_studio/organizations/views.py#L9)
  - Annotators/Reviewers redirect to projects page
  - Only Admin/Owner/SuperAdmin can see people list

### 11. Data Export
- **Single Task Export** — [label_studio/data_export/urls.py:22](label_studio/data_export/urls.py#L22)
  - Route: `POST /api/projects/{pk}/tasks/{task_id}/export/`
  - Returns one JSON doc named after the file

### 12. Data Import
- **Import API** — [label_studio/data_import/api.py](label_studio/data_import/api.py)
  - Supports JSON, CSV, TSV, TXT, URL-based import
  - Async processing (non-Community editions)
  - Sync processing (Community edition)
  - Properly documented

### 13. Super Admin Control APIs (Backend Only)
- **List All Orgs** — `GET /api/superadmin/organizations/` [organizations/api.py:464](organizations/api.py#L464)
- **Suspend/Unsuspend** — `POST /api/superadmin/organizations/{id}/suspend/` [organizations/api.py:474](organizations/api.py#L474)
- **Maintenance Toggle** — `POST /api/superadmin/maintenance/toggle/` [organizations/api.py:495](organizations/api.py#L495)
- **Admin List** — `GET /api/super-admin/admins/` [users/api.py:431](users/api.py#L431)
- **Admin Delete** — `DELETE /api/super-admin/admins/{pk}/` [users/api.py:465](users/api.py#L465)

### 14. Fixensy UI Branding
- **CSS** — [label_studio/templates/base.html:68](label_studio/templates/base.html#L68)
  - Dark indigo sidebar (`#0F172A`)
  - Indigo buttons (`#6366F1`)
  - Inter font

---

## ⚠️ PARTIALLY DONE (50-90% — Needs Fixes)

### 1. Organization Suspension Flow 🔴 CRITICAL
| What | Where | Issue |
|------|-------|-------|
| API suspend | [organizations/api.py:486](organizations/api.py#L486) | Sets cache flag `org_{org.pk}_suspended` |
| Middleware check | [core/middleware.py:282](core/middleware.py#L282) | Checks DB field `Organization.is_suspended` |
| **Issue** | — | Cache and DB out of sync — suspension doesn't actually work |
| **Fix** | [organizations/api.py:484](organizations/api.py#L484) | Change API to update `org.is_suspended` directly instead of cache |

### 2. Task Assignment Dropdown Role Filtering 🟡 MEDIUM
| What | Where | Issue |
|------|-------|-------|
| Annotator dropdown | [data_manager/actions/assign_tasks.py:13](data_manager/actions/assign_tasks.py#L13) | Includes `role__in=['annotator', 'admin']` |
| Reviewer dropdown | [data_manager/actions/assign_tasks.py:18](data_manager/actions/assign_tasks.py#L18) | Includes `role__in=['reviewer', 'admin']` |
| **Issue** | — | Both dropdowns show admin; should be role-specific |
| **Fix** | [data_manager/actions/assign_tasks.py:10](data_manager/actions/assign_tasks.py#L10) | Split into two separate role filters |

### 3. Rejection Loop Detection 🟡 MEDIUM
| What | Where | Issue |
|------|-------|-------|
| Signal | [tasks/models.py:1634](tasks/models.py#L1634) | Looks for `type == 'choices'` with rejection keywords |
| **Issue** | — | Only works for choices; other annotation types won't trigger reject |
| **Fix** | [tasks/models.py:1641](tasks/models.py#L1641) | Add explicit `POST /api/tasks/{id}/reject/` endpoint |

### 4. Admin Creation Restriction 🟡 MEDIUM
| What | Where | Issue |
|------|-------|-------|
| Current | [organizations/api.py:95](organizations/api.py) | No check prevents annotator from becoming admin in invite flow |
| **Fix** | [organizations/api.py:95](organizations/api.py) | Add: `if role == 'admin' and not user.is_superuser: raise PermissionDenied(...)` |

### 5. Super Admin Control Panel (No UI Yet) 🟡 MEDIUM
| What | Where | Missing |
|------|-------|---------|
| Backend APIs | [organizations/api.py:464](organizations/api.py#L464) | ✅ Done |
| Frontend page | — | ❌ No UI; needs `/superadmin/` or extend `/organization/` |
| Storage usage bar | — | ❌ Missing |
| Live tracking | — | ❌ Missing |
| Org list UI | — | ❌ Missing |

---

## ❌ NOT DONE (0-10% — Placeholder Only)

### 1. Super Admin Dashboard UI
- **Status:** APIs exist, but no frontend page
- **Impact:** Admin can't actually use the system without calling APIs directly
- **Effort:** Medium — extend existing organization page with conditional Super Admin section

### 2. Storage Usage Tracking
- **Status:** 0% — not in code
- **Impact:** Super Admin can't see org storage quotas
- **Effort:** High — needs file accounting logic

### 3. Live Task Tracking Dashboard
- **Status:** 0% — concept only in docs
- **Impact:** Admin can't see "who is working on what now"
- **Effort:** High — needs real-time WebSocket or polling

### 4. Task Release/Re-assignment
- **Status:** Code exists ([tasks/api.py:841](tasks/api.py#L841)) but not wired to UI
- **Impact:** Admin can't manually take tasks away from users
- **Effort:** Low-Medium — mostly UI wiring

### 5. Robust Data Import Error Handling
- **Status:** API exists, but error messages may be generic
- **Impact:** Users might not know why import failed
- **Effort:** Medium — improve error reporting

---

## 🧪 Test Coverage

| Feature | Test File | Status |
|---------|-----------|--------|
| TaskAssignment | [tests/](label_studio/tests/) | ⚠️ No specific test found |
| Data Manager filtering | [tests/](label_studio/tests/) | ⚠️ No specific test found |
| Invite URL | [tests/test_invites.py](label_studio/tests/test_invites.py) | ✅ Exists |
| Organization access | [tests/](label_studio/tests/) | ⚠️ Limited |
| Maintenance middleware | [tests/](label_studio/tests/) | ⚠️ No specific test found |
| Suspension flow | [tests/](label_studio/tests/) | ❌ Missing |

---

## 🔧 Priority Fix Order

### CRITICAL (Fix immediately)
1. **Org suspension flow** — Cache vs DB mismatch breaks feature
   - File: [organizations/api.py:484](organizations/api.py#L484)
   - Change: Use `org.is_suspended = True; org.save()` instead of cache
   - ETA: 10 mins

### HIGH (Fix this week)
2. **Task assignment dropdown role filtering**
   - File: [data_manager/actions/assign_tasks.py:13-18](data_manager/actions/assign_tasks.py#L13)
   - Change: Split annotator/reviewer queries by role only
   - ETA: 20 mins

3. **Explicit reject endpoint**
   - File: [tasks/api.py](label_studio/tasks/api.py)
   - Add: `POST /api/tasks/{id}/reject/` that sets status to `rejected`
   - ETA: 30 mins

4. **Admin creation restriction**
   - File: [organizations/api.py:95](organizations/api.py#L95)
   - Add: superuser check in POST handler
   - ETA: 15 mins

### MEDIUM (Fix this sprint)
5. **Super Admin control panel UI**
   - Extend [organizations/templates/people_list.html](label_studio/organizations/templates/people_list.html)
   - Add conditional super admin section
   - ETA: 2 hours

6. **E2E workflow test**
   - Test full path: superadmin → admin → project → assign → annotate → review → approve/reject
   - ETA: 1.5 hours

### LOW (Nice to have)
7. Storage usage tracking
8. Live task tracking dashboard
9. Better import error messages

---

## 📋 Next Steps

```
✅ Done:
  - Seeder works (4 users, org, project, tasks)
  - Invite URL fixed
  - Org permission logic fixed
  - Task isolation works
  - Maintenance middleware works

⚠️ Fix now:
  1. Org suspension cache → DB (10 mins)
  2. Task dropdown filtering (20 mins)
  3. Explicit reject endpoint (30 mins)
  4. Admin role check (15 mins)

🎯 Then:
  5. Super Admin UI
  6. Full E2E test

Total estimated fix time: ~2 hours for critical + high priority items
```

---

## 🚀 How to Verify Everything Works

```bash
# 1. Reset DB and run seeder
python label_studio/setup_test_data.py

# 2. Start server
python label_studio/manage.py runserver 8080

# 3. Test workflow
- Login: superadmin@fixensy.com / fixensy123
- Navigate to /organization
- Try: suspend org, toggle maintenance, list all orgs
- Logout, login as admin@fixensy.com
- Create project, import audio, assign tasks
- Login as annotator@fixensy.com
- See only assigned tasks, annotate, submit
- Login as reviewer@fixensy.com
- See review queue, reject, reviewer sees again
- Re-submit, approve → completed ✅
```

