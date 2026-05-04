# ⚡ EntroFix — Quick Start Guide for Frontend Development

> **Start building EntroFix frontend in 30 minutes**  
> **References:** Use alongside ENTROFIX_FRONTEND_SPEC.md, ENTROFIX_API_INTEGRATION_GUIDE.md, ENTROFIX_COMPONENT_LIBRARY.md

---

## 📚 Documentation Map

| Document | Purpose | Read When |
|----------|---------|-----------|
| **ENTROFIX_FRONTEND_SPEC.md** | Design system, page structure, components | Planning your app |
| **ENTROFIX_API_INTEGRATION_GUIDE.md** | Backend APIs, data models, integration | Building features |
| **ENTROFIX_COMPONENT_LIBRARY.md** | Code structure, component templates | Setting up project |
| **This Guide** | Quick reference & getting started | Right now! |

---

## 🚀 Phase 1: Project Setup (Day 1)

### Step 1: Create Vite Project

```bash
npm create vite@latest entrofix-frontend -- --template react-ts
cd entrofix-frontend
npm install
```

### Step 2: Install Dependencies

```bash
# Core dependencies
npm install react react-dom react-router-dom
npm install zustand axios
npm install -D tailwindcss postcss autoprefixer
npm install @headlessui/react @heroicons/react

# UI & Data
npm install recharts react-hot-toast wavesurfer.js

# Forms & Validation
npm install react-hook-form zod @hookform/resolvers

# Development
npm install -D typescript @types/react @types/node
npm install -D prettier eslint @typescript-eslint/eslint-plugin
npm install -D @storybook/react @storybook/addon-docs
```

### Step 3: Configure TailwindCSS

```bash
npx tailwindcss init -p
```

Update `tailwind.config.ts` (see ENTROFIX_COMPONENT_LIBRARY.md)

### Step 4: Create Directory Structure

```bash
# Create all directories
mkdir -p src/components/{Layout,Forms,DataDisplay,Modals,Specialized}
mkdir -p src/pages/{Auth,Dashboard,Projects,Annotation,Review,Organization,Profile,SuperAdmin}
mkdir -p src/stores src/hooks src/services src/types src/utils src/styles src/config
```

### Step 5: Create Essential Files

**`src/main.tsx`**
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**`src/App.tsx`**
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores'
import { useEffect } from 'react'

// Pages
import LoginPage from './pages/Auth/LoginPage'
import AdminDashboard from './pages/Dashboard/AdminDashboard'
import AnnotatorDashboard from './pages/Dashboard/AnnotatorDashboard'
import ReviewerDashboard from './pages/Dashboard/ReviewerDashboard'

function App() {
  const { initAuth, isAuthenticated } = useAuthStore()
  
  useEffect(() => {
    initAuth()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        {isAuthenticated ? (
          <Route path="/dashboard" element={<AdminDashboard />} />
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

**`src/styles/globals.css`**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom animations */
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors;
  }
  
  .spinner {
    @apply animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600;
  }
}
```

---

## 🔐 Phase 2: Authentication (Day 1-2)

### Step 1: Create Auth Store

**`src/stores/authStore.ts`** (use template from ENTROFIX_COMPONENT_LIBRARY.md)

Key methods:
- `login(email, password)` → POST /user/login/
- `logout()` → POST /user/logout/
- `initAuth()` → GET /api/me/
- `setUser(user)` → set current user
- `clear()` → clear all auth data

### Step 2: Create Login Page

**`src/pages/Auth/LoginPage.tsx`**

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores'
import { Button, Input } from '../../components'
import { showToast } from '../../utils/toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const success = await login(email, password)
    
    if (success) {
      showToast('Login successful', 'success')
      navigate('/dashboard')
    } else {
      showToast('Login failed', 'error')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">EntroFix</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <Button
            type="submit"
            fullWidth
            loading={loading}
          >
            Login
          </Button>
        </form>
      </div>
    </div>
  )
}
```

### Step 3: Test Auth

1. Start backend: `python manage.py runserver 0.0.0.0:8080`
2. Start frontend: `npm run dev`
3. Try login with `admin@fixensy.com` / `fixensy123`
4. Should redirect to dashboard

---

## 📊 Phase 3: Admin Dashboard (Day 2-3)

### Build Layout Components

**`src/components/Layout/AppLayout.tsx`**
```typescript
interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-sidebar text-white">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### Build Dashboard Page

**`src/pages/Dashboard/AdminDashboard.tsx`**
```typescript
import { useEffect } from 'react'
import { AppLayout, PageHeader, KPICard, DataTable } from '../../components'
import { useProjectStore, useTaskStore } from '../../stores'

export default function AdminDashboard() {
  const { projects, fetchProjects } = useProjectStore()
  const { tasks, fetchTasks } = useTaskStore()

  useEffect(() => {
    fetchProjects()
  }, [])

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader title="Admin Dashboard" subtitle="Manage projects and tasks" />

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          <KPICard label="Projects" value={projects.length} trend={5} />
          <KPICard label="Tasks" value={tasks.length} />
          <KPICard label="Completed" value={tasks.filter(t => t.status === 'completed').length} />
          <KPICard label="Team Members" value={12} />
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-3 gap-4">
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
```

---

## 📝 Phase 4: Annotation Workflow (Day 4-5)

### Build Waveform Editor

**`src/components/Specialized/WaveformEditor.tsx`**

Use [Wavesurfer.js](https://wavesurfer.xyz/):

```typescript
import WaveSurfer from 'wavesurfer.js'
import { useEffect, useRef } from 'react'

interface WaveformEditorProps {
  audioUrl: string
  onSegmentCreate: (segment: any) => void
}

export function WaveformEditor({ audioUrl, onSegmentCreate }: WaveformEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Initialize WaveSurfer
    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#ddd',
      progressColor: '#6366F1',
      url: audioUrl,
    })

    // Add region plugin for segment drawing
    const regionsPlugin = wavesurferRef.current.registerPlugin(
      WaveSurfer.Regions.create()
    )

    regionsPlugin.on('region-created', (region) => {
      onSegmentCreate({
        start: region.start,
        end: region.end,
        labels: [],
        text: '',
      })
    })

    return () => wavesurferRef.current?.destroy()
  }, [audioUrl, onSegmentCreate])

  return (
    <div
      ref={containerRef}
      className="h-32 bg-gray-100 rounded-lg border border-gray-300"
    />
  )
}
```

### Build Annotation Editor Page

**`src/pages/Annotation/AnnotationEditorPage.tsx`**

```typescript
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppLayout, WaveformEditor, Button, TextArea } from '../../components'
import { useTaskStore } from '../../stores'
import { showToast } from '../../utils/toast'

