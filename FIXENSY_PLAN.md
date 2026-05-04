# Fixensy — A-to-Z Workflow Implementation Plan

> এই document-টি Fixensy platform-এর সম্পূর্ণ workflow implement করার step-by-step plan।
> প্রতিটি Step আলাদাভাবে implement ও test করা হবে।

---

## 🎯 চূড়ান্ত লক্ষ্য (End Goal)

```
Super Admin
    └── Admin account তৈরি করে
          └── Admin → Project তৈরি করে
                   └── Admin → Tasks import করে (URL দিয়ে)
                           └── Admin → Tasks assign করে (Annotator + Reviewer)
                                    └── Annotator → শুধু নিজের tasks দেখে → Annotate করে → Submit
                                              └── Reviewer → শুধু নিজের tasks দেখে → Approve/Reject
                                                        └── Reject হলে → Annotator আবার পায়
                                                        └── Approve হলে → Completed ✅
```

---

## 📊 বর্তমান অবস্থা

| Feature | Status |
|---------|--------|
| PostgreSQL DB | ✅ Done |
| Login (all users) | ✅ Done |
| TaskAssignment model | ✅ Done |
| Rejection loop signal | ✅ Done |
| Task isolation RBAC | ✅ Done |
| Assign Tasks action | ✅ Done |
| Maintenance middleware | ✅ Done |
| Fixensy UI branding | ✅ Done |
| Super Admin org permission | ✅ Done (`Organization.has_permission` superuser bypass) |
| Invite URL correct | ✅ Done |
| Reviewer role correct | ✅ Done |
| Org page restricted (annotator/reviewer blocked) | ✅ Done |
| Admin creation by Super Admin only | ✅ Done |
| Task assign dropdown role-filtered | ✅ Done |
| Super Admin UI controls | ✅ Done |
| Data import working | ✅ Done |

### Test logins (after Docker seed)

Copy [`.env.example`](.env.example) to `.env`, set `FIXENSY_SUPERADMIN_PASSWORD` (at least 12 characters) and optional `FIXENSY_SUPERADMIN_EMAIL`, then run:

```bash
bash scripts/fixensy_docker_bootstrap.sh
```

First container start can take **several minutes** (PostgreSQL migrations run before the HTTP server listens). If the script times out, run `docker compose logs -f label_studio` to see errors. You can extend the wait with env vars `BOOTSTRAP_WAIT_ATTEMPTS` (default 180) and `BOOTSTRAP_WAIT_SLEEP_SEC` (default 2).

| Role | Email | Password | Notes |
|------|--------|----------|--------|
| Super Admin | `FIXENSY_SUPERADMIN_EMAIL` (default `superadmin@fixensy.com` in `.env.example`) | from `.env` | `python manage.py create_super_admin` |
| Admin | `admin@fixensy.com` | `fixensy123` | [`setup_test_data.py`](label_studio/setup_test_data.py) |
| Annotator | `annotator@fixensy.com` | `fixensy123` | same |
| Reviewer | `reviewer@fixensy.com` | `fixensy123` | same |

Do not commit real `.env` secrets. Migrations run automatically on container start when PostgreSQL is configured.

---

## 🔢 Step-by-Step Plan

---

### STEP 1 — Fix: Super Admin Organization Page Access
**ফাইল:** `label_studio/organizations/models.py`  
**কী হবে:** `has_permission()` method-এ `is_superuser` check যোগ করব। Super Admin সব Organization দেখতে ও পরিচালনা করতে পারবে।  
**পরিবর্তন:**
```python
# BEFORE (line 166):
def has_permission(self, user):
    return OrganizationMember.objects.filter(...).exists()

# AFTER:
def has_permission(self, user):
    if user.is_superuser:
        return True  # Super Admin bypasses all org checks
    return OrganizationMember.objects.filter(...).exists()
```
**Test:** `superadmin@fixensy.com` দিয়ে `/organization` page ঠিকঠাক লোড হয়।

---

