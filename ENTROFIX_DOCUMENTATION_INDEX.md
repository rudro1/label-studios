# 📚 EntroFix Frontend — Complete Documentation Index

> **All Frontend Development Guidance in One Place**  
> **5 Core Documents** for building EntroFix's custom React frontend

---

## 🎯 Overview

EntroFix is transitioning from **Label Studio's default UI** to a **custom, professional, responsive frontend**. This documentation provides everything needed to build and integrate it with the Django backend.

**Timeline:** ~3 weeks of development  
**Team Size:** 1-2 frontend developers  
**Tech Stack:** React 18 + TypeScript + TailwindCSS + Zustand

---

## 📖 Document Breakdown

### 1. **ENTROFIX_FRONTEND_SPEC.md** ⭐ START HERE
**Purpose:** Complete design system + page architecture  
**Contains:**
- Color palette (Indigo primary, green success, red danger)
- Typography & spacing scales
- Component inventory (40+ components)
- Page structure for each role (Super Admin, Admin, Annotator, Reviewer)
- Page wireframes & flows
- Responsive breakpoints

**When to Read:** First thing when starting frontend work  
**Length:** ~2000 lines  
**Action:** Use this to create design mockups in Figma

---

### 2. **ENTROFIX_API_INTEGRATION_GUIDE.md** 🔌 SECOND PRIORITY
**Purpose:** Complete API contract + data integration  
**Contains:**
- Authentication & session management
- All API endpoints (7 feature groups)
- Request/response formats (with actual JSON examples)
- Data models & TypeScript interfaces
- Error handling patterns
- State management patterns (Zustand + React Query examples)
- Component ↔ API mapping table
- Testing checklist

**When to Read:** While implementing features  
**Length:** ~2500 lines  
**Action:** Copy-paste API calls into your service layer

---

### 3. **ENTROFIX_COMPONENT_LIBRARY.md** 🧩 CODE STRUCTURE
**Purpose:** Frontend code organization + component templates  
**Contains:**
- Directory structure (how to organize 200+ files)
- Component templates with code
- Store templates (Zustand examples)
- Hook templates (useApi, useAuth, etc.)
- TypeScript interfaces & enums
- TailwindCSS configuration
- Storybook setup

**When to Read:** When setting up project  
**Length:** ~1500 lines  
**Action:** Copy this structure into your frontend repo

---

### 4. **ENTROFIX_QUICK_START.md** ⚡ IMPLEMENTATION GUIDE
**Purpose:** Day-by-day implementation roadmap  
**Contains:**
- 6 phases (each 1-2 days):
  - Phase 1: Project setup
  - Phase 2: Authentication
  - Phase 3: Admin dashboard
  - Phase 4: Annotation workflow
  - Phase 5: Testing
  - Phase 6: Polish & deployment
- Code examples for each phase
- Troubleshooting tips
- Testing checklist

**When to Read:** First day of coding  
**Length:** ~800 lines  
**Action:** Follow the phases day-by-day

---

## 🗺️ How to Use These Documents

### Scenario 1: I'm Starting Fresh
1. Read **ENTROFIX_FRONTEND_SPEC.md** (30 min) - understand design system
2. Read **ENTROFIX_QUICK_START.md** (30 min) - understand roadmap
3. Skim **ENTROFIX_COMPONENT_LIBRARY.md** (20 min) - understand code structure
4. Start with Phase 1 of Quick Start → Project Setup

### Scenario 2: I'm Building a Feature (e.g., Task Assignment)
1. Go to **ENTROFIX_API_INTEGRATION_GUIDE.md**
2. Search for "Feature 5: Task Assignment"
3. Find API endpoint details
4. Find component mapping
5. Go to **ENTROFIX_COMPONENT_LIBRARY.md** → copy store/hook template
6. Implement using the template

### Scenario 3: I Need the API Contract
1. Open **ENTROFIX_API_INTEGRATION_GUIDE.md**
2. Each endpoint has:
   - Request format (JSON)
   - Response format (JSON)
   - Frontend example code
3. Copy the example + adapt to your store/hook

### Scenario 4: I'm Stuck
1. Check **ENTROFIX_QUICK_START.md** → Troubleshooting section
2. Check if the issue is in **ENTROFIX_API_INTEGRATION_GUIDE.md** → Error Handling
3. Check code structure in **ENTROFIX_COMPONENT_LIBRARY.md** → is your file in the right place?

---

## 📊 What Each Role Sees (Pages per Role)

### Super Admin (4 pages)
| Page | Path | Features |
|------|------|----------|
| Control Panel | `/dashboard/super-admin` | List admins, suspend, delete, maintenance mode, storage usage |
| Admin Mgmt | `/super-admin/admins` | CRUD admins, view storage |
| Maintenance | `/super-admin/maintenance` | Toggle 503 mode |
| Profile | `/profile` | Settings, password change, logout |

