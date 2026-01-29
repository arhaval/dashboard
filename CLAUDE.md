# Arhaval Dashboard

Production-grade internal operations panel for team management, work tracking, payments, financials, and social media performance.

## Project Overview

**Type:** Enterprise Internal Dashboard  
**Stack:** Next.js 14 (App Router) + Supabase + TypeScript + Vercel  
**Status:** Production Development  

This is NOT a demo project. All code must be production-ready, secure, and scalable.

---

## Development Mindset

This project follows a **product mindset**, not a project mindset.

### Core Principles

- **Long-term product**: This is a permanent internal tool, not a temporary solution
- **Reusability first**: Every feature, component, and function must be designed for reuse
- **No quick hacks**: Avoid one-off logic, shortcuts, or "just make it work" solutions
- **Systems thinking**: Think in systems and modules, not individual pages
- **Future-proof**: Code must be maintainable by a future team member who has never seen it
- **Design stability**: Never redesign the UI theme unless explicitly instructed by the user

### Decision Framework

Before writing any code, ask:
1. Can this be reused elsewhere?
2. Will this be maintainable in 6 months?
3. Does this follow established patterns?
4. Is this the simplest solution that works?

---

## Design Philosophy

### Visual Identity

**Aesthetic:** Corporate Minimalism with Swiss Design influences  
**Theme:** Dark-first with high contrast  
**Status:** LOCKED - Do not modify without explicit instruction

```
Primary Background:    #0A0A0A (near black)
Secondary Background:  #141414 (elevated surfaces)
Tertiary Background:   #1F1F1F (cards, modals)
Border:                #2A2A2A (subtle dividers)

Text Primary:          #FAFAFA (headings, emphasis)
Text Secondary:        #A1A1A1 (body text)
Text Muted:            #6B6B6B (labels, hints)

Arhaval Accent:        #FF4D00 (primary actions, highlights)
Arhaval Accent Light:  #FF6B2C (hover states)
Arhaval Accent Muted:  rgba(255, 77, 0, 0.15) (backgrounds)

Success:               #22C55E
Warning:               #EAB308
Error:                 #EF4444
Info:                  #3B82F6
```

### Typography

```
Display/Headings:  "Instrument Sans" or "DM Sans" (weight: 500-700)
Body:              "IBM Plex Sans" (weight: 400-500)
Monospace/Data:    "IBM Plex Mono" (tables, numbers, code)
```

### Design Rules

- NO game aesthetics, playful elements, or entertainment-style UI
- NO gradients except subtle surface elevation
- NO rounded corners beyond 8px (prefer 4px-6px)
- NO decorative shadows (use border or elevation only)
- NO hardcoded colors - always use CSS variables or Tailwind config
- Cards: 1px border with `#2A2A2A`, no shadow
- Spacing: 4px base unit (4, 8, 12, 16, 24, 32, 48, 64)
- Data hierarchy through typography weight and color, not decoration
- Tables: zebra striping with `#141414` / `#0F0F0F`
- Status badges: pill shape, muted backgrounds, no borders

---

## UI Consistency & Design System

### Layout System (Mandatory)

All pages MUST use the shared dashboard layout. No exceptions.

```
┌─────────────────────────────────────────────────────┐
│                     Header                          │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│          │                                          │
│ Sidebar  │              Content                     │
│          │                                          │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

**Layout Rules:**
- Layout structure is FIXED: Sidebar → Header → Content
- Pages must NOT create custom layouts
- All layout components live in `src/components/layout/`
- Content area has consistent padding: `p-6` (24px)

### Page Structure (Mandatory)

Every page MUST follow this structure:

```tsx
// src/app/(dashboard)/[module]/page.tsx