### STEP 2 — Fix: Organization Page Blocked for Annotator/Reviewer
**ফাইল:** `label_studio/organizations/views.py`  
**কী হবে:** `organization_people_list()` ও `simple_view()` এ role check যোগ। Annotator/Reviewer গেলে projects page-এ redirect হবে।  
**পরিবর্তন:**
```python
@login_required
def organization_people_list(request):
    user = request.user
    if not user.is_superuser:
        org = user.active_organization
        if org:
            om = OrganizationMember.objects.filter(
                user=user, organization=org, deleted_at__isnull=True
            ).first()
            if not om or om.role not in ['admin'] and org.created_by != user:
                return redirect('projects:project-index')
    return render(request, 'organizations/people_list.html')
```
**Test:** `annotator@fixensy.com` দিয়ে `/organization` গেলে `/projects` এ redirect হয়।

---

### STEP 3 — Fix: Invite Link URL `undefined` Bug
**ফাইল:** `label_studio/organizations/api.py`  
**কী হবে:** `OrganizationInviteAPI.get()` এ relative URL → absolute URL করব।  
**পরিবর্তন:**
```python
# BEFORE (line 404):
invite_url = '{}?token={}'.format(reverse('user-signup'), org.token)

# AFTER:
invite_url = request.build_absolute_uri(
    '{}?token={}'.format(reverse('user-signup'), org.token)
)
```
**Test:** "Add Members" বাটনে ক্লিক করলে সঠিক URL দেখায় (`http://127.0.0.1:8080/user/signup/?token=xxx`)।

---

### STEP 4 — Fix: Admin Account Creation — Only Super Admin
**ফাইল:** `label_studio/organizations/api.py`  
**কী হবে:** `OrganizationMemberListAPI` তে নতুন member add করার সময় যদি `role=admin` হয়, তাহলে শুধু `is_superuser=True` user করতে পারবে।  
**পরিবর্তন:** `post()` method-এ (অথবা serializer validate-এ) role=admin restriction:
```python
def post(self, request, *args, **kwargs):
    role = request.data.get('role', 'annotator')
    if role == 'admin' and not request.user.is_superuser:
        raise PermissionDenied("Only Super Admin can create Admin accounts.")
    return super().post(request, *args, **kwargs)
```
এছাড়া **invite flow** এও: Invite দিয়ে যে user যোগ দেবে তার role `admin` হলে Super Admin শুধু দিতে পারবে।  
**Test:** `admin@fixensy.com` দিয়ে অন্য কাউকে Admin বানানোর চেষ্টা করলে `403` error আসে।

---

### STEP 5 — Fix: Reviewer Role Seeder Bug
**ফাইল:** `label_studio/setup_test_data.py`  
**কী হবে:** `member.role = 'RV'` → `member.role = 'reviewer'` — valid choice অনুযায়ী।  
**পরিবর্তন:**
```python
# BEFORE (line 73):
member.role = 'RV'

# AFTER:
member.role = 'reviewer'
```
তারপর DB-তে এটি fix করতে seeder re-run করব।  
**Test:** `reviewer@fixensy.com` লগইন করলে assigned review tasks দেখায়।

---

### STEP 6 — Fix: Task Assignment Dropdown Role-Filtered
**ফাইল:** `label_studio/data_manager/actions/assign_tasks.py`  
**কী হবে:** Annotator dropdown → শুধু `role='annotator'` members; Reviewer dropdown → শুধু `role='reviewer'` members।  
**পরিবর্তন:**
```python
annotators = User.objects.filter(
    id__in=OrganizationMember.objects.filter(
        organization=project.organization, role='annotator'
    ).values_list('user_id', flat=True)
)
reviewers = User.objects.filter(
    id__in=OrganizationMember.objects.filter(
        organization=project.organization, role='reviewer'
    ).values_list('user_id', flat=True)
)
```
**Test:** Task assign form-এ Annotator dropdown-এ শুধু annotators, Reviewer dropdown-এ শুধু reviewers দেখায়।

---

### STEP 7 — Fix: Rejection Loop Reliability
**ফাইল:** `label_studio/tasks/models.py`  
**কী হবে:** Rejection trigger আরও robust করব। শুধু `choices` নয়, Reviewer-এর annotation submit মানেই `pending_review` → check; rejection হলে `rejected` → annotator-এর queue-এ ফেরে।  
**পরিবর্তন:**  
Signal logic update:
- Annotator submit → `pending_review` (সবসময়, result content নির্বিশেষে)
- Reviewer submit → `completed` (default)  
- Reviewer-এর annotation-এ explicit `reject` keyword থাকলে → `rejected`
- একটি নতুন `POST /api/tasks/{id}/reject/` endpoint যোগ করব — Reviewer ১ ক্লিকে reject করতে পারবে

