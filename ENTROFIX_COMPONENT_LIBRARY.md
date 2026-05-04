# 🎨 EntroFix — Component Library & Code Structure

> **Frontend Architecture & Component Organization**  
> **For:** React + TypeScript Development  
> **Build Tool:** Vite + TailwindCSS + Storybook

---

## 📁 Project Directory Structure

```
frontend/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── Layout/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── Container.tsx
│   │   ├── Forms/
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── TextArea.tsx
│   │   │   ├── Checkbox.tsx
│   │   │   ├── RadioGroup.tsx
│   │   │   ├── Switch.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Form.tsx
│   │   │   └── FileUpload.tsx
│   │   ├── DataDisplay/
│   │   │   ├── DataTable.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── KPICard.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Tag.tsx
│   │   │   ├── Progress.tsx
│   │   │   ├── Timeline.tsx
│   │   │   ├── Breadcrumbs.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── Modals/
│   │   │   ├── Modal.tsx
│   │   │   ├── Drawer.tsx
│   │   │   ├── ConfirmModal.tsx
│   │   │   └── UserInviteModal.tsx
│   │   ├── Specialized/
│   │   │   ├── WaveformEditor.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── ToastContainer.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   └── index.ts          # Re-export all components
│   │
│   ├── pages/               # Page components (route-level)
│   │   ├── Auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   └── ResetPasswordPage.tsx
│   │   ├── Dashboard/
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AnnotatorDashboard.tsx
│   │   │   ├── ReviewerDashboard.tsx
│   │   │   └── SuperAdminDashboard.tsx
│   │   ├── Projects/
│   │   │   ├── ProjectsPage.tsx
│   │   │   ├── ProjectDetailsPage.tsx
│   │   │   └── ProjectSettingsPage.tsx
│   │   ├── Annotation/
│   │   │   ├── AnnotationEditorPage.tsx
│   │   │   └── AnnotationDashboard.tsx
│   │   ├── Review/
│   │   │   ├── ReviewEditorPage.tsx
│   │   │   └── ReviewDashboard.tsx
│   │   ├── Organization/
│   │   │   ├── OrgSettingsPage.tsx
│   │   │   ├── MembersPage.tsx
│   │   │   └── InvitePage.tsx
│   │   ├── Profile/
│   │   │   └── ProfilePage.tsx
│   │   └── SuperAdmin/
│   │       ├── AdminManagementPage.tsx
│   │       ├── MaintenanceModePage.tsx
│   │       └── StorageUsagePage.tsx
│   │
│   ├── stores/              # Zustand stores
│   │   ├── authStore.ts
│   │   ├── projectStore.ts
│   │   ├── taskStore.ts
│   │   ├── organizationStore.ts
│   │   ├── uiStore.ts        # Toast, modals, notifications
│   │   └── index.ts
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useApi.ts        # Wrapper for fetch with error handling
│   │   ├── useAuth.ts       # Auth-related hooks
│   │   ├── useProjects.ts
│   │   ├── useTasks.ts
│   │   └── useLocalStorage.ts
│   │
│   ├── services/            # API service layer
│   │   ├── api.ts           # Base API client
│   │   ├── authService.ts
│   │   ├── projectService.ts
│   │   ├── taskService.ts
│   │   ├── organizationService.ts
│   │   ├── userService.ts
│   │   └── superAdminService.ts
│   │
│   ├── types/               # TypeScript interfaces
│   │   ├── models.ts        # User, Project, Task, etc.
│   │   ├── api.ts           # API request/response types
│   │   ├── enums.ts         # TaskStatus, UserRole, etc.
│   │   └── index.ts
│   │
│   ├── utils/               # Utility functions
│   │   ├── formatters.ts    # Format dates, sizes, etc.
│   │   ├── validators.ts    # Email, password validation
│   │   ├── constants.ts     # App constants
│   │   ├── colors.ts        # Color palette utilities
│   │   ├── cn.ts            # Tailwind class merging utility
│   │   └── localStorage.ts  # Draft auto-save
│   │
│   ├── styles/              # Global styles
│   │   ├── globals.css      # Global Tailwind directives
│   │   ├── animations.css   # Custom animations
│   │   └── theme.css        # CSS variables for theming
│   │
│   ├── config/              # Configuration
│   │   ├── routes.ts        # Route definitions
│   │   ├── api.ts           # API base URL, timeouts
│   │   └── env.ts           # Environment variables
│   │
│   ├── App.tsx              # Main app component + routes
│   └── main.tsx             # Vite entry point
│
├── public/
│   ├── icons/
│   ├── images/
│   └── fonts/
│
├── .storybook/              # Storybook configuration
│   ├── main.ts
│   ├── preview.ts
│   └── manager.ts
│
├── stories/                 # Component stories for Storybook
│   ├── Button.stories.tsx
│   ├── Input.stories.tsx
│   ├── Card.stories.tsx
│   └── ...
│
├── __tests__/               # Test files (mirror src structure)
│   ├── components/
│   ├── pages/
│   └── hooks/
│
├── tailwind.config.ts       # TailwindCSS configuration
├── postcss.config.js        # PostCSS configuration
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration
├── package.json
├── .env.example
└── .env.local               # gitignored
```