export default function ModulePage() {
  return (
    <PageShell
      title="Page Title"
      description="Optional description"
      actions={<ActionButtons />}  // Optional
    >
      {/* 1. Filters/Controls (if needed) */}
      <FilterBar />
      
      {/* 2. Content (cards/tables/charts) */}
      <ContentSection />
    </PageShell>
  );
}
```

### PageShell Component

Every page MUST be wrapped in `PageShell`. This component provides:
- Consistent page header with title
- Breadcrumb navigation
- Action button slot
- Consistent content spacing

```tsx
interface PageShellProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}
```

### UI Primitives (Mandatory)

All UI elements MUST use components from `src/components/ui/`:

| Element | Component | Location |
|---------|-----------|----------|
| Buttons | `Button` | `ui/button.tsx` |
| Inputs | `Input` | `ui/input.tsx` |
| Select | `Select` | `ui/select.tsx` |
| Cards | `Card` | `ui/card.tsx` |
| Tables | `DataTable` | `ui/data-table.tsx` |
| Modals | `Dialog` | `ui/dialog.tsx` |
| Badges | `Badge` | `ui/badge.tsx` |
| Tabs | `Tabs` | `ui/tabs.tsx` |
| Dropdowns | `DropdownMenu` | `ui/dropdown-menu.tsx` |

**Rules:**
- No custom page-level styling
- No inline styles
- No one-off component variations
- Extend existing components if needed, don't create duplicates

### Theme Rules (Enforced)

| Rule | Requirement |
|------|-------------|
| Colors | Use CSS variables only (`var(--color-*)`) |
| Border Radius | Maximum 8px, prefer 4px-6px |
| Spacing | 4px scale only (4, 8, 12, 16, 24, 32, 48, 64) |
| Shadows | NONE - use borders for elevation |
| Theme Changes | PROHIBITED without explicit instruction |

### Prohibited UI Patterns

- ❌ Different styles per page
- ❌ Experimental or custom layouts
- ❌ Playful or game-like visuals
- ❌ Animated backgrounds or decorative elements
- ❌ Custom scrollbars
- ❌ Gradient text or buttons
- ❌ Icon-only buttons without tooltips
- ❌ Inconsistent spacing between pages

---

## Architecture

### Layer Separation (Enforced)

```
┌─────────────────────────────────────────────────────┐
│                   UI Layer                          │
│         (Components, Pages, Layouts)                │
│                      │                              │
│                      ▼                              │
├─────────────────────────────────────────────────────┤
│                 Hooks Layer                         │
│      (useWorkItems, usePayments, useAuth)           │
│                      │                              │
│                      ▼                              │
├─────────────────────────────────────────────────────┤
│               Services Layer                        │
│   (workItemService, paymentService, authService)    │
│                      │                              │
│                      ▼                              │
├─────────────────────────────────────────────────────┤
│                 Data Layer                          │
│         (Supabase Client, API Routes)               │
└─────────────────────────────────────────────────────┘
```

**Strict Rules:**
- Components NEVER call Supabase directly
- All data fetching goes through services or API routes
- Hooks encapsulate business logic and state
- Services handle data transformation and API calls

### Single Source of Truth Rule

- Business logic must exist in ONE place only (service layer)
- No duplicated logic across pages or components
- If logic is reused twice, extract it to a service or hook
- Constants, enums, and type definitions live in dedicated files
- Never copy-paste logic — abstract it

```typescript
// ❌ WRONG: Same calculation in two places
// pages/work/page.tsx
const total = items.reduce((sum, i) => sum + i.cost, 0);

// pages/payments/page.tsx
const total = items.reduce((sum, i) => sum + i.cost, 0);

// ✅ CORRECT: Single source in service
// services/work-item.service.ts
export const calculateTotal = (items: WorkItem[]) => 
  items.reduce((sum, i) => sum + (i.cost ?? 0), 0);

