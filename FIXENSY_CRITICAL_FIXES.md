# 🔨 Fixensy — Critical Fixes To-Do (Actionable)

## Issue #1: Organization Suspension Flow Broken 🔴 CRITICAL
**Problem:** Suspension sets cache flag, but middleware checks DB field. Result: suspension doesn't actually work.

**Status:** ❌ Broken now  
**Fix Time:** 10 minutes

### Change Required:
**File:** `label_studio/organizations/api.py` (line 484)

```python
# BEFORE (line 484-492):
if action == 'suspend':
    # Set some flag or cache to suspend. For now we just use cache as an example or flag.
    cache.set(f'org_{org.pk}_suspended', True, timeout=None)
    return Response({"status": "suspended", "org_id": org.pk})
elif action == 'unsuspend':
    cache.delete(f'org_{org.pk}_suspended')
    return Response({"status": "active", "org_id": org.pk})

# AFTER:
if action == 'suspend':
    org.is_suspended = True
    org.save(update_fields=['is_suspended'])
    return Response({"status": "suspended", "org_id": org.pk, "is_suspended": org.is_suspended})
elif action == 'unsuspend':
    org.is_suspended = False
    org.save(update_fields=['is_suspended'])
    return Response({"status": "active", "org_id": org.pk, "is_suspended": org.is_suspended})
```

---

## Issue #2: Task Assignment Dropdowns Show All Roles 🟡 MEDIUM
**Problem:** Both annotator and reviewer dropdowns show admins + role mix. Should be role-specific.

**Status:** ⚠️ Works but user confusion  
**Fix Time:** 20 minutes

### Change Required:
**File:** `label_studio/data_manager/actions/assign_tasks.py` (line 10-27)

```python
# BEFORE (line 10-27):
def assign_tasks_form(user, project):
    annotator_ids = OrganizationMember.objects.filter(
        organization=project.organization, 
        role__in=['annotator', 'admin']  # ← PROBLEM: includes admin
    ).values_list('user_id', flat=True)
    
    reviewer_ids = OrganizationMember.objects.filter(
        organization=project.organization, 
        role__in=['reviewer', 'admin']  # ← PROBLEM: includes admin
    ).values_list('user_id', flat=True)

# AFTER:
def assign_tasks_form(user, project):
    annotator_ids = OrganizationMember.objects.filter(
        organization=project.organization, 
        role='annotator'  # ← FIXED: only annotators
    ).values_list('user_id', flat=True)
    
    reviewer_ids = OrganizationMember.objects.filter(
        organization=project.organization, 
        role='reviewer'  # ← FIXED: only reviewers
    ).values_list('user_id', flat=True)
```

---

## Issue #3: No Explicit Reject Endpoint 🟡 MEDIUM
**Problem:** Rejection only works if reviewer's annotation contains 'invalid'/'reject' keywords. Heuristic-based, fragile.

**Status:** ⚠️ Works for choices, fails for other annotation types  
**Fix Time:** 30 minutes

### Changes Required:

**File 1:** `label_studio/tasks/api.py` — Add new endpoint (around line 900, after AnnotationAPI class)

```python
# NEW ENDPOINT at end of file:
@extend_schema(
    tags=['Tasks'],
    summary='Reject task annotation',
    description='Reviewer explicitly rejects a task, sending it back to annotator.',
    request=OpenApiTypes.NONE,
    responses={200: OpenApiResponse(description='Task rejected successfully.')},
)
class TaskRejectAPI(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk, *args, **kwargs):
        from tasks.models import TaskAssignment
        task = generics.get_object_or_404(Task, pk=pk)
        assignment = TaskAssignment.objects.filter(task=task).first()
        
        if not assignment:
            return Response({'detail': 'No task assignment found'}, status=404)
        
        if assignment.reviewer != request.user:
            raise PermissionDenied("Only assigned reviewer can reject tasks.")
        
        if assignment.status != 'pending_review':
            return Response({'detail': f'Task is in {assignment.status} state, cannot reject'}, status=400)
        
        assignment.status = 'rejected'
        assignment.save(update_fields=['status', 'updated_at'])
        
        logger.info(f"Task {task.id} rejected by reviewer {request.user.id}")
        return Response({'status': 'rejected', 'task_id': task.id})
```

**File 2:** `label_studio/tasks/urls.py` — Add route (find task URLs around line 20)