export default function AnnotationEditorPage() {
  const { projectId, taskId } = useParams()
  const navigate = useNavigate()
  const { currentTask, fetchTaskById } = useTaskStore()
  const [segments, setSegments] = useState([])
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (segments.length === 0) {
      showToast('Add at least one segment', 'error')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}/annotation/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: segments }),
      })

      if (response.ok) {
        showToast('Submitted for review', 'success')
        navigate('/dashboard/annotator')
      } else {
        showToast('Submission failed', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="grid grid-cols-3 gap-6">
        {/* Editor */}
        <div className="col-span-2 space-y-4">
          <WaveformEditor
            audioUrl={currentTask?.data.audio}
            onSegmentCreate={(seg) => setSegments([...segments, seg])}
          />

          {/* Segments List */}
          <div className="space-y-2">
            {segments.map((seg, i) => (
              <div key={i} className="bg-white p-4 rounded border">
                <p>{seg.start.toFixed(2)}s - {seg.end.toFixed(2)}s</p>
                <TextArea value={seg.text} onChange={(e) => {
                  segments[i].text = e.target.value
                  setSegments([...segments])
                }} />
              </div>
            ))}
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="font-semibold mb-4">Task Info</h3>
          <div className="space-y-2 mb-6">
            <p><strong>Task:</strong> {currentTask?.title}</p>
            <p><strong>Segments:</strong> {segments.length}</p>
          </div>

          <div className="space-y-2">
            <Button fullWidth onClick={handleSubmit} loading={loading}>
              Submit for Review
            </Button>
            <Button fullWidth variant="outline">
              Save Draft
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
```

---

## 🧪 Phase 5: Testing & Integration (Day 5-6)

### Test Checklist

```typescript
// src/__tests__/auth.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '../pages/Auth/LoginPage'

describe('LoginPage', () => {
  it('should submit login form', async () => {
    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: /login/i })

    fireEvent.change(emailInput, { target: { value: 'admin@fixensy.com' } })
    fireEvent.change(passwordInput, { target: { value: 'fixensy123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard')
    })
  })
})
```

### Integration with Backend

1. **API Base URL:** Set in `src/config/api.ts`
   ```typescript
   export const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8080'
   ```

2. **CSRF Token Handling:** Automatically in all POST/PUT/PATCH requests
   ```typescript
   // src/services/api.ts
   const getCsrfToken = () => {
     return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || ''
   }
   ```

3. **Session Cookies:** Enable with `credentials: 'include'` in fetch calls

---

## 📱 Phase 6: Responsive & Polish (Day 6-7)

### Mobile Breakpoints

Use Tailwind responsive classes:
```typescript
// Grid that stacks on mobile
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Items */}
</div>

// Hide on mobile, show on desktop
<div className="hidden md:block">Desktop only content</div>

// Full width on mobile, container on desktop
<div className="max-w-full md:max-w-4xl">Content</div>
```

### Accessibility

- Use semantic HTML (`<button>`, `<nav>`, `<main>`)
- Add ARIA labels for screen readers
- Test with keyboard navigation
- Ensure 4.5:1 color contrast

### Performance

- Lazy load pages with `React.lazy()`
- Use React Query for data fetching + caching
- Optimize images with `<img loading="lazy">`
- Bundle size < 200KB (gzip)

---

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

Output: `dist/` folder

### Deploy to Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Or push to GitHub, connect to Vercel

### Environment Variables

Create `.env.production`:
```
VITE_API_URL=https://entrofix.example.com
VITE_APP_NAME=EntroFix
```

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| CORS error | Add backend to `CSRF_TRUSTED_ORIGINS` |
| Session not persisting | Check `credentials: 'include'` in fetch |
| Waveform not loading | Verify audio URL is accessible (HTTPS) |
| Sidebar not showing | Check `AppLayout` import + TailwindCSS built |
| Types not found | Run `npm install` again + restart IDE |

---

## 📚 Learning Resources

- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [WaveSurfer.js Docs](https://wavesurfer.xyz/)

---

## ✅ Completion Checklist

**Week 1:**
- [ ] Project setup complete
- [ ] Auth flow working (login/logout)
- [ ] Dashboard showing projects

**Week 2:**
- [ ] All pages built
- [ ] Annotation editor functional
- [ ] Review editor functional

**Week 3:**
- [ ] All APIs integrated
- [ ] Mobile responsive
- [ ] Ready for testing

---

**Created:** 2 May 2026  
**Updated:** 2 May 2026  
**Status:** Ready to Build 🚀

Good luck with EntroFix! 🎉

---