// Then import and use everywhere
import { calculateTotal } from '@/services/work-item.service';
```

### Directory Structure

```
arhaval-dashboard/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth routes (login)
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   │   ├── layout.tsx      # Dashboard layout (Sidebar + Header)
│   │   │   ├── page.tsx        # Dashboard home
│   │   │   ├── team/           # Team management
│   │   │   ├── work/           # Work items (STREAM, VOICE, EDIT)
│   │   │   ├── payments/       # Payment processing
│   │   │   ├── finance/        # Financial ledger
│   │   │   ├── social/         # Social media stats
│   │   │   └── reports/        # PDF report generation
│   │   ├── api/                # API routes
│   │   └── layout.tsx          # Root layout
│   │
│   ├── components/
│   │   ├── ui/                 # Base UI primitives (MANDATORY)
│   │   ├── forms/              # Form components with validation
│   │   ├── tables/             # Data table components
│   │   ├── charts/             # Chart components
│   │   ├── layout/             # Layout components (Sidebar, Header, PageShell)
│   │   └── [feature]/          # Feature-specific components
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       # Browser client
│   │   │   ├── server.ts       # Server client
│   │   │   ├── admin.ts        # Admin client (service role)
│   │   │   └── middleware.ts   # Auth middleware
│   │   ├── utils/              # Utility functions
│   │   └── validations/        # Zod schemas
│   │
│   ├── services/               # Data services (NEW)
│   │   ├── work-item.service.ts
│   │   ├── payment.service.ts
│   │   ├── finance.service.ts
│   │   ├── social.service.ts
│   │   └── user.service.ts
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-work-items.ts
│   │   ├── use-payments.ts
│   │   ├── use-finance.ts
│   │   └── use-auth.ts
│   │
│   ├── types/                  # TypeScript type definitions
│   ├── constants/              # App constants
│   └── styles/
│       └── globals.css         # Global styles + CSS variables
│
├── supabase/
│   ├── migrations/             # Database migrations
│   └── seed.sql                # Seed data
│
├── public/                     # Static assets
├── .env.local                  # Local environment (git-ignored)
├── .env.example                # Environment template
└── CLAUDE.md                   # This file
```

### Service Layer Pattern

```typescript
// src/services/work-item.service.ts

import { createServerClient } from '@/lib/supabase/server';
import type { WorkItem, CreateWorkItemInput } from '@/types';

export const workItemService = {
  async getAll(filters?: WorkItemFilters): Promise<WorkItem[]> {
    const supabase = await createServerClient();
    // Implementation
  },
  
  async getById(id: string): Promise<WorkItem | null> {
    // Implementation
  },
  
  async create(input: CreateWorkItemInput): Promise<WorkItem> {
    // Implementation
  },
  
  async updateStatus(id: string, status: WorkStatus): Promise<WorkItem> {
    // Implementation
  },
};
```

### Hook Pattern

```typescript
// src/hooks/use-work-items.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useWorkItems(filters?: WorkItemFilters) {
  return useQuery({
    queryKey: ['work-items', filters],
    queryFn: () => fetch('/api/work-items?' + new URLSearchParams(filters)),
  });
}

export function useCreateWorkItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (input: CreateWorkItemInput) => 
      fetch('/api/work-items', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
    },
  });
}
```

### Database Schema

```sql
-- ENUMS
CREATE TYPE user_role AS ENUM ('ADMIN', 'PUBLISHER', 'EDITOR', 'VOICE');
CREATE TYPE work_type AS ENUM ('STREAM', 'VOICE', 'EDIT');
CREATE TYPE work_status AS ENUM ('DRAFT', 'APPROVED', 'PAID');
CREATE TYPE content_length AS ENUM ('SHORT', 'LONG');
CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');

-- USERS (managed by admin, no self-registration)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WORK ITEMS (all work tracked here)
CREATE TABLE work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  work_type work_type NOT NULL,
  status work_status DEFAULT 'DRAFT',
  
  -- Common fields
  work_date DATE NOT NULL,
  cost DECIMAL(10,2),
  notes TEXT,
  
  -- STREAM specific
  match_name TEXT,
  duration_minutes INTEGER,
  
  -- VOICE/EDIT specific
  content_name TEXT,
  content_length content_length,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENTS (created when work items marked as paid)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENT_ITEMS (links payments to work items)
CREATE TABLE payment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  work_item_id UUID REFERENCES work_items(id) ON DELETE CASCADE
);

-- FINANCIAL TRANSACTIONS (income/expense ledger)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type transaction_type NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL,
  
  -- Optional link to payment (for team expenses)
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SOCIAL MEDIA STATS (period-based, not content-based)
CREATE TABLE social_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL, -- 'twitch', 'youtube', 'instagram', 'x'
  period_type TEXT NOT NULL, -- 'weekly', 'monthly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Metrics (flexible JSON for platform differences)
  metrics JSONB NOT NULL DEFAULT '{}',
  
  is_manual BOOLEAN DEFAULT false, -- true for Instagram/X
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(platform, period_type, period_start)
);

-- ADVANCES (team advances)
CREATE TABLE advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  advance_date DATE NOT NULL,
  notes TEXT,
  is_settled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_work_items_user ON work_items(user_id);