**Total New Components:** 5  
**API Endpoints Used:** 6

---

### Admin (6 pages)
| Page | Path | Features |
|------|------|----------|
| Dashboard | `/dashboard/admin` | KPI cards, projects grid, task list, live tracking |
| Projects | `/projects` | List/create projects, import data |
| Project Details | `/projects/<id>` | Overview, tasks, team, settings |
| Org Settings | `/organization` | Edit org, manage members, invite |
| Data Export | `/projects/<id>/export` | Bulk export tasks |
| Profile | `/profile` | Settings, logout |

**Total New Components:** 12  
**API Endpoints Used:** 10

---

### Annotator (2 pages)
| Page | Path | Features |
|------|------|----------|
| My Tasks | `/dashboard/annotator` | Task queue, filters, rejection reason display |
| Annotation Editor | `/projects/<id>/tasks/<id>/annotate` | Waveform + segment drawing, transcription, validation, submit |

**Total New Components:** 3  
**API Endpoints Used:** 4

---

### Reviewer (2 pages)
| Page | Path | Features |
|------|------|----------|
| My Reviews | `/dashboard/reviewer` | Review queue, Kanban view |
| Review Editor | `/projects/<id>/tasks/<id>/review` | Waveform view, edit annotations, approve/reject with reason |

**Total New Components:** 3  
**API Endpoints Used:** 3

---

## 🎨 Design System Quick Reference

### Colors
```
Primary (CTA): #6366F1 (Indigo)
Success: #10B981 (Green)
Danger: #EF4444 (Red)
Warning: #F59E0B (Amber)
Sidebar: #0F172A (Dark Slate)
```

### Typography
```
H1: 32px bold
H2: 24px bold
Body: 14px normal
Label: 12px semibold
```

### Spacing
```
xs: 2px    md: 8px    xl: 24px
sm: 4px    lg: 16px   2xl: 32px
```

---

## 🔧 Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 18.2+ |
| Language | TypeScript | 5.0+ |
| Styling | TailwindCSS | 3.3+ |
| State | Zustand | 4.4+ |
| Data Fetch | React Query (optional) | 5.0+ |
| Routing | React Router | v6+ |
| Forms | React Hook Form | 7.5+ |
| Validation | Zod | 3.20+ |
| Audio | Wavesurfer.js | 6.0+ |
| Components | Headless UI | 1.7+ |
| Toasts | React Hot Toast | 2.4+ |

---

## 📋 API Endpoints Summary

**Total Endpoints:** 25

| Category | Count | Docs |
|----------|-------|------|
| Authentication | 3 | ENTROFIX_API_INTEGRATION_GUIDE.md § 3.1-3.5 |
| Projects | 3 | § Feature 1 |
| Tasks | 3 | § Feature 2 |
| Annotations | 2 | § Feature 3 |
| Review | 2 | § Feature 4 |
| Assignment | 3 | § Feature 5 |
| Organization | 5 | § Feature 6 |
| Super Admin | 4 | § Feature 7 |

**Each endpoint has:**
- HTTP method & path
- Request format
- Response format (with example JSON)
- Frontend code example

---

## 🚀 Implementation Timeline

### Week 1: Foundation
- **Days 1-2:** Project setup + components
- **Days 3-4:** Auth (login/logout/profile)
- **Days 5:** Admin dashboard + projects

### Week 2: Workflows
- **Days 6-7:** Task assignment modal
- **Days 8-9:** Annotation editor + Wavesurfer
- **Days 10:** Review editor + approve/reject

### Week 3: Polish
- **Days 11-12:** Mobile responsiveness
- **Days 13:** Testing + bug fixes
- **Days 14:** Deployment + documentation

---

## ✅ Quality Checklist

### Code Quality
- [ ] TypeScript strict mode enabled
- [ ] No `any` types
- [ ] Components have PropTypes or TS interfaces
- [ ] Unit tests for all utils
- [ ] E2E tests for critical flows

### UI/UX
- [ ] Mobile responsive (tested on 375px, 768px, 1440px)
- [ ] Accessibility (WCAG 2.1 AA minimum)
- [ ] Toast notifications for all actions
- [ ] Loading states on all async operations
- [ ] Error messages are helpful

### Performance
- [ ] Bundle size < 200KB (gzip)
- [ ] First Contentful Paint < 3s
- [ ] API calls cached where appropriate
- [ ] Images optimized (WebP format)
- [ ] No console errors or warnings

### API Integration
- [ ] All 25 endpoints integrated
- [ ] Error responses handled correctly
- [ ] CSRF tokens included in POST requests
- [ ] Session cookies managed properly
- [ ] Auth redirect on 401/403

---

## 🎓 Learning Path

