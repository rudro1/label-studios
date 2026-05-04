# 🔌 EntroFix — Frontend ↔ Backend Integration Guide

> **Complete API Contract & Data Flow Documentation**  
> **For:** Frontend developers implementing EntroFix  
> **Backend:** Django 5.1 + DRF on http://localhost:8080  
> **Database:** PostgreSQL (fixensy)

---

## 📋 Table of Contents

1. [Authentication & Session Management](#authentication--session-management)
2. [API Endpoints by Feature](#api-endpoints-by-feature)
3. [Data Models & Response Formats](#data-models--response-formats)
4. [Error Handling & Status Codes](#error-handling--status-codes)
5. [State Management Patterns](#state-management-patterns)
6. [Frontend Component ↔ API Mapping](#frontend-component--api-mapping)
7. [Testing Checklist](#testing-checklist)

---

## 🔐 Authentication & Session Management

### 3.1 Session-Based Auth (Django Cookies)

**How It Works:**
```
1. Frontend: POST /user/login/ with { email, password }
2. Backend: Validates credentials → creates session
3. Backend: Returns response with Set-Cookie header (sessionid)
4. Frontend: Browser auto-stores sessionid cookie
5. Subsequent requests: Browser auto-includes sessionid
6. Backend: Middleware checks sessionid → authenticates
7. On logout: POST /user/logout/ → clears session
```

### 3.2 CSRF Protection

**What is CSRF?**
- Cross-Site Request Forgery token prevents unauthorized requests
- Required for all POST/PUT/PATCH/DELETE requests

**Frontend Implementation:**
```javascript
// On page load or login, fetch CSRF token
const getCsrfToken = async () => {
  const response = await fetch('/user/login/', { method: 'GET' });
  const html = await response.text();
  const tokenMatch = html.match(/csrfmiddlewaretoken[^>]*value="([^"]+)"/);
  return tokenMatch ? tokenMatch[1] : null;
};

// Store token in Zustand or context
// Include in all POST/PUT/PATCH/DELETE requests

const response = await fetch('/api/tasks/1/annotation/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': csrfToken, // ← Include this header
  },
  body: JSON.stringify({ /* data */ }),
});
```

**Alternative: Meta Tag (if backend includes it)**
```html
<!-- In response HTML -->
<meta name="csrf-token" content="abc123xyz">

<!-- In JS -->
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
```

### 3.3 Current User Info

**Endpoint:** `GET /api/me/`

**Response (200):**
```json
{
  "id": 1,
  "email": "admin@fixensy.com",
  "first_name": "Admin",
  "last_name": "User",
  "is_superuser": false,
  "is_staff": false,
  "active_organization": {
    "id": 1,
    "name": "EntroFix Org",
    "created_by": 1
  },
  "organization_member": {
    "role": "admin",
    "is_owner": true,
    "is_admin": true
  }
}
```

**Frontend Usage:**
```javascript
// On app initialization, fetch current user
const useAuthStore = create((set) => ({
  user: null,
  role: null,
  isAuthenticated: false,
  
  initAuth: async () => {
    try {
      const response = await fetch('/api/me/');
      if (response.ok) {
        const user = await response.json();
        set({ user, isAuthenticated: true, role: user.organization_member?.role });
      } else {
        set({ isAuthenticated: false }); // Not logged in
      }
    } catch (error) {
      console.error('Auth init failed:', error);
    }
  },
}));
```

### 3.4 Login Flow

**Endpoint:** `POST /user/login/`

**Request:**
```json
{
  "email": "admin@fixensy.com",
  "password": "fixensy123"
}
```

**Response (200):**
```json
{
  "id": 1,
  "email": "admin@fixensy.com",
  "first_name": "Admin",
  "last_name": "User",
  "active_organization": { /* ... */ }
}
```

**Response (401):**
```json
{
  "error": "Invalid email or password",
  "status": "error"
}
```

**Frontend Implementation:**
```javascript
const handleLogin = async (email, password) => {
  try {
    const response = await fetch('/user/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const user = await response.json();
      authStore.setUser(user);
      
      // Redirect based on role
      const roleRoutes = {
        admin: '/dashboard/admin',
        annotator: '/dashboard/annotator',
        reviewer: '/dashboard/reviewer',
      };
      window.location.href = roleRoutes[user.organization_member.role] || '/dashboard';
    } else {
      const error = await response.json();
      showToast(error.error || 'Login failed', 'error');
    }
  } catch (error) {
    showToast('Network error', 'error');
  }
};
```

### 3.5 Logout Flow

**Endpoint:** `POST /user/logout/`

**Request:** (no body needed)

**Response (200):**
```json
{
  "message": "Logged out successfully",
  "status": "success"
}
```

**Frontend Implementation:**
```javascript
const handleLogout = async () => {
  try {
    await fetch('/user/logout/', { method: 'POST' });
    authStore.clear(); // Clear Zustand store
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout error:', error);
    window.location.href = '/login'; // Force redirect anyway
  }
};
```

---

## 📡 API Endpoints by Feature

### Feature 1: Projects Management

#### 1.1 List Projects

**Endpoint:** `GET /api/projects/`

**Query Parameters:**
```
?page=1
?limit=20
?search=audio
?ordering=-created_at
```

**Response (200):**
```json
{
  "count": 45,
  "next": "http://localhost:8080/api/projects?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Audio Labeling 2025",
      "description": "Q1 2025 audio annotation campaign",
      "created_at": "2025-04-15T10:30:00Z",
      "updated_at": "2025-05-02T14:20:00Z",
      "label_config": "...",
      "task_count": 150,
      "completed_tasks": 45,
      "organization": 1
    },
    // ... more projects
  ]
}
```

**Frontend Component:**
```javascript
// useProjectStore.js (Zustand)
const useProjectStore = create((set) => ({
  projects: [],
  totalCount: 0,
  loading: false,
  
  fetchProjects: async (page = 1) => {
    set({ loading: true });
    try {
      const response = await fetch(`/api/projects?page=${page}&limit=20`);
      const data = await response.json();
      set({ projects: data.results, totalCount: data.count });
    } finally {
      set({ loading: false });
    }
  },
}));

// ProjectList.tsx
export function ProjectList() {
  const { projects, loading, fetchProjects } = useProjectStore();
  
  useEffect(() => {
    fetchProjects();
  }, []);
  
  if (loading) return <Spinner />;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
```

#### 1.2 Create Project

**Endpoint:** `POST /api/projects/`

**Request:**
```json
{
  "title": "New Audio Project",
  "description": "Description here",
  "label_config": "...",  // YAML template config
  "organization": 1
}
```

**Response (201):**
```json
{
  "id": 46,
  "title": "New Audio Project",
  "created_at": "2025-05-02T14:30:00Z",
  // ... full project object
}
```

**Frontend:**
```javascript
const createProject = async (projectData) => {
  const response = await fetch('/api/projects/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify(projectData),
  });
  
  if (response.ok) {
    const newProject = await response.json();
    projectStore.addProject(newProject);
    showToast('Project created', 'success');
    return newProject;
  } else {
    const error = await response.json();
    showToast(error.error || 'Failed to create project', 'error');
  }
};
```

#### 1.3 Get Project Details

**Endpoint:** `GET /api/projects/<id>/`

**Response (200):**
```json
{
  "id": 1,
  "title": "Audio Labeling 2025",
  "description": "...",
  "label_config": "...",
  "created_at": "2025-04-15T10:30:00Z",
  "updated_at": "2025-05-02T14:20:00Z",
  "task_count": 150,
  "completed_tasks": 45,
  "organization": {
    "id": 1,
    "name": "EntroFix Org"
  }
}
```

---

### Feature 2: Tasks Management

#### 2.1 List Tasks (with RBAC filtering)

**Endpoint:** `GET /api/dm/tasks?project=<id>`

**Query Parameters:**
```
?project=1           # Required: project ID
?status=pending_annotation,rejected  # Filter by status
?assigned_to=2       # Filter by user
?page=1
?limit=20
?search=task
```

**Status Values:**
- `pending_annotation` - Waiting for annotator
- `pending_review` - Waiting for reviewer
- `completed` - Approved by reviewer
- `rejected` - Sent back by reviewer

**Response (200):**
```json
{
  "count": 100,
  "results": [
    {
      "id": 1,
      "title": "Audio_Sample_01.wav",
      "data": {
        "audio": "https://example.com/audio.wav",
        "filename": "Audio_Sample_01",
        "clean_name": "Audio_Sample_01",
        "source_url": "https://example.com/audio.wav"
      },
      "project": 1,
      "task_assignments": [
        {
          "id": 101,
          "annotator": {
            "id": 2,
            "email": "annotator@fixensy.com",
            "first_name": "John"
          },
          "reviewer": {
            "id": 3,
            "email": "reviewer@fixensy.com",
            "first_name": "Jane"
          },
          "status": "pending_annotation",
          "created_at": "2025-05-01T10:00:00Z",
          "assigned_at": "2025-05-01T10:00:00Z",
          "started_at": null,
          "completed_at": null,
          "rejection_reason": null
        }
      ]
    },
    // ... more tasks
  ]
}
```

**Frontend:**
```javascript
const useTaskStore = create((set) => ({
  tasks: [],
  
  fetchTasks: async (projectId, status = null) => {
    let url = `/api/dm/tasks?project=${projectId}`;
    if (status) url += `&status=${status}`;
    
    const response = await fetch(url);
    const data = await response.json();
    set({ tasks: data.results });
  },
}));

// TaskDashboard.tsx
export function TaskDashboard() {
  const { tasks, fetchTasks } = useTaskStore();
  const { user } = useAuthStore();
  const projectId = useParams().projectId;
  
  useEffect(() => {
    // Annotators see pending_annotation + rejected
    if (user.role === 'annotator') {
      fetchTasks(projectId, 'pending_annotation,rejected');
    }
    // Reviewers see pending_review
    if (user.role === 'reviewer') {
      fetchTasks(projectId, 'pending_review');
    }
    // Admins see all
    if (user.role === 'admin') {
      fetchTasks(projectId);
    }
  }, [projectId, user.role]);
  
  return <TaskList tasks={tasks} />;
}
```

#### 2.2 Get Task Details

**Endpoint:** `GET /api/tasks/<id>/`

**Response (200):**
```json
{
  "id": 1,
  "title": "Audio_Sample_01.wav",
  "data": {
    "audio": "https://example.com/audio.wav",
    "filename": "Audio_Sample_01",
    "clean_name": "Audio_Sample_01",
    "source_url": "https://example.com/audio.wav"
  },
  "project": 1,
  "annotations": [
    {
      "id": 201,
      "completed_by": 2,
      "result": [
        {
          "value": {
            "start": 0.5,
            "end": 1.5,
            "labels": ["speech"],
            "text": "Hello world"
          },
          "from_name": "segment",
          "to_name": "audio",
          "type": "textarea"
        }
      ],
      "created_at": "2025-05-01T11:30:00Z"
    }
  ],
  "task_assignments": [
    {
      "id": 101,
      "annotator": 2,
      "reviewer": 3,
      "status": "pending_annotation",
      "rejection_reason": null
    }
  ]
}
```

---

### Feature 3: Annotation Workflow

#### 3.1 Submit Annotation

**Endpoint:** `POST /api/tasks/<id>/annotation/`

**Request:**
```json
{
  "result": [
    {
      "value": {
        "start": 0.5,
        "end": 1.5,
        "labels": ["speech"],
        "text": "Hello world"
      },
      "from_name": "segment",
      "to_name": "audio",
      "type": "textarea"
    },
    {
      "value": {
        "start": 2.0,
        "end": 3.0,
        "labels": ["silence"],
        "text": ""
      },
      "from_name": "segment",
      "to_name": "audio",
      "type": "textarea"
    }
  ]
}
```

**Response (201):**
```json
{
  "id": 201,
  "task": 1,
  "completed_by": 2,
  "result": [ /* echoes request */ ],
  "created_at": "2025-05-01T11:30:00Z"
}
```

**Response (400) - Validation Error:**
```json
{
  "error": "Missing required field",
  "details": {
    "result": ["At least one segment required"]
  }
}
```

**Frontend:**
```javascript
// AnnotationEditor.tsx
const submitAnnotation = async (segments) => {
  // Validate required fields
  if (!segments || segments.length === 0) {
    showToast('Please add at least one segment', 'error');
    return;
  }
  
  const response = await fetch(`/api/tasks/${taskId}/annotation/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify({ result: segments }),
  });
  
  if (response.ok) {
    showToast('Annotation submitted for review', 'success');
    navigate('/dashboard/annotator');
  } else {
    const error = await response.json();
    showToast(error.error || 'Failed to submit', 'error');
  }
};
```

#### 3.2 Save Draft (not implemented yet, optional)

For now, save drafts only in **localStorage**:
```javascript
const saveDraft = (taskId, segments) => {
  localStorage.setItem(`draft_task_${taskId}`, JSON.stringify(segments));
  showToast('Draft saved', 'info');
};

const loadDraft = (taskId) => {
  return JSON.parse(localStorage.getItem(`draft_task_${taskId}`));
};
```

---

### Feature 4: Review Workflow

#### 4.1 Approve Task

**Endpoint:** `POST /api/tasks/<id>/approve/`

**Request:** (no body)

**Response (200):**
```json
{
  "message": "Task approved",
  "status": "completed",
  "task_assignment_id": 101
}
```

**Frontend:**
```javascript
const approveTask = async (taskId) => {
  const response = await fetch(`/api/tasks/${taskId}/approve/`, {
    method: 'POST',
    headers: { 'X-CSRFToken': csrfToken },
  });
  
  if (response.ok) {
    showToast('Task approved', 'success');
    navigate('/dashboard/reviewer');
  }
};
```

#### 4.2 Reject Task

**Endpoint:** `POST /api/tasks/<id>/reject/`

**Request:**
```json
{
  "reason": "Audio quality is too poor. Background noise overwhelms the speech."
}
```

**Response (200):**
```json
{
  "message": "Task rejected",
  "status": "rejected",
  "rejection_reason": "Audio quality is too poor..."
}
```

**Response (400) - Missing/Invalid Reason:**
```json
{
  "error": "Reason is required and must be <= 2000 characters",
  "details": { "reason": ["..."] }
}
```

**Frontend:**
```javascript
// RejectModal.tsx
export function RejectModal({ taskId, onClose }) {
  const [reason, setReason] = useState('');
  
  const handleReject = async () => {
    if (!reason.trim()) {
      showToast('Please provide a reason', 'error');
      return;
    }
    
    if (reason.length > 2000) {
      showToast('Reason is too long (max 2000 chars)', 'error');
      return;
    }
    
    const response = await fetch(`/api/tasks/${taskId}/reject/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify({ reason }),
    });
    
    if (response.ok) {
      showToast('Task rejected', 'success');
      onClose();
      navigate('/dashboard/reviewer');
    }
  };
  
  return (
    <Modal open onClose={onClose}>
      <h2>Reject Task</h2>
      <TextArea
        label="Reason (required)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Explain why this task needs rework..."
        rows={5}
      />
      <Button onClick={handleReject} variant="danger">Reject</Button>
    </Modal>
  );
}
```

---

### Feature 5: Task Assignment (Admin Only)

#### 5.1 Get Available Annotators

**Endpoint:** `GET /api/users?role=annotator&organization=<org_id>`

**Response (200):**
```json
{
  "results": [
    {
      "id": 2,
      "email": "annotator1@fixensy.com",
      "first_name": "Alice",
      "last_name": "Annotator"
    },
    {
      "id": 5,
      "email": "annotator2@fixensy.com",
      "first_name": "Bob",
      "last_name": "Annotator"
    }
  ]
}
```

#### 5.2 Get Available Reviewers

**Endpoint:** `GET /api/users?role=reviewer&organization=<org_id>`

**Response:** (same structure as annotators)

#### 5.3 Assign Tasks

**Endpoint:** `POST /api/dm/tasks/assign/`

**Request:**
```json
{
  "task_ids": [1, 2, 3],
  "annotator_id": 2,
  "reviewer_id": 3
}
```

**Response (200):**
```json
{
  "message": "3 tasks assigned successfully",
  "assigned_count": 3,
  "task_assignments": [
    {
      "id": 101,
      "task": 1,
      "annotator": 2,
      "reviewer": 3,
      "status": "pending_annotation",
      "assigned_at": "2025-05-02T14:30:00Z"
    },
    // ... more
  ]
}
```

**Frontend:**
```javascript
// AssignTasksModal.tsx
export function AssignTasksModal({ selectedTaskIds, onClose, projectId }) {
  const [annotator, setAnnotator] = useState(null);
  const [reviewer, setReviewer] = useState(null);
  const [annotators, setAnnotators] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const { user } = useAuthStore();
  
  useEffect(() => {
    // Fetch available users
    fetch(`/api/users?role=annotator&organization=${user.active_organization.id}`)
      .then(r => r.json())
      .then(data => setAnnotators(data.results));
    
    fetch(`/api/users?role=reviewer&organization=${user.active_organization.id}`)
      .then(r => r.json())
      .then(data => setReviewers(data.results));
  }, []);
  
  const handleAssign = async () => {
    if (!annotator) {
      showToast('Select an annotator', 'error');
      return;
    }
    
    const response = await fetch('/api/dm/tasks/assign/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify({
        task_ids: selectedTaskIds,
        annotator_id: annotator.id,
        reviewer_id: reviewer?.id || null,
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      showToast(`${result.assigned_count} tasks assigned`, 'success');
      onClose();
    }
  };
  
  return (
    <Modal open onClose={onClose}>
      <h2>Assign {selectedTaskIds.length} Tasks</h2>
      
      <Select
        label="Annotator *"
        options={annotators.map(u => ({ label: u.first_name + ' ' + u.last_name, value: u.id }))}
        value={annotator?.id}
        onChange={(id) => setAnnotator(annotators.find(a => a.id === id))}
        required
      />
      
      <Select
        label="Reviewer (optional)"
        options={[{label: 'None', value: null}, ...reviewers.map(u => ({ label: u.first_name + ' ' + u.last_name, value: u.id }))]}
        value={reviewer?.id || null}
        onChange={(id) => setReviewer(id ? reviewers.find(r => r.id === id) : null)}
      />
      
      <Button onClick={handleAssign} variant="primary">Assign Tasks</Button>
    </Modal>
  );
}
```

---

### Feature 6: Organization Management

#### 6.1 Get Organization Details

**Endpoint:** `GET /api/organizations/<id>/`

**Response (200):**
```json
{
  "id": 1,
  "name": "EntroFix Org",
  "description": "Audio annotation team",
  "website": "https://entrofix.com",
  "created_by": 1,
  "created_at": "2025-01-15T10:00:00Z",
  "is_suspended": false,
  "user_count": 15,
  "project_count": 5
}
```

#### 6.2 Update Organization

**Endpoint:** `PATCH /api/organizations/<id>/`

**Request:**
```json
{
  "name": "Updated Org Name",
  "description": "New description"
}
```

#### 6.3 List Members

**Endpoint:** `GET /api/organizations/<id>/memberships/`

**Response (200):**
```json
{
  "results": [
    {
      "id": 101,
      "user": {
        "id": 1,
        "email": "admin@fixensy.com",
        "first_name": "Admin",
        "last_name": "User"
      },
      "organization": 1,
      "role": "admin",
      "is_owner": true,
      "is_suspended": false,
      "created_at": "2025-01-15T10:00:00Z"
    },
    {
      "id": 102,
      "user": {
        "id": 2,
        "email": "annotator@fixensy.com",
        "first_name": "John",
        "last_name": "Annotator"
      },
      "organization": 1,
      "role": "annotator",
      "is_owner": false,
      "is_suspended": false,
      "created_at": "2025-02-20T14:30:00Z"
    }
  ]
}
```

#### 6.4 Add Member (Create Invite)

**Endpoint:** `POST /api/organizations/<id>/memberships/invite/`

**Request:**
```json
{
  "email": "newuser@example.com",
  "role": "annotator"
}
```

**Response (201):**
```json
{
  "id": 103,
  "organization": 1,
  "role": "annotator",
  "token": "abc123def456...",
  "invite_url": "http://localhost:8080/user/signup?token=abc123def456&role=annotator",
  "created_at": "2025-05-02T14:30:00Z"
}
```

**Frontend:**
```javascript
const inviteMember = async (email, role) => {
  const response = await fetch(`/api/organizations/${orgId}/memberships/invite/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify({ email, role }),
  });
  
  if (response.ok) {
    const invite = await response.json();
    // Copy invite_url to clipboard or send via email
    copyToClipboard(invite.invite_url);
    showToast('Invite link copied to clipboard', 'success');
  }
};
```

#### 6.5 Suspend/Unsuspend Member

**Endpoint:** `POST /api/organizations/<id>/memberships/<user_id>/suspend/`

**Response (200):**
```json
{
  "message": "Member suspended",
  "is_suspended": true
}
```

---

### Feature 7: Super Admin APIs

#### 7.1 List Admins

**Endpoint:** `GET /api/super-admin/admins/`

**Response (200):**
```json
{
  "results": [
    {
      "id": 1,
      "email": "admin1@fixensy.com",
      "organization": {
        "id": 1,
        "name": "Org 1"
      },
      "storage_bytes": 5368709120,  // 5 GB
      "user_count": 12,
      "project_count": 3,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

#### 7.2 Suspend Admin

**Endpoint:** `POST /api/super-admin/admins/<admin_id>/suspend/`

**Response (200):**
```json
{
  "message": "Admin organization suspended",
  "is_suspended": true
}
```

#### 7.3 Delete Admin (Cascade Delete)

**Endpoint:** `DELETE /api/super-admin/admins/<admin_id>/`

**Response (204):** (No content)

**Effect:** Org + all members + projects + tasks deleted

#### 7.4 Maintenance Mode

**Endpoint GET:** `GET /api/super-admin/maintenance/`

**Response (200):**
```json
{
  "enabled": false
}
```

**Endpoint POST:** `POST /api/super-admin/maintenance/`

**Request:**
```json
{
  "enabled": true
}
```

**Response (200):**
```json
{
  "enabled": true,
  "message": "Maintenance mode enabled"
}
```

---

## 💾 Data Models & Response Formats

### User Model
```typescript
interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_superuser: boolean;
  is_staff: boolean;
  created_at: string;
  active_organization: Organization;
  organization_member: OrganizationMember;
}
```

### Organization Model
```typescript
interface Organization {
  id: number;
  name: string;
  description: string;
  website?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  is_suspended: boolean;
  user_count: number;
  project_count: number;
}
```

### OrganizationMember Model
```typescript
interface OrganizationMember {
  id: number;
  user: User;
  organization: Organization;
  role: 'admin' | 'annotator' | 'reviewer';
  is_owner: boolean;
  is_admin: boolean;
  is_suspended: boolean;
  created_at: string;
}
```

### Project Model
```typescript
interface Project {
  id: number;
  title: string;
  description: string;
  label_config: string; // YAML
  created_at: string;
  updated_at: string;
  task_count: number;
  completed_tasks: number;
  organization: number | Organization;
}
```

### Task Model
```typescript
interface Task {
  id: number;
  title: string;
  data: {
    audio: string;
    filename: string;
    clean_name: string;
    source_url: string;
  };
  project: number;
  annotations: Annotation[];
  task_assignments: TaskAssignment[];
  created_at: string;
}
```

### TaskAssignment Model
```typescript
interface TaskAssignment {
  id: number;
  task: number;
  annotator: User;
  reviewer?: User;
  status: 'pending_annotation' | 'pending_review' | 'completed' | 'rejected';
  assigned_at: string;
  started_at?: string;
  completed_at?: string;
  rejection_reason?: string;
  created_at: string;
}
```

### Annotation Model
```typescript
interface Annotation {
  id: number;
  task: number;
  completed_by: number;
  result: AnnotationSegment[];
  created_at: string;
}

interface AnnotationSegment {
  value: {
    start: number;
    end: number;
    labels: string[];
    text: string;
  };
  from_name: string;
  to_name: string;
  type: string;
}
```

---

## ⚠️ Error Handling & Status Codes

### HTTP Status Codes

| Status | Meaning | Frontend Action |
|--------|---------|---|
| 200 | OK | Display success toast, update state |
| 201 | Created | Same as 200 |
| 204 | No Content | Silent success (no response body) |
| 400 | Bad Request | Show validation errors from response.details |
| 401 | Unauthorized | Redirect to /login, clear auth state |
| 403 | Forbidden | Show "Access Denied" toast, block action |
| 404 | Not Found | Show "Resource not found" toast |
| 500 | Server Error | Show "Server error" toast, log to console |

### Error Response Format

**Standard Error (4xx):**
```json
{
  "error": "Field validation failed",
  "details": {
    "email": "Invalid email format",
    "password": "Too short"
  },
  "status": "error",
  "code": "VALIDATION_ERROR"
}
```

**Permission Denied:**
```json
{
  "error": "Only Super Admin can assign admin role",
  "status": "error",
  "code": "PERMISSION_DENIED"
}
```

**Maintenance Mode (503):**
```html
<!-- Returns HTML page -->
503 Service Unavailable
The server is currently in maintenance mode.
```

### Frontend Error Handling Pattern

```javascript
const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(endpoint, options);
    
    if (!response.ok) {
      const errorData = await response.json();
      
      switch (response.status) {
        case 401:
          authStore.logout();
          window.location.href = '/login';
          return;
        
        case 403:
          showToast(errorData.error || 'Access Denied', 'error');
          return;
        
        case 400:
          // Show field errors
          Object.entries(errorData.details || {}).forEach(([field, messages]) => {
            showToast(`${field}: ${messages[0]}`, 'error');
          });
          return;
        
        case 503:
          showToast('Server is in maintenance mode', 'warning');
          return;
        
        default:
          showToast(errorData.error || 'An error occurred', 'error');
      }
    }
    
    return await response.json();
  } catch (error) {
    showToast('Network error: ' + error.message, 'error');
    console.error('API call failed:', error);
  }
};
```

---

## 🎛️ State Management Patterns

### Zustand Store Structure

```javascript
// stores/authStore.js
import create from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  role: null,
  loading: false,
  
  // Actions
  login: async (email, password) => {
    set({ loading: true });
    try {
      const response = await fetch('/user/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (response.ok) {
        const user = await response.json();
        set({
          user,
          isAuthenticated: true,
          role: user.organization_member?.role,
        });
      }
    } finally {
      set({ loading: false });
    }
  },
  
  logout: async () => {
    await fetch('/user/logout/', { method: 'POST' });
    set({ user: null, isAuthenticated: false, role: null });
  },
  
  setUser: (user) => set({ user, isAuthenticated: true }),
  clear: () => set({ user: null, isAuthenticated: false, role: null }),
}));

// stores/projectStore.js
export const useProjectStore = create((set) => ({
  projects: [],
  currentProject: null,
  loading: false,
  
  fetchProjects: async () => { /* ... */ },
  fetchProjectById: async (id) => { /* ... */ },
}));

// stores/taskStore.js
export const useTaskStore = create((set) => ({
  tasks: [],
  currentTask: null,
  
  fetchTasks: async (projectId, filters = {}) => { /* ... */ },
  fetchTaskById: async (id) => { /* ... */ },
}));
```

### React Query Alternative

```javascript
// hooks/useProjects.js
import { useQuery } from '@tanstack/react-query';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects/');
      return response.json();
    },
  });
}

export function useProject(id) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}/`);
      return response.json();
    },
  });
}

// In component
export function ProjectList() {
  const { data, isLoading, error } = useProjects();
  
  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  
  return <div>{/* render data */}</div>;
}
```

---

## 🔗 Frontend Component ↔ API Mapping

| Page | Component | API Calls | Methods |
|------|-----------|-----------|---------|
| **Login** | `<LoginForm>` | `POST /user/login/` | Form submit |
| **Org Settings** | `<OrgSettingsPage>` | `GET /api/organizations/<id>/`, `PATCH /api/organizations/<id>/` | Load, Save |
| **Members** | `<MembersTable>` | `GET /api/organizations/<id>/memberships/`, `POST .../invite/`, `POST .../suspend/`, `DELETE ...` | List, Invite, Suspend, Remove |
| **Projects** | `<ProjectList>` | `GET /api/projects/`, `POST /api/projects/` | Load, Create |
| **Project Details** | `<ProjectPage>` | `GET /api/projects/<id>/`, `GET /api/dm/tasks?project=<id>` | Load, List tasks |
| **Task List** | `<TaskDashboard>` | `GET /api/dm/tasks?project=<id>` | Load (filtered by role) |
| **Annotation Editor** | `<AnnotationEditor>` | `POST /api/tasks/<id>/annotation/` | Submit |
| **Review Editor** | `<ReviewEditor>` | `POST /api/tasks/<id>/approve/`, `POST /api/tasks/<id>/reject/` | Approve, Reject |
| **Assign Modal** | `<AssignTasksModal>` | `GET /api/users?role=annotator`, `GET /api/users?role=reviewer`, `POST /api/dm/tasks/assign/` | Load users, Assign |
| **Super Admin** | `<SuperAdminDash>` | `GET /api/super-admin/admins/`, `POST .../suspend/`, `DELETE ...`, `GET /api/super-admin/maintenance/`, `POST .../maintenance/` | List, Manage, Toggle mode |

---

## ✅ Testing Checklist

### Authentication Tests
- [ ] Login with valid credentials → redirects to dashboard
- [ ] Login with invalid credentials → shows error toast
- [ ] Logout → clears auth state + redirects to login
- [ ] Protected routes → redirect to login if not authenticated
- [ ] Role-based routes → annotators can't access /organization

### API Integration Tests
- [ ] Projects list loads correctly
- [ ] Tasks filter by role (annotators see only pending_annotation + rejected)
- [ ] Annotation submission validates required fields
- [ ] Rejection reason is required + max 2000 chars
- [ ] Task assignment updates task list
- [ ] Approve/Reject buttons trigger correct endpoints
- [ ] Maintenance mode shows 503 to all except superuser

### UI/UX Tests
- [ ] Responsive design on mobile/tablet/desktop
- [ ] Toast notifications appear for all user actions
- [ ] Loading spinners during API calls
- [ ] Keyboard shortcuts work (Space, S, D)
- [ ] Unsaved changes warning on annotation editor
- [ ] CSRF tokens properly included in POST requests

### Data Display Tests
- [ ] Task status badges show correct colors
- [ ] Rejection reasons display in annotator queue
- [ ] Organization members display correct roles
- [ ] Storage usage bar chart displays correctly
- [ ] Progress bars show completion percentage

---

**Document Version:** 1.0  
**Last Updated:** 2 May 2026  
**Status:** Ready for Frontend Implementation

---