CREATE INDEX idx_work_items_status ON work_items(status);
CREATE INDEX idx_work_items_date ON work_items(work_date);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_social_stats_platform ON social_stats(platform, period_start);
```

---

## Security (Enforced)

### Authentication & Authorization

Every protected action MUST verify:
1. User is authenticated
2. User has required role
3. User has permission for the specific resource

```typescript
// Required pattern for all API routes
export async function POST(request: Request) {
  const supabase = await createServerClient();
  
  // 1. Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 2. Get user role from database
  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  
  // 3. Check role permission
  if (dbUser?.role !== 'ADMIN') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // 4. Validate input
  const body = await request.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }
  
  // Process request...
}
```

### Security Rules

| Rule | Requirement |
|------|-------------|
| Auth Check | Every API route MUST verify authentication |
| Role Check | Every sensitive action MUST verify role |
| Input Validation | Every API route MUST validate with Zod |
| RLS | Supabase RLS MUST be enabled and configured |
| Secrets | NO secrets in client-side code |
| Environment | ALL secrets in environment variables |

### Row Level Security (RLS)

Assume RLS is ALWAYS active. Write queries accordingly:

```sql
-- Example RLS policies
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;

-- Users can view their own work items
CREATE POLICY "Users view own work items" ON work_items
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all work items
CREATE POLICY "Admins view all work items" ON work_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
```

### User Roles & Permissions

| Action | Admin | Publisher | Editor | Voice |
|--------|-------|-----------|--------|-------|
| View Dashboard | ✓ | ✓ | ✓ | ✓ |
| View Own Work | ✓ | ✓ | ✓ | ✓ |
| View All Work | ✓ | ✗ | ✗ | ✗ |
| Create Work Item | ✓ | ✓ (STREAM, VOICE) | ✓ (EDIT) | ✓ (VOICE) |
| Edit Work Cost | ✓ | ✗ | ✗ | ✗ |
| Approve Work | ✓ | ✗ | ✗ | ✗ |
| Process Payments | ✓ | ✗ | ✗ | ✗ |
| View Finance | ✓ | ✗ | ✗ | ✗ |
| Manage Users | ✓ | ✗ | ✗ | ✗ |
| Enter Social Stats | ✓ | ✗ | ✗ | ✗ |
| Generate Reports | ✓ | ✗ | ✗ | ✗ |

---

## Performance (Enforced)

### Rendering Strategy

| Scenario | Strategy |
|----------|----------|
| Default | Server Components |
| User interaction needed | Client Components with `'use client'` |
| Real-time data | Client Components with React Query |
| Static content | Server Components with caching |

### Mandatory Performance Rules

| Rule | Implementation |
|------|----------------|
| Server Components | Use by default, `'use client'` only when necessary |
| Pagination | ALL tables must paginate (20 items/page default) |
| Lazy Loading | Heavy modules (charts, modals, PDF) must be lazy loaded |
| Re-renders | Minimize with `useMemo`, `useCallback`, proper deps |
| Images | Always use `next/image` with proper sizing |
| Queries | Index all frequently queried columns |
| Realtime | Use Supabase realtime ONLY where necessary |

### Data Fetching Pattern

```typescript
// Server Component (preferred)
async function WorkItemsPage() {
  const items = await workItemService.getAll();
  return <WorkItemsTable data={items} />;
}

// Client Component (when needed)
'use client';

function WorkItemsTable({ initialData }) {
  const { data, isLoading } = useWorkItems({ 
    initialData,
    refetchInterval: 30000  // Only if real-time needed
  });
  
  return <DataTable data={data} />;
}
```

### Lazy Loading Pattern

```typescript
import dynamic from 'next/dynamic';

// Lazy load heavy components
const Chart = dynamic(() => import('@/components/charts/Chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false
});

const PDFGenerator = dynamic(() => import('@/components/PDFGenerator'), {
  loading: () => <Spinner />,
  ssr: false
});
```

---

## Coding Standards

### TypeScript

```typescript
// Always use explicit types, never `any`
// Use interfaces for objects, types for unions/primitives

interface WorkItem {
  id: string;
  userId: string;
  workType: 'STREAM' | 'VOICE' | 'EDIT';
  status: 'DRAFT' | 'APPROVED' | 'PAID';
  workDate: Date;
  cost: number | null;
}

// Use Zod for runtime validation
const workItemSchema = z.object({
  workType: z.enum(['STREAM', 'VOICE', 'EDIT']),
  workDate: z.coerce.date(),
  cost: z.number().positive().optional(),
});
```

### Component Patterns

```typescript
// Server Components by default (no 'use client' unless needed)
// Co-locate related files

