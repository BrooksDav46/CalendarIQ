# ClientFlow AI Coding Instructions

## Project Overview
**ClientFlow** is a Next.js 16 + React 19 web application for client intake management and calendar scheduling. It uses Clerk for authentication and localStorage for persistence. The app displays as "Recon IQ" in the dashboard.

### Core Purpose
- **Intake Flow**: Collect client contact, phone, address, and notes (saved per `userId`)
- **Calendar/Schedule**: Monthly calendar view with draggable job actions (Inspection, Install, Repair, Phone Call, Follow-up, Invoice, Other)
- **Authentication**: Clerk-based auth with protected `/dashboard/*` routes

## Architecture & Key Components

### Data Persistence Layer
**File**: [app/lib/storage.ts](app/lib/storage.ts)
- Uses **browser localStorage** (client-side only) with namespaced keys: `calendariq:intake:v1:{userId}` and `calendariq:calendar:v1:{userId}`
- Two main entities:
  - **Intake**: `fullName`, `phone`, `address`, `notes`, `completedAt` (timestamp)
  - **CalendarItem**: `id`, `dateKey` (YYYY-MM-DD), `type`, `title`, `createdAt`
- Functions follow pattern: `load{Entity}(userId)`, `save{Entity}(userId, data)`, `clear{Entity}(userId)`
- Always checks `typeof window === "undefined"` for SSR safety

### Authentication & Route Protection
**Files**: [middleware.ts](middleware.ts), [app/layout.tsx](app/layout.tsx)
- Uses `@clerk/nextjs` for auth integration
- RootLayout wraps app in `<ClerkProvider>` (required for all child components)
- Middleware protects `/dashboard/*` routes via `createRouteMatcher(["/dashboard(.*)"])`
- Public routes: `/` (auth page), `/sign-in/*`, `/sign-up/*`
- All protected pages can access user via `useUser()` hook from Clerk

### Page Structure
```
app/page.tsx           → Custom email/code-based auth UI (legacy, not Clerk sign-up)
app/dashboard/         → Protected hub page with nav links
  ├─ page.tsx         → Dashboard hub (UserButton + links to intake/schedule)
  ├─ intake/page.tsx  → Loads IntakeForm component
  └─ schedule/page.tsx → Full calendar view (largest component ~390 lines)
```

## Development Workflows

### Build & Run
- **Dev**: `npm run dev` (starts Next.js dev server at http://localhost:3000)
- **Build**: `npm build` (prod build)
- **Lint**: `npm run lint` (ESLint validation)
- Hot reload enabled by default in dev mode

### Key Dependencies
- **Next.js 16.1.1** (App Router, file-based routing)
- **React 19.2.3** + **react-dom** (latest hooks)
- **@clerk/nextjs ^6.36.7** (auth, `useUser()`, `UserButton`)
- **Tailwind CSS 4** (utility styling)
- **TypeScript 5** (strict mode enabled)

## Code Patterns & Conventions

### Component Patterns
1. **Client Components** marked with `"use client"` (all interactive pages)
   - `app/page.tsx`, `components/IntakeForm.tsx`, `app/dashboard/schedule/page.tsx`
2. **Server Components** by default (e.g., `app/dashboard/page.tsx`)
3. **Type-First Development**:
   - Type definitions at top of file (see `app/page.tsx`)
   - Example: `type Intake = { fullName: string; phone: string; ... }`
4. **useState + useEffect** for local state and side effects
5. **useUser()** hook always checks `isLoaded` and `user?.id` before localStorage operations

### Form & Storage Pattern (IntakeForm)
```tsx
// 1. Load on mount (after user loads)
useEffect(() => {
  if (!isLoaded || !user?.id) return;
  const existing = loadIntake(user.id);
  if (existing) setForm({...});
}, [isLoaded]);

// 2. Save on submit
const handleSave = () => {
  saveIntake(user.id, {...form, completedAt: Date.now()});
};
```

### Calendar View Pattern (schedule/page.tsx)
- Generates 6x7 grid (Monday-start weeks) using `buildGrid(viewDate)`
- Uses YYYY-MM-DD string keys for date comparison
- `loadCalendar(userId)` returns array; modifications → `saveCalendar()` + re-render
- Helper functions: `toKey(date)`, `monthLabel(date)`, `isToday(date)`, `addMonths(date, delta)`

### Styling Conventions
- **Tailwind CSS** utility classes (no custom CSS)
- Responsive design: `sm:grid-cols-2`, `min-h-screen`, `max-w-5xl`
- Common patterns: `bg-gray-100`, `rounded-lg`, `shadow`, `hover:shadow-md transition`
- Font system via Geist (Google Fonts, configured in layout)

## Integration Points

### Clerk Integration
- **useUser()**: Returns `{ user, isLoaded }`. Always guard on `isLoaded` first
- **UserButton**: Clerk's UI component, imported from `@clerk/nextjs`
- **Protected Routes**: Clerk middleware auto-redirects unauthenticated users to `/sign-in`

### localStorage Patterns
- **Safe Access**: Always wrap in try/catch, check `typeof window`
- **Data Format**: JSON serialization for all objects
- **Keys**: Namespace by feature + version for future migrations (e.g., `calendariq:intake:v1:{userId}`)
- **Client-Only**: No server-side persistence (consider adding backend if scaling)

## File Location Glossary
- **Components**: `components/` (reusable UI, e.g., IntakeForm)
- **Pages**: `app/` (route-based, each is a page component)
- **Lib/Utilities**: `app/lib/` (shared functions, storage, helpers)
- **Styles**: `app/globals.css` (global Tailwind/CSS)
- **Config**: Root level (next.config.ts, tsconfig.json, postcss.config.mjs)

## Common Tasks for AI Agents

### Adding a new form field to Intake
1. Update `Intake` type in [app/lib/storage.ts](app/lib/storage.ts)
2. Add input field in [components/IntakeForm.tsx](components/IntakeForm.tsx) (connect to state)
3. Update load/save logic if field has special handling

### Adding a new calendar action type
1. Add to `ActionType` union in [app/dashboard/schedule/page.tsx](app/dashboard/schedule/page.tsx)
2. Add entry to `ACTIONS` array with hint text
3. CalendarItem type already supports dynamic `type` field

### Debugging localStorage
- Check browser DevTools → Application → LocalStorage for key/value inspection
- Keys follow pattern: `calendariq:*:v1:{userId}`
- If data corrupts, clear via `clearIntake(userId)` or `clearCalendar(userId)` functions

## Future Considerations
- **No backend**: Currently all data is client-side; consider adding API routes (`app/api/`) if persistence needed
- **Multi-device sync**: localStorage is per-device; would need server-side storage
- **Type Safety**: Already using strict TypeScript; maintain type-first approach in new features
