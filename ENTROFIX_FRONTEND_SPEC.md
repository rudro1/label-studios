# 🎨 EntroFix — Complete Frontend Architecture & Design System

> **Project:** EntroFix (Audio Annotation Platform)  
> **Frontend Stack:** React 18 + TypeScript + TailwindCSS + Zustand  
> **Backend:** Django 5.1 + DRF (PostgreSQL)  
> **Target:** Responsive, Professional, RBAC-driven UI  
> **Version:** 1.0 (Phase 1)

---

## 📋 Table of Contents

1. [Design System](#design-system)
2. [Page Structure by Role](#page-structure-by-role)
3. [Component Inventory](#component-inventory)
4. [Data Flow & API Integration](#data-flow--api-integration)
5. [Page Wireframes & Flows](#page-wireframes--flows)
6. [Responsive Breakpoints](#responsive-breakpoints)
7. [Implementation Checklist](#implementation-checklist)

---

## 🎨 Design System

### 1.1 Color Palette

**Primary Colors (Brand Identity)**
```
Primary (Indigo): #6366F1 - Main CTA, active states, highlights
Dark Indigo: #4F46E5 - Hover state, darker variant
Light Indigo: #E0E7FF - Background, subtle highlights

Secondary (Green): #10B981 - Success, approve, completed status
Success Light: #D1FAE5 - Success background
Success Dark: #059669 - Success hover

Danger (Red): #EF4444 - Reject, delete, error states
Danger Light: #FEE2E2 - Danger background
Danger Dark: #DC2626 - Danger hover

Warning (Amber): #F59E0B - Pending, assignment, needs attention
Warning Light: #FEF3C7 - Warning background
Warning Dark: #D97706 - Warning hover

Neutral (Grayscale):
  50:  #F9FAFB - Very light background
  100: #F3F4F6 - Light background
  200: #E5E7EB - Border
  300: #D1D5DB - Secondary text
  400: #9CA3AF - Placeholder text
  500: #6B7280 - Tertiary text
  600: #4B5563 - Secondary heading
  700: #374151 - Main text
  800: #1F2937 - Dark text
  900: #111827 - Darkest text

Sidebar: #0F172A (Dark blue-slate)
Sidebar Text: #F1F5F9
Sidebar Accent: #6366F1

Overlay: rgba(0,0,0,0.5)
Shadow: rgba(0,0,0,0.1)
```

**Status-specific Colors**
```
Pending Annotation: #F59E0B (amber)
Pending Review: #3B82F6 (blue)
Completed: #10B981 (green)
Rejected: #EF4444 (red)
Suspended: #6B7280 (gray)
Assigned: #8B5CF6 (purple)
```

### 1.2 Typography

**Font Stack:** Inter, system-ui, -apple-system, sans-serif

| Usage | Size | Weight | Line Height | Letter Spacing |
|-------|------|--------|-------------|---|
| Page Title (H1) | 32px | 700 | 1.2 | -0.02em |
| Section Title (H2) | 24px | 700 | 1.3 | -0.01em |
| Subsection (H3) | 18px | 600 | 1.4 | 0 |
| Card Title (H4) | 16px | 600 | 1.5 | 0 |
| Body Large | 16px | 400 | 1.6 | 0 |
| Body (default) | 14px | 400 | 1.5 | 0 |
| Label / Caption | 12px | 500 | 1.4 | 0.02em |
| Code / Mono | 13px | 400 | 1.5 | 0 |

### 1.3 Spacing Scale

```
xs:  2px
sm:  4px
md:  8px
lg:  16px
xl:  24px
2xl: 32px
3xl: 48px
4xl: 64px
```

### 1.4 Component Borders & Shadows

**Border Radius**
```
sm: 4px    (inputs, tags)
md: 8px    (cards, modals)
lg: 12px   (major components)
full: 9999px (pills, avatars)
```

**Shadows**
```
sm:   0 1px 2px rgba(0,0,0,0.05)
md:   0 4px 6px rgba(0,0,0,0.1)
lg:   0 10px 15px rgba(0,0,0,0.15)
xl:   0 20px 25px rgba(0,0,0,0.2)
2xl:  0 25px 50px rgba(0,0,0,0.25)
```

### 1.5 Animations & Transitions

**Duration**
```
fast:   150ms
normal: 300ms
slow:   500ms
```

**Easing**
```
in:       cubic-bezier(0.4, 0, 1, 1)
out:      cubic-bezier(0, 0, 0.2, 1)
in-out:   cubic-bezier(0.4, 0, 0.2, 1)
```

---

## 📄 Page Structure by Role

### 2.1 Universal Pages (All Roles)

#### **Page: Login** (`/login`)
- Email + Password form
- "Forgot Password" link
- Social login (optional Phase 2)
- Remember me checkbox
- Error handling with toasts
- Responsive: Full width on mobile, centered card on desktop

#### **Page: Forgot Password** (`/forgot-password`)
- Email input
- Reset link sent confirmation
- Resend option with cooldown

#### **Page: Reset Password** (`/reset-password?token=xxx`)
- New password + confirm password
- Password strength indicator
- Success redirect to login

#### **Page: Profile Settings** (`/profile`)
- User name + email (display only)
- Password change form
- Timezone preference
- Email notification preferences
- Logout button
- Delete account (with 2-step confirmation)

---

### 2.2 Super Admin Pages

#### **Dashboard: Super Admin Control Panel** (`/dashboard/super-admin`)
```
Layout:
┌─────────────────────────────────────┐
│  Super Admin Dashboard              │
├─────────────────────────────────────┤
│                                     │
│  [KPI Cards]                        │
│  ├─ Total Admins                    │
│  ├─ Total Users                     │
│  ├─ Total Storage Used              │
│  └─ System Health                   │
│                                     │
│  [Admin Management Table]           │
│  ├─ Admin Name | Email | Org       │
│  ├─ Users | Storage (bar) | Status │
│  └─ Actions: View | Suspend | Delete│
│                                     │
│  [Maintenance Mode Toggle]          │
│  ├─ Toggle switch (enabled/disabled)│
│  └─ Status indicator                │
└─────────────────────────────────────┘

Key Components:
- KPI Cards (4-column grid, 1-2 col mobile)
- Data Table (sortable, filterable by status)
- Storage bar chart (per admin)
- Modal: Confirm suspend/delete with reason
- Toast: Operation success/failure
```

**API Endpoints Used:**
- `GET /api/super-admin/admins/` → list with storage
- `POST /api/super-admin/admins/<id>/suspend/` → toggle suspension
- `DELETE /api/super-admin/admins/<id>/` → delete + cascade
- `GET /api/super-admin/maintenance/` → check mode status
- `POST /api/super-admin/maintenance/` → toggle mode

---

### 2.3 Admin Pages

#### **Dashboard: Admin Project Overview** (`/dashboard/admin`)
```
Layout:
┌─────────────────────────────────────┐
│  Projects & Tasks                   │
├─────────────────────────────────────┤
│                                     │
│  [Quick Stats Cards]                │
│  ├─ Active Projects | Total Tasks   │
│  ├─ Pending Review | Completed     │
│  └─ Team Members                    │
│                                     │
│  [Projects List - Grid/Table View]  │
│  ├─ Project Name | Tasks | Status  │
│  ├─ Owner | Created Date | Actions │
│  └─ [ New Project ] [ Import ]      │
│                                     │
│  [Live Tracking Table]              │
│  ├─ Task | Assigned To | Status    │
│  ├─ Started | Elapsed Time | Actions│
│  └─ [ Assign ] [ Release ] [ Export]│
│                                     │
└─────────────────────────────────────┘

Key Features:
- Project grid (3 cols desktop, 1 mobile) with cover images
- Quick filters: All / Active / Archived
- Live task status with elapsed time counter
- Bulk actions: Select tasks → Assign / Release
- Action buttons: Create Project, Import Data
```

**API Endpoints Used:**
- `GET /api/projects/` → list user's projects
- `GET /api/dm/tasks?project=<id>` → task list with status
- `POST /api/projects/<id>/import/urls/` → URL import
- `POST /api/tasks/<id>/assign/` → assign task
- `POST /api/tasks/<id>/release/` → release task
- `GET /api/projects/<id>/tasks/<tid>/export/` → export single task

---

#### **Page: Project Details & Task Management** (`/projects/<id>`)
```
Layout:
┌─────────────────────────────────────┐
│  Project: Audio Labeling 2025       │
├─────────────────────────────────────┤
│                                     │
│  [Project Info Tabs]                │
│  ├─ Overview | Tasks | Team | Settings│
│                                     │
│  [Overview Tab]                     │
│  ├─ Description, created date       │
│  ├─ Progress bar (% complete)       │
│  └─ [ Edit ] [ Delete ] [ Export ]  │
│                                     │
│  [Tasks Tab]                        │
│  ├─ Data Table:                     │
│  │  - Task # | Name | Status        │
│  │  - Assigned To | Elapsed | Actions│
│  ├─ Filters: Status, assigned user  │
│  ├─ Bulk select + Actions           │
│  └─ [ Assign ] [ Release ] [ Export]│
│                                     │
│  [Team Tab]                         │
│  ├─ Annotators assigned to project  │
│  ├─ Reviewers assigned to project   │
│  └─ [ Add Members ]                 │
│                                     │
└─────────────────────────────────────┘
```

---

#### **Page: Organization Settings** (`/organization`)
```
Layout:
┌─────────────────────────────────────┐
│  Organization Settings              │
├─────────────────────────────────────┤
│                                     │
│  [Settings Tabs]                    │
│  ├─ General | Members | Roles       │
│                                     │
│  [General Tab]                      │
│  ├─ Org name (editable)             │
│  ├─ Description (editable)          │
│  ├─ Website (optional, editable)    │
│  └─ [ Save ] [ Delete Org ]         │
│                                     │
│  [Members Tab]                      │
│  ├─ Data Table:                     │
│  │  - Name | Email | Role | Status  │
│  │  - Joined Date | Actions         │
│  ├─ Filters: Role, status           │
│  ├─ [ Add Member ]                  │
│  └─ Action dropdowns:               │
│     • Change Role                   │
│     • Suspend                       │
│     • Remove                        │
│                                     │
│  [Roles Tab]                        │
│  ├─ Display available roles         │
│  ├─ Permissions per role (readonly) │
│  └─ [ Request Custom Role ] (Phase 2)│
│                                     │
└─────────────────────────────────────┘

Key Features:
- Tabs with icon labels
- Inline edit for org name
- Member invite modal with email + role selector
- Confirmation dialogs for destructive actions
- Role-based permission display
```

**API Endpoints Used:**
- `GET /api/organizations/<id>/` → org details
- `PATCH /api/organizations/<id>/` → update org
- `GET /api/organizations/<id>/memberships/` → members list
- `POST /api/organizations/<id>/memberships/` → add member
- `POST /api/organizations/<id>/memberships/<user_id>/suspend/` → toggle suspend
- `DELETE /api/organizations/<id>/memberships/<user_id>/` → remove member

---

#### **Modal: Assign Tasks**
```
┌──────────────────────────────────┐
│  Assign Tasks                    │
├──────────────────────────────────┤
│                                  │
│  Selected: 3 tasks               │
│                                  │
│  Annotator *                     │
│  [Dropdown: Only annotators]     │
│                                  │
│  Reviewer (Optional)             │
│  [Dropdown: Only reviewers]      │
│                                  │
│  [ Cancel ] [ Assign ]           │
└──────────────────────────────────┘

Validation:
- Annotator is required
- Reviewer is optional
- Show "No annotators available" if list empty
- Show error toast if assignment fails
- Disable dropdowns while loading
```

---

### 2.4 Annotator Pages

#### **Dashboard: My Tasks** (`/dashboard/annotator`)
```
Layout:
┌─────────────────────────────────────┐
│  My Annotation Tasks                │
├─────────────────────────────────────┤
│                                     │
│  [Quick Stats]                      │
│  ├─ Pending | In Review | Rejected  │
│  └─ Completion Rate (%)             │
│                                     │
│  [Task List - Cards or Table]       │
│  ├─ Task Name | Project             │
│  ├─ Status | Assigned Date          │
│  ├─ Rejection Reason (if rejected)  │
│  └─ [ Start Annotating ]            │
│                                     │
│  [Filter & Sort]                    │
│  ├─ Filter: All / Pending / Rejected│
│  └─ Sort: Recent / Oldest / Name    │
│                                     │
└─────────────────────────────────────┘

Status Display Rules:
- If status = "pending_annotation" → show "Ready"
- If status = "rejected" → show "Rejected" + reason badge
- If status = "pending_review" → show "Submitted"
- If status = "completed" → hide from list (archive view)

Key Feature: Rejection reason displayed as collapsed box
```

**API Endpoints Used:**
- `GET /api/dm/tasks?project=<id>&status=pending_annotation,rejected` → task list
- `GET /api/tasks/<id>/` → task details with rejection reason
- `POST /api/tasks/<id>/annotation/` → submit annotation

---

#### **Page: Annotation Editor** (`/projects/<project_id>/tasks/<task_id>/annotate`)
```
Layout (2-column):
┌──────────────────┬─────────────────┐
│   Audio Editor   │  Label Panel    │
│   (Left 70%)     │   (Right 30%)   │
├──────────────────┼─────────────────┤
│                  │                 │
│  [Waveform]      │  [Properties]   │
│  ├─ Play/Pause   │  ├─ Segment ID  │
│  ├─ Zoom +/-     │  ├─ Start/End   │
│  ├─ Timeline     │  ├─ Labels      │
│  ├─ Segments     │  ├─ Speaker     │
│  └─ Progress     │  └─ Notes       │
│                  │                 │
│                  │  [Transcription]│
│                  │  ├─ Auto text   │
│                  │  └─ Edit box    │
│                  │                 │
│                  │  [Valid/Invalid]│
│                  │  └─ Radio buttons│
│                  │                 │
│                  │  [ Submit ]     │
│                  │  [ Save Draft ] │
│                  │  [ Discard ]    │
│                  │                 │
└──────────────────┴─────────────────┘

Responsive:
- Desktop (70/30 split)
- Tablet (60/40 split)
- Mobile: Stack vertically, full width each
```

**Key Features:**
- Waveform rendering (AudioUltra or Wavesurfer.js)
- Segment drawing with drag handles
- Auto-transcription via Whisper (fire-and-forget)
- Toast notifications for validation errors
- Keyboard shortcuts: Space (play/pause), S (submit), D (save draft)
- Unsaved changes warning

---

### 2.5 Reviewer Pages

#### **Dashboard: My Reviews** (`/dashboard/reviewer`)
```
Layout:
┌─────────────────────────────────────┐
│  My Review Queue                    │
├─────────────────────────────────────┤
│                                     │
│  [Quick Stats]                      │
│  ├─ Pending Review | Approved       │
│  ├─ Rejected | Average Time         │
│  └─ Quality Score (%)               │
│                                     │
│  [Review Queue - Kanban or Table]   │
│  ├─ Pending Review section:         │
│  │  - Task cards with urgency       │
│  │  - Assigned date + time elapsed  │
│  │  - [ Start Review ]              │
│  │                                  │
│  ├─ Approved section (archive):     │
│  │  - Completed task cards          │
│  │                                  │
│  └─ Rejected section:               │
│     - Tasks rejected by reviewer    │
│                                     │
│  [Filter & Sort]                    │
│  ├─ Filter: All / Pending / Approved│
│  └─ Sort: Urgent (elapsed) / New    │
│                                     │
└─────────────────────────────────────┘

Kanban View:
- 3 columns: Pending | Approved | Rejected
- Drag tasks between columns (optional)
- Card shows: Task name, annotator, time elapsed
- Hover shows quick actions: Review, Reject, Approve
```

**API Endpoints Used:**
- `GET /api/dm/tasks?status=pending_review` → review queue
- `GET /api/tasks/<id>/` → task with annotation
- `POST /api/tasks/<id>/approve/` → approve task
- `POST /api/tasks/<id>/reject/` → reject task

---

#### **Page: Review & Approval Editor** (`/projects/<project_id>/tasks/<task_id>/review`)
```
Layout (Similar to annotation editor):
┌──────────────────┬─────────────────┐
│   Audio Editor   │  Review Panel   │
│   (Left 70%)     │   (Right 30%)   │
├──────────────────┼─────────────────┤
│                  │                 │
│  [Waveform]      │  [Annotator]    │
│  ├─ Play/Pause   │  ├─ Name        │
│  ├─ Zoom +/-     │  └─ Email       │
│  ├─ Timeline     │                 │
│  ├─ Segments     │  [Segments]     │
│  └─ [ReadOnly]   │  ├─ List        │
│                  │  ├─ Click to    │
│                  │  │  highlight   │
│                  │  └─ Edit labels │
│                  │                 │
│                  │  [Transcription]│
│                  │  ├─ Annotator's │
│                  │  │  text        │
│                  │  └─ Edit box    │
│                  │                 │
│                  │  [Actions]      │
│                  │  ├─ [ Approve ] │
│                  │  └─ [ Reject ]  │
│                  │                 │
│                  │  [Reject Reason]│
│                  │  (shows on modal)│
│                  │                 │
└──────────────────┴─────────────────┘

Key Features:
- Waveform is interactive (can still edit annotations)
- Show annotator info for context
- Segments editable by reviewer
- Approve button (green) - marks task complete
- Reject button (red) - opens reason modal
- Unsaved changes tracked
```

---

## 🧩 Component Inventory

### 3.1 Layout Components

| Component | Props | Usage |
|-----------|-------|-------|
| `<AppLayout>` | `children`, `sidebar?`, `topbar?` | Main app wrapper with sidebar + topbar |
| `<Sidebar>` | `user`, `role`, `activeRoute` | Left navigation, role-based menu items |
| `<TopBar>` | `user`, `onLogout` | Header with user profile dropdown |
| `<Container>` | `children`, `maxWidth?`, `padding?` | Content container with max-width |
| `<PageHeader>` | `title`, `subtitle?`, `actions?` | Page title + breadcrumbs + CTA buttons |
| `<Tabs>` | `tabs: {label, icon, content}`, `activeTab?` | Tab navigation with icons |
| `<Modal>` | `title`, `open`, `onClose`, `children` | Dialog modal with overlay |
| `<Drawer>` | `title`, `open`, `onClose`, `children`, `side?` | Slide-out drawer panel |

### 3.2 Form Components

| Component | Props | Usage |
|-----------|-------|-------|
| `<Input>` | `label`, `placeholder`, `value`, `onChange`, `error?`, `required?` | Text input field |
| `<Select>` | `label`, `options`, `value`, `onChange`, `multiple?`, `searchable?` | Dropdown select |
| `<TextArea>` | `label`, `placeholder`, `value`, `onChange`, `rows?`, `error?` | Multi-line text input |
| `<Checkbox>` | `label`, `checked`, `onChange` | Checkbox input |
| `<RadioGroup>` | `options`, `value`, `onChange`, `direction?` | Radio button group |
| `<Switch>` | `label`, `checked`, `onChange`, `disabled?` | Toggle switch |
| `<Form>` | `onSubmit`, `children`, `layout?` | Form wrapper with validation |
| `<Button>` | `label`, `onClick`, `variant`, `size`, `loading?`, `disabled?`, `icon?` | CTA button |

**Button Variants:**
- `primary` (Indigo background, white text)
- `secondary` (Gray background, dark text)
- `success` (Green background)
- `danger` (Red background)
- `ghost` (No background, colored text)
- `outline` (Border, no fill)

**Button Sizes:**
- `sm` (8px padding, 12px font)
- `md` (12px padding, 14px font) - default
- `lg` (16px padding, 16px font)

### 3.3 Data Display Components

| Component | Props | Usage |
|-----------|-------|-------|
| `<DataTable>` | `columns`, `data`, `onRowClick?`, `sortable?`, `filterable?`, `paginated?` | Sortable, filterable table |
| `<Card>` | `title?`, `children`, `footer?`, `onClick?`, `hover?` | Content card with optional border |
| `<KPICard>` | `label`, `value`, `trend?`, `trendLabel?`, `icon?`, `color?` | Metric display card |
| `<Avatar>` | `src`, `name`, `size?`, `online?` | User avatar with fallback |
| `<Badge>` | `label`, `variant`, `size?` | Status badge |
| `<Tag>` | `label`, `onRemove?`, `variant?` | Removable tag |
| `<Progress>` | `value`, `max`, `label?`, `showLabel?` | Progress bar |
| `<Timeline>` | `items: {date, title, description}` | Timeline view |
| `<Breadcrumbs>` | `items: {label, href}` | Navigation breadcrumbs |

**Badge Variants:**
- `success` (green) - completed, approved
- `warning` (amber) - pending, needs attention
- `danger` (red) - rejected, error
- `info` (blue) - under review
- `default` (gray) - other

### 3.4 Specialized Components

| Component | Props | Usage |
|-----------|-------|-------|
| `<WaveformEditor>` | `audioUrl`, `segments`, `onSegmentCreate`, `onSegmentUpdate`, `onPlay`, `zoom?` | Audio waveform with drawing |
| `<TaskCard>` | `task`, `status`, `onClick`, `actions?` | Task summary card |
| `<ProjectCard>` | `project`, `taskCount`, `progressPercent`, `onClick` | Project overview card |
| `<UserInviteModal>` | `open`, `onClose`, `onInvite`, `roles?` | Invite user form |
| `<ConfirmModal>` | `open`, `title`, `message`, `onConfirm`, `onCancel`, `danger?` | Confirmation dialog |
| `<ToastContainer>` | — | Toast notification system |
| `<Toast>` | `message`, `type`, `duration?`, `onClose?` | Single toast notification |
| `<Spinner>` | `size?`, `color?` | Loading spinner |
| `<EmptyState>` | `icon`, `title`, `description`, `action?` | Empty state placeholder |
| `<ErrorBoundary>` | `children`, `onError?` | Error boundary wrapper |

---

## 🔄 Data Flow & API Integration

### 4.1 Authentication Flow

```
[Login Page]
    ↓ POST /user/login/ with email + password
    ↓ Receive csrfmiddlewaretoken + session cookie
    ↓ Store in Zustand auth store
    ↓ Redirect to /dashboard/<role>
    ↓ On all subsequent requests, include session cookie
    ↓ Middleware checks org suspension + role
    ↓ If 403/401, redirect to /login
    ↓ On logout, POST /user/logout/
    ↓ Clear auth store + cookies → /login
```

### 4.2 Task Assignment Flow

```
[Admin Dashboard]
    ↓ User selects 1+ tasks in table
    ↓ Clicks "Assign Tasks" button
    ↓ Modal opens with Annotator + Reviewer dropdowns
    ↓ Fetches available annotators via GET /api/users?role=annotator
    ↓ Fetches available reviewers via GET /api/users?role=reviewer
    ↓ User selects annotator + reviewer
    ↓ POST /api/dm/tasks/assign/ with task_ids + annotator_id + reviewer_id
    ↓ Backend creates TaskAssignment records
    ↓ Toast: "3 tasks assigned successfully"
    ↓ Table refreshes, status updates to "assigned"
```

### 4.3 Annotation Submission Flow

```
[Annotation Editor]
    ↓ Annotator draws segments, adds labels, transcription
    ↓ Clicks "Submit for Review" button
    ↓ Frontend validates required fields (toast if missing)
    ↓ POST /api/tasks/<id>/annotation/ with segments + labels + transcription
    ↓ Backend signal: TaskAssignment.status = "pending_review"
    ↓ Toast: "Submitted for review"
    ↓ Redirect to /dashboard/annotator
    ↓ Task no longer shows in "My Tasks" (moved to reviewer queue)
```

### 4.4 Review Approval Flow

```
[Review Editor - Approve Path]
    ↓ Reviewer reviews annotations, optionally edits
    ↓ Clicks "Approve" button
    ↓ POST /api/tasks/<id>/approve/
    ↓ Backend signal: TaskAssignment.status = "completed"
    ↓ Toast: "Task approved"
    ↓ Redirect to /dashboard/reviewer
    ↓ Task moves to "Approved" section (archive)

[Review Editor - Reject Path]
    ↓ Reviewer clicks "Reject" button
    ↓ Modal opens: "Reason for rejection" textarea (required)
    ↓ User enters reason (max 2000 chars)
    ↓ POST /api/tasks/<id>/reject/ with {"reason": "..."}
    ↓ Backend signal: TaskAssignment.status = "rejected"
    ↓ Toast: "Task rejected with reason"
    ↓ Annotator receives task back with reason visible
    ↓ Reviewer sees task in "Rejected" section
```

### 4.5 API Response Structure

**Success Response (200/201/204)**
```json
{
  "data": { /* resource */ },
  "message": "Operation successful",
  "status": "success"
}
```

**Error Response (4xx/5xx)**
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

**List Response with Pagination**
```json
{
  "count": 150,
  "next": "http://localhost:8080/api/tasks?page=2",
  "previous": null,
  "results": [ /* items */ ]
}
```

---

## 📱 Page Wireframes & Flows

### 5.1 Navigation Structure

```
┌─ /login
├─ /forgot-password
├─ /reset-password?token=xxx
└─ /dashboard
   ├─ (if super_admin)
   │  ├─ /dashboard/super-admin
   │  └─ /super-admin/admins
   ├─ (if admin)
   │  ├─ /dashboard/admin
   │  ├─ /projects
   │  ├─ /projects/<id>
   │  ├─ /projects/<id>/tasks
   │  ├─ /organization
   │  └─ /organization/settings
   ├─ (if annotator)
   │  ├─ /dashboard/annotator
   │  ├─ /projects (limited view)
   │  └─ /projects/<id>/tasks/<id>/annotate
   ├─ (if reviewer)
   │  ├─ /dashboard/reviewer
   │  ├─ /projects (limited view)
   │  └─ /projects/<id>/tasks/<id>/review
   └─ /profile
```

### 5.2 Responsive Breakpoints

```
Mobile:    0px - 640px   (sm)
Tablet:    640px - 1024px (md, lg)
Desktop:   1024px+ (xl, 2xl)

Layout Rules:
- Mobile:   Single column, full width, stacked components
- Tablet:   2-3 column grid, tabs horizontal
- Desktop:  Multi-column, sidebars visible, modals centered
- Data Tables: Horizontal scroll on mobile, sticky header
- Modals:   Full width on mobile, max-width 600px on desktop
```

### 5.3 Mobile Navigation

```
Mobile Menu Structure:
┌──────────────────────┐
│ ≡ Menu    Profile ✕ │  (TopBar)
├──────────────────────┤
│ [Dashboard]          │
│ [My Tasks]           │  (Sidebar collapses to icons)
│ [Projects]           │
│ [Organization]       │
│ [Settings]           │
│ [Logout]             │
└──────────────────────┘
```

---

## ✅ Implementation Checklist

### Phase 1A: Core Layout & Auth

- [ ] Project setup (React + TS + TailwindCSS + Zustand)
- [ ] Design token setup (colors, typography, spacing)
- [ ] Base layout components (AppLayout, Sidebar, TopBar)
- [ ] Login page with form validation
- [ ] Forgot password flow
- [ ] Auth context/store (Zustand)
- [ ] Protected routes (role-based redirects)
- [ ] Profile settings page
- [ ] Logout flow

### Phase 1B: Admin Dashboard

- [ ] Admin dashboard layout
- [ ] Project list (grid + table views)
- [ ] Task list with filters + sorting
- [ ] Task assignment modal
- [ ] Project details page (Overview tab)
- [ ] Organization settings page
- [ ] Member management (invite, suspend, delete)
- [ ] Data export UI

### Phase 1C: Annotator Editor

- [ ] Task list dashboard
- [ ] Waveform editor component
- [ ] Segment drawing + labeling
- [ ] Transcription textarea
- [ ] Required field validation + toasts
- [ ] Submit for review flow
- [ ] Save draft functionality
- [ ] Rejected task display with reason

### Phase 1D: Reviewer Editor

- [ ] Review queue dashboard
- [ ] Review editor (annotation view + edit)
- [ ] Approve button + flow
- [ ] Reject button + reason modal
- [ ] Rejection reason display

### Phase 1E: Super Admin

- [ ] Super Admin dashboard
- [ ] Admin management table
- [ ] Admin suspend/delete
- [ ] Maintenance mode toggle
- [ ] Storage usage display

### Phase 1F: Polish & Testing

- [ ] Mobile responsiveness testing
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance optimization
- [ ] Error handling & edge cases
- [ ] Toast notification system
- [ ] Loading states & skeletons
- [ ] Dark mode (optional)
- [ ] Documentation

---

## 🛠️ Tech Stack Recommendations

**Frontend Stack:**
```
React 18.2+
TypeScript 5.0+
TailwindCSS 3.3+ (with custom config)
Zustand 4.4+ (state management)
React Query (TanStack Query) - data fetching
Axios - HTTP client with interceptors
React Router v6+ - routing
React Hook Form - form handling
Zod or Yup - form validation
Headless UI or Radix UI - accessible components
Recharts - charts & graphs
React Hot Toast - toast notifications
Framer Motion - animations
Wavesurfer.js or React-Waveform - audio visualization
```

**Development Tools:**
```
Vite (or Next.js for SSR)
ESLint + Prettier
Jest + React Testing Library
Storybook - component documentation
Husky + lint-staged - pre-commit hooks
```

---

## 🎯 Integration Checklist

### Backend API Contract

**Ensure Backend Provides:**
- [ ] `POST /user/login/` - session-based auth
- [ ] `POST /user/logout/` - clear session
- [ ] `GET /api/me/` - current user info
- [ ] `GET /api/projects/` - list user's projects
- [ ] `GET /api/dm/tasks?project=<id>` - task list with filters
- [ ] `POST /api/dm/tasks/assign/` - assign tasks
- [ ] `POST /api/tasks/<id>/annotation/` - submit annotation
- [ ] `POST /api/tasks/<id>/approve/` - approve task
- [ ] `POST /api/tasks/<id>/reject/` - reject with reason
- [ ] `GET /api/organizations/<id>/` - org details
- [ ] `POST /api/organizations/<id>/memberships/` - add member
- [ ] `GET /api/super-admin/admins/` - list admins (superuser only)
- [ ] `POST /api/super-admin/admins/<id>/suspend/` - toggle suspension
- [ ] Error responses with clear messages
- [ ] CSRF token in responses (for POST)

**Frontend Handles:**
- [ ] Session cookie management
- [ ] CSRF token in request headers
- [ ] Role-based route protection
- [ ] Toast notifications for all API responses
- [ ] Loading states during API calls
- [ ] Error handling & user feedback
- [ ] Auto-logout on 401/403 errors
- [ ] Retry logic for failed requests

---

## 📊 Design System Files to Create

**Tailwind Config Extension:**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#6366F1',
        'primary-dark': '#4F46E5',
        'primary-light': '#E0E7FF',
        // ... all custom colors
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        // ... custom spacing scale
      },
    },
  },
};
```

**CSS Variables (for runtime theming):**
```css
/* styles/theme.css */
:root {
  --color-primary: #6366F1;
  --color-primary-dark: #4F46E5;
  /* ... all colors as CSS vars */
  
  --font-family: 'Inter', system-ui, sans-serif;
  --spacing-unit: 8px;
}
```

---

## 🚀 Next Steps

1. **Review this spec** with your design/dev team
2. **Create design mockups** in Figma based on color palette & typography
3. **Set up React project** with Vite + TailwindCSS
4. **Build shared component library** in Storybook
5. **Implement layout & auth** (Phase 1A)
6. **Connect to backend APIs** with React Query
7. **Iterate & test** with actual backend

---

**Document Version:** 1.0  
**Last Updated:** 2 May 2026  
**Status:** Ready for Implementation

---