// src/components/work/WorkItemCard.tsx
interface WorkItemCardProps {
  item: WorkItem;
  onStatusChange?: (id: string, status: WorkStatus) => void;
}

export function WorkItemCard({ item, onStatusChange }: WorkItemCardProps) {
  // Implementation
}

// Use composition over prop drilling
// Extract hooks for complex state logic
// Keep components under 150 lines
```

### Error Handling

```typescript
// Use custom error classes
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 400
  ) {
    super(message);
  }
}

// Wrap async operations
async function safeAsync<T>(
  promise: Promise<T>
): Promise<[T, null] | [null, Error]> {
  try {
    return [await promise, null];
  } catch (error) {
    return [null, error as Error];
  }
}
```

---

## Environment Variables

```bash
# .env.local (NEVER commit this file)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: External APIs
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
YOUTUBE_API_KEY=
```

---

## Key Business Logic

### Work Item Flow

```
1. Team member creates WorkItem (status: DRAFT)
2. Admin reviews and sets cost (status: APPROVED)
3. Admin selects approved items for payment
4. Payment created → WorkItems status: PAID
5. Transaction record created (type: EXPENSE)
6. Only PAID items appear in financial reports
```

### Payment Processing

```typescript
async function processPayment(userId: string, workItemIds: string[]) {
  // 1. Validate all items are APPROVED and belong to user
  // 2. Calculate total amount
  // 3. Create Payment record
  // 4. Create PaymentItems linking payment to work items
  // 5. Update WorkItems status to PAID
  // 6. Create Transaction record (EXPENSE)
  // All in a single transaction
}
```

### Financial Rules

- Only PAID work items create expenses
- Manual income/expenses can be added independently
- Advances are tracked separately from payments
- Monthly filtering for all financial views
- Categories: Team Payments, Advances, Operations, Equipment, Other

---

## Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint check
npm run type-check       # TypeScript check

# Database
npx supabase db push     # Push migrations
npx supabase db reset    # Reset and re-seed
npx supabase gen types   # Generate TypeScript types

# Testing
npm run test             # Run tests
npm run test:e2e         # E2E tests with Playwright
```

---

## Module Implementation Order

1. **Auth & Layout** - Login, protected routes, sidebar navigation, PageShell
2. **UI Primitives** - Button, Input, Card, Table, Dialog, Badge components
3. **Team Management** - User CRUD (admin only)
4. **Work Items** - Create, list, filter, status management
5. **Payments** - Selection interface, payment processing
6. **Finance** - Ledger, manual entries, filtering
7. **Social Stats** - Data entry, charts, period comparison
8. **Reports** - PDF generation with jsPDF or react-pdf

---

## Prohibited Patterns

### Code Quality
- ❌ `any` type in TypeScript
- ❌ Console.log in production code
- ❌ Inline styles (use Tailwind classes)
- ❌ Direct DOM manipulation
- ❌ Unhandled promise rejections
- ❌ Hardcoded credentials or URLs
- ❌ Components over 200 lines
- ❌ Nested ternaries beyond 2 levels
- ❌ Magic numbers without constants
- ❌ Commented-out code blocks

### Architecture
- ❌ Direct Supabase calls in components
- ❌ Business logic in components
- ❌ API calls without error handling
- ❌ Missing input validation
- ❌ Skipping auth checks

### UI/UX
- ❌ Custom layouts per page
- ❌ Hardcoded colors
- ❌ Inconsistent spacing
- ❌ Missing loading states
- ❌ Missing error states
- ❌ Non-paginated tables

---

## Access Control & Data Validation Rules

### Strict Access Control (Critical)

This system is **private and role-restricted**. Security violations are unacceptable.

#### User Data Isolation

| Data Type | Owner Access | Admin Access | Other Users |
|-----------|--------------|--------------|-------------|
| User Profile | Read/Edit Own | Full Access | ❌ FORBIDDEN |
| Work Items | Read/Edit Own | Full Access | ❌ FORBIDDEN |
| Payments | ❌ Read Only | Full Access | ❌ FORBIDDEN |
| Financial Data | ❌ NO ACCESS | Full Access | ❌ FORBIDDEN |
| Social Stats | ❌ Read Only | Full Access | ❌ FORBIDDEN |