---

## 🎯 Key File Templates

### 1. Component Template (with Storybook)

**File:** `src/components/Forms/Button.tsx`

```typescript
import React from 'react';
import { cn } from '../../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800',
  secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
  success: 'bg-green-500 text-white hover:bg-green-600',
  danger: 'bg-red-500 text-white hover:bg-red-600',
  ghost: 'text-indigo-600 hover:bg-indigo-50',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2 py-1 text-xs rounded',
  md: 'px-3 py-2 text-sm rounded-md',
  lg: 'px-4 py-3 text-base rounded-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'font-medium transition-colors duration-200 flex items-center gap-2 justify-center',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  );
}
```

**Storybook Story:** `stories/Button.stories.tsx`

```typescript
import { Meta, StoryObj } from '@storybook/react';
import { Button } from '../src/components/Forms/Button';
import { useState } from 'react';

const meta: Meta<typeof Button> = {
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
    size: 'md',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Loading: Story = {
  args: {
    children: 'Loading...',
    loading: true,
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
```

---

### 2. Page Component Template

**File:** `src/pages/Projects/ProjectsPage.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppLayout,
  PageHeader,
  Button,
  Card,
  Spinner,
  EmptyState,
  ProjectCard,
} from '../../components';
import { useProjectStore } from '../../stores';
import { useAuth } from '../../hooks';

export function ProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects, loading, fetchProjects } = useProjectStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = () => {
    navigate('/projects/new');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Projects"
          subtitle="Manage your annotation projects"
          actions={
            user?.role === 'admin' && (
              <Button onClick={handleCreateProject} variant="primary">
                + New Project
              </Button>
            )
          }
        />

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'outline'}
            onClick={() => setViewMode('grid')}
            size="sm"
          >
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'outline'}
            onClick={() => setViewMode('list')}
            size="sm"
          >
            List
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon="📁"
            title="No projects yet"
            description="Create your first project to get started"
            action={<Button onClick={handleCreateProject}>Create Project</Button>}
          />
        ) : (
          <div
            className={`grid gap-6 ${
              viewMode === 'grid'
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1'
            }`}
          >
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
```

---

### 3. Custom Hook Template

**File:** `src/hooks/useApi.ts`