```python
# Add to urlpatterns (after other task routes):
path('api/tasks/<int:pk>/reject/', api.TaskRejectAPI.as_view(), name='task-reject'),
```

---

## Issue #4: Admin Role Can Be Assigned by Non-Superuser 🟡 MEDIUM
**Problem:** Annotator could invite someone as admin (if they had access). Should only superuser can create admins.

**Status:** ⚠️ UI prevents it, but API doesn't enforce  
**Fix Time:** 15 minutes

### Changes Required:

**File:** `label_studio/organizations/api.py` (around line 95, in OrganizationMemberListAPI.post)

```python
# BEFORE (find the POST method for creating members):
def post(self, request, *args, **kwargs):
    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    # ... rest of method

# AFTER (add check at start of post method):
def post(self, request, *args, **kwargs):
    role = request.data.get('role', 'annotator')
    
    # Only Super Admin can create Admin users
    if role == 'admin' and not request.user.is_superuser:
        raise PermissionDenied("Only Super Admin can create Admin accounts.")
    
    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    # ... rest of method
```

---

## Issue #5: No Super Admin Dashboard UI 🟡 MEDIUM
**Problem:** APIs exist but no UI. Super Admin has to call API endpoints manually.

**Status:** ❌ No UI exists  
**Fix Time:** 1-2 hours

### Quick MVP Fix:
Extend the existing organization page to show Super Admin section.

**File:** `label_studio/organizations/templates/people_list.html` (or admin section)

```html
<!-- Add after regular people list, only visible to superuser: -->
{% if user.is_superuser %}
<section id="superadmin-controls" style="margin-top: 40px; padding: 20px; background: #f5f5f5; border: 2px solid #6366F1;">
  <h2>Super Admin Controls</h2>
  
  <div id="org-list">
    <h3>All Organizations</h3>
    <table id="all-orgs-table">
      <thead>
        <tr>
          <th>Organization</th>
          <th>Owner</th>
          <th>Members</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="org-tbody"></tbody>
    </table>
  </div>
  
  <div id="maintenance-toggle" style="margin-top: 20px;">
    <h3>Maintenance Mode</h3>
    <button id="toggle-maintenance-btn">Toggle Maintenance Mode</button>
    <span id="maintenance-status">Status: <span id="maint-current">Unknown</span></span>
  </div>
</section>

<script>
// Load all organizations
fetch('/api/superadmin/organizations/')
  .then(r => r.json())
  .then(data => {
    const tbody = document.getElementById('org-tbody');
    data.forEach(org => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${org.title}</td>
        <td>${org.organization_title}</td>
        <td>${org.total_members}</td>
        <td>${org.is_suspended ? 'SUSPENDED' : 'ACTIVE'}</td>
        <td>
          <button onclick="toggleOrgSuspend(${org.organization_id})">
            ${org.is_suspended ? 'Unsuspend' : 'Suspend'}
          </button>
        </td>
      `;
    });
  });

// Toggle maintenance mode
document.getElementById('toggle-maintenance-btn').addEventListener('click', () => {
  fetch('/api/superadmin/maintenance/toggle/', {method: 'POST'})
    .then(r => r.json())
    .then(data => {
      document.getElementById('maint-current').textContent = data.maintenance_mode;
    });
});

// Helper to suspend org
function toggleOrgSuspend(orgId) {
  const action = confirm('Are you sure?') ? 'suspend' : 'unsuspend';
  fetch(`/api/superadmin/organizations/${orgId}/suspend/`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({action})
  })
  .then(r => r.json())
  .then(data => location.reload());
}
</script>
{% endif %}
```

---

## Quick Summary: What to Fix Right Now

| Issue | File | Lines | Time | Impact |
|-------|------|-------|------|--------|
| Org suspension | `organizations/api.py` | 484-492 | 10m | 🔴 Breaks feature |
| Dropdown filtering | `data_manager/actions/assign_tasks.py` | 13-18 | 20m | 🟡 User confusion |
| Reject endpoint | `tasks/api.py` | +30 lines | 30m | 🟡 Unreliable rejection |
| Admin check | `organizations/api.py` | ~95 | 15m | 🟡 Security gap |
| Super Admin UI | `organizations/templates/...` | new | 90m | 🟡 No UI access |

**Total fix time for all critical: ~2.5 hours**

After these fixes, you can run full E2E test from seeder to completion.