#### Enforcement Rules

- Users must NEVER see, access, query, or modify other users' profiles unless they are ADMIN
- Non-admin users may ONLY view and edit their OWN profile data
- Work items must be visible only to:
  - The user who owns the work item
  - Admins
- Financial data is ADMIN-only
- Payment data is ADMIN-only
- Social media stats editing is ADMIN-only

#### Technical Requirements

```typescript
// EVERY query must include ownership filter for non-admins
const getWorkItems = async (userId: string, role: UserRole) => {
  const query = supabase.from('work_items').select('*');
  
  // Non-admins can ONLY see their own data
  if (role !== 'ADMIN') {
    query.eq('user_id', userId);
  }
  
  return query;
};
```

- Row Level Security (RLS) must be assumed active on ALL tables
- All queries must enforce user ownership filtering
- Never trust client-side role checks alone
- Server-side verification is MANDATORY

### Data Validation (No Empty Data)

#### Form Validation Rules

| Rule | Enforcement |
|------|-------------|
| Required fields | NEVER optional in forms |
| Critical inputs | Validated with Zod |
| Empty submissions | BLOCKED at form level |
| Server validation | MANDATORY even with client validation |
| Incomplete records | NOT ALLOWED in database |

#### Validation Pattern

```typescript
// Client-side (first layer)
const formSchema = z.object({
  workType: z.enum(['STREAM', 'VOICE', 'EDIT']),
  workDate: z.coerce.date(),
  // Required fields - no .optional()
  matchName: z.string().min(1, 'Match name is required'),
});

// Server-side (second layer - MANDATORY)
export async function POST(request: Request) {
  const body = await request.json();
  
  // Re-validate EVERYTHING on server
  const result = formSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }
  
  // Only proceed with validated data
  const validatedData = result.data;
}
```

### Prohibited Behavior (Zero Tolerance)

These actions are **strictly forbidden** and must be blocked at both UI and API levels:

| Action | Reason | Enforcement |
|--------|--------|-------------|
| User changing own role | Security violation | Hide UI + Block API |
| User assigning cost to own work | Conflict of interest | Hide UI + Block API |
| User marking own work as paid | Financial fraud prevention | Hide UI + Block API |
| Direct DB operations from client | Security + Architecture | Block at code review |
| Accessing other users' data | Privacy violation | RLS + API checks |

#### Implementation

```typescript
// Block self-cost-assignment
export async function updateWorkItemCost(
  workItemId: string, 
  cost: number, 
  currentUserId: string
) {
  const workItem = await getWorkItem(workItemId);
  
  // BLOCK: User cannot set cost on their own work
  if (workItem.user_id === currentUserId) {
    throw new AppError('Cannot set cost on your own work item', 'FORBIDDEN', 403);
  }
  
  // Only admins can set cost (already checked in middleware)
  return updateCost(workItemId, cost);
}

// Block self-payment
export async function markWorkItemAsPaid(
  workItemId: string,
  currentUserId: string
) {
  const workItem = await getWorkItem(workItemId);

  // BLOCK: User cannot mark their own work as paid
  if (workItem.user_id === currentUserId) {
    throw new AppError('Cannot mark your own work as paid', 'FORBIDDEN', 403);
  }

  return processPayment(workItemId);
}
```

---

## Development Workflow (MANDATORY)

### Dev Server Management

When starting the dev server or encountering rendering issues:

```bash
# 1. Kill all node processes
powershell -Command "Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force"

# 2. Delete .next cache
rm -rf .next

# 3. Start fresh dev server
npm run dev
```

**IMPORTANT:** Always clean `.next` folder when:
- Rendering is stuck or frozen
- Hot reload is not working
- Strange caching issues occur
- After major file structure changes

### Import Rules (MANDATORY)

**NEVER use barrel imports from `@/components/ui`**

```typescript
// ❌ WRONG - Barrel import
import { Button, Input, Select } from '@/components/ui';

// ✅ CORRECT - Direct file imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
```

**Reason:** Barrel imports can cause:
- Circular dependency issues
- Slower builds and hot reload
- Missing export errors at runtime
- Rendering stuck on page load

### Pre-Build Checklist

Before running `npm run build`:
1. Kill any running dev server
2. Delete `.next` folder
3. Run `npm run build`

```bash
powershell -Command "Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force"
rm -rf .next
npm run build
```