```typescript
import { useState, useCallback } from 'react';
import { useAuthStore } from '../stores';
import { showToast } from '../utils/toast';

interface UseApiOptions {
  showError?: boolean;
  showSuccess?: boolean;
  successMessage?: string;
}

export function useApi<T = any>(options: UseApiOptions = {}) {
  const { showError = true, showSuccess = false, successMessage = '' } = options;
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    async (url: string, fetchOptions: RequestInit = {}): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
          },
          credentials: 'include', // Include cookies
        });

        if (response.status === 401) {
          // Unauthorized - redirect to login
          useAuthStore.getState().logout();
          return null;
        }

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error || `Request failed (${response.status})`;
          setError(errorMessage);

          if (showError) {
            showToast(errorMessage, 'error');
          }

          return null;
        }

        // Handle 204 No Content
        let result: T | null = null;
        if (response.status !== 204) {
          result = await response.json();
        }

        setData(result);

        if (showSuccess) {
          showToast(successMessage || 'Success', 'success');
        }

        return result;
      } catch (err: any) {
        const message = err.message || 'Network error';
        setError(message);

        if (showError) {
          showToast(message, 'error');
        }

        return null;
      } finally {
        setLoading(false);
      }
    },
    [showError, showSuccess, successMessage]
  );

  return { data, loading, error, request };
}
```

---

### 4. Zustand Store Template

**File:** `src/stores/projectStore.ts`

```typescript
import create from 'zustand';
import { Project } from '../types';
import { useApi } from '../hooks';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchProjects: () => Promise<void>;
  fetchProjectById: (id: number) => Promise<void>;
  createProject: (data: Partial<Project>) => Promise<Project | null>;
  updateProject: (id: number, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  reset: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true });
    try {
      const response = await fetch('/api/projects/');
      if (response.ok) {
        const data = await response.json();
        set({ projects: data.results || data });
      }
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchProjectById: async (id) => {
    set({ loading: true });
    try {
      const response = await fetch(`/api/projects/${id}/`);
      if (response.ok) {
        const data = await response.json();
        set({ currentProject: data });
      }
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  createProject: async (data) => {
    try {
      const response = await fetch('/api/projects/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const newProject = await response.json();
        set((state) => ({
          projects: [...state.projects, newProject],
        }));
        return newProject;
      }
      return null;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    }
  },

  updateProject: async (id, data) => {
    try {
      const response = await fetch(`/api/projects/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const updated = await response.json();
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? updated : p)),
        }));
      }
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  deleteProject: async (id) => {
    try {
      const response = await fetch(`/api/projects/${id}/`, {
        method: 'DELETE',
      });

      if (response.ok) {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }));
      }
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  reset: () =>
    set({
      projects: [],
      currentProject: null,
      loading: false,
      error: null,
    }),
}));
```

---

### 5. Types Template

**File:** `src/types/models.ts`

```typescript
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_superuser: boolean;
  is_staff: boolean;
  created_at: string;
  active_organization?: Organization;
  organization_member?: OrganizationMember;
}

export interface Organization {
  id: number;
  name: string;
  description?: string;
  website?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  is_suspended: boolean;
  user_count: number;
  project_count: number;
}

export interface OrganizationMember {
  id: number;
  user: User;
  organization: Organization;
  role: 'admin' | 'annotator' | 'reviewer';
  is_owner: boolean;
  is_admin: boolean;
  is_suspended: boolean;
  created_at: string;
}

export interface Project {
  id: number;
  title: string;
  description?: string;
  label_config: string;
  created_at: string;
  updated_at: string;
  task_count: number;
  completed_tasks: number;
  organization: number | Organization;
}

