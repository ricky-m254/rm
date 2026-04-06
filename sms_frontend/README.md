# SMS Frontend

This app is the frontend for the Student Management System (SMS). It uses Vite + React + TypeScript, Tailwind, and shadcn/ui patterns.

## Run

```bash
npm install
npm run dev
```

## API Integration

- Base URL is controlled by `VITE_API_BASE_URL` (defaults to `http://demo.localhost:8000`).
- The API client prepends `/api` internally.
- Tenant routing uses `X-Tenant-ID` (stored from login input).
- Auth uses JWT from `/api/auth/login/`.
- Permissions are fetched from `/api/dashboard/routing/` and stored in `sms_permissions` + `sms_user.permissions`.
- Idle security: users are automatically logged out after 15 minutes of inactivity (see `src/components/IdleLogout.tsx`).
- Responsive layout tuned for mobile and tablet breakpoints; tables scroll horizontally on small screens.

## Real Data vs Mockups

Live backend data is used in:
- Login: `POST /api/auth/login/`.
- Dashboard summary: `GET /api/dashboard/summary/`.
- Students dashboard:
  - `GET /api/students/summary/`
  - `GET /api/students/`
- Finance dashboard:
  - `GET /api/finance/summary/`
  - `GET /api/finance/invoices/` (supports pagination)
  - `GET /api/finance/payments/` (supports pagination)
  - `GET /api/finance/expenses/` (supports pagination)
  - Charts: Cashflow from Operating Activities, Debtors Aging Report, Payments by Method, Payments volume.
- Finance invoices:
  - `GET /api/finance/invoices/`
  - `GET /api/finance/invoices/{id}/`
  - `POST /api/finance/payments/{id}/allocate/`
  - `POST /api/finance/invoices/`
  - Allocation popup shows payment date and notes (UI-only, not sent to backend yet).
  - Student context uses:
    - `GET /api/students/{id}/` (includes guardians)
    - `GET /api/finance/ref/enrollments/?student_id={id}` (class/term)
  - Invoice list rows can expand "Context" to show class/term + guardian info.
- Finance payments:
  - `GET /api/finance/payments/`
  - `POST /api/finance/payments/`
  - Payment form shows class + guardian info from student/enrollment endpoints.
  - Payments list rows can expand "Context" to show class/term + guardian info.
- Finance fee assignments:
  - `GET /api/finance/fee-assignments/`
  - `POST /api/finance/fee-assignments/`
  - Fee assignment form shows class + guardian info from student/enrollment endpoints.
- Finance adjustments:
  - `GET /api/finance/invoice-adjustments/`
  - `POST /api/finance/invoice-adjustments/`
  - Adjustment form shows class + guardian info from student/enrollment endpoints.
- Finance expenses:
  - `GET /api/finance/expenses/`
  - `POST /api/finance/expenses/`
  - `PATCH /api/finance/expenses/{id}/`
  - Budget inputs (monthly/quarterly/annual) stored in localStorage under `finance:budget:*`.
  - Spending trends chart is derived from loaded expense data (last 6 months).
  - Budget API contract:
    - `GET /api/v1/finance/budgets`
    - `GET /api/v1/finance/budgets?academicYear=2025&term=1`
    - `POST /api/v1/finance/budgets/` (payload: `academic_year`, `term`, `monthly_budget`, `quarterly_budget`, `annual_budget`)
    - `PUT /api/v1/finance/budgets/{id}/`
  - If budget API is unavailable, the UI uses mock/local values and shows a notice.
  - Expense reporting: CSV export and JSON summary export.
- Finance fee structures:
  - `GET /api/finance/fees/`
  - `POST /api/finance/fees/`
  - `PATCH /api/finance/fees/{id}/`
- Finance academic references (for fee setup):
  - `GET /api/academics/ref/academic-years/`
  - `GET /api/academics/ref/terms/`
- Finance fee assignments:
  - `GET /api/finance/fee-assignments/` (backend route added in `sms_backend/school/urls.py`)
- Finance invoice adjustments:
  - `GET /api/finance/invoice-adjustments/` (backend route added in `sms_backend/school/urls.py`)
  - `POST /api/finance/invoice-adjustments/`
- Finance pagination:
  - Finance list endpoints now return paginated responses (`count`, `results`) with page size 8.
- Settings (local only):
  - Schema-driven settings live under `src/settings/schemas`.
  - Stored in localStorage under `settings:<module>` (example: `settings:finance`).
  - Global theme preference supports `system`, `light`, and `dark`.
  - Permissions debug toggle stored in `settings:debug_show_hidden`.
  - Permissions now come from `/api/dashboard/routing/` and are stored in `sms_permissions` and `sms_user.permissions`.

Mockup placeholders (no backend data yet):
- Main dashboard module navigation uses static labels (no module metadata from API yet).
- Finance charts assume dates exist and do not handle sparse data gracefully.
- Allocation popup payment date/notes are UI-only until backend supports it.
- Budget API is frontend-ready but backend endpoints may be missing.
- If student/guardian or enrollment endpoints are unavailable, finance forms fall back to mock data and show a notice.

If you want mock data for a new screen, add it near the component and tag it with `// TODO: replace with API`.

## Known Gaps / Follow-ups

- Finance charts assume invoice `created_at` and payment `payment_date` are populated; if missing, charts may look sparse.
- Finance tables use client-side pagination; switch to server-side when datasets grow.
- Allocation flow uses `/api/finance/payments/{id}/allocate/` and assumes sufficient balance; backend errors are surfaced but not yet mapped to field-level validation.
- Finance create/edit flows are implemented for most submodules.
- Delete flows are implemented for expenses, fee structures, fee assignments, invoices, and payments.
- Adjustments remain create-only; payments have no edit endpoint; invoices are immutable (edit route is view-only).
- Finance invoice detail is now a modal popup (not inline).
- Settings are currently local-only; backend overrides still needed.
- Parents module:
  - `GET /api/students/` (guardian data derived from student records).
  - Summary + Directory pages are scaffolded under `/modules/parents`.
- Budget persistence depends on `/api/v1/finance/budgets`; mock data is used until backend is ready.









