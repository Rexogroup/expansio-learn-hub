

# Plan: Strip Down to Simple LMS

## Overview
Remove all non-LMS features and simplify the app to just: **Auth**, **Courses** (with Sales Vault tab), **Course View**, **Sales Call View**, and **Admin** (courses/sections/lessons/brands/sales calls/invites only).

## Changes

### 1. Simplify `App.tsx` Routes
- Keep: `/` and `/auth` (Auth), `/signup`, `/courses` (default authenticated route), `/course/:id`, `/sales-call/:id`, `/admin`
- Remove all other routes: `/dashboard`, `/revenue`, `/onboarding`, `/copilot`, `/ai-brain`, `/script-builder`, `/integrations`, `/email-accounts`, `/network`, `/agency/:id`, `/tools`, `/inbox`, `/crm`, `/cold-email-crm`, `/sales-coach`, `/projects`, `/implementation-guide`, `/cold-email-crm`
- Change default post-auth redirect to `/courses`

### 2. Simplify `AppSidebar.tsx`
- Reduce `mainNavItems` to just:
  - **Expansio Accelerator** → `/courses` (GraduationCap icon)
- Keep: Admin link (for admins), user menu with sign out
- Remove: all notification fetching logic, Network link, and all other nav items

### 3. Simplify `Admin.tsx`
- Keep tabs: Courses, Sections, Lessons, Brands, Sales Calls, Invites
- Remove tabs: Onboarding, ICP Profiles, Tool Categories, Tools, Knowledge Base, Services
- Remove unused imports

### 4. Update Auth redirect
- In `Auth.tsx`, change post-login redirect from `/dashboard` to `/courses`

### 5. Files that remain untouched (core LMS)
- `Courses.tsx`, `CourseView.tsx`, `SalesCallView.tsx`, `BrandCard.tsx`, `VideoThumbnail.tsx`
- All admin managers for courses/sections/lessons/brands/sales calls/invites
- `LessonManager.tsx` (with DOCX download), `PdfImporter.tsx`
- Rich text editor and all extensions
- `html-to-docx.ts`, `sanitize.ts`, `validation.ts`

### 6. No database changes needed
All existing tables and RLS policies remain — we're only removing frontend routes and UI elements.