export interface Task {
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

export type TaskStatus = 'pending_annotation' | 'pending_review' | 'completed' | 'rejected';

export interface TaskAssignment {
  id: number;
  task: number;
  annotator: User;
  reviewer?: User;
  status: TaskStatus;
  assigned_at: string;
  started_at?: string;
  completed_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface Annotation {
  id: number;
  task: number;
  completed_by: number;
  result: AnnotationSegment[];
  created_at: string;
}

export interface AnnotationSegment {
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

### 6. Enums Template

**File:** `src/types/enums.ts`

```typescript
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  ANNOTATOR = 'annotator',
  REVIEWER = 'reviewer',
}

export enum TaskStatus {
  PENDING_ANNOTATION = 'pending_annotation',
  PENDING_REVIEW = 'pending_review',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

export const TaskStatusColors: Record<TaskStatus, string> = {
  [TaskStatus.PENDING_ANNOTATION]: '#F59E0B',  // amber
  [TaskStatus.PENDING_REVIEW]: '#3B82F6',      // blue
  [TaskStatus.COMPLETED]: '#10B981',           // green
  [TaskStatus.REJECTED]: '#EF4444',            // red
};

export const TaskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.PENDING_ANNOTATION]: 'Ready',
  [TaskStatus.PENDING_REVIEW]: 'Under Review',
  [TaskStatus.COMPLETED]: 'Completed',
  [TaskStatus.REJECTED]: 'Rejected',
};
```

---

### 7. Routes Configuration

**File:** `src/config/routes.ts`

```typescript
import { Navigate } from 'react-router-dom';
import {
  LoginPage,
  AdminDashboard,
  AnnotatorDashboard,
  ReviewerDashboard,
  SuperAdminDashboard,
  ProjectsPage,
  AnnotationEditorPage,
  ReviewEditorPage,
  OrgSettingsPage,
} from '../pages';
import { useAuthStore } from '../stores';

interface RouteConfig {
  path: string;
  element: React.ComponentType;
  roles?: string[]; // Require specific roles
  public?: boolean;  // No auth required
}

export const routes: RouteConfig[] = [
  // Public routes
  { path: '/login', element: LoginPage, public: true },

  // Protected routes with role checks
  {
    path: '/dashboard',
    element: () => {
      const { role } = useAuthStore();
      switch (role) {
        case 'admin':
          return <AdminDashboard />;
        case 'annotator':
          return <AnnotatorDashboard />;
        case 'reviewer':
          return <ReviewerDashboard />;
        case 'super_admin':
          return <SuperAdminDashboard />;
        default:
          return <Navigate to="/login" />;
      }
    },
  },

  // Admin-only routes
  { path: '/projects', element: ProjectsPage, roles: ['admin'] },
  { path: '/organization', element: OrgSettingsPage, roles: ['admin'] },

  // Annotator/Reviewer routes
  {
    path: '/projects/:projectId/tasks/:taskId/annotate',
    element: AnnotationEditorPage,
    roles: ['annotator'],
  },
  {
    path: '/projects/:projectId/tasks/:taskId/review',
    element: ReviewEditorPage,
    roles: ['reviewer'],
  },

  // Catch all
  { path: '*', element: () => <Navigate to="/dashboard" /> },
];
```

---

### 8. TailwindCSS Configuration

**File:** `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F0F4FF',
          100: '#E0E7FF',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
        },
        success: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          500: '#22C55E',
          600: '#16A34A',
        },
        danger: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
        },
        sidebar: '#0F172A',
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '16px',
        xl: '24px',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-in-out',
        'slide-in': 'slideIn 300ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
```

---

## 🚀 Getting Started Checklist

### Setup Phase
- [ ] Create Vite + React + TS project
- [ ] Install TailwindCSS + dependencies
- [ ] Configure paths + absolute imports
- [ ] Set up Zustand stores
- [ ] Set up Storybook

### Component Library Phase
- [ ] Build all Layout components
- [ ] Build all Form components
- [ ] Build all Data Display components
- [ ] Build all Modal components
- [ ] Build specialized components (Waveform, TaskCard, etc.)
- [ ] Document in Storybook

### Integration Phase
- [ ] Create API service layer
- [ ] Connect stores to APIs
- [ ] Implement auth flow
- [ ] Build all pages
- [ ] Set up routing
- [ ] Test all features

### Polish Phase
- [ ] Mobile responsiveness
- [ ] Accessibility (WCAG 2.1)
- [ ] Performance optimization
- [ ] Error handling
- [ ] Loading states
- [ ] Toast notifications

---

**Document Version:** 1.0  
**Last Updated:** 2 May 2026

---