**Test:** Annotator submit → Reviewer-এর queue-এ আসে → Reject → Annotator আবার পায়।

---

### STEP 8 — Fix: Data Import "Not Found" Error
**ফাইল:** `label_studio/data_import/api.py`  
**কী হবে:** Project create flow-এ data import করার সময় project_id সঠিকভাবে pass হচ্ছে কিনা investigate করব। URL-based import সঠিকভাবে কাজ করবে।  
**Test:** Project create করে URL দিয়ে audio task import হয়।

---

### STEP 9 — Super Admin Control Panel (Organization Page-এই)
**ফাইলসমূহ:** `organizations/api.py`, `organizations/views.py`  
**কী হবে:** Super Admin যখন `/organization` page-এ যাবে, সে extra controls দেখবে (existing page-এ conditional UI)।

#### Sub-step 9a — All Organizations List API
```
GET /api/superadmin/organizations/
```
Super Admin সব org list দেখতে পাবে।

#### Sub-step 9b — Suspend/Unsuspend Organization API
```
POST /api/superadmin/organizations/{id}/suspend/
POST /api/superadmin/organizations/{id}/unsuspend/
```

#### Sub-step 9c — Maintenance Mode Toggle API
```
POST /api/superadmin/maintenance/toggle/
```
Cache key `maintenance_mode_enabled` toggle করবে।

**Test:**  
- Maintenance ON → `admin@fixensy.com` লগইন করলে 503 পায়, superadmin পায় না  
- Org suspend → সেই org-এর members 403 পায়

---

### STEP 10 — Final DB Reset & Full E2E Test
**কী হবে:**
1. DB clean করব (সব data মুছে নতুন করে seed)
2. `setup_test_data.py` re-run
3. সম্পূর্ণ workflow test

**Test Checklist:**
```
[ ] superadmin@fixensy.com লগইন → Organization page দেখে
[ ] superadmin → Admin account তৈরি করে (invite দিয়ে)
[ ] admin@fixensy.com লগইন → Project তৈরি করে
[ ] admin → URL দিয়ে audio task import করে
[ ] admin → Task select করে → Assign Tasks → Annotator ও Reviewer বাছে
[ ] annotator@fixensy.com লগইন → শুধু নিজের tasks দেখে
[ ] annotator → Task annotate করে → Submit
[ ] reviewer@fixensy.com লগইন → Task review queue-এ দেখে
[ ] reviewer → Reject করে → Annotator আবার পায়
[ ] annotator → আবার submit করে
[ ] reviewer → Approve করে → Task completed ✅
[ ] superadmin → Maintenance Mode ON → admin 503 পায়
[ ] superadmin → Org suspend → admin 403 পায়
[ ] annotator/reviewer → /organization গেলে → /projects redirect হয়
```

---

## 📁 ফাইল পরিবর্তনের সারণী

| Step | ফাইল | পরিবর্তনের ধরন |
|------|------|----------------|
| 1 | `organizations/models.py` | `has_permission()` — superuser bypass |
| 2 | `organizations/views.py` | Role check + redirect for annotator/reviewer |
| 3 | `organizations/api.py` | Invite URL — absolute URI fix |
| 4 | `organizations/api.py` | Admin creation restricted to superuser |
| 5 | `setup_test_data.py` | Reviewer role `'RV'` → `'reviewer'` |
| 6 | `data_manager/actions/assign_tasks.py` | Dropdown role-filtered |
| 7 | `tasks/models.py` | Rejection signal + new reject endpoint |
| 8 | `data_import/api.py` | URL import fix |
| 9 | `organizations/api.py` | Super Admin control APIs |
| 10 | Terminal | DB reset + full E2E test |

---

## ⚡ Implementation Order

```
Step 1 → Step 2 → Step 3 (এই ৩টি Super Admin-কে সচল করবে)
    ↓
Step 4 → Step 5 → Step 6 (Admin workflow সচল হবে)
    ↓
Step 7 → Step 8 (Annotation workflow সচল হবে)
    ↓
Step 9 (Super Admin control panel)
    ↓
Step 10 (Final test)
```

> **নিয়ম:** প্রতিটি Step implement করার পর test করব, তারপর পরের Step শুরু করব।  
> আপনি প্রতিটি Step-এর পরে approve করলেই পরের Step শুরু হবে।