**If you know React:**
1. Read ENTROFIX_FRONTEND_SPEC.md (design system)
2. Read ENTROFIX_API_INTEGRATION_GUIDE.md (APIs)
3. Skip ENTROFIX_COMPONENT_LIBRARY.md (standard React patterns)
4. Follow ENTROFIX_QUICK_START.md (implementation)

**If you know Vue/Angular but not React:**
1. Learn React basics (30 min)
2. Read all 4 documents in order
3. Follow ENTROFIX_QUICK_START.md with extra time for React concepts

**If you're new to web development:**
1. Learn JavaScript fundamentals (2 days)
2. Learn React basics (5 days)
3. Then follow the path for "If you know React"

---

## 🆘 Getting Help

### Issue: API returning 401 (Unauthorized)
**Check:** ENTROFIX_API_INTEGRATION_GUIDE.md § 3.3-3.4 (Auth flow)  
**Likely cause:** Session cookie not sent with request

### Issue: Component not rendering
**Check:** ENTROFIX_COMPONENT_LIBRARY.md § Directory Structure  
**Likely cause:** Import path is wrong or file in wrong location

### Issue: Waveform not displaying
**Check:** ENTROFIX_QUICK_START.md § Phase 4  
**Likely cause:** Audio URL not HTTPS or CORS headers missing

### Issue: TailwindCSS classes not working
**Check:** ENTROFIX_COMPONENT_LIBRARY.md § TailwindCSS Configuration  
**Likely cause:** Content path not configured correctly

---

## 📞 Reference Checklists

### Daily Development Checklist
- [ ] All API calls have error handling
- [ ] All forms have validation
- [ ] All async operations show loading state
- [ ] All user actions show toast notification
- [ ] TypeScript types are complete (no `any`)
- [ ] Mobile view tested at 375px width
- [ ] Code committed to Git

### Feature Completion Checklist
- [ ] API integration done
- [ ] UI matches ENTROFIX_FRONTEND_SPEC.md
- [ ] Mobile responsive
- [ ] Accessibility tested (keyboard navigation)
- [ ] Error cases handled
- [ ] Unit tests written (if applicable)
- [ ] Component documented in Storybook

### Before Deployment
- [ ] All tests passing
- [ ] No console errors/warnings
- [ ] Performance metrics good (LCP, CLS, FID)
- [ ] Bundle size optimized
- [ ] Environment variables set
- [ ] API endpoints verified
- [ ] Database migrations checked

---

## 📞 Quick Links

| Resource | Link |
|----------|------|
| Design System | ENTROFIX_FRONTEND_SPEC.md |
| API Reference | ENTROFIX_API_INTEGRATION_GUIDE.md |
| Code Templates | ENTROFIX_COMPONENT_LIBRARY.md |
| Implementation | ENTROFIX_QUICK_START.md |
| Master Spec | FIXENSY_MASTER_PROMPT.md |
| Backend Status | FIXENSY_STATUS.md |
| Backend APIs | FIXENSY_CODEBASE.md |

---

## 🎉 Success Criteria

**When is the frontend "done"?**

✅ All 4 user roles can login  
✅ Super Admin can manage admins  
✅ Admin can create projects + assign tasks  
✅ Annotator can draw segments + submit  
✅ Reviewer can approve/reject  
✅ Mobile responsive on all pages  
✅ No console errors  
✅ All API endpoints integrated  
✅ Proper error handling everywhere  
✅ Toast notifications for all actions  

---

## 🚀 Getting Started Right Now

**Next 5 minutes:**
1. Open ENTROFIX_QUICK_START.md
2. Run `npm create vite@latest entrofix-frontend -- --template react-ts`
3. Install TailwindCSS: `npm install -D tailwindcss postcss autoprefixer`
4. Create src/ directory structure (see ENTROFIX_COMPONENT_LIBRARY.md)

**Next 30 minutes:**
1. Follow Phase 1 of ENTROFIX_QUICK_START.md (Project Setup)
2. Start `npm run dev`
3. You should see blank React app

**Next 2 hours:**
1. Build Login page (see Phase 2)
2. Test login with backend (Django running on 8080)
3. You should be redirected to dashboard

**Congratulations!** 🎉 You've started EntroFix!

---

## 📝 Notes for Future Reference

- All designs are **responsive-first** (mobile → tablet → desktop)
- All APIs use **session-based authentication** (not JWT)
- **CSRF tokens** are required for POST/PUT/PATCH requests
- **TailwindCSS** is the only styling library (no Styled Components, Emotion, etc.)
- **Zustand** is chosen for state management (simple, lightweight)
- **TypeScript** is mandatory (no JavaScript files)

---

**Document Created:** 2 May 2026  
**Status:** ✅ Ready for Development  
**Version:** 1.0  

**Next Step:** Open ENTROFIX_QUICK_START.md and begin coding! 🚀

---
