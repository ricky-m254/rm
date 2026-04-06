# Project Status Handoff (Frontend + Backend)

This document summarizes what has been implemented so far, what is missing, and key integration points. It is intended for the next team to continue the work without losing context.

## Latest Update (April 3, 2026 - Sessions 1 to 10 Regression Sweep Closed Locally)

- Re-ran the focused Session 1 to 10 proof set against the approved local PostgreSQL helper and closed the remaining local regression gaps.
- Session 9 was intentionally skipped in this sweep because it was already verified separately.
- New consolidated verification record:
  - `docs/REPLIT_SESSION_1_TO_10_REGRESSION_SWEEP_2026-04-03.md`
- Focused backend results captured there:
  - Sessions 1 to 4: `11/11 OK`
  - Session 5: `29/29 OK`
  - Session 6: `11/11 OK`
  - Session 7: `9/9 OK`
  - Session 8: `16/16 OK`
  - Session 10: `12/12 OK`
- Shared checks also passed on April 3, 2026:
  - `.venv\\Scripts\\python.exe sms_backend\\manage.py check`
  - `cmd /c npm run typecheck`
  - `cmd /c npm run build`

### Local fixes required during the sweep

- `sms_backend/hr/views.py`
  - fixed Session 6 onboarding shell-profile completion
  - fixed Session 7 long-leave calendar-day approval behavior
  - fixed `USE_TZ=False` datetime coercion
  - refreshed prefetched payroll batches before serializing disbursement and finance-posting responses
- `sms_backend/hr/domain/attendance_operations.py`
  - fixed Session 7 attendance datetime normalization and preserved `AUTO_RESOLVED` alert state
- `sms_backend/hr/domain/payroll_feed.py`
  - fixed Session 8 payroll feed so unpaid absence days come from explicit `Absent` rows instead of all unrecorded calendar days
- `sms_backend/parent_portal/views.py`
  - fixed parent password change for stateless request-factory or API flows without a session object
- keepdb fixture hardening:
  - `sms_backend/hr/test_session6_identity_onboarding.py`
  - `sms_backend/hr/test_session7_workforce_operations.py`
  - `sms_backend/hr/test_session8_payroll_controls.py`
  - `sms_backend/school/test_students_phase5.py`

## Latest Update (April 3, 2026 - Session 10 Control Plane Verification Trail)

- Closed the remaining Session 10 handoff gap on top of the already-landed institution control-plane implementation:
  - backend control-plane ownership, typed security policy, and lifecycle automation live in:
    - `sms_backend/school/models.py`
    - `sms_backend/school/serializers.py`
    - `sms_backend/school/views.py`
    - `sms_backend/school/urls.py`
    - `sms_backend/school/control_plane.py`
    - `sms_backend/school/security_policy.py`
    - `sms_backend/school/lifecycle_automation.py`
    - migrations:
      - `sms_backend/school/migrations/0056_institutionsecuritypolicy_control_plane.py`
      - `sms_backend/school/migrations/0057_lifecycle_automation.py`
  - focused backend proof remains centered in:
    - `sms_backend/school/test_session10_control_plane.py`
  - frontend control-plane and honest settings surfaces are wired in:
    - `sms_frontend/src/api/controlPlane.ts`
    - `sms_frontend/src/pages/settings/SettingsControlPlanePage.tsx`
    - `SettingsSecurityPage.tsx`
    - `SettingsSchoolProfilePage.tsx`
    - `SettingsAcademicsConfigPage.tsx`
    - `ModuleSettingsPage.tsx`
    - `SettingsLayout.tsx`
    - `sms_frontend/src/App.tsx`
- Added the Session 10 tenant runtime guide:
  - `docs/REPLIT_SESSION_10_CONTROL_PLANE_VERIFICATION.md`
  - covers:
    - migration `school 0056` and `0057`
    - control-plane blocker review
    - school, admission, academics, grading, finance, security, and modules baseline resolution
    - tenant onboarding run
    - term-start run
    - normal-operation readiness check
    - year-close run with explicit waiver evidence
- Updated project tracking for the Session 10 slice in:
  - `docs/MASTER_DEBUG_REGISTER.md`

### Current evidence

- Frontend typecheck passed:
  - `cmd /c npm run typecheck`
- Frontend production build passed:
  - `cmd /c npm run build`
- Backend lightweight verification passed:
  - `.venv\\Scripts\\python.exe -m py_compile sms_backend\\school\\models.py sms_backend\\school\\serializers.py sms_backend\\school\\views.py sms_backend\\school\\urls.py sms_backend\\school\\control_plane.py sms_backend\\school\\security_policy.py sms_backend\\school\\lifecycle_automation.py sms_backend\\school\\test_session10_control_plane.py`
  - `.venv\\Scripts\\python.exe sms_backend\\manage.py check`
- Focused backend Session 10 proof passed after bringing up the approved local test DB helper:
  - `powershell -ExecutionPolicy Bypass -File .\\scripts\\local_test_db.ps1 -Action up -BaseDir 'C:\\Users\\Public\\sms-local-postgres'`
  - `$env:DATABASE_URL=''; $env:PGHOST='localhost'; $env:PGPORT='55432'; $env:PGDATABASE='sms_school_db'; $env:PGUSER='postgres'; $env:PGPASSWORD='change-me'; $env:POSTGRES_HOST='localhost'; $env:POSTGRES_PORT='55432'; $env:POSTGRES_DB='sms_school_db'; $env:POSTGRES_USER='postgres'; $env:POSTGRES_PASSWORD='change-me'; .\\.venv\\Scripts\\python.exe sms_backend\\manage.py test school.test_session10_control_plane --keepdb --noinput -v 2`
  - result on April 3, 2026: `12/12 OK`

### Uncompleted / deferred before calling Session 10 runtime-verified

1. Run the new Session 10 Replit guide against a tenant-backed PostgreSQL environment.
2. Confirm the full live flow:
   - readiness blockers resolve through the owning school, admission, academics, finance, security, and module settings pages
   - the security policy persists through the new typed backend owner
   - tenant onboarding refuses early completion and then completes with task evidence
   - term start switches the live current academic year and term safely
   - year close records waiver evidence when used, promotes the selected next year, and clears the current term
3. Browser and API evidence for the lifecycle `last_execution_effect` trail and blocker-to-owner navigation path is now captured in `docs/superpowers/specs/2026-04-04-control-plane-runtime-verification.md`; Session 10 tenant runtime verification is closed locally.

## Latest Update (April 2, 2026 - Session 9 Lifecycle UI and Verification Trail)

- Completed the Session 9 finish on top of the already-landed lifecycle backend:
  - `sms_frontend/src/pages/hr/HrCareerEventsPage.tsx` now gives HR a dedicated workspace for promotions, demotions, acting appointments, apply actions, and acting-end actions
  - `sms_frontend/src/pages/hr/HrDisciplinePage.tsx` now handles disciplinary case creation, outcome closure, and dismissal routing into the structured exit spine
  - `sms_frontend/src/pages/hr/HrExitsPage.tsx` now handles exit-case creation, clearance-item management, exit completion, and archive handoff
  - `sms_frontend/src/pages/hr/HrEmployeeProfilePage.tsx` now renders the Session 9 lifecycle timeline with actor metadata, before or after snapshot context, and archived-profile access via `?include_archived=1`
  - HR navigation and routing now expose `Career Events`, `Discipline`, and `Exits`, and role settings now include the new HR submodule keys
- Tightened the Session 9 regression coverage:
  - `sms_backend/hr/test_session9_lifecycle_controls.py` now includes an explicit ordered-timeline regression with source-reference assertions
  - `sms_backend/hr/tests.py` now keeps the legacy employee-exit compatibility path honest by asserting it appends `EXIT_COMPLETED` through the new structured exit spine
- Added the Session 9 runtime guide:
  - `docs/REPLIT_SESSION_9_LIFECYCLE_VERIFICATION.md`
  - covers:
    - Session 9 migrations `0016` to `0019`
    - transfer completion smoke
    - career action apply and acting-end smoke
    - discipline outcome smoke
    - exit clearance, completion, and archive smoke
    - archived employee profile and timeline verification
- Updated project tracking for the Session 9 slice in:
  - `docs/MASTER_DEBUG_REGISTER.md`

### Current evidence

- Frontend typecheck passed:
  - `cmd /c npm run typecheck`
- Frontend production build passed:
  - `cmd /c npm run build`
- Backend lightweight verification passed:
  - `.venv\\Scripts\\python.exe -m py_compile sms_backend/hr/views.py sms_backend/hr/serializers.py sms_backend/hr/urls.py sms_backend/hr/domain/career_operations.py sms_backend/hr/domain/discipline_operations.py sms_backend/hr/domain/exit_operations.py sms_backend/hr/domain/lifecycle_events.py sms_backend/hr/test_session9_lifecycle_controls.py sms_backend/hr/tests.py`
  - `.venv\\Scripts\\python.exe sms_backend\\manage.py check`
- Focused backend test module is still environment-blocked locally:
  - `.venv\\Scripts\\python.exe sms_backend\\manage.py test hr.test_session9_lifecycle_controls --noinput`
  - current failure on April 2, 2026: PostgreSQL password authentication failed for `postgres@localhost:5432`

### Uncompleted / deferred before calling Session 9 runtime-verified

1. Run the new Session 9 Replit guide against a tenant-backed PostgreSQL environment.
2. Confirm the live flow end to end:
   - transfer completion appends immutable lifecycle events and updates the active assignment safely
   - promotion, demotion, and acting appointment apply correctly, and acting end restores the prior assignment
   - disciplinary suspension updates live state and dismissal opens the structured exit path
   - exit clearance, completion, and archive all behave correctly in sequence
   - archive disables linked login and active module assignments
   - archived staff remain hidden from default active lists while their profile and timeline stay intentionally reviewable
3. Browser and API evidence for the ordered lifecycle timeline and archived-profile read path is now captured in `docs/superpowers/specs/2026-04-04-hr-runtime-verification.md`; Session 9 tenant runtime verification is closed locally.

## Latest Update (April 2, 2026 - Session 8 Blocks 6 and 7 Payslip Snapshots, Payroll Workbench, and Verification Docs)

- Completed the Session 8 frontend/docs finish on top of the already-landed payroll control backend:
  - `sms_frontend/src/pages/hr/HrPayrollPage.tsx` now acts as the Session 8 payroll workbench with statutory-rule visibility, finance approval actions, disbursement controls, finance posting summaries, richer selected-batch totals, and snapshot-aware payslip visibility
  - `sms_frontend/src/components/PayslipPrintModal.tsx` was rebuilt to render persisted payroll breakdown rows, including named allowances, attendance deductions, statutory deductions, employer contributions, and stable net-pay summaries
  - `sms_backend/hr/views.py` now serves snapshot-first payslip HTML and a richer payroll tax report backed by stored statutory breakdown rows
  - `sms_backend/hr/test_session8_payroll_controls.py` now includes a payslip snapshot-stability regression so later salary-component edits do not bleed into old payroll batches
- Added the Session 8 runtime guide:
  - `docs/REPLIT_SESSION_8_PAYROLL_FINANCE_CONTROLS_VERIFICATION.md`
  - covers:
    - Session 8 migrations `hr 0015` and `school 0055`
    - statutory rule inspection
    - payroll processing from workforce-fed readiness
    - batch exceptions and finance approval gates
    - disbursement flow
    - finance posting verification
    - snapshot-stable payslip verification after later salary edits
- Updated project tracking for the Session 8 slice in:
  - `docs/MASTER_DEBUG_REGISTER.md`

### Current evidence

- Frontend typecheck passed:
  - `cmd /c npm run typecheck`
- Frontend production build passed after rerunning outside the Windows sandbox because Vite or esbuild spawn was blocked inside the sandbox:
  - `cmd /c npm run build`
- Backend lightweight verification passed:
  - `.venv\\Scripts\\python.exe -m py_compile sms_backend/hr/views.py sms_backend/hr/serializers.py sms_backend/hr/urls.py sms_backend/hr/domain/payroll_operations.py sms_backend/hr/domain/payroll_posting.py sms_backend/hr/test_session8_payroll_controls.py sms_backend/school/services.py`
  - `.venv\\Scripts\\python.exe sms_backend\\manage.py check`
- Focused backend test module is still environment-blocked locally:
  - `.venv\\Scripts\\python.exe sms_backend\\manage.py test hr.test_session8_payroll_controls --noinput`
  - current failure on April 2, 2026: PostgreSQL password authentication failed for `postgres@localhost:5432`

### Uncompleted / deferred before calling Session 8 runtime-verified

1. Run the new Session 8 Replit guide against a tenant-backed PostgreSQL environment.
2. Confirm the finance posting references and cashbook outflow against real tenant finance data.
3. Confirm payslip snapshot stability end to end in a tenant browser session after later salary-structure edits.

## Latest Update (April 2, 2026 - Session 7 Block 6 Frontend Wiring + Verification Docs)

- Completed the remaining Session 7 Block 6 frontend/docs slice on top of the already-landed workforce operations backend:
  - `sms_frontend/src/pages/hr/HrAttendancePage.tsx` now wires shift-template management, missed-check-in evaluation, absence alert resolution and escalation, teaching substitute assignment capture, and richer shift or payroll-feed visibility into the attendance workspace
  - `sms_frontend/src/pages/hr/HrLeavePage.tsx` now shows staged long-leave approvals, manager-to-HR handoff state, and return-to-work reconciliation actions in the leave workspace
  - `sms_frontend/src/pages/hr/HrPayrollPage.tsx` now surfaces Session 7 workforce-readiness indicators, blocker summaries, and the payroll-facing workforce feed
- Added the Session 7 runtime guide:
  - `docs/REPLIT_SESSION_7_WORKFORCE_OPERATIONS_VERIFICATION.md`
  - covers:
    - tenant HR migrations `0013_attendancerecord_alert_status_and_more` and `0014_leaverequest_approval_stage_and_more`
    - Session 5 and Session 6 prerequisites
    - shift-template plus schedule setup
    - same-day absence alert evaluation plus resolve or escalate flow
    - teaching substitute coverage
    - long-leave staged approval
    - return-to-work reconciliation
    - payroll workforce-readiness inspection
- Updated project tracking for the Session 7 slice in:
  - `docs/MASTER_DEBUG_REGISTER.md`

### Current evidence

- Frontend typecheck passed:
  - `cmd /c npm run typecheck`
- Frontend production build passed after rerunning outside the Windows sandbox:
  - `cmd /c npm run build`
- Backend lightweight verification passed:
  - `.venv\\Scripts\\python.exe -m py_compile sms_backend/hr/views.py sms_backend/hr/serializers.py sms_backend/hr/domain/attendance_operations.py sms_backend/hr/domain/leave_operations.py sms_backend/hr/domain/payroll_feed.py sms_backend/hr/test_session7_workforce_operations.py`
  - `.venv\\Scripts\\python.exe sms_backend\\manage.py check`
- Focused backend test module is still environment-blocked locally:
  - `.venv\\Scripts\\python.exe sms_backend\\manage.py test hr.test_session7_workforce_operations --noinput`
  - current failure on April 2, 2026: PostgreSQL password authentication failed for `postgres@localhost:5432`

### Uncompleted / deferred before calling Session 7 runtime-verified

1. Run the new Session 7 Replit guide against a tenant-backed PostgreSQL environment.
2. Confirm the full live flow:
   - shift-template creation and schedule resolution
   - missed-check-in alert creation plus resolve or escalate behavior
   - teaching substitute assignment without rewriting absent-teacher attendance
   - long-leave manager approval then HR final approval
   - return-to-work reconciliation clearing payroll blockers
   - payroll workforce feed reflecting blockers before cleanup and readiness after cleanup
3. Keep the still-open Session 5 and Session 6 tenant runtime gates in view; Session 7 depends on those earlier compatibility slices being green in the same tenant-backed environment.

## Latest Update (April 2, 2026 - Session 6 Staff Identity and Onboarding Workspace)

- Completed the remaining safe Session 6 frontend/docs slice on top of the already-landed backend identity onboarding APIs:
  - `sms_frontend/src/pages/hr/HrOnboardingPage.tsx` is now a real onboarding workspace instead of checklist-only tracking
  - the workspace loads the backend onboarding summary, employment profile, qualifications, emergency contacts, biometric link state, provisioning blockers, and legacy onboarding tasks in one screen
  - biometric linkage and account provisioning now flow from the UI against the new additive backend endpoints without creating a parallel frontend-only readiness model
  - `sms_frontend/src/pages/hr/HrRecruitmentPage.tsx` now captures optional `work_email`, `staff_category`, and explicit role override during hire and redirects straight into `/modules/hr/onboarding?employee=<id>`
- Added the Session 6 runtime guide:
  - `docs/REPLIT_SESSION_6_STAFF_IDENTITY_ONBOARDING_VERIFICATION.md`
  - covers:
    - tenant migration `0012_session6_staff_identity_backbone`
    - Session 5 seed/baseline prerequisites
    - hire candidate
    - complete onboarding details
    - link biometric identity
    - provision account
    - first login plus forced password change
- Updated project tracking for the Session 6 slice in:
  - `docs/MASTER_DEBUG_REGISTER.md`

### Current evidence

- Frontend typecheck passed:
  - `cmd /c npm run typecheck`
- Frontend production build passed after rerunning outside the Windows sandbox:
  - `cmd /c npm run build`
- Backend lightweight verification passed:
  - `.venv\\Scripts\\python.exe -m py_compile sms_backend/hr/views.py sms_backend/hr/urls.py sms_backend/hr/test_session6_identity_onboarding.py`
  - `.venv\\Scripts\\python.exe sms_backend\\manage.py check`
- Focused backend test module is still environment-blocked locally:
  - `.venv\\Scripts\\python.exe sms_backend\\manage.py test hr.test_session6_identity_onboarding --noinput`
  - current failure on April 2, 2026: PostgreSQL password authentication failed for `postgres@localhost:5432`

### Uncompleted / deferred before calling Session 6 runtime-verified

1. Run the new Session 6 Replit guide against a tenant-backed PostgreSQL environment.
2. Confirm the full live flow:
   - recruitment hire redirects into the correct onboarding record
   - readiness blockers clear as HR fills the required sections
   - biometric linkage updates `clockin.PersonRegistry`
   - provisioning creates the account and Session 5 module baseline
   - first login forces password change before normal access
3. Verify welcome-email behavior against the real delivery path; the code currently reports placeholder delivery status cleanly, but live provider behavior is still unconfirmed.
4. Session 5 and Session 6 runtime smoke are now green locally; keep welcome-email provider verification as a separate delivery-provider follow-up rather than a rollout gate for the identity and onboarding spine.

## Latest Update (April 1, 2026 - Session 5 Frontend Role Surface Alignment + Replit Smoke Runbook)

- Completed Block 6 of the approved Session 5 compatibility slice on the tenant frontend role surfaces:
  - shared frontend role catalog now drives the remaining Session 5-facing admin UI surfaces
  - settings users page now exposes the expanded role catalog, adds alumni account creation, and no longer tells admins to use a child admission number for parent login
  - settings roles page now renders and sorts the expanded role list through the shared catalog and treats `PRINCIPAL` / `DEPUTY_PRINCIPAL` as admin-family locked roles
  - dashboard quick actions now resolve through the shared role-family mapper so `PRINCIPAL`, `BURSAR`, `HOD`, `HR_OFFICER`, `REGISTRAR`, `LIBRARIAN`, `NURSE`, `SECURITY_GUARD`, `STORE_CLERK`, `COOK`, `PARENT`, `STUDENT`, and `ALUMNI` no longer fall back to a legacy-only action set
- Added the Replit-only Session 5 runtime runbook:
  - `docs/REPLIT_SESSION_5_RBAC_RUNTIME_VERIFICATION.md`
  - covers:
    - tenant migration `0054`
    - `seed_roles`
    - `seed_default_permissions --assign-roles`
    - `backfill_role_module_baselines`
    - live smoke steps for principal, bursar, and HOD login/routing/RBAC/settings expectations

### Current evidence
- Frontend typecheck passed:
  - `cmd /c npm run typecheck`
- Frontend production build passed:
  - `cmd /c npm run build`
- Backend PostgreSQL-backed runtime smoke is still pending in Replit and is now documented in:
  - `docs/REPLIT_SESSION_5_RBAC_RUNTIME_VERIFICATION.md`

### Required follow-up before calling Session 5 runtime verified
1. Run the new Replit runbook against a live tenant schema.
2. Confirm:
   - principal login plus RBAC/settings access succeeds
   - bursar login plus finance-family module baseline succeeds while RBAC/settings management stays denied
   - HOD login plus academic-family module baseline succeeds while RBAC/settings management stays denied
3. Once that live smoke passes, update this file from "implemented + locally verified" to "runtime verified."

## Latest Update (April 1, 2026 - Session 5 Seed Alignment + Module Baseline Backfill)

- Landed the next safe Session 5 compatibility slice after the role-scope bridge:
  - tenant-safe role seeding now uses the expanded Session 5 catalog
  - default role-permission grants now resolve through scope profiles instead of legacy-only role lists
  - new-tenant bootstrap now seeds roles, modules, and RBAC defaults automatically
  - new management command added:
    - `sms_backend/school/management/commands/backfill_role_module_baselines.py`
- Shared backend source of truth extended in:
  - `sms_backend/school/role_scope.py`
  - includes:
    - canonical seed role definitions
    - scope-to-module baseline map
    - helpers for role baseline resolution
- Tenant seed/bootstrap paths aligned in:
  - `sms_backend/school/management/commands/seed_roles.py`
  - `sms_backend/school/management/commands/seed_default_permissions.py`
  - `sms_backend/school/management/commands/seed_demo.py`
  - `sms_backend/school/management/commands/seed_kenya_school.py`
  - `sms_backend/school/management/commands/create_school.py`
- Focused regression coverage added:
  - `sms_backend/school/test_phase5_seed_alignment.py`
  - `sms_backend/school/test_phase5_module_baselines.py`
  - existing bridge coverage retained in:
    - `sms_backend/school/test_phase5_role_scope_bridge.py`

### Current evidence
- Python syntax verification passed with `py_compile`.
- Focused backend tests passed in the local virtual environment:
  - `.venv\\Scripts\\python.exe sms_backend\\manage.py test school.test_phase5_role_scope_bridge school.test_phase5_seed_alignment school.test_phase5_module_baselines --noinput`
- Sessions 1 to 4 live PostgreSQL-backed smoke is still pending in Replit.
- Session 5 live tenant smoke is still pending after tenant-side seed/backfill execution.

### Required follow-up before calling this Session 5 slice runtime verified
1. In a PostgreSQL-backed tenant, run:
   - `seed_roles`
   - `seed_default_permissions --assign-roles`
   - `backfill_role_module_baselines`
2. Smoke test principal, bursar, and HOD users on a live tenant:
   - login
   - dashboard routing
   - RBAC/settings access
   - module-gated API access for the seeded baseline
3. Keep frontend role-surface alignment as the next safe follow-up block; the backend compatibility spine is now in place.

## Latest Update (April 1, 2026 - Sessions 1 to 4 Identity/Auth Bridge Implemented)

- Sessions 1 to 4 are implemented in code as the identity/auth foundation slice, with runtime confirmation still pending on a PostgreSQL-backed environment.
- Identity rule freeze is now reflected in the backend model and auth flow:
  - `Student.admission_number` stays academic.
  - `UserProfile.admission_number` is now a temporary student account bridge, not a permanent login identity.
  - `UserProfile.force_password_change` added via:
    - `sms_backend/school/migrations/0053_userprofile_force_password_change.py`
- Tenant login flow hardened in:
  - `sms_backend/school/views.py`
  - `sms_frontend/src/pages/LoginPage.tsx`
- Current login behavior:
  - Staff: username-first flow remains supported.
  - Parent: username, email, or phone lookup is supported.
  - Student: username is preferred; admission-number fallback remains temporarily supported.
  - Parent admission-number fallback is no longer supported.
- Parent/student portal identity resolution tightened:
  - Parent portal child resolution now uses explicit `ParentStudentLink` first and no longer falls back from parent username to student admission number.
  - Student portal no longer resolves through `ParentStudentLink`; it resolves from the student account bridge or temporary username/admission match only.
  - Backend files:
    - `sms_backend/parent_portal/views.py`
    - `sms_backend/parent_portal/student_portal_views.py`
    - `sms_backend/parent_portal/serializers.py`
- Forced parent credential reset bridge added:
  - Seeded/default parent accounts can be marked with `force_password_change`.
  - Parent portal access is blocked until password change, except for profile + password-change endpoints.
  - Frontend forced-reset landing flow is implemented in:
    - `sms_frontend/src/pages/parentPortal/ParentPortalLibraryProfilePage.tsx`
- Regression coverage added:
  - `sms_backend/school/test_identity_auth_bridge.py`
  - `sms_backend/parent_portal/tests.py`

### Current evidence
- Code changes applied across backend + frontend.
- Python syntax verification passed with `py_compile`.
- Focused Django tests could not run locally because PostgreSQL authentication failed for `postgres` on `localhost:5432`.
- Frontend typecheck/build were not rerun in this slice because local `node_modules` is not currently installed in the workspace.

### Required follow-up before calling Sessions 1 to 4 fully done
1. Apply migration `sms_backend/school/migrations/0053_userprofile_force_password_change.py`.
2. Run `seed_portal_accounts` or equivalent tenant-safe backfill for parent profile phone/reset flags.
3. Run PostgreSQL-backed smoke checks for:
   - parent email login
   - parent phone login
   - parent forced-password-change flow
   - student admission-number fallback
   - parent/student portal routing
4. Update this status file from "implemented" to "runtime verified" once those checks pass.

## Latest Update (March 3, 2026 - Tenant Dashboard Modernization + Go-Live Scan)

- Tenant main dashboard modernized for operational readiness:
  - KPI cards retained and hardened.
  - Added chart panels:
    - module activity snapshot (bar chart)
    - finance mix (pie chart, shown only when finance data exists)
  - Added "Today's Tasks" action panel generated from current tenant metrics.
  - Kept strict role/module visibility behavior from backend assignments.
- Readiness scan completed:
  - `python manage.py check` PASS
  - `npx tsc -b --pretty false` PASS
  - `npm run build` PASS
  - broad backend suite PASS (`75` tests):
    - `school.tests admissions.tests academics.tests parent_portal.tests communication.tests library.tests clients.tests`
- Dedicated deployment-readiness report added:
  - `docs/TENANT_GO_LIVE_READINESS_2026-03-03.md`

## Latest Update (March 3, 2026 - Super Admin Users Lifecycle Completed)

- Completed Super Admin Users lifecycle management end-to-end:
  - create/grant super admin
  - role update (OWNER/ADMIN/SUPPORT/AUDITOR)
  - activate/deactivate
  - revoke access
  - reset platform admin password
- New backend endpoint added:
  - `POST /api/platform/admin-users/{id}/reset-password/`
  - Payload: `{ "password": "<new_password>" }` (min length 8)
- Super Admin Users UI upgraded for operational clarity:
  - role dropdown + save per row
  - in-row password reset input + confirmation
  - confirmation dialog for revoke/deactivate/reset
  - clearer success/error messaging
- Validation:
  - `python manage.py check` passed
  - `npx tsc -b --pretty false` passed
  - API verification passed for `/api/platform/admin-users/` and `/reset-password/`

## Latest Update (March 3, 2026 - System Continuation Checkpoint)

### Current state understood
- Multi-tenant SMS architecture is active with:
  - public schema for platform APIs and Super Admin.
  - tenant schemas for school module operations.
- Frontend auth flow is split:
  - Super Admin: `/platform/login` on `localhost`.
  - Tenant users: `/login` on tenant host (example `demo.localhost`).
- Frontend API base resolution now follows current browser host, avoiding earlier cross-host login mismatch.

### Super Admin status now
- Implemented and live in UI:
  - Overview
  - Tenants (guided flow: create/select/manage profile/status/billing/credential reset)
  - Subscription & Billing page
  - Support
  - Impersonation
  - Monitoring
  - Deployment
  - Backup & Recovery
  - Security & Compliance
  - Action Logs
  - Platform Settings
  - Admin Users
- Known operational caveat:
  - If an endpoint appears missing in browser (404) but exists in code, restart backend to load latest routes.

### Where work was left
- Tenant Management user flow was refactored for usability and production operations:
  - Step 1: Create tenant
  - Step 2: Select tenant and status operations
  - Step 3: Manage selected tenant (profile, plan assignment, invoice generation, school-admin credential reset)
- Subscription & Billing module was made visible and wired from Super Admin navigation.
- Super Admin users/roles management already supports:
  - list
  - create/grant
  - role update
  - activate/deactivate
  - revoke
- In-progress hardening slice (not finished in this checkpoint):
  - extending super-admin user lifecycle to include dedicated password reset action endpoint and richer UI controls.

### Immediate next actions (recommended)
1. Finish super-admin user lifecycle hardening:
   - Add backend action for explicit super-admin password reset.
   - Add corresponding button/flow on `/platform/admin-users`.
2. Add confirmation UX on super-admin revoke/deactivate and self-protection messaging.
3. Run backend + frontend validation and update this document with evidence block.

## Latest Update (March 3, 2026 - Super Admin Tenant/Billing UX Completion Slice)

- Super Admin navigation and routing now exposes Subscription & Billing:
  - Frontend route added: `/platform/billing`
  - Sidebar item added: `Subscription & Billing`
- New Super Admin billing page implemented:
  - Plan visibility via `/api/platform/plans/`
  - Invoice tracking via `/api/platform/subscription-invoices/`
  - Manual payment recording via `/api/platform/subscription-invoices/{id}/record-payment/`
- Tenants page upgraded from read-only status actions to full management surface:
  - Tenant profile edit (`PATCH /api/platform/tenants/{id}/`)
  - Plan assignment (`POST /api/platform/tenants/{id}/assign-plan/`)
  - On-demand invoice generation (`POST /api/platform/tenants/{id}/generate-invoice/`)
  - Create tenant now supports optional plan selection
- Backend endpoint added for tenant credential administration:
  - `POST /api/platform/tenants/{id}/reset-school-admin/`
  - Payload: `username` (optional, defaults `admin`), `password` (required), `email` (optional)
  - Includes platform action log persistence (`RESET_CREDENTIALS`).
- Validation:
  - `python manage.py check` passed
  - `npx tsc -b --pretty false` passed

## Latest Update (March 3, 2026 - Full Launch Gate + Cross-Module Regression Closure)

- Full all-modules backend matrix re-validated and green:
  - `python manage.py test school.test_architecture_audit school.test_production_readiness_gate school.test_uat_fail_closure school.tests admissions.tests parent_portal.tests communication.tests library.tests academics.tests.AcademicsClassManagementTests school.test_finance_phase4 school.test_finance_phase11 school.test_finance_phase13 school.test_finance_phase14 school.test_finance_phase15 clients.tests --keepdb --noinput`
  - Result: `Found 86 test(s)` and `OK`.
- Root cause for prior cross-module `403` regressions was config lock mode:
  - `MODULE_FOCUS_LOCK` was enabled in backend env and blocked non-focus modules.
- Hardening fix applied:
  - `sms_backend/.env` now sets `MODULE_FOCUS_LOCK=false`.
  - `sms_backend/.env.example` now sets `MODULE_FOCUS_LOCK=false`.
  - `sms_backend/config/settings.py` default changed to `MODULE_FOCUS_LOCK=False`.
  - Focus lock remains available for deliberate temporary windows via explicit env override.
- New canonical handoff doc added for next teams:
  - `docs/GO_LIVE_HANDOFF_2026-03-03.md`

## Latest Update (March 3, 2026 - Step 3 Deployment Hooking Hardening)

- Deployment pipeline hardening moved from scaffold-only toward operational integration:
  - Added secure callback token setting: `DEPLOYMENT_CALLBACK_TOKEN`.
  - Added release callback endpoint:
    - `POST /api/platform/deployment/releases/callbacks/status/`
    - Supports events: `deploying`, `success`, `failed`, `rolled_back`
    - Enforces callback token validation.
  - Added automated release health-check endpoint:
    - `POST /api/platform/deployment/releases/{id}/run-health-checks/`
    - Persists computed health summary on release record.
  - Release completion now auto-computes health summary when not provided.
- Production guardrails updated:
  - Strict production startup now rejects placeholder `DEPLOYMENT_CALLBACK_TOKEN`.
- Validation:
  - `python manage.py test clients.tests.PlatformDeploymentHardeningTests --keepdb --noinput` passed.
  - `python manage.py test clients.tests --keepdb --noinput` passed.
  - `python manage.py check` passed.

## Latest Update (March 3, 2026 - Step 4 Backup/Recovery Operational Hardening)

- Added concrete backup/recovery operational endpoints:
  - `POST /api/platform/backup/jobs/{id}/verify-integrity/`
  - `POST /api/platform/backup/jobs/enforce-retention/` (`dry_run` supported)
  - `POST /api/platform/backup/jobs/{id}/run-restore-drill/` (dual-admin separation enforced)
- Backup flow now supports:
  - Checksum-based integrity verification with explicit pass/fail response.
  - Retention enforcement execution with dry-run preview and apply mode.
  - Restore drill creation/execution tied to successful backup and separate approver.
- Docs updated for new operations:
  - `docs/PLATFORM_SUPER_ADMIN_RUNBOOK.md`
  - `docs/GO_LIVE_HANDOFF_2026-03-03.md`
- Validation:
  - `python manage.py test clients.tests.PlatformBackupRestoreHardeningTests --keepdb --noinput` passed.
  - `python manage.py test clients.tests --keepdb --noinput` passed.

## Latest Update (March 3, 2026 - Step 5 Provider/Webhook Security Finalization + Full Gate)

- Finance webhook security hardened:
  - Added `FINANCE_WEBHOOK_STRICT_MODE` setting (defaults strict in non-debug environments).
  - Finance webhooks now reject unconfigured verification in strict mode.
  - Non-strict mode remains available for controlled development environments.
- Added finance webhook verification tests for:
  - strict-mode rejection when unconfigured
  - non-strict-mode allowance when unconfigured
- Env templates updated:
  - `sms_backend/.env.example`
  - `sms_backend/.env.production.example`
- Validation:
  - `python manage.py test school.test_finance_phase4 --keepdb --noinput` passed.
  - Full all-modules backend gate rerun passed:
    - `Found 94 test(s)` and `OK`.

## Current Hardening Status (March 2, 2026)

- Backend config now follows strict env-first behavior in `sms_backend/config/settings.py`:
  - `DJANGO_DEBUG` defaults to `false`.
  - `DJANGO_ALLOW_INSECURE_DEFAULTS` defaults to `false`.
  - `DJANGO_SECRET_KEY` is required unless explicitly running insecure local dev mode.
  - `DJANGO_ALLOWED_HOSTS` is required (no implicit production fallback).
  - Postgres credentials are required unless explicitly in insecure local dev mode.
  - Parent portal guardian fallback should be explicitly set via `PARENT_PORTAL_ALLOW_GUARDIAN_FALLBACK` in strict environments.
- Tenant reliability guard middleware now validates tenant context triplet consistency on API routes:
  - Header vs resolved tenant schema (`TENANT_ENFORCE_HEADER_MATCH`).
  - Host vs resolved tenant domains (`TENANT_ENFORCE_HOST_MATCH`).
  - Optional required header on tenant API routes (`TENANT_REQUIRE_HEADER`).
- Frontend hardening completed for shared delete confirmation and shared export download error behavior:
  - Shared confirmation component: `src/components/ConfirmDialog.tsx`.
  - Shared API blob download utility: `src/utils/download.ts` (`downloadFromResponse`).
- Validation evidence:
  - Backend gate matrix: 69 tests passed.
    - Validated with explicit env profile (`DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, full Postgres triplet, `PARENT_PORTAL_ALLOW_GUARDIAN_FALLBACK`).
  - Frontend build: `npm run build` passed.
  - Presentation evidence validator: PASS (`docs/validate_presentation_evidence.ps1`).

## Latest Update (March 2, 2026 - Platform Step 4 Hardening + Action Logs)

- Platform Step 4 hardening tightened in backend:
  - Strict transition guards for support tickets, impersonation sessions, and monitoring alerts.
  - Serializer-level protection for lifecycle fields (status/timestamps cannot be client-forced).
- Platform action audit is now DB-backed (not logger-only):
  - New model: `clients.PlatformActionLog`
  - New endpoint: `GET /api/platform/action-logs/`
  - Filter params: `tenant_id`, `actor_id`, `action`, `model_name`, `date_from`, `date_to`
  - Wired into support/impersonation/monitoring sensitive actions.
- New platform ops runbook added for next team:
  - `docs/PLATFORM_SUPER_ADMIN_RUNBOOK.md`
  - Includes super admin bootstrap, login flow, and platform endpoint access.
- Focused cross-module consistency pass started and applied:
  - Finance: `FinanceReconciliationPage` now uses shared download + API error extraction pattern.
  - Students: `StudentsDocumentsPage` now uses shared download + API error extraction and delete confirmation dialog.
  - Academics: `AcademicsCalendarPage` now uses delete confirmation dialog and date-range validation (`start_date <= end_date`).
- Validation after update:
  - `python manage.py migrate clients` applied `clients.0008_platformactionlog`
  - `python manage.py test clients.tests.PlatformStep4HardeningTests --keepdb --noinput` passed (`7` tests)
  - `python manage.py check` passed
  - `npm run build` passed

## Latest Update (March 3, 2026 - Super Admin Web UI)

- New platform auth mode added in frontend auth store:
  - `authMode: 'tenant' | 'platform'`
  - Tenant and platform browser sessions are route-isolated.
- New browser entrypoint for Super Admin:
  - `/platform/login`
  - Login uses public schema auth and verifies platform role by calling:
    - `GET /api/platform/analytics/overview/`
- New Super Admin routes/UI:
  - `/platform` (overview dashboard)
  - `/platform/tenants` (tenant provisioning + activate/suspend/resume)
  - `/platform/support` (ticket creation/workflow actions)
  - `/platform/impersonation` (request/approve/start/end sessions)
  - `/platform/monitoring` (snapshots + alerts + acknowledge/resolve)
  - `/platform/action-logs` (filterable platform action logs)
- Additional Super Admin completion slice (March 3, 2026):
  - `/platform/deployment` (maintenance windows, releases, feature flags)
  - `/platform/backup-recovery` (backup jobs and restore workflow)
  - `/platform/security-compliance` (security incidents + compliance report generation)
  - Backend platform endpoints added:
    - `/api/platform/maintenance/windows/`
    - `/api/platform/deployment/releases/`
    - `/api/platform/deployment/feature-flags/`
    - `/api/platform/backup/jobs/`
    - `/api/platform/backup/restores/`
    - `/api/platform/security/incidents/`
    - `/api/platform/security/compliance-reports/`
- Existing tenant routes remain intact:
  - `/login`, `/dashboard`, `/modules/*`, `/settings/*`
- Validation:
  - `npm run build` passed after platform UI integration.

## Backend Overview

**Architecture**
- Django + DRF with `django-tenants` multi-tenant model.
- Tenant routing by domain or `X-Tenant-ID` header.
- Public schema handles system-level routes; tenant schema handles module routes.

**Auth**
- JWT via `rest_framework_simplejwt`.
- Login endpoint: `POST /api/auth/login/` (tenant routes).
- All module endpoints require auth + module permissions.

**Permissions**
- Role-based: `ADMIN`, `TENANT_SUPER_ADMIN`, `ACCOUNTANT`, `TEACHER`.
- Module access enforced by `HasModuleAccess` using `UserModuleAssignment`.

**Key Backend Routes (Tenant)**
- Dashboard:
  - `GET /api/dashboard/summary/`
  - `GET /api/dashboard/routing/`
- School profile:
  - `GET /api/school/profile/` (tenant branding for print headers)
- Students:
  - `GET /api/students/`
  - `GET /api/students/summary/`
  - `GET /api/admissions/summary/` (pipeline counts)
- Finance:
  - `GET /api/finance/summary/`
  - `GET /api/finance/invoices/`
  - `POST /api/finance/invoices/`
  - `GET /api/finance/invoices/{id}/`
  - `GET /api/finance/payments/`
  - `POST /api/finance/payments/`
  - `POST /api/finance/payments/{id}/allocate/`
  - `GET /api/finance/expenses/`
  - `POST /api/finance/expenses/`
  - `PATCH /api/finance/expenses/{id}/`
  - `GET /api/finance/fees/`
  - `POST /api/finance/fees/`
  - `PATCH /api/finance/fees/{id}/`
  - `GET /api/finance/fee-assignments/` (registered)
  - `POST /api/finance/fee-assignments/`
  - `PATCH /api/finance/fee-assignments/{id}/`
  - `GET /api/finance/invoice-adjustments/` (registered)
  - `POST /api/finance/invoice-adjustments/`
- Finance references:
  - `GET /api/finance/ref/students/`
  - `GET /api/finance/ref/enrollments/`
- Academics references:
  - `GET /api/academics/ref/academic-years/`
  - `GET /api/academics/ref/terms/`
  - `GET /api/academics/ref/classes/`
- Academics Phase 1 (Academic Structure):
  - `GET /api/academics/years/`
  - `POST /api/academics/years/`
  - `PATCH /api/academics/years/{id}/`
  - `GET /api/academics/terms/`
  - `POST /api/academics/terms/`
  - `PATCH /api/academics/terms/{id}/`
  - `GET /api/academics/grade-levels/`
  - `POST /api/academics/grade-levels/`
  - `PATCH /api/academics/grade-levels/{id}/`
  - `GET /api/academics/classes/`
  - `POST /api/academics/classes/`
  - `PATCH /api/academics/classes/{id}/`

**Backend Fixes Applied**
- `FeeAssignmentViewSet` registered in router.
- `InvoiceAdjustmentViewSet` registered in router.
- Summary endpoints reordered before router to avoid `/students/summary` being treated as pk.
- Invoice serializer now explicitly declares writable `student` and `term` fields.
- Invoice serializer now uses `school.Term` queryset to avoid cross-app Term mismatch.
- Admissions: fixed `AdmissionApplication.save()` to avoid double `force_insert` and duplicate PK errors.
- Admin maintenance: `POST /api/admin/maintenance/reset-sequences/` resets tenant sequences (used to fix Postgres sequence drift).

**Known Pitfalls / Errors Resolved**
- Duplicate key violations on `school_admissionapplication` were caused by:
  1) Postgres sequence drift in tenant schema, and
  2) `AdmissionApplication.save()` calling `super().save()` twice during create.
  Fix: reset sequences per-tenant and updated model save logic.
- Frontend now omits `guardian_email` if blank and validates format client-side to avoid 400s.

## API Examples (Sample Payloads)

**Auth**
```
POST /api/auth/login/
{
  "username": "admin",
  "password": "admin123"
}
```
Response:
```
{
  "access": "<jwt-access-token>",
  "refresh": "<jwt-refresh-token>"
}
```

**Students Summary**
```
GET /api/students/summary/
Authorization: Bearer <token>
X-Tenant-ID: demo_school
```
Response:
```
{
  "students_active": 2,
  "enrollments_active": 2
}
```

**Finance Summary**
```
GET /api/finance/summary/
```
Response:
```
{
  "revenue_billed": 1500,
  "cash_collected": 500,
  "total_expenses": 200,
  "net_profit": 300,
  "outstanding_receivables": 1000,
  "active_students_count": 2
}
```

**Create Invoice**
```
POST /api/finance/invoices/
{
  "student": 1,
  "term": 1,
  "due_date": "2026-03-01",
  "line_items": [
    { "fee_structure": 1, "amount": 1500.00, "description": "Tuition" }
  ]
}
```

**Record Payment**
```
POST /api/finance/payments/
{
  "student": 1,
  "amount": 500.00,
  "payment_method": "Cash",
  "reference_number": "RCPT-1001",
  "notes": "Initial deposit"
}
```

**Allocate Payment**
```
POST /api/finance/payments/1/allocate/
{
  "invoice_id": 1,
  "amount": 200.00
}
```

**Create Expense**
```
POST /api/finance/expenses/
{
  "category": "Utilities",
  "amount": 200.00,
  "expense_date": "2026-02-04",
  "description": "Electricity bill"
}
```

**Create Fee Structure**
```
POST /api/finance/fees/
{
  "name": "Term 1 Tuition",
  "amount": 1500.00,
  "academic_year": 1,
  "term": 1,
  "is_active": true
}
```

**Create Fee Assignment**
```
POST /api/finance/fee-assignments/
{
  "student": 1,
  "fee_structure": 1,
  "discount_amount": 100.00,
  "is_active": true
}
```

**Create Invoice Adjustment**
```
POST /api/finance/invoice-adjustments/
{
  "invoice": 1,
  "amount": 100.00,
  "reason": "Scholarship waiver"
}
```

## Screenshots (To Add)

- Main dashboard (`/dashboard`)
- Students dashboard (`/modules/students`)
- Finance summary (`/modules/finance`)
- Finance invoices list + modal
- Finance create invoice form
- Finance payments list + create
- Finance expenses list + create/edit
- Finance fee structures list + create/edit
- Finance fee assignments list + create/edit
- Finance adjustments list + create
- Settings (global + finance) pages

## Frontend Overview

**Stack**
- Vite + React + TypeScript
- Tailwind + shadcn style primitives
- Axios for API calls
- React Router for routing
- Zustand for auth state

**Design Constraints Enforced**
- 12-column grid system
- Flat dark UI
- Single accent color (emerald)
- KPIs limited to 4
- Clear visual hierarchy and spacing

**Routing**
- `/login`
- `/dashboard`
- `/modules/students`
- `/modules/finance/*`

**Auth + API**
- Token stored in localStorage (`sms_access_token`, `sms_refresh_token`, `sms_tenant_id`).
- Axios injects `Authorization` and `X-Tenant-ID` headers.

### Students Module (Complete)
- Summary + roster from backend:
  - `GET /api/students/summary/`
  - `GET /api/students/`
- Search filter included.
 - Student module now has a dedicated layout with sidebar and pages for Admissions, Attendance, Behavior, Medical, Documents, and Reports.
- Admissions page is fully wired to backend:
   - `GET /api/admissions/applications/` (search/status/page/page_size)
   - `POST /api/admissions/applications/` (creates without manual IDs)
   - `PATCH /api/admissions/applications/{id}/` (decision updates)
   - `POST /api/admissions/applications/{id}/enroll/`
   - Live pipeline counts computed from loaded data; mock data used only if API is unreachable.
 - Student profile page added with tabbed sections (some sections still use mock placeholders pending backend wiring).
 - Student profile uploads are wired:
   - `GET /api/students/{id}/` includes `photo` and `uploaded_documents`.
   - `POST /api/students/{id}/photo/` (multipart `photo`).
   - `POST /api/students/{id}/documents/` (multipart `documents`).
   - `DELETE /api/students/{id}/documents/{doc_id}/`.
 - Student profile now attempts to load attendance, behavior, and academic data using these stubbed contracts:
   - `GET /api/attendance/summary/?student_id=:id`
   - `GET /api/attendance/?student_id=:id`
   - `GET /api/behavior/incidents/?student_id=:id`
   - `GET /api/academics/records/?student_id=:id`
 - Student profile now pulls medical data:
   - `GET /api/medical/records/?student_id=:id`
   - `GET /api/medical/visits/?student_id=:id`

### Academics Module (Phases 1-6 Baseline Implemented)
- Frontend routes:
  - `/modules/academics/dashboard` (fully wired, default academics landing page)
  - `/modules/academics/structure` (fully wired)
  - `/modules/academics/subjects` (fully wired)
  - `/modules/academics/class-management` (fully wired)
  - `/modules/academics/gradebook` (fully wired)
  - `/modules/academics/report-cards` (fully wired)
  - `/modules/academics/assignments` (fully wired)
  - `/modules/academics/calendar` (fully wired)
  - `/modules/academics/analytics` (fully wired)
- Academic Structure page supports:
  - Academic year create/list/set-current
  - Term create/list/set-current (with `billing_date`)
  - Grade level create/list
  - Class section create/list/filter by year + grade
- Uses backend APIs:
  - `GET/POST/PATCH /api/academics/years/`
  - `GET/POST/PATCH /api/academics/terms/`
  - `GET/POST/PATCH /api/academics/grade-levels/`
  - `GET/POST/PATCH /api/academics/classes/`
  - `GET /api/staff/` for class teacher selection
- Backward compatibility preserved:
  - Existing `SchoolClass.name` and `stream` retained
  - New class fields added (`grade_level`, `section_name`, `class_teacher`, `room`, `capacity`)
  - `display_name` computed without breaking finance/student references
- Academic Structure completion slice implemented:
  - Edit flows added for academic years, terms, grade levels, and class sections.
  - Archive/activate toggles added for years, terms, grade levels, and class sections (`is_active` patch flow).
  - Clone flow added for year structure:
    - `POST /api/academics/years/{id}/clone-structure/`
    - Supports copying terms and class sections into a new academic year.
  - Staff lookup for class teacher assignment now uses `/api/hr/staff/`.
  - Backend academics tests now cover structure current-state behavior and clone structure flow.
- Gradebook completion slice implemented:
  - Grading schemes + bands, assessment setup, bulk mark entry, assessment publish, and term result compute are wired.
  - Frontend page: `sms_frontend/src/pages/academics/AcademicsGradebookPage.tsx`.
  - Route now points to the live page instead of placeholder: `/modules/academics/gradebook`.
- Report Cards completion slice implemented:
  - Batch generation, approval, publish, distribution, and PDF download are wired.
  - Frontend page: `sms_frontend/src/pages/academics/AcademicsReportCardsPage.tsx`.
  - Route now points to the live page: `/modules/academics/report-cards`.
- Homework & Calendar completion slice implemented:
  - Assignment creation, submissions, grading, stats, and calendar events/export are wired.
  - Frontend pages:
    - `sms_frontend/src/pages/academics/AcademicsAssignmentsPage.tsx`
    - `sms_frontend/src/pages/academics/AcademicsCalendarPage.tsx`
  - Routes:
    - `/modules/academics/assignments`
    - `/modules/academics/calendar`
- Analytics completion slice implemented:
  - Analytics endpoints for summary, class/subject performance, at-risk, student profile, teacher profile, and trend are wired.
  - Frontend pages:
    - `sms_frontend/src/pages/academics/AcademicsDashboardPage.tsx` (main academics dashboard submodule)
    - `sms_frontend/src/pages/academics/AcademicsAnalyticsPage.tsx` (deep-dive analytics)
  - Routes:
    - `/modules/academics/dashboard`
    - `/modules/academics/analytics`
  - `Academics` module default route now lands on `/modules/academics/dashboard`.

### Student Profile Stub API Contracts

Moved to `docs/student-profile-api-contracts.md`.

### Finance Module (In Progress)
**Layout**
- Sidebar navigation with submodules.

**Dashboard (Summary)**
- KPIs + charts (area, bar, pie).
- Real data from:
  - `GET /api/finance/summary/`
  - `GET /api/finance/invoices/`
  - `GET /api/finance/payments/`
  - `GET /api/finance/expenses/`
- Charts updated: Cashflow from Operating Activities, Debtors Aging Report, Payments by Method, Payments volume.

**Invoices**
- List with filters + pagination.
- Invoice detail and allocation shown in modal popup.
- Student column now prefers full name (from `student_full_name`) over admission number.
- Invoice list includes index column.
- Invoice list now includes Invoice Date, Due Date, Amount Paid, and Due Amount.
- Status badge styling with paid/partial/overdue logic.
- Filters: status, student, date range; search now includes student full name.
- Invoice form now shows admin-aligned fields (total amount, status, is_active, invoice/created dates, balance due) as read-only.
- For TENANT_SUPER_ADMIN, status and is_active are editable and sent to backend on create.
- Invoice line items now auto-fill amount from selected fee structure (editable override).
- Invoice create flow includes "Create & add another" and success message.
- Invoice list shows success banner after create.
- Allocation popup now shows student name, current balance, payment date, notes, and filters payments by student.
- Allocation popup header shows class/term and guardian count.
- Allocation posts to:
  - `POST /api/finance/payments/{id}/allocate/`
- Invoice create form now shows student class/term and guardian contacts (from `/api/students/{id}/` and `/api/finance/ref/enrollments/`).
- Invoice list rows include a "Context" expander for class/term + guardian info.

**Payments**
- List view with Create button.
- Create page implemented.
- Create now returns success banner on payments list.
- Payments list shows student names and supports search + student filter.
- Added filters: payment method, allocation status, date range.
- Payments list now shows allocated/unallocated amounts and computed allocation status.
- Payment form shows student class/term and guardian contacts (student + enrollment endpoints).
- Payments list rows include a "Context" expander for class/term + guardian info.

**Fee Assignments**
- Fee assignment form now shows student class/term and guardian contacts (student + enrollment endpoints).
- Fee assignments list now includes filters for student, fee structure, and status.
- Fee assignment form includes start and end dates.

**Invoice Adjustments**
- Adjustment form now shows student class/term and guardian contacts (via selected invoice student).

**Expenses**
- List view with Create/Edit buttons.
- Create/Edit page implemented.
- Edit/save now returns a success banner on the list page.
- Budgeting inputs (monthly/quarterly/annual) stored in localStorage (`finance:budget:*`).
- Spending trends chart (last 6 months) from loaded expense data.
- Budget API integrated at `/api/finance/budgets/` with `academic_year` + `term` params.
- Budget save flow uses `POST /api/finance/budgets/` and `PUT /api/finance/budgets/{id}/`.
- Budget management is consolidated under the Expenses submodule (no separate Budgets nav item).
- Spending trends now support daily/weekly/monthly views with category filter.
- Export tools: CSV list export and JSON summary export from the expenses list page.
- Expense form now includes vendor, payment method, receipt/invoice number, approval status, and attachment placeholder.
- Expense list includes vendor, method, receipt #, approval status, and filters for category/vendor/date/status.
- Budget list is rendered directly under the expense list in the same submodule page.
- Budget list includes search, date-range filters, CSV/summary export, create shortcut, and created/updated timestamps.

**Fee Structures**
- List view with Create/Edit buttons.
- Create/Edit page implemented.
- Uses academic references.
- Edit/save now returns a success banner on the list page.
- Term options now filter by selected academic year.
- Category + grade level fields added (grade level optional).
- Fee list includes category/grade columns and category/status filters.

**Fee Assignments**
- List view with Create/Edit buttons.
- Create/Edit page implemented.
- Edit/save now returns a success banner on the list page.

**Invoice Adjustments**
- List view with Create button.
- Create page implemented.
- Create form validates against invoice balance due (client-side) and shows balance in selector.
- Filtering + summary cards (total, average, last 30 days) for adjustments list.

**Settings (Global + Module)**
- Central Settings layout at `/settings`.
- Sidebar links for Global, Finance, Students, Parents, Academics, Staff.
- Schema-driven settings stored in `src/settings/schemas`.
- Renderer built via reusable `SettingsField` component.
- LocalStorage persistence via `settings:<module>` keys.
- Permissions mocked via `src/settings/permissions.ts` (hidden fields use `requiredPermission`).
- Debug toggle allows admins to show restricted fields (localStorage `settings:debug_show_hidden`).
- Settings permissions are now fetched from `/api/dashboard/routing/` and stored in `sms_permissions` / `sms_user.permissions`.

## Immediate Next Steps (Safe Continuation)

- Ensure `FinanceLayout` route uses `path="/modules/finance/*"` so nested create/edit pages do not redirect to `/dashboard`.
- Restart backend after router changes (fee assignments, invoice adjustments).
- Keep tenant aligned: domain `demo.localhost` + schema `demo_school` + user `admin/admin123`.

## Missing / Not Done Yet

**Frontend**
- Field-level validation and inline error hints for Finance create/edit forms (payments, expenses, fee structures, fee assignments, invoice adjustments, invoices).
- Delete flows implemented for expenses, fee structures, fee assignments, invoices, and payments (with confirmation).
- Invoice edit is view-only (backend immutability); fields locked with guidance banner.
- Server-side pagination enabled for finance list endpoints; frontend normalizes DRF-style `count` + `results`.
- Finance summary dashboard normalizes paginated invoice/payment/expense lists.
- Auto-logout after 15 minutes of inactivity via `IdleLogout`.
- Expense budgets now persist through backend budgets API; localStorage remains fallback-only for transient UI input.
- Module dashboards beyond Students/Finance.
- Parents module needs dedicated backend endpoints for guardians; currently derived from `/api/students/`.
- Admin user/module management screens.
- Finance-to-student/parent integration for class + contact data in finance flows (pending backend data).
- Responsive pass across major pages (mobile/tablet-friendly layouts, collapsible sidebars, table overflow).
- Parents module scaffolded (summary + directory) using `/api/students/` guardian data.

**Backend**
- Payment editing endpoints (not provided).
- Invoice editing endpoints (disabled by design).
- Invoice adjustment edit/delete endpoints not provided.
 - Add delete endpoints only if business rules allow; adjustments are still create-only.
- Finance list endpoints now paginate with page size 8 via `FinanceResultsPagination`.
- Settings overrides endpoint not implemented (frontend uses localStorage only).
- `/api/dashboard/routing/` now returns permissions for frontend settings.
- Budget endpoints implemented:
  - `GET /api/finance/budgets/` (supports `academic_year` + `term` filters)
  - `POST /api/finance/budgets/`
  - `PUT /api/finance/budgets/{id}/`
  - `DELETE /api/finance/budgets/{id}/` (soft delete)
- Admissions endpoints added:
  - `GET/POST /api/admissions/applications/`
  - `PATCH /api/admissions/applications/{id}/`
  - `POST /api/admissions/applications/{id}/enroll/`
  - `GET /api/admissions/summary/` (pipeline counts, supports date/status/grade filters)
  - Uploads (multipart):
    - `student_photo` (image)
    - `documents_upload` (repeatable file field)
  - Note: requires DB migration for `AdmissionApplication` model.
- Attendance endpoints added:
  - `GET /api/attendance/summary/`
  - `GET/POST /api/attendance/`
  - Note: requires DB migration `0008_attendance_behavior`.
 - Attendance UI wired:
   - `GET /api/attendance/summary/`
   - `GET /api/attendance/` supports `status`, `date_from`, `date_to`, pagination.
   - `POST /api/attendance/` for new attendance records.
- Behavior endpoints added:
  - `GET/POST /api/behavior/incidents/`
  - Note: requires DB migration `0008_attendance_behavior`.
- Behavior UI wired:
   - `GET /api/behavior/incidents/` supports `incident_type`, `date_from`, `date_to`, pagination.
   - `POST /api/behavior/incidents/` for new incident logging.
 - Student reports UI wired with live summary data:
   - `GET /api/students/summary/`
   - `GET /api/admissions/summary/`
   - `GET /api/attendance/summary/`
   - `GET /api/behavior/incidents/`
   - `GET /api/students/`
- Student reports print flows:
  - Module-wide print uses `GET /api/students/reports/summary/` with fallback to loaded dashboard data.
  - Individual student print uses `GET /api/students/{id}/report/` (includes guardians, attendance, behavior, medical, documents).
 - School profile endpoint added for print branding:
   - `GET /api/school/profile/` returns tenant name/schema and `SchoolProfile` (logo, address, phone).
 - Student reports export endpoints:
   - `GET /api/students/reports/summary/export/csv/`
   - `GET /api/students/{id}/report/export/csv/`
   - `GET /api/students/reports/summary/export/pdf/`
   - `GET /api/students/{id}/report/export/pdf/`
 - Frontend report actions are wired:
   - `StudentsReportsPage` supports module CSV/PDF download + per-student CSV/PDF download.
   - `StudentProfilePage` supports one-click Print + CSV/PDF download for the current student.
- Medical endpoints added:
   - `GET/POST /api/medical/records/`
   - `GET/POST /api/medical/immunizations/`
   - `GET/POST /api/medical/visits/`
   - Note: requires DB migration `0011_medical_records`.
 - School profile branding added:
   - `SchoolProfile.logo` (ImageField) with migration `0012_schoolprofile_logo`.
 - Student report CSV export endpoints added in backend (`school.views` + `school.urls`).
 - Full PDF export implemented in backend using `reportlab` (added to `sms_backend/requirements.txt`).
- Behavior UI wired to backend list endpoint with filters for incident type.
- Admin maintenance endpoint added (tenant-scoped) to fix Postgres sequence drift:
  - `POST /api/admin/maintenance/reset-sequences/` (ADMIN/TENANT_SUPER_ADMIN only)
- Admissions uploads wired (requires migration `0009_admissions_uploads`):
  - `student_photo` + `AdmissionDocument` model.
  - `MEDIA_URL=/media/`, `MEDIA_ROOT=BASE_DIR/media` with dev serving.
  - `Pillow` added to backend requirements.
 - Student uploads wired (requires migration `0010_student_uploads`):
  - `photo` + `StudentDocument` model.
  - `POST /api/students/{id}/photo/`, `POST /api/students/{id}/documents/`, `DELETE /api/students/{id}/documents/{doc_id}/`.
 - Student documents UI wired:
   - Lists documents by aggregating `uploaded_documents` from `/api/students/`.
   - Uploads via `POST /api/students/{id}/documents/`.
   - Deletes via `DELETE /api/students/{id}/documents/{doc_id}/`.

## Phase A (Finance Completion) - Actionable Checklist

Target: Fully deliver the Finance module per the agreed structure. Items are grouped by submodule, with status markers.

**Dashboard**
- [x] KPIs (max 4) with real data
- [x] Cashflow from Operating Activities chart
- [x] Debtors Aging Report chart
- [x] Payments by Method chart
- [x] Payment Volume Trend chart

**Fee Structures**
- [x] List + Create/Edit
- [x] Add Category field + filter
- [x] Add Status filter (Active/Inactive)
- [x] Add Grade/Class Level field (optional if backend supports)
- [x] Search by name
- [x] Bulk actions (Activate/Deactivate, Clone) - UI only if backend missing

**Fee Assignments**
- [x] List + Create/Edit
- [x] Student context panel
- [x] Filters: Student, Fee Structure, Academic Year, Term, Status
- [x] Bulk assignment wizard (UI only if backend missing)

**Invoices**
- [x] List + Create + Allocation modal
- [x] Columns: Invoice Date, Due Date, Amount Paid, Due Amount
- [x] Status badges (Paid/Partial/Overdue logic)
- [x] Filters: Student, Term, Status, Date Range
- [x] Search: Student name, Invoice number
- [x] Bulk invoice generation (UI only if backend missing)
- [x] PDF/Email placeholders (UI only)

**Payments**
- [x] List + Create + Allocation
- [x] Student context panel
- [x] Filters: Student, Method, Date Range, Allocation Status
- [x] Search: Student name, Receipt number, Reference number
- [x] Allocation list improvements (show outstanding invoices with due/amount)
- [x] Receipt export placeholder (UI only)

**Expenses**
- [x] List + Create/Edit + Trend charts + Budget inputs
- [x] Add Vendor/Payee field
- [x] Add Payment Method field
- [x] Add Invoice/Receipt Number field
- [x] Add Approval Status field
- [x] Attachments placeholder (UI only)
- [x] Filters: Category, Date Range, Approval Status, Vendor

**Adjustments**
- [x] List + Create + Balance-aware validation
- [x] Summary cards + filters
- [x] Require notes + enforce reason type

**Budgets (Enhanced)**
- [x] Budgets API integrated in expenses flow
- [x] Consolidated into Expenses submodule (standalone budgets route redirects to expenses)

**Reports / Accounts / Scholarships / Refunds (Future)**
- [x] Reports module shell (mock data)
- [x] Student accounts ledger (mock data)
- [x] Scholarships module (mock data)
- [x] Refunds module (mock data)

## Tenant Configuration (Recommended)
- `demo.localhost` domain
- `demo_school` schema name
- Admin: `admin` / `admin123`

## Notes / Pitfalls
- Direct browser access to API endpoints returns 401; JWT is only attached by the app.
- The Students summary endpoint must be registered before router to avoid `/students/summary` being treated as a pk.
- Invoices are immutable (no PUT/PATCH in backend); frontend create flow only.
- Fee assignments and adjustments routes were added to backend router; verify they remain in `sms_backend/school/urls.py`.
- Settings are persisted locally under `settings:<module>`; no backend overrides yet.
- Budget API now expects `academic_year` (academic year id or name) and `term` (term id).
- Student and guardian details rely on `/api/students/{id}/` and `/api/finance/ref/enrollments/?student_id=...`; if missing, the UI shows fallback mock data.

## Theme Preference

- Stored in localStorage under `settings:global` (`themePreference`).
- UI exposes `system`, `light`, and `dark`.

## Current UI Patterns (Do Not Break)

- Finance submodules use list pages with Create/Edit buttons that navigate to dedicated pages.
- Invoice detail uses modal popup for viewing and allocation.
- Flat dark UI, single accent color, 12-column grid, KPIs limited to 4.

## How To Run (Local)

- Frontend: `npm run dev -- --host --port 3000`
- Backend: `python manage.py runserver`
- Tenant: `demo.localhost` domain + `demo_school` schema

## Next Team Start Point (Updated Order)

1. Confirm adjustment creation rules and surface backend errors clearly (especially balance constraints).
2. Add server-side pagination + filters once backend enables pagination.
3. Expand settings permissions from backend (replace mock).

## Repo Hygiene

- Added root `.gitignore` to exclude build artifacts, venvs, and `.env` files.
- Added `.env.example` in `sms_backend/` and `sms_frontend/` (not yet wired in backend settings).
- Root `README.md` includes structure and run steps.


## Export Wiring (All Modules)

### What Is Already Done
- Student reports exports are implemented and wired:
  - Module summary CSV/PDF.
  - Individual student CSV/PDF.
- Finance reports exports are implemented and wired:
  - `GET /api/finance/reports/summary/export/csv/`
  - `GET /api/finance/reports/summary/export/pdf/`
- Attendance reports exports are implemented and wired:
  - `GET /api/attendance/summary/export/csv/`
  - `GET /api/attendance/summary/export/pdf/`

### Current Risk Notes (Observed During Wiring)
- Some modules still use page-local blob download logic instead of one shared helper, which can cause inconsistent filename handling and inconsistent error handling.
- Export buttons in not-yet-completed modules may appear before endpoint readiness; this leads to 404/501/permission responses if wired too early.
- Multi-tenant exports require both JWT and tenant context (`X-Tenant-ID`); missing either can look like wiring failure.

### Must-Do At Project Completion (All Modules)
- Standardize all export actions on one shared frontend helper (`downloadBlob`) with:
  - responseType `blob`
  - consistent filename extraction from `Content-Disposition`
  - consistent toast/banner error messaging.
- Ensure every module report page supports both CSV and PDF with the same UX pattern.
- Ensure backend export endpoints return:
  - correct `Content-Type`
  - correct `Content-Disposition` filename
  - correct tenant-scoped data only.
- Add regression tests for exports per module:
  - auth required
  - tenant header required
  - non-empty payload for seeded data
  - predictable status/error handling for empty datasets.
- Add one final cross-module QA pass:
  - click each export button
  - verify file downloads
  - open CSV/PDF content
  - verify branding/header consistency where applicable.

### Recommended Final Validation Matrix
- Modules to verify: `students`, `finance`, `attendance`, `academics`, `hr`, `assets`, `communication`, `reporting`.
- Formats: `csv`, `pdf`.
- Roles: `TENANT_SUPER_ADMIN`, `ADMIN`, module-limited roles.
- Tenants: at least 2 schemas (for isolation confirmation).

## Current Working Module Snapshot (2026-02-11)

Primary active module is **Finance** with cross-module dependencies on:
- Students (`/api/students/`, `/api/students/{id}/`)
- Enrollments (`/api/finance/ref/enrollments/`)
- Academics references (`/api/academics/ref/*`)

Finance implementation state:
- Core operational flows are in place: invoices, payments, expenses, fee structures, fee assignments, adjustments.
- Invoices are create-only and intentionally immutable.
- Payments support allocation, but no edit endpoint exists.
- Expense budgets now persist through backend `/api/finance/budgets/`; localStorage remains fallback behavior.
- Finance list endpoints are paginated (backend `FinanceResultsPagination`, page size 8).

## Gaps and Risk Register (Keep in Mind)

1. Test coverage risk
- Most meaningful tests are concentrated in `sms_backend/school/tests.py`.
- `academics` now has working structure + subjects/curriculum + class-management tests, but broader scenarios still need coverage.
- `hr`, `assets`, `communication`, `reporting` test files remain thin.
- Impact: regressions may pass unnoticed in module apps.
- Mitigation: add endpoint-level contract tests before major refactors.

2. Configuration risk
- `sms_backend/config/settings.py` still contains hardcoded DB credentials and secret key.
- Impact: environment drift, unsafe defaults, onboarding failures.
- Mitigation: migrate to `.env` loading and document required variables in one canonical place.

3. Contract drift risk
- Some docs describe routes/features that may be ahead of or behind implementation.
- Impact: frontend/backend integration confusion and false bug reports.
- Mitigation: when changing endpoints, update both `docs/API_CONTRACTS.md` and this file in the same PR.

4. Multi-tenant context risk
- Missing `X-Tenant-ID` or domain mismatch causes misleading auth/data errors.
- Impact: "works for me" integration failures across environments.
- Mitigation: always validate tenant triplet together: domain + schema + header.

5. Export consistency risk
- Export logic is not fully centralized across all modules yet.
- Impact: inconsistent filenames, content types, and error handling.
- Mitigation: standardize on one shared download helper and add cross-module export regression tests.

## Documentation Discipline for Next Team

When shipping changes, treat these docs as required update targets:
- `sms_frontend/PROJECT_STATUS.md` for implementation state and runbook updates.
- `docs/API_CONTRACTS.md` for endpoint request/response contract changes.
- `docs/MODULE_CONTRACTS.md` for read-only ref contract changes.
- `docs/BASELINE_NOTES.md` for architectural or routing baseline changes.
- `docs/INDEX.md` when adding, moving, or deprecating any major document.

## Academics Phases (Execution Order)

Reference matrix: `docs/ACADEMICS_IMPLEMENTATION_MATRIX.md`

1. Phase 1: Subjects & Curriculum
- Build department, subject, mapping, and syllabus contracts.

2. Phase 2: Class Management
- Add academics-native enrollments and teacher assignments.

3. Phase 3: Gradebook
- Add grading schemes, assessments, grade entry, and term result computation.
- Status: baseline complete (backend + frontend wired).

4. Phase 4: Report Cards
- Add report card lifecycle (generate, approve, publish, distribute, PDF).
- Status: baseline complete (backend + frontend wired).

5. Phase 5: Homework + Calendar
- Add assignments/submissions and calendar/event workflows.
- Status: baseline complete (backend + frontend wired).

6. Phase 6: Academic Analytics
- Add KPI and trend endpoints and corresponding dashboard views.
- Status: baseline complete (backend + frontend wired).

## Academic Structure Completion Slice (2026-02-11)

### Completed in this slice
- Frontend Academic Structure page was fully completed and stabilized in `sms_frontend/src/pages/academics/AcademicsStructurePage.tsx`.
- Create/edit flows for Year, Term, Grade Level, and Class Section are now popup modals instead of inline multi-panel forms.
- Clone year flow (with terms/classes toggles) is exposed through a dedicated modal and calls:
  - `POST /api/academics/years/{id}/clone-structure/`
- List tables and actions are active for:
  - set current year/term
  - archive/activate year/term/grade/class
  - edit year/term/grade/class
- Page data loads from:
  - `/api/academics/years/`
  - `/api/academics/terms/`
  - `/api/academics/grade-levels/`
  - `/api/academics/classes/`
  - `/api/hr/staff/`

### Platform-level optimization completed
- Route-level lazy loading is active in `sms_frontend/src/App.tsx` using `React.lazy` + `Suspense`.
- Build output now confirms split chunks per route/module, reducing initial bundle pressure.

### Validation result
- Frontend production build passes:
  - command: `npm run build`
  - result: success on 2026-02-11

### Risks/Gaps to keep in mind
- Academic Structure currently depends on backend write contracts being stable for:
  - `section_name` in class create/update payloads
  - `is_active` toggle semantics across all structure entities
- Modal UX is implemented; keyboard accessibility and focus trap behavior still need dedicated QA hardening.
- No dedicated frontend automated tests yet for this page (create/edit/archive/clone regressions are still manual QA).

## Finance Budgets Completion Slice (2026-02-11)

### Completed
- Backend budget persistence added under `school` module:
  - Model: `Budget` (`academic_year`, `term`, monthly/quarterly/annual budgets, `categories`, `is_active`)
  - Viewset route: `finance/budgets`
  - Serializer: includes `academic_year_name` and `term_name`
  - Migration: `sms_backend/school/migrations/0014_budget.py`
- Frontend integration completed:
  - `sms_frontend/src/pages/finance/FinanceExpensesPage.tsx` now reads/writes budgets via `/api/finance/budgets/`.
  - Legacy `/api/v1/finance/budgets` calls removed.
  - Budgets UX consolidated into Expenses submodule; `/modules/finance/budgets` now redirects to `/modules/finance/expenses`.

### Verification
- Frontend build: `npm run build` (pass)
- Backend check: `python manage.py check` (pass)
- Added tenant-aware budget API test:
  - `school.tests.FinanceBudgetApiTests` (pass with `--keepdb`)

### Remaining risks
- Existing legacy localStorage keys (`finance:budget:*`) still exist and can mask backend issues during manual QA if API fails.
- Budget uniqueness is enforced per `(academic_year, term)`; duplicate creates must be handled by UI validation messaging.

## Academics Subjects + Class Management Slice (2026-02-11)

### Completed
- Subjects & Curriculum backend implemented:
  - Models: `Department`, `Subject`, `SubjectMapping`, `SyllabusTopic`
  - Endpoints: `/api/academics/departments/`, `/subjects/`, `/subject-mappings/`, `/syllabus/`, `/syllabus/progress/`
  - Action: `PATCH /api/academics/syllabus/{id}/complete/`
- Class Management backend implemented:
  - `GET/POST/PATCH /api/academics/enrollments/`
  - `POST /api/academics/enrollments/bulk-promote/`
  - `GET/POST/DELETE /api/academics/teacher-assignments/`
  - Added `Enrollment.status`, `Enrollment.left_date`, and `TeacherAssignment` model.
- Frontend implemented:
  - `sms_frontend/src/pages/academics/AcademicsSubjectsPage.tsx`
  - `sms_frontend/src/pages/academics/AcademicsClassManagementPage.tsx`
  - Routes wired in `sms_frontend/src/App.tsx` for:
    - `/modules/academics/subjects`
    - `/modules/academics/class-management`

### Validation
- Frontend production build passes (`npm run build`).
- Backend check passes (`python manage.py check`).
- User-validated backend test pass:
  - `python manage.py test academics.tests.AcademicsSubjectsCurriculumTests --keepdb`

### Remaining risks
- Bulk promotion logic uses next grade by `GradeLevel.order` and best-match section fallback; schools with custom promotion maps may require a mapping table later.
- Class management UI currently focuses on core create/list/remove flows; advanced filters and transfer workflow UX can be expanded next.

## Academics Gradebook Completion Slice (2026-02-12)

### Completed
- Backend models/migrations implemented:
  - `GradingScheme`, `GradeBand`, `Assessment`, `AssessmentGrade`, `TermResult`
  - Migrations: `sms_backend/school/migrations/0016_enrollment_status_teacherassignment.py` and `sms_backend/school/migrations/0017_gradebook_models.py`
- Backend endpoints implemented:
  - `GET/POST /api/academics/grading-schemes/`
  - `GET/POST /api/academics/grade-bands/`
  - `GET/POST/PATCH /api/academics/assessments/`
  - `POST /api/academics/assessments/{id}/publish/`
  - `GET/PATCH /api/academics/grades/`
  - `POST /api/academics/grades/bulk/`
  - `GET /api/academics/grades/import-template/`
  - `POST /api/academics/grades/import/`
  - `GET /api/academics/term-results/`
  - `POST /api/academics/term-results/compute/`
- Frontend implemented:
  - `sms_frontend/src/pages/academics/AcademicsGradebookPage.tsx`
  - Route wired in `sms_frontend/src/App.tsx` at `/modules/academics/gradebook`
  - UI supports scheme creation, band creation, assessment setup, bulk score entry, publish action, and term result computation.

### Validation
- User-validated backend test pass:
  - `python manage.py test academics.tests.AcademicsSubjectsCurriculumTests --keepdb`
- Gradebook test class exists for local run:
  - `academics.tests.AcademicsGradebookTests`

### Remaining risks
- Gradebook bulk entry currently lists all students from `/api/students/`; class-scoped student filtering should be tightened using active enrollment context.
- Import endpoint currently accepts JSON rows and CSV template download; true Excel import parity is still pending.
- Ranking currently applies simple descending order without tie handling rules; clarify tie policy before report-card workflows.

## Academics Report Cards Completion Slice (2026-02-12)

### Completed
- Backend model/migration implemented:
  - `ReportCard`
  - Migration: `sms_backend/school/migrations/0018_reportcard.py`
- Backend endpoints implemented:
  - `GET /api/academics/report-cards/`
  - `POST /api/academics/report-cards/generate/`
  - `GET /api/academics/report-cards/{id}/`
  - `PATCH /api/academics/report-cards/{id}/`
  - `POST /api/academics/report-cards/{id}/approve/`
  - `POST /api/academics/report-cards/{id}/publish/`
  - `POST /api/academics/report-cards/distribute/`
  - `GET /api/academics/report-cards/{id}/pdf/`
- Frontend implemented:
  - `sms_frontend/src/pages/academics/AcademicsReportCardsPage.tsx`
  - Route wired in `sms_frontend/src/App.tsx` at `/modules/academics/report-cards`
  - UI supports class+term generation, approval/publish/distribute actions, and PDF download.

### Validation
- Backend tests pass:
  - `python manage.py test academics.tests.AcademicsReportCardsTests academics.tests.AcademicsGradebookTests --keepdb`
- Frontend production build passes:
  - `npm run build`

### Remaining risks
- Generated PDF is currently a baseline layout (single-page summary + subject rows); advanced template customization is pending.
- Distribution endpoint currently marks records as distributed but does not yet send email/portal notifications.
- Approval flow is simplified (direct approve/publish actions) and does not yet enforce multi-role workflow constraints.

## Academics Homework + Calendar Completion Slice (2026-02-12)

### Completed
- Backend models/migrations implemented:
  - `Assignment`, `AssignmentSubmission`, `CalendarEvent`
  - Migration: `sms_backend/school/migrations/0019_assignment_calendarevent_assignmentsubmission.py`
- Backend endpoints implemented:
  - `GET/POST/PATCH /api/academics/assignments/`
  - `GET /api/academics/assignments/{id}/submissions/`
  - `GET /api/academics/assignments/{id}/stats/`
  - `GET/POST /api/academics/submissions/`
  - `PATCH /api/academics/submissions/{id}/grade/`
  - `GET/POST/PATCH/DELETE /api/academics/calendar/`
  - `GET /api/academics/calendar/export/`
- Frontend implemented:
  - `sms_frontend/src/pages/academics/AcademicsAssignmentsPage.tsx`
  - `sms_frontend/src/pages/academics/AcademicsCalendarPage.tsx`
  - Routes wired in `sms_frontend/src/App.tsx`:
    - `/modules/academics/assignments`
    - `/modules/academics/calendar`

### Validation
- Backend tests pass:
  - `python manage.py test academics.tests.AcademicsAssignmentsCalendarTests academics.tests.AcademicsReportCardsTests academics.tests.AcademicsGradebookTests --keepdb`
- Frontend production build passes:
  - `npm run build`

### Remaining risks
- Submission upload flow currently uses metadata-only create from UI; multipart file upload UX is pending.
- Assignment stats currently use active enrollment count as class size and may need tighter term scoping rules for promoted/transferred students.
- Calendar export currently emits date-based iCal events; timed event support in export payload can be expanded.

## Academics Analytics Completion Slice (2026-02-12)

### Completed
- Backend analytics endpoints implemented:
  - `GET /api/academics/analytics/summary/`
  - `GET /api/academics/analytics/class-performance/`
  - `GET /api/academics/analytics/subject-performance/`
  - `GET /api/academics/analytics/at-risk/`
  - `GET /api/academics/analytics/student/{id}/`
  - `GET /api/academics/analytics/teacher/{id}/`
  - `GET /api/academics/analytics/trend/`
- Frontend implemented:
  - `sms_frontend/src/pages/academics/AcademicsDashboardPage.tsx`
  - `sms_frontend/src/pages/academics/AcademicsAnalyticsPage.tsx`
  - `sms_frontend/src/pages/academics/AcademicsLayout.tsx` includes Dashboard nav entry.
  - `sms_frontend/src/App.tsx` route index now redirects to `/modules/academics/dashboard`.

### Validation
- Backend tests pass:
  - `python manage.py test academics.tests.AcademicsAnalyticsTests academics.tests.AcademicsAssignmentsCalendarTests academics.tests.AcademicsReportCardsTests academics.tests.AcademicsGradebookTests --keepdb`
- Frontend production build passes:
  - `npm run build`

### Remaining risks
- Analytics currently aggregates from `TermResult` and `AttendanceRecord`; if schools require weighted attendance/behavior composites, formula configuration is still pending.
- Teacher profile analytics rely on `TeacherAssignment` mappings; co-teaching or historical reassignment snapshots may need stricter effective-date handling.
- Analytics export/report endpoints are not yet added; this is a natural next enhancement for parity with other modules.

## HR Baseline Slice (2026-02-12)

### Completed
- Backend HR baseline implemented in `sms_backend/hr`:
  - Models: `Department`, `Position`, `Employee`, `EmergencyContact`, `EmployeeDocument`, `WorkSchedule`, `AttendanceRecord`
  - Migration: `sms_backend/hr/migrations/0001_initial.py`
  - Endpoints wired in `sms_backend/hr/urls.py`:
    - `GET/POST/PATCH/DELETE /api/hr/employees/`
    - `GET /api/hr/employees/{id}/employment/`
    - `POST /api/hr/employees/{id}/confirm/`
    - `POST /api/hr/employees/{id}/exit/`
    - `GET/POST/PATCH/DELETE /api/hr/departments/`
    - `GET /api/hr/departments/{id}/employees/`
    - `GET /api/hr/departments/org-chart/`
    - `GET/POST/PATCH/DELETE /api/hr/positions/`
    - `GET /api/hr/positions/{id}/vacancies/`
    - `GET/POST/PATCH/DELETE /api/hr/attendance/`
    - `POST /api/hr/attendance/clock-in/`
    - `POST /api/hr/attendance/clock-out/`
    - `POST /api/hr/attendance/bulk/`
    - `GET /api/hr/attendance/summary/`
    - `GET /api/hr/attendance/report/`
    - `GET/POST/PATCH/DELETE /api/hr/schedules/`
    - `GET/POST/PATCH/DELETE /api/hr/documents/`
    - `POST /api/hr/documents/upload/`
    - `GET /api/hr/documents/{id}/download/`
    - `GET /api/hr/documents/expiring/`
    - `GET /api/hr/analytics/summary/`
    - `GET/POST/PATCH/DELETE /api/hr/leave-types/`
    - `GET/POST/PATCH/DELETE /api/hr/leave-policies/`
    - `GET /api/hr/leave-balance/{employee_id}/`
    - `GET/POST/PATCH/DELETE /api/hr/leave-requests/`
    - `POST /api/hr/leave-requests/{id}/approve/`
    - `POST /api/hr/leave-requests/{id}/reject/`
    - `POST /api/hr/leave-requests/{id}/cancel/`
    - `GET /api/hr/leave-calendar/`
    - `GET/POST/PATCH/DELETE /api/hr/salary-structures/`
    - `GET/POST/PATCH/DELETE /api/hr/salary-components/`
    - `GET/POST /api/hr/payrolls/`
    - `POST /api/hr/payrolls/process/`
    - `POST /api/hr/payrolls/{id}/approve/`
    - `POST /api/hr/payrolls/{id}/reprocess/`
    - `GET /api/hr/payrolls/{id}/bank-file/`
    - `GET /api/hr/payrolls/tax-report/`
    - `GET /api/hr/payslips/`
    - `GET /api/hr/payslips/{id}/pdf/`
    - `POST /api/hr/payslips/email/`
    - `GET/POST/PATCH/DELETE /api/hr/job-postings/`
    - `POST /api/hr/job-postings/{id}/publish/`
    - `GET/POST/PATCH/DELETE /api/hr/applications/`
    - `POST /api/hr/applications/{id}/shortlist/`
    - `POST /api/hr/applications/{id}/reject/`
    - `POST /api/hr/applications/{id}/hire/`
    - `GET/POST/PATCH/DELETE /api/hr/interviews/`
    - `POST /api/hr/interviews/{id}/feedback/`
    - `GET /api/hr/onboarding/{employee_id}/`
    - `GET/POST/PATCH/DELETE /api/hr/onboarding/`
    - `PATCH /api/hr/onboarding/{id}/complete/`
    - `GET/POST/PATCH/DELETE /api/hr/performance-goals/`
    - `GET/POST/PATCH/DELETE /api/hr/performance-reviews/`
    - `POST /api/hr/performance-reviews/{id}/submit/`
    - `GET/POST/PATCH/DELETE /api/hr/training-programs/`
    - `GET/POST/PATCH/DELETE /api/hr/training-enrollments/`
    - `GET /api/hr/analytics/headcount/`
    - `GET /api/hr/analytics/turnover/`
    - `GET /api/hr/analytics/attendance/`
    - `GET /api/hr/analytics/leave/`
    - `GET /api/hr/analytics/diversity/`
    - `GET /api/hr/analytics/payroll-costs/`
  - Compatibility endpoints preserved:
    - `GET /api/hr/ref/staff/`
    - `GET/POST/PATCH/DELETE /api/hr/staff/`
- Backend tests added:
  - `hr.tests.HrEmployeeDirectoryTests`
  - `hr.tests.HrDepartmentsPositionsTests`
  - `hr.tests.HrAttendanceTests`
- Frontend HR module scaffold implemented with dedicated dashboard submodule:
  - `sms_frontend/src/pages/hr/HrLayout.tsx`
  - `sms_frontend/src/pages/hr/HrDashboardPage.tsx`
  - `sms_frontend/src/pages/hr/HrEmployeesPage.tsx`
  - `sms_frontend/src/pages/hr/HrEmployeeProfilePage.tsx`
  - `sms_frontend/src/pages/hr/HrOrganizationPage.tsx`
  - `sms_frontend/src/pages/hr/HrAttendancePage.tsx`
  - `sms_frontend/src/pages/hr/HrLeavePage.tsx`
  - `sms_frontend/src/pages/hr/HrPayrollPage.tsx`
  - `sms_frontend/src/pages/hr/HrRecruitmentPage.tsx`
  - `sms_frontend/src/pages/hr/HrOnboardingPage.tsx`
  - `sms_frontend/src/pages/hr/HrPerformancePage.tsx`
  - `sms_frontend/src/pages/hr/HrTrainingPage.tsx`
  - `sms_frontend/src/pages/hr/HrAnalyticsPage.tsx`
  - `sms_frontend/src/pages/hr/HrPlaceholderPage.tsx`
  - `sms_frontend/src/App.tsx` routes under `/modules/hr/*`
- Phase 1 Employee Directory hardening completed:
  - Employee profile detail route: `/modules/hr/employees/:id`
  - Emergency contacts UI: create/list/archive
  - Employee document UI: upload/list/download/archive + expiring alert
- Phase 2 Departments & Positions completion completed:
  - Department popups: create/edit
  - Department archive action
  - Position popups: create/edit
  - Position archive action
  - Vacancy dashboard with search + filters + CSV export baseline
- Phase 3 Attendance & Time completion completed:
  - Department, employee, and date-range attendance filters
  - Monthly attendance CSV export
  - Attendance report table (employee-level aggregates)
  - Work schedules UI: create/edit/archive
  - Overtime policy settings UI (threshold + include-break flags) persisted in localStorage for reporting use
- Phase 4 Leave Management completion completed:
  - Leave types setup UI
  - Leave policy setup UI
  - Leave request submission UI
  - Approve/reject/cancel actions from request list
  - Employee leave balance panel
  - Team leave calendar table
- Frontend Phase 4 page:
  - `sms_frontend/src/pages/hr/HrLeavePage.tsx`
  - Route wired in `sms_frontend/src/App.tsx` at `/modules/hr/leave`
- Phase 5 Payroll completion completed:
  - Salary structure setup UI
  - Salary components setup UI (allowance/deduction, fixed/percentage)
  - Payroll process trigger (month/year/payment date)
  - Payroll batch list with approve and bank-file actions
  - Tax report export
  - Payslip list by payroll batch, download action, and bulk "mark sent"
- Frontend Phase 5 page:
  - `sms_frontend/src/pages/hr/HrPayrollPage.tsx`
  - Route wired in `sms_frontend/src/App.tsx` at `/modules/hr/payroll`
- Phase 6 Recruitment + Onboarding completion completed:
  - Job posting create/list/publish UI
  - Application create/list with shortlist/reject/hire actions
  - Interview scheduling and feedback capture UI
  - Onboarding checklist view by employee
  - Onboarding task create + complete workflow
- Frontend Phase 6 pages:
  - `sms_frontend/src/pages/hr/HrRecruitmentPage.tsx`
  - `sms_frontend/src/pages/hr/HrOnboardingPage.tsx`
  - Routes wired in `sms_frontend/src/App.tsx`:
    - `/modules/hr/recruitment`
    - `/modules/hr/onboarding`
- Phase 7 Performance + Training + HR Analytics completion completed:
  - Performance goals and review workflow (create/list + submit action)
  - Training programs and enrollment workflow
  - Expanded HR analytics endpoints and analytics dashboard page
- Frontend Phase 7 pages:
  - `sms_frontend/src/pages/hr/HrPerformancePage.tsx`
  - `sms_frontend/src/pages/hr/HrTrainingPage.tsx`
  - `sms_frontend/src/pages/hr/HrAnalyticsPage.tsx`
  - Routes wired in `sms_frontend/src/App.tsx`:
    - `/modules/hr/performance`
    - `/modules/hr/training`
    - `/modules/hr/analytics`
- Phase 7 UX cleanup pass completed:
  - Added search + status filters to Performance and Training pages
  - Added status badge styling for goals/reviews/enrollments
  - Added CSV exports for goals, reviews, programs, enrollments, and payroll-cost analytics rows
  - Added analytics controls (year/month refresh) and JSON snapshot export
- Session 8 payroll finance controls completion completed:
  - Statutory rule visibility added to the payroll workspace
  - Payroll batch lifecycle upgraded to finance approve, disbursement, and finance posting states
  - Selected payroll detail now shows blocked-item counts, statutory totals, bucket totals, and finance lifecycle metadata
  - Payslip modal rebuilt around persisted breakdown rows instead of live salary-component reads
  - Payroll tax report now reads stored statutory rows instead of a placeholder percentage-only estimate
  - Session 8 runtime verification guide documented for tenant-backed smoke follow-up
- Backend hardening completed:
  - Emergency contacts enforce one primary contact per employee
  - Employee directory tests expanded for contacts + expiring documents
  - Payroll tests added for process, approve, bank file, tax report, payslip download, and sent flow
  - Session 8 payroll tests expanded for finance approval gates, disbursement transitions, finance posting idempotence, and payslip snapshot stability
  - Recruitment/onboarding tests added for full flow (posting -> application -> interview -> hire -> onboarding task completion)
  - Performance/training/analytics tests added for baseline endpoint coverage
- Documentation updated for next team:
  - `docs/API_CONTRACTS.md` HR contract section expanded
  - `docs/MODULE_CONTRACTS.md` HR section updated to baseline model

### Validation
- Backend tests pass:
  - `python manage.py test hr.tests --keepdb`

### Remaining risks / gaps
- Performance reviews currently support single reviewer submission; 360-degree and calibration workflow is still pending.
- Employee documents currently support upload/download/archive, but advanced UX (preview, retry queue, drag-drop) is still pending.
- Overtime policy controls are currently UI-level and do not yet write into backend computation rules (backend still computes overtime using default model logic).
- Leave request workflow is currently single-stage approval in practice; multi-level approver chain rules can be expanded in next iteration.
- Leave balance accrual currently initializes from active policy entitlement and updates pending/used on request lifecycle; monthly accrual and year-end carry-forward automation are pending.
- Payroll processing now carries a Kenya-first statutory baseline, persisted breakdown snapshots, finance approval, disbursement, and finance posting controls, and now has tenant-backed runtime proof captured in `docs/superpowers/specs/2026-04-04-hr-runtime-verification.md`.
- Payroll attendance deduction still uses the current calendar-day approximation and should be refined if the school needs a different payroll policy model.
- Direct bank integrations and full payroll reversal workflows are still pending beyond the tracked disbursement state and export flow.
- Recruitment is currently authenticated-only; public careers endpoint behavior and anti-spam controls are pending.
- Hire conversion currently creates a baseline employee + default onboarding tasks; offer approval, salary negotiation, and background check steps are pending.
- HR analytics currently use baseline aggregate formulas and should be refined with school-specific KPIs and period controls.

## HR Phases (Execution Order)

1. Phase 1: Employee Directory hardening
- Status: complete (profile details + contacts + documents baseline)

2. Phase 2: Departments & Positions completion
- Status: complete (CRUD popups + vacancy dashboard filters + CSV export baseline)

3. Phase 3: Attendance & Time completion
- Status: complete (schedules + filters + monthly export + overtime policy UI settings)

4. Phase 4: Leave Management
- Status: complete (types + policies + balances + request workflow + leave calendar baseline)

5. Phase 5: Payroll
- Status: complete baseline (salary structures, components, process/approve/reprocess, bank file, tax report, payslip list/download/mark-sent)

6. Phase 6: Recruitment + Onboarding
- Status: complete baseline (job postings, applications, interviews, hire conversion, onboarding checklist/tasks)

7. Phase 7: Performance + Training + HR Analytics expansion
- Status: complete baseline (performance goals/reviews, training programs/enrollments, analytics endpoint expansion + frontend analytics page)

8. Session 8: Payroll finance-linked controls
- Status: runtime-verified locally on 2026-04-04; see `docs/superpowers/specs/2026-04-04-hr-runtime-verification.md`

## Staff Management Baseline Slice (2026-02-12)

### Completed
- Backend Staff Management app implemented in `sms_backend/staff_mgmt`:
  - Models:
    - `StaffMember`
    - `StaffQualification`
    - `StaffEmergencyContact`
    - `StaffDepartment`
    - `StaffRole`
    - `StaffAssignment`
    - `StaffAttendance`
    - `StaffObservation`
    - `StaffAppraisal`
    - `StaffDocument`
  - Migration:
    - `sms_backend/staff_mgmt/migrations/0001_initial.py`
  - Endpoints mounted at `/api/staff/` (tenant routes) including:
    - Directory/profile:
      - `GET/POST /api/staff/`
      - `GET/PATCH/DELETE /api/staff/{id}/`
      - `GET /api/staff/search/`
      - `GET /api/staff/export/`
      - `GET /api/staff/{id}/badge/`
      - `GET /api/staff/{id}/profile/`
    - Profile tabs:
      - `GET/POST /api/staff/{id}/qualifications/`
      - `DELETE /api/staff/qualifications/{id}/`
      - `GET/POST /api/staff/{id}/emergency-contacts/`
      - `PATCH /api/staff/emergency-contacts/{id}/`
    - Departments & roles:
      - `GET/POST/PATCH/DELETE /api/staff/departments/`
      - `GET /api/staff/departments/{id}/staff/`
      - `GET/POST/PATCH/DELETE /api/staff/roles/`
      - `GET/POST/PATCH/DELETE /api/staff/assignments/`
    - Attendance:
      - `GET/PATCH/DELETE /api/staff/attendance/`
      - `POST /api/staff/attendance/mark/`
      - `GET /api/staff/attendance/summary/`
      - `GET /api/staff/attendance/report/`
      - `GET /api/staff/attendance/export/`
    - Performance:
      - `GET/POST/PATCH/DELETE /api/staff/observations/`
      - `POST /api/staff/observations/{id}/submit/`
      - `GET/POST/PATCH/DELETE /api/staff/appraisals/`
      - `POST /api/staff/appraisals/{id}/approve/`
      - `GET /api/staff/{id}/review-history/`
    - Documents:
      - `GET /api/staff/{id}/documents/`
      - `POST /api/staff/{id}/documents/upload/`
      - `GET/POST/PATCH/DELETE /api/staff/documents/`
      - `GET /api/staff/documents/{id}/download/`
      - `POST /api/staff/documents/{id}/verify/`
      - `GET /api/staff/documents/expiring/`
    - Analytics/reports:
      - `GET /api/staff/analytics/summary/`
      - `GET /api/staff/analytics/by-department/`
      - `GET /api/staff/analytics/attendance/`
      - `GET /api/staff/analytics/performance/`
      - `GET /api/staff/analytics/compliance/`
      - `GET /api/staff/reports/directory/`
      - `GET /api/staff/reports/attendance/`
- Frontend Staff module routes wired in `sms_frontend/src/App.tsx`:
  - `/modules/staff/dashboard`
  - `/modules/staff/directory`
  - `/modules/staff/profiles`
  - `/modules/staff/departments-roles`
  - `/modules/staff/attendance`
  - `/modules/staff/performance`
  - `/modules/staff/documents`
  - `/modules/staff/analytics`
- Frontend Staff pages implemented:
  - `sms_frontend/src/pages/staff/StaffLayout.tsx`
  - `sms_frontend/src/pages/staff/StaffDashboardPage.tsx`
  - `sms_frontend/src/pages/staff/StaffDirectoryPage.tsx`
  - `sms_frontend/src/pages/staff/StaffProfilesPage.tsx`
  - `sms_frontend/src/pages/staff/StaffDepartmentsRolesPage.tsx`
  - `sms_frontend/src/pages/staff/StaffAttendancePage.tsx`
  - `sms_frontend/src/pages/staff/StaffPerformancePage.tsx`
  - `sms_frontend/src/pages/staff/StaffDocumentsPage.tsx`
  - `sms_frontend/src/pages/staff/StaffAnalyticsPage.tsx`

### Validation
- Backend tests pass:
  - `python manage.py test staff_mgmt.tests --keepdb`
- Backend check passes:
  - `python manage.py check`
- Frontend production build passes:
  - `npm run build`

### Remaining risks / gaps
- Badge endpoint currently returns baseline PDF content and needs branded badge template rendering.
- Staff profile tab endpoints are implemented, but frontend still uses simplified forms (no file upload on qualifications yet).
- Attendance currently supports operational marking and summary; biometric/RFID sync is not yet integrated.
- Performance workflows are baseline (single submit/approve actions); rubric templates and multi-step approvals are pending.
- Document management supports upload/download/verify/expiring, but versioning UI and access-scope controls are pending.

## Staff Management Phases (Execution Order)

1. Phase 1: Staff Directory + Profiles hardening
- Status: complete baseline

2. Phase 2: Departments & Roles hardening
- Status: complete baseline

3. Phase 3: Attendance completion
- Status: complete baseline

4. Phase 4: Performance reviews completion
- Status: complete baseline

5. Phase 5: Documents & records completion
- Status: complete baseline

6. Phase 6: Staff analytics + report polish
- Status: complete baseline

## Communication Baseline Slice (2026-02-12)

### Completed
- Backend Communication module expanded in `sms_backend/communication` with managed models and API contracts:
  - Messaging:
    - `Conversation`, `ConversationParticipant`, `CommunicationMessage`, `MessageAttachment`, `MessageReadReceipt`
    - Endpoints: `/api/communication/conversations/*`, `/api/communication/messages/*`
  - Notifications:
    - `Notification`, `NotificationPreference`
    - Endpoints: `/api/communication/notifications/*`, `/api/communication/notification-preferences/`
  - Email manager:
    - `EmailCampaign`, `EmailRecipient`
    - Endpoints: `/api/communication/email-campaigns/*` (+ `test`, `send`, `stats`, `recipients`)
  - SMS/WhatsApp gateway:
    - `SmsMessage`
    - Endpoints: `/api/communication/sms/send/`, `/api/communication/sms/`, `/api/communication/sms/{id}/status/`, `/api/communication/sms/balance/`
  - Templates:
    - `MessageTemplate`
    - Endpoints: `/api/communication/templates/*`, `/api/communication/templates/{id}/preview/`
  - Announcements:
    - `Announcement`, `AnnouncementRead`
    - Endpoints: `/api/communication/announcements/*`, `/api/communication/announcements/{id}/read/`, `/api/communication/announcements/{id}/stats/`
  - Analytics:
    - Endpoints: `/api/communication/analytics/summary/`, `/by-channel/`, `/delivery-rate/`, `/engagement/`
  - Parent communication:
    - Endpoints: `/api/communication/parent/report-card-notify/`, `/fee-reminder/`, `/attendance-alert/`, `/meeting-invite/`
- Backend provider placeholder services implemented:
  - `sms_backend/communication/services.py`
  - Email uses Django mail backend.
  - SMS/WhatsApp use placeholder-safe transport when API keys are missing.
- Compatibility preserved for legacy school imports:
  - `communication.models.Message` (unmanaged wrapper for `school_message`)
  - `communication.serializers.MessageSerializer`
  - Migration strategy includes state-only unmanaged compatibility migration (`communication/migrations/0002_message.py`).
- Frontend Communication module scaffold implemented:
  - `sms_frontend/src/pages/communication/CommunicationLayout.tsx`
  - `CommunicationDashboardPage.tsx`
  - `CommunicationMessagingPage.tsx`
  - `CommunicationNotificationsPage.tsx`
  - `CommunicationEmailPage.tsx`
  - `CommunicationSmsPage.tsx`
  - `CommunicationTemplatesPage.tsx`
  - `CommunicationAnnouncementsPage.tsx`
  - `CommunicationAnalyticsPage.tsx`
  - `CommunicationParentPage.tsx`
  - Routes wired in `sms_frontend/src/App.tsx` under `/modules/communication/*`
- Settings placeholders added:
  - New communication schema: `sms_frontend/src/settings/schemas/communication.ts`
  - Added to settings index/sidebar: `sms_frontend/src/settings/index.ts`
  - Finance placeholder keys added:
    - `paymentGatewayProvider`
    - `paymentGatewayApiKey`
    - file: `sms_frontend/src/settings/schemas/finance.ts`
- Main dashboard now includes direct Communication access button.

### Validation
- Backend tests pass:
  - `python manage.py test communication.tests --keepdb`
- Frontend production build passes:
  - `npm run build`

### Provider Configuration Documentation
- Added:
  - `docs/COMMUNICATION_PROVIDER_SETUP.md`
  - `sms_backend/.env.example` placeholder keys:
    - `COMMUNICATION_SMS_API_KEY`
    - `COMMUNICATION_WHATSAPP_API_KEY`
    - `FINANCE_PAYMENT_GATEWAY_PROVIDER`
    - `FINANCE_PAYMENT_GATEWAY_API_KEY`

### Remaining risks / gaps
- WebSocket real-time delivery/typing indicators are not yet implemented (HTTP baseline only).
- Push notifications (FCM) are not yet integrated; `channel_push` is currently preference-level only.
- Email open/click tracking and webhook-based delivery callbacks are placeholder-level and need provider webhook ingestion for production.
- SMS/WhatsApp balance and cost are placeholder estimates unless real provider keys and adapters are configured.

## Communication Phases (Execution Order)

1. Phase 1: Messaging + Notifications baseline
- Status: complete baseline

2. Phase 2: Email + SMS gateway baseline
- Status: complete baseline (placeholder-safe transport)

3. Phase 3: Templates + Announcements baseline
- Status: complete baseline

4. Phase 4: Analytics + Parent communication baseline
- Status: complete baseline

## Communication Hardening Slice (2026-02-12)

### Completed
- Backend authorization hardening:
  - Conversation participant management (`add/remove`) now requires conversation admin or system admin.
  - Message edit/delete now restricted to sender or system admin.
  - Message create validates sender is an active conversation participant.
  - Notification create to other users now restricted to system admins.
- Backend reliability hardening:
  - Notification preference `GET` now auto-seeds defaults for all notification types.
  - Email campaign send now deduplicates recipient emails and rejects invalid formats.
  - Email recipient now stores `provider_id` for webhook reconciliation.
  - SMS send now validates `channel` and deduplicates phone targets.
- Webhook reconciliation endpoints added:
  - `POST /api/communication/webhooks/email/`
  - `POST /api/communication/webhooks/sms/`
  - Provider callbacks now update delivery/open/click/failure states.
- Push placeholder support added:
  - Models: `PushDevice`, `PushNotificationLog`
  - Endpoints:
    - `GET/POST /api/communication/push/devices/`
    - `POST /api/communication/push/send/` (admin)
    - `GET /api/communication/push/`
  - Analytics `by-channel` now includes real push counts.
- Environment/config updates:
  - Added `COMMUNICATION_PUSH_SERVER_KEY` in backend settings and `.env.example`.
- Test coverage expanded:
  - Added hardening test cases for:
    - message edit guard,
    - SMS webhook delivery update,
    - push device registration and push send flow.

### Validation
- Backend tests pass:
  - `python manage.py test communication.tests --keepdb`
- Backend migration state clean:
  - `python manage.py makemigrations --check --dry-run communication`
- Frontend build passes:
  - `npm run build`

### Remaining hardening gaps
- Webhook endpoints are currently open (`AllowAny`) for provider compatibility; add signature/token verification before production.
- Real-time WebSocket delivery, typing indicators, and presence are still pending.
- Provider adapters for Twilio/SendGrid/FCM are still placeholder-level and should be implemented behind the existing service layer.

## Library Baseline Slice (2026-02-13)

### Completed
- Backend `library` app created in `sms_backend/library` with core baseline models:
  - `LibraryCategory`
  - `LibraryResource`
  - `ResourceCopy`
  - `LibraryMember`
  - `CirculationRule`
  - `CirculationTransaction`
  - `Reservation`
  - `FineRecord`
- Backend routes mounted at `/api/library/` via `school.urls` include:
  - Catalog:
    - `GET/POST /api/library/resources/`
    - `GET/PATCH/DELETE /api/library/resources/{id}/`
    - `GET /api/library/resources/search/`
    - `GET/POST /api/library/copies/`
    - `GET/PATCH/DELETE /api/library/copies/{id}/`
    - `GET/POST /api/library/categories/`
  - Member management:
    - `GET/POST /api/library/members/`
    - `GET/PATCH/DELETE /api/library/members/{id}/`
    - `POST /api/library/members/{id}/suspend/`
    - `GET /api/library/members/{id}/borrowings/`
    - `GET /api/library/members/{id}/history/`
  - Circulation:
    - `POST /api/library/circulation/issue/`
    - `POST /api/library/circulation/return/`
    - `POST /api/library/circulation/renew/`
    - `GET /api/library/circulation/transactions/`
    - `GET /api/library/circulation/overdue/`
    - `GET /api/library/circulation/member/{id}/`
    - `GET/POST /api/library/circulation/rules/`
  - Reservations:
    - `GET/POST /api/library/reservations/`
    - `PATCH /api/library/reservations/{id}/cancel/`
    - `PATCH /api/library/reservations/{id}/pickup/`
    - `GET /api/library/reservations/queue/{resource_id}/`
  - Fines:
    - `GET /api/library/fines/`
    - `POST /api/library/fines/{id}/pay/`
    - `POST /api/library/fines/{id}/waive/`
    - `GET /api/library/fines/summary/{member_id}/`
- Frontend Library module routes added in `sms_frontend/src/App.tsx`:
  - `/modules/library/dashboard`
  - `/modules/library/catalog`
  - `/modules/library/circulation`
  - `/modules/library/reservations`
  - `/modules/library/members`
  - `/modules/library/fines`
- Frontend pages added:
  - `sms_frontend/src/pages/library/LibraryLayout.tsx`
  - `sms_frontend/src/pages/library/LibraryDashboardPage.tsx`
  - `sms_frontend/src/pages/library/LibraryCatalogPage.tsx`
  - `sms_frontend/src/pages/library/LibraryCirculationPage.tsx`
  - `sms_frontend/src/pages/library/LibraryReservationsPage.tsx`
  - `sms_frontend/src/pages/library/LibraryMembersPage.tsx`
  - `sms_frontend/src/pages/library/LibraryFinesPage.tsx`
- Main dashboard direct access updated:
  - `sms_frontend/src/pages/DashboardPage.tsx` now includes `LIBRARY` quick button.
  - `sms_frontend/src/pages/ModuleDashboardPage.tsx` includes `LIBRARY` label mapping.

### Remaining gaps (next slice)
- Inventory audits, acquisition/procurement, and digital resources are not implemented yet.
- Report/analytics endpoints under `/api/library/reports/*` are pending.
- Auto-membership sync with Students/Staff modules is pending.
- Finance integration for fine payment posting is pending.
- Communication-triggered overdue and reservation-ready alerts are pending.

## Library P0 Reports + Integration Slice (2026-02-16)

### Completed
- Backend library reports endpoints added:
  - `GET /api/library/reports/circulation/`
  - `GET /api/library/reports/popular/`
  - `GET /api/library/reports/overdue/`
  - `GET /api/library/reports/fines/`
  - `GET /api/library/reports/member-activity/`
- Backend member sync integration endpoint added:
  - `POST /api/library/members/sync/` (admin only)
  - Syncs active members from:
    - Students (`school.Student`)
    - HR employees (`hr.Employee`)
    - Staff management staff (`staff_mgmt.StaffMember`)
- Communication integration added in circulation return workflow:
  - Overdue fine creation now triggers in-app notification for linked member user.
  - Reservation-ready transition now triggers in-app notification for next member user.

### Frontend completed
- Added Library reports page and route:
  - `sms_frontend/src/pages/library/LibraryReportsPage.tsx`
  - `/modules/library/reports`
- Added Library nav entry for Reports:
  - `sms_frontend/src/pages/library/LibraryLayout.tsx`
- Added members sync action to Library Members page:
  - `sms_frontend/src/pages/library/LibraryMembersPage.tsx`
  - Button: `Sync from Students/Staff`

### Validation
- Backend tests:
  - `python manage.py test library.tests --keepdb`
- Frontend build:
  - `npm run build`

### Remaining gaps
- Inventory audit, acquisition/procurement, and digital resources remain pending.
- Finance posting integration for fine payment receivables is completed in the next slice.

## Library P0 Finance Posting Integration (2026-02-16)

### Completed
- Added finance journal posting integration for library fines:
  - File: `sms_backend/school/services.py`
  - New service methods:
    - `FinanceService.post_library_fine_accrual(...)`
    - `FinanceService.post_library_fine_payment(...)`
    - `FinanceService.post_library_fine_waiver(...)`
- Integrated posting into Library workflows:
  - File: `sms_backend/library/views.py`
  - On overdue fine creation (return flow):
    - posts accrual entry (AR debit, revenue credit) with idempotent key `library_fine_accrual:{fine_id}`
  - On fine payment:
    - posts settlement entry (cash debit, AR credit) with marker-based idempotent key
  - On fine waiver:
    - posts write-off entry (expense debit, AR credit) with idempotent key `library_fine_waiver:{fine_id}`
- Added finance audit endpoint on fines:
  - `GET /api/library/fines/{id}/finance-postings/`
  - Returns linked journal entries and journal lines for that fine.
- Added frontend visibility for finance linkage:
  - File: `sms_frontend/src/pages/library/LibraryFinesPage.tsx`
  - New `Finance` action per fine row to view postings.

### Notes
- Return flow remains non-blocking if accrual posting fails (to avoid blocking circulation operations).
- Payment/waiver flows are transactional and return validation errors when accounting period rules reject posting.

## Provider Configuration Reminder (Deferred by request)
- You asked to configure providers later. Keep these pending before production:
  - Communication:
    - `COMMUNICATION_SMS_API_KEY`
    - `COMMUNICATION_WHATSAPP_API_KEY`
    - `COMMUNICATION_PUSH_SERVER_KEY`
    - `COMMUNICATION_WEBHOOK_TOKEN`
    - `COMMUNICATION_WEBHOOK_SHARED_SECRET`
    - `COMMUNICATION_WEBHOOK_REQUIRE_TIMESTAMP`
    - `COMMUNICATION_WEBHOOK_MAX_AGE_SECONDS`
    - `COMMUNICATION_WEBHOOK_STRICT_MODE`
  - Finance:
    - `FINANCE_PAYMENT_GATEWAY_PROVIDER`
    - `FINANCE_PAYMENT_GATEWAY_API_KEY`

## Parent Portal Baseline Slice (2026-02-14)

### Completed
- Backend parent portal app added: `sms_backend/parent_portal`
  - Mounted at: `/api/parent-portal/`
  - Included in tenant apps and tenant routes:
    - `sms_backend/config/settings.py`
    - `sms_backend/school/urls.py`
- Baseline endpoints implemented:
  - Dashboard:
    - `GET /api/parent-portal/dashboard/`
    - `GET /api/parent-portal/dashboard/kpis/`
    - `GET /api/parent-portal/dashboard/alerts/`
    - `GET /api/parent-portal/dashboard/activity/`
    - `GET /api/parent-portal/dashboard/upcoming/`
  - Academics:
    - `GET /api/parent-portal/academics/grades/`
    - `GET /api/parent-portal/academics/report-cards/`
    - `GET /api/parent-portal/academics/report-cards/{id}/download/`
    - `GET /api/parent-portal/academics/analysis/`
    - `GET /api/parent-portal/academics/assessments/`
  - Attendance & behavior:
    - `GET /api/parent-portal/attendance/calendar/`
    - `GET /api/parent-portal/attendance/summary/`
    - `POST /api/parent-portal/attendance/leave-request/`
    - `GET /api/parent-portal/behavior/incidents/`
    - `POST /api/parent-portal/behavior/{id}/acknowledge/`
  - Finance:
    - `GET /api/parent-portal/finance/summary/`
    - `GET /api/parent-portal/finance/invoices/`
    - `GET /api/parent-portal/finance/invoices/{id}/download/`
    - `GET /api/parent-portal/finance/payments/`
    - `GET /api/parent-portal/finance/payments/{id}/receipt/`
    - `POST /api/parent-portal/finance/pay/`
    - `GET /api/parent-portal/finance/statement/`
  - Communication:
    - `GET/POST /api/parent-portal/messages/`
    - `GET /api/parent-portal/announcements/`
    - `GET /api/parent-portal/notifications/`
    - `PATCH /api/parent-portal/notifications/{id}/read/`
    - `GET/PATCH /api/parent-portal/notification-preferences/`
  - Schedule, assignments, events, library, profile:
    - `GET /api/parent-portal/timetable/`
    - `GET /api/parent-portal/timetable/export/`
    - `GET /api/parent-portal/calendar/`
    - `GET /api/parent-portal/assignments/`
    - `POST /api/parent-portal/assignments/{id}/submit/`
    - `GET /api/parent-portal/events/`
    - `POST /api/parent-portal/events/{id}/rsvp/`
    - `GET /api/parent-portal/library/borrowings/`
    - `GET /api/parent-portal/library/history/`
    - `GET/PATCH /api/parent-portal/profile/`
    - `POST /api/parent-portal/profile/change-password/`
- Frontend Parent Portal module added:
  - Route base: `/modules/parent-portal/*`
  - Files:
    - `sms_frontend/src/pages/parentPortal/ParentPortalLayout.tsx`
    - `sms_frontend/src/pages/parentPortal/ParentPortalDashboardPage.tsx`
    - `sms_frontend/src/pages/parentPortal/ParentPortalAcademicsPage.tsx`
    - `sms_frontend/src/pages/parentPortal/ParentPortalAttendancePage.tsx`
    - `sms_frontend/src/pages/parentPortal/ParentPortalFinancePage.tsx`
    - `sms_frontend/src/pages/parentPortal/ParentPortalCommunicationPage.tsx`
    - `sms_frontend/src/pages/parentPortal/ParentPortalSchedulePage.tsx`
    - `sms_frontend/src/pages/parentPortal/ParentPortalAssignmentsPage.tsx`
    - `sms_frontend/src/pages/parentPortal/ParentPortalLibraryProfilePage.tsx`
  - Dashboard quick access for `PARENTS` now opens portal dashboard:
    - `sms_frontend/src/pages/DashboardPage.tsx`

### Gaps / risks
- Child scoping currently derives linkage from guardian email/name matching user profile; this is a temporary strategy until explicit `ParentUser <-> Guardian` linkage is introduced.
- Invoice and receipt download endpoints are placeholder responses (no PDF generation in parent-portal layer yet).
- Timetable endpoint currently uses assessment timeline fallback; dedicated timetable model/feed integration is pending.
- Library borrowings/history endpoints are baseline placeholders and require direct student-library linkage in next slice.

### Hardening update (explicit parent-child linkage)
- Added `ParentStudentLink` model in `sms_backend/parent_portal/models.py` with migration:
  - `sms_backend/parent_portal/migrations/0001_initial.py`
- Child scoping resolver now uses explicit mapping first:
  - `parent_portal.views._children_for_parent`
- Transitional fallback behavior is now controlled by:
  - `PARENT_PORTAL_ALLOW_GUARDIAN_FALLBACK` in `sms_backend/config/settings.py`
  - `.env` placeholder added in `sms_backend/.env.example`
- Added admin link management endpoints:
  - `GET/POST /api/parent-portal/admin/links/`
  - `PATCH/DELETE /api/parent-portal/admin/links/{id}/`
- Recommended production setting:
  - `PARENT_PORTAL_ALLOW_GUARDIAN_FALLBACK=false` after links are populated.
- Current backend defaults:
  - `PARENT_PORTAL_ALLOW_GUARDIAN_FALLBACK=true` in debug/dev, `false` otherwise.
  - `COMMUNICATION_WEBHOOK_STRICT_MODE=false` in debug/dev, `true` otherwise.

## Admissions cleanup and readiness (2026-02-14)

### Current implementation state
- Admissions is operational but currently coupled to Students via `school` app APIs.
- Active endpoints:
  - `GET/POST /api/admissions/applications/`
  - `PATCH /api/admissions/applications/{id}/`
  - `POST /api/admissions/applications/{id}/enroll/`
  - `POST /api/admissions/applications/{id}/documents/`
  - `DELETE /api/admissions/applications/{id}/documents/{doc_id}/`
  - `GET /api/admissions/summary/`
- Frontend entry point is currently:
  - `/modules/students/admissions`

### Cleanup notes for next team
- Admissions standalone split is not yet done; current implementation should remain unchanged until cutover plan is executed.
- Dedicated readiness handoff has been added:
  - `docs/ADMISSIONS_READINESS.md`
- Docs index updated to include the admissions readiness reference:
  - `docs/INDEX.md`

### Gaps and risks to keep in mind
- Admissions permissions now require `ADMISSIONS` module access; users previously assigned only `STUDENTS` need assignment updates.
- Admissions data/workflows are mixed with student lifecycle; future extraction requires compatibility routing.
- Advanced admissions submodules from spec (Inquiry, Review, Assessment, Interview, Decision workflow, Analytics) are still pending.

## Admissions Phase A extraction (2026-02-14)

### Implemented
- Standalone backend module shell added:
  - `sms_backend/admissions/apps.py`
  - `sms_backend/admissions/views.py`
  - `sms_backend/admissions/urls.py`
- Admissions route ownership moved to standalone include under tenant API:
  - `path('admissions/', include('admissions.urls'))` in `sms_backend/school/urls.py`
- Existing endpoint paths are preserved (no frontend/API break):
  - `GET/POST /api/admissions/applications/`
  - `PATCH /api/admissions/applications/{id}/`
  - `POST /api/admissions/applications/{id}/enroll/`
  - `POST /api/admissions/applications/{id}/documents/`
  - `DELETE /api/admissions/applications/{id}/documents/{doc_id}/`
  - `GET /api/admissions/summary/`
- New module key seeded:
  - `ADMISSIONS` added in:
    - `sms_backend/school/management/commands/seed_modules.py`
    - `sms_backend/school/management/commands/seed_demo.py`
- Dashboard summary now includes admissions KPI block when module is assigned.

### Frontend extraction
- New standalone module shell:
  - `sms_frontend/src/pages/admissions/AdmissionsLayout.tsx`
  - `sms_frontend/src/pages/admissions/AdmissionsDashboardPage.tsx`
  - `sms_frontend/src/pages/admissions/AdmissionsApplicationsPage.tsx`
- New routes:
  - `/modules/admissions/dashboard`
  - `/modules/admissions/applications`
- Legacy alias kept:
  - `/modules/students/admissions` now redirects to `/modules/admissions/applications`
- Main dashboard includes Admissions button.

### Access migration helper
- Added tenant-aware backfill command:
  - `python manage.py backfill_admissions_module_access --schema=<tenant_schema>`
- Purpose:
  - Assign `ADMISSIONS` module access to users who already have active `STUDENTS` access.
- Supports:
  - `--dry-run` for preview
  - `--all-tenants` for bulk execution

## Library Inventory + Acquisition Baseline Slice (2026-02-16)

### Completed
- Backend models/migration added in `sms_backend/library`:
  - `InventoryAudit`
  - `AcquisitionRequest`
  - Migration: `sms_backend/library/migrations/0002_inventoryaudit_acquisitionrequest.py`
- Backend endpoints added under `/api/library/`:
  - Inventory:
    - `GET/POST /api/library/inventory/audits/`
    - `POST /api/library/inventory/audits/{id}/complete/`
  - Acquisition:
    - `GET/POST /api/library/acquisition/requests/`
    - `POST /api/library/acquisition/requests/{id}/approve/`
    - `POST /api/library/acquisition/requests/{id}/reject/`
    - `POST /api/library/acquisition/requests/{id}/mark-ordered/`
    - `POST /api/library/acquisition/requests/{id}/mark-received/`
- Frontend pages/routes added:
  - `sms_frontend/src/pages/library/LibraryInventoryPage.tsx`
  - `sms_frontend/src/pages/library/LibraryAcquisitionPage.tsx`
  - Routes:
    - `/modules/library/inventory`
    - `/modules/library/acquisition`
  - Library sidebar updated in `sms_frontend/src/pages/library/LibraryLayout.tsx`.
- Backend tests expanded:
  - `sms_backend/library/tests.py` includes inventory + acquisition baseline endpoint coverage.

### Remaining library gaps
- Inventory line-level scan reconciliation (per-copy found/missing) is not yet implemented.
- Acquisition vendor records, purchase orders, and budget commit linkage are pending.

## Communication Webhook Strictness Slice (2026-02-16)

### Completed
- Webhook verification path supports stricter production behavior:
  - token via `X-Webhook-Token` or `Authorization: Bearer <token>`
  - optional timestamp requirement and replay-window enforcement
  - signature accepted for raw body and `timestamp.body` formats
- Communication webhook endpoints now enforce strict status handling:
  - Email webhook normalizes provider statuses (`processed/open/click/bounce/...`) to internal enum
  - SMS webhook normalizes provider statuses (`queued/submitted/undelivered/...`) to internal enum
  - Unknown status values now return `400` instead of silent no-op success
- Test coverage expanded in `sms_backend/communication/tests.py`:
  - signed webhook with timestamp success path
  - invalid/unknown status rejection path
  - continued coverage for token auth fallback behavior

### Validation
- `python manage.py test communication.tests --keepdb` passes.

### Deferred provider config reminder
- Keep these pending before production:
  - `COMMUNICATION_WEBHOOK_TOKEN`
  - `COMMUNICATION_WEBHOOK_SHARED_SECRET`
  - `COMMUNICATION_WEBHOOK_REQUIRE_TIMESTAMP=true`
  - `COMMUNICATION_WEBHOOK_MAX_AGE_SECONDS=300`

## Admissions P0-A Functional Hardening (2026-02-16)

### Completed
- Interview scheduling/calendar time handling hardened in frontend:
  - File: `sms_frontend/src/pages/admissions/AdmissionsInterviewsPage.tsx`
  - Added datetime normalization for create/reschedule flows so `datetime-local` values are posted in consistent API-compatible format (`YYYY-MM-DDTHH:MM:SS`).
  - Added safer seed conversion when loading existing interview datetimes into editable `datetime-local` fields.
  - Added explicit validation for required application/date/time before submit actions.
- Assessment scheduling time handling hardened:
  - File: `sms_frontend/src/pages/admissions/AdmissionsAssessmentsPage.tsx`
  - Added datetime normalization and required field validation to reduce avoidable 400s from schedule payload format.

### Validation
- Frontend build passes:
  - `npm run build`
- Backend admissions regression tests pass:
  - `python manage.py test admissions.tests --keepdb`

## Admissions P0-B Action Reliability Hardening (2026-02-16)

### Completed
- Decisions page hardening:
  - File: `sms_frontend/src/pages/admissions/AdmissionsDecisionsPage.tsx`
  - Added in-flight locks for create/respond/offer-letter actions to prevent duplicate submissions.
  - Added richer backend error extraction so field/api errors surface clearly to operators.
  - Added client-side guards for required fields and decision/offer deadline consistency.
- Enrollment page hardening:
  - File: `sms_frontend/src/pages/admissions/AdmissionsEnrollmentPage.tsx`
  - Added in-flight locks for eligibility checks and enrollment completion.
  - Added stronger required-field checks before submit.
  - Added richer backend error extraction for clearer failure messages.

### Validation
- Frontend build passes:
  - `npm run build`

## Admissions P0-C UX Consistency Sweep (2026-02-16)

### Completed
- Admissions pages UX standardized for operator consistency:
  - Files:
    - `sms_frontend/src/pages/admissions/AdmissionsInquiriesPage.tsx`
    - `sms_frontend/src/pages/admissions/AdmissionsReviewsPage.tsx`
    - `sms_frontend/src/pages/admissions/AdmissionsAssessmentsPage.tsx`
    - `sms_frontend/src/pages/admissions/AdmissionsInterviewsPage.tsx`
    - `sms_frontend/src/pages/admissions/AdmissionsDecisionsPage.tsx`
    - `sms_frontend/src/pages/admissions/AdmissionsEnrollmentPage.tsx`
    - `sms_frontend/src/pages/admissions/AdmissionsAnalyticsPage.tsx`
- Added consistent loading indicators on pages that fetch API data.
- Added flash-message auto-dismiss behavior (3s) across operational admissions pages.
- Ensured error paths clear stale success messages for clearer user feedback.
- Kept existing behavior and endpoint contracts intact while improving UI state reliability.

### Validation
- Frontend build passes:
  - `npm run build`

## Admissions P0 Contract-Level Hardening (2026-02-16)

### Completed
- Added stricter client-side contract validation before API calls across admissions pages:
  - `sms_frontend/src/pages/admissions/AdmissionsInquiriesPage.tsx`
    - inquiry source enum validation
    - optional parent email format validation
    - status enum validation before patch update
  - `sms_frontend/src/pages/admissions/AdmissionsReviewsPage.tsx`
    - required application validation
    - recommendation enum validation
    - overall score numeric range validation (decimal-compatible upper bound)
  - `sms_frontend/src/pages/admissions/AdmissionsAssessmentsPage.tsx`
    - status enum validation
    - pass-state enum validation
    - score numeric range validation
  - `sms_frontend/src/pages/admissions/AdmissionsInterviewsPage.tsx`
    - interview type/status enum validation
    - interview score numeric range validation for feedback and completion actions
  - `sms_frontend/src/pages/admissions/AdmissionsDecisionsPage.tsx`
    - decision enum validation before submit
- Objective: reduce avoidable 400 responses by aligning frontend payload constraints with backend serializer/model choices.

### Validation
- Frontend build passes:
  - `npm run build`

## Admissions Backend Contract Hardening (2026-02-16)

### Completed
- Added serializer-level backend validations in `sms_backend/admissions/serializers.py`:
  - Inquiry:
    - no future `inquiry_date`
    - `child_dob` cannot be after `inquiry_date`
    - `child_age` range enforcement (1-25) when provided
  - Review:
    - `academic_score`, `test_score`, `interview_score`, `overall_score` constrained to 0-100
  - Assessment:
    - `score` constrained to 0-100
    - `score` required when status is `Completed`
    - basic `scheduled_at` floor-date guard
  - Interview:
    - `score` constrained to 0-100
    - `panel` must be a list of integer user IDs
    - very-far-future/out-of-range datetime guard
    - `Completed` interviews require score or feedback
  - Decision:
    - `offer_deadline >= decision_date`
    - `offer_deadline` only valid for `Accept` decisions
    - initial `response_status` must be `Pending`
- Added negative contract tests in `sms_backend/admissions/tests.py`:
  - score range validation failures
  - decision payload consistency failures

### Validation
- Backend tests pass:
  - `python manage.py test admissions.tests --keepdb`

## Finance mock cleanup step 1 (2026-02-15)

### Completed
- Removed `mockStudentDetail` fallback injection from finance student-context flows so UI no longer displays fabricated guardian/class data when API calls fail.
- Updated fallback behavior to:
  - set `studentDetail` to `null`
  - keep enrollment as `null`
  - show non-mock notice: `Student contact or class info not available.`
- Updated files:
  - `sms_frontend/src/pages/finance/FinanceInvoicesPage.tsx`
  - `sms_frontend/src/pages/finance/FinancePaymentsPage.tsx`
  - `sms_frontend/src/pages/finance/FinanceInvoiceFormPage.tsx`
  - `sms_frontend/src/pages/finance/FinancePaymentFormPage.tsx`
  - `sms_frontend/src/pages/finance/FinanceFeeAssignmentFormPage.tsx`
  - `sms_frontend/src/pages/finance/FinanceAdjustmentFormPage.tsx`

### Validation
- Frontend build passes:
  - `npm run build`

## Finance mock cleanup step 2 (2026-02-15)

### Completed
- Removed expense budget hardcoded fallback dataset (`mockBudgets`) from:
  - `sms_frontend/src/pages/finance/FinanceExpensesPage.tsx`
- Budget load fallback is now strictly:
  - API data when available
  - local persisted values when API is unavailable
  - empty budget list when neither source has data
- Updated budget fallback notices to remove "mock" wording and reflect local-only mode.

### Validation
- Frontend build passes:
  - `npm run build`

## Finance mock cleanup step 3 (2026-02-15)

### Completed
- Replaced placeholder-action buttons that previously simulated unavailable features via flash banners.
- Converted these controls to explicit disabled pending buttons:
  - `sms_frontend/src/pages/finance/FinanceFeeAssignmentsPage.tsx`
    - `Bulk assign` -> `Bulk assign (pending)`
  - `sms_frontend/src/pages/finance/FinanceFeeStructuresPage.tsx`
    - `Bulk actions` -> `Bulk actions (pending)`
  - `sms_frontend/src/pages/finance/FinanceInvoicesPage.tsx`
    - `Bulk generate` -> `Bulk generate (pending)`
    - `Download PDF` -> `Download PDF (pending)`
  - `sms_frontend/src/pages/finance/FinancePaymentsPage.tsx`
    - `Export receipts` -> `Export receipts (pending)`
- Removed old “will be enabled once backend…”/“queued for backend support” runtime flash messages from these actions.

### Validation
- Frontend build passes:
  - `npm run build`

## Finance mock cleanup step 4 (2026-02-15)

### Completed
- Removed remaining non-functional placeholder control in expense form:
  - Deleted `Attachment (coming soon)` disabled file input block from:
    - `sms_frontend/src/pages/finance/FinanceExpenseFormPage.tsx`
- Expense form now presents only fields backed by current API behavior.

### Validation
- Frontend build passes:
  - `npm run build`

## Finance mock cleanup step 5 (2026-02-15)

### Completed
- Removed remaining disabled "pending" action buttons so finance pages show only currently operational actions:
  - `sms_frontend/src/pages/finance/FinanceFeeAssignmentsPage.tsx`
    - Removed `Bulk assign (pending)`
  - `sms_frontend/src/pages/finance/FinanceFeeStructuresPage.tsx`
    - Removed `Bulk actions (pending)`
  - `sms_frontend/src/pages/finance/FinanceInvoicesPage.tsx`
    - Removed `Bulk generate (pending)`
    - Removed `Download PDF (pending)` in invoice detail modal
  - `sms_frontend/src/pages/finance/FinancePaymentsPage.tsx`
    - Removed `Export receipts (pending)`

### Validation
- Frontend build passes:
  - `npm run build`

## Finance mock cleanup step 6 (2026-02-15)

### Completed
- Removed budget local-persistence fallback behavior so budget data is now strictly API-truth:
  - `sms_frontend/src/pages/finance/FinanceExpensesPage.tsx`
- Changes made:
  - Removed `localStorage` read/write effects for budget fields.
  - Removed fallback reconstruction of budgets from local values when budget API fails.
  - Save failure no longer mutates in-memory budgets as if persisted; now shows explicit failure notice.
  - Budget form now clears values when no budget exists for selected term (instead of showing stale values).

### Validation
- Frontend build passes:
  - `npm run build`

## Finance mock cleanup step 7 (2026-02-15)

### Completed
- Replaced payment reversal prompt flow with a proper modal workflow:
  - `sms_frontend/src/pages/finance/FinancePaymentsPage.tsx`
- Changes made:
  - Removed `window.prompt` usage for reversal reason capture.
  - Added controlled modal state (`reversalTarget`, `reversalReason`, `isSubmittingReversal`).
  - Added modal submit/cancel flow with required reason validation.
  - Kept backend integration unchanged (`POST /api/finance/payment-reversals/`).

### Validation
- Frontend build passes:
  - `npm run build`

## Finance mock cleanup step 8 (2026-02-15)

### Completed
- Standardized finance download behavior on shared helpers to remove duplicated blob logic and keep filename parsing consistent:
  - `sms_frontend/src/utils/download.ts` (reused)
  - `sms_frontend/src/pages/finance/FinanceReportsPage.tsx`
  - `sms_frontend/src/pages/finance/FinanceReconciliationPage.tsx`
  - `sms_frontend/src/pages/finance/FinanceExpensesPage.tsx`
- Changes made:
  - Replaced page-local `downloadBlob`/`extractFilename` implementations with shared imports.
  - Replaced manual `createObjectURL` download blocks with `downloadBlob(...)`.
  - Applied `extractFilename(...)` on reconciliation CSV export response headers.

### Validation
- Frontend build passes:
  - `npm run build`

## Finance mock cleanup step 9 (2026-02-15)

### Completed
- Removed remaining fabricated academic reference defaults from finance budget planning:
  - `sms_frontend/src/pages/finance/FinanceExpensesPage.tsx`
- Changes made:
  - Removed hardcoded fallback `setSelectedTerm('1')` when academic reference APIs fail.
  - Removed synthetic dropdown fallback values (`'2025'` year and `'1'` term).
  - Budget planner year/term selectors now show explicit unavailable options and disable when references are missing.
  - Added clear notice: `Academic references unavailable. Budget planner is disabled until references load.`

### Validation
- Frontend build passes:
  - `npm run build`

## Finance mock cleanup step 10 (2026-02-15)

### Completed
- Removed misleading report-card export actions that were routing every card to summary export:
  - `sms_frontend/src/pages/finance/FinanceReportsPage.tsx`
- Changes made:
  - Report cards now show export buttons only for implemented endpoints:
    - Debtors Aging -> `Export Aging CSV`
    - Collections Report -> `Export Overdue CSV`
  - Non-implemented report cards now display explicit `Export not yet available` label.
  - Summary CSV/PDF export remains available from the page header only.
  - Aging/overdue CSV exports now honor backend `Content-Disposition` filenames when present.

### Validation
- Frontend build passes:
  - `npm run build`

## Finance mock cleanup step 11 (2026-02-15)

### Completed
- Hardened write-off request creation to reduce ID-entry errors:
  - `sms_frontend/src/pages/finance/FinanceRefundsPage.tsx`
- Changes made:
  - Added invoice option loader from live `/api/finance/invoices/`.
  - Replaced free-text invoice ID with dropdown when options are available.
  - Kept manual Invoice ID input as fallback when invoice list cannot load.
  - Added strict validation:
    - invoice ID must be positive integer
    - amount must be positive
    - amount cannot exceed selected invoice balance due
  - API error detail is now surfaced when available.

### Validation
- Frontend build passes:
  - `npm run build`

## Finance mock cleanup step 12 (2026-02-15)

### Completed
- Added write-off action state hardening to prevent accidental double submissions:
  - `sms_frontend/src/pages/finance/FinanceRefundsPage.tsx`
- Changes made:
  - Added submit in-flight state (`isSubmitting`) with disabled submit button and loading label.
  - Added per-row review in-flight state (`reviewingId`) to disable approve/reject buttons while request is processing.

### Validation
- Frontend build passes:
  - `npm run build`

## Finance mock cleanup step 13 (2026-02-15)

### Completed
- Applied consistent finance display formatting in write-off workflows:
  - `sms_frontend/src/pages/finance/FinanceRefundsPage.tsx`
- Changes made:
  - Standardized currency formatting to 2 decimal places.
  - Standardized datetime rendering for request timestamps.
  - Added visual status badges for `PENDING` / `APPROVED` / `REJECTED`.

### Validation
- Frontend build passes:
  - `npm run build`

## Finance mock cleanup step 14 (2026-02-15)

### Completed
- Hardened invoice adjustment review actions and row readability:
  - `sms_frontend/src/pages/finance/FinanceAdjustmentsPage.tsx`
- Changes made:
  - Added in-flight review guard (`reviewingId`) so approve/reject actions are disabled while submitting.
  - Standardized currency and datetime display for adjustment amount/date.
  - Added visual status badges for adjustment approval state.

### Validation
- Frontend build passes:
  - `npm run build`

## Finance mock cleanup step 15 (2026-02-15)

### Completed
- Improved payment operations table and reversal queue consistency:
  - `sms_frontend/src/pages/finance/FinancePaymentsPage.tsx`
- Changes made:
  - Standardized currency and datetime display for payments.
  - Added payment status badges (`Reversed`, `Allocated`, `Partial`, `Unallocated`).
  - Added reversal status badges and in-flight guard (`reviewingReversalId`) for approve/reject actions.
  - Fixed context expansion table alignment by setting `colSpan` to match table columns.

### Validation
- Frontend build passes:
  - `npm run build`

## Finance mock cleanup step 16 (2026-02-15)

### Completed
- Hardened invoice operations validation and backend error extraction:
  - `sms_frontend/src/pages/finance/FinanceInvoicesPage.tsx`
- Changes made:
  - Added strict allocation validation:
    - amount must be numeric and > 0
    - cannot exceed payment unallocated amount
    - cannot exceed invoice balance
    - cannot exceed selected installment outstanding amount
  - Improved backend error mapping for allocation/installment API responses (`error`, `detail`, `non_field_errors`).
  - Added installment plan validation:
    - count must be integer in range 1..24
    - due-date count must match installment count
    - due dates must be valid, unique, and ascending
    - last installment date cannot be later than invoice due date
  - Added in-flight guard state for installment save action (`isSavingInstallmentPlan`).
  - Added invoice list date filter guard for invalid date range (`date_from > date_to`).

### Validation
- Frontend build passes:
  - `npm run build`

## Finance mock cleanup step 17 (2026-02-15)

### Completed
- Hardened invoice creation form interaction safety:
  - `sms_frontend/src/pages/finance/FinanceInvoiceFormPage.tsx`
- Changes made:
  - Added duplicate submit guard (`if (isSubmitting) return`) in submit handler.
  - Added unsaved-change protection for create flow:
    - tracks form touch state
    - browser `beforeunload` guard when there are unsaved changes
    - cancel navigation confirmation when unsaved edits exist
  - Strengthened line-item validation:
    - must have at least one line item
    - duplicate fee structures are blocked
    - description is required per line
    - amount must be valid and > 0
  - Added per-line description error rendering.

### Validation
- Frontend build passes:
  - `npm run build`

## Finance Maturity Phase 4 (2026-02-14)

### Completed
- Gateway + reconciliation backend contracts wired in `school`:
  - `GET/POST/PATCH /api/finance/gateway/transactions/`
  - `POST /api/finance/gateway/transactions/{id}/mark-reconciled/`
  - `GET /api/finance/gateway/events/`
  - `POST /api/finance/gateway/webhooks/{provider}/`
  - `GET/POST/PATCH /api/finance/reconciliation/bank-lines/`
  - `POST /api/finance/reconciliation/bank-lines/{id}/auto-match/`
  - `POST /api/finance/reconciliation/bank-lines/{id}/clear/`
  - `POST /api/finance/reconciliation/bank-lines/{id}/ignore/`
  - `POST /api/finance/reconciliation/bank-lines/{id}/unmatch/`
- Webhook processing hardening:
  - Idempotent event ingestion by `event_id`.
  - Token verification via `X-Webhook-Token` (or `Authorization: Bearer ...`) when configured.
  - HMAC signature verification via `X-Webhook-Signature` when shared secret is configured.
  - Event processing updates gateway transaction status and reconciles successful payments.
- New finance reconciliation models are now tracked with migration:
  - `sms_backend/school/migrations/0023_paymentgatewaytransaction_paymentgatewaywebhookevent_and_more.py`

### Config placeholders added
- `sms_backend/config/settings.py`:
  - `FINANCE_WEBHOOK_TOKEN`
  - `FINANCE_WEBHOOK_SHARED_SECRET`
- `sms_backend/.env.example`:
  - `FINANCE_WEBHOOK_TOKEN=`
  - `FINANCE_WEBHOOK_SHARED_SECRET=`

### Pending for production
- Configure real gateway provider keys + webhook secret/token values.
- Add provider-specific payload adapters where field names differ from current generic mapper.

## Finance Maturity Phase 5 (2026-02-14)

### Completed
- Finance accounting workspace is now live (frontend):
  - `sms_frontend/src/pages/finance/FinanceAccountsPage.tsx`
  - Uses backend endpoints:
    - `GET /api/finance/accounting/accounts/`
    - `GET /api/finance/accounting/periods/`
    - `POST /api/finance/accounting/periods/{id}/close/`
    - `POST /api/finance/accounting/periods/{id}/reopen/`
    - `GET /api/finance/accounting/trial-balance/`
    - `GET /api/finance/accounting/ledger/?account_id=<id>`
  - Replaces previous mock ledger with live trial-balance + ledger + period controls.
- Finance reconciliation workspace is now live (frontend):
  - `sms_frontend/src/pages/finance/FinanceReconciliationPage.tsx`
  - Uses backend endpoints:
    - `GET /api/finance/gateway/transactions/`
    - `POST /api/finance/gateway/transactions/{id}/mark-reconciled/`
    - `GET /api/finance/gateway/events/`
    - `GET /api/finance/reconciliation/bank-lines/`
    - `POST /api/finance/reconciliation/bank-lines/{id}/auto-match/`
    - `POST /api/finance/reconciliation/bank-lines/{id}/clear/`
    - `POST /api/finance/reconciliation/bank-lines/{id}/ignore/`
    - `POST /api/finance/reconciliation/bank-lines/{id}/unmatch/`
- Finance navigation and routing updated:
  - `sms_frontend/src/pages/finance/FinanceLayout.tsx` adds `Reconciliation`.
  - `sms_frontend/src/App.tsx` adds route:
    - `/modules/finance/reconciliation`

### Validation
- Frontend production build passes:
  - `npm run build`

### Remaining hardening
- Add CSV/PDF exports for reconciliation tables.
- Add bulk import for bank statement lines (CSV upload).
- Add role-specific UI guards for period close/reopen actions.

## Finance Maturity Phase 6 (2026-02-14)

### Completed
- Backend reconciliation import/export hardening:
  - `sms_backend/school/views.py` (`BankStatementLineViewSet`)
  - Added CSV import endpoint:
    - `POST /api/finance/reconciliation/bank-lines/import-csv/`
    - Expects CSV columns including:
      - `statement_date` (`YYYY-MM-DD`)
      - `amount`
      - optional: `value_date`, `reference`, `narration`, `source`
  - Added CSV export endpoint:
    - `GET /api/finance/reconciliation/bank-lines/export-csv/`
- Frontend reconciliation operational tools:
  - `sms_frontend/src/pages/finance/FinanceReconciliationPage.tsx`
  - Added:
    - Gateway transactions CSV export (client-side)
    - Webhook events CSV export (client-side)
    - Bank lines CSV export (server endpoint)
    - Bank lines CSV import upload (multipart form)
- Frontend role guard for accounting period controls:
  - `sms_frontend/src/pages/finance/FinanceAccountsPage.tsx`
  - Close/reopen buttons are now disabled for non-admin roles.
  - Informational banner shown when user is not `ADMIN`/`TENANT_SUPER_ADMIN`.

### Validation
- Backend:
  - `python manage.py check` passed
  - `python -m py_compile sms_backend/school/views.py` passed
- Frontend:
  - `npm run build` passed

## Finance Maturity Phase 7 (2026-02-14)

### Completed
- Backend collections/reporting endpoints added:
  - `GET /api/finance/reports/receivables-aging/`
  - `GET /api/finance/reports/overdue-accounts/` (supports `search`)
  - Files:
    - `sms_backend/school/views.py`
    - `sms_backend/school/urls.py`
- Backend invoice-level reminder action added:
  - `POST /api/finance/invoices/{id}/send-reminder/`
  - Uses `FinanceService.send_invoice_reminder(...)` and logs reminder entries in `FeeReminderLog`.
  - File:
    - `sms_backend/school/services.py`
- Frontend Finance Reports upgraded to operational collections workspace:
  - File: `sms_frontend/src/pages/finance/FinanceReportsPage.tsx`
  - Added:
    - live receivables aging cards from backend endpoint
    - overdue accounts table with search
    - per-invoice reminder action
    - bulk overdue reminder trigger

### Validation
- Backend:
  - `python -m py_compile sms_backend/school/views.py sms_backend/school/services.py` passed
  - `python manage.py check` passed
- Frontend:
  - `npm run build` passed

## Finance Maturity Phase 8 (2026-02-14)

### Completed
- Backend collections export endpoints added:
  - `GET /api/finance/reports/receivables-aging/export/csv/`
  - `GET /api/finance/reports/overdue-accounts/export/csv/` (supports `search`)
  - Files:
    - `sms_backend/school/views.py`
    - `sms_backend/school/urls.py`
- Frontend reports export controls added:
  - File: `sms_frontend/src/pages/finance/FinanceReportsPage.tsx`
  - Added:
    - `Export Aging CSV` button
    - `Export Overdue CSV` button (current filter-aware)

### Validation
- Backend:
  - `python -m py_compile sms_backend/school/views.py sms_backend/school/urls.py` passed
  - `python manage.py check` passed
- Frontend:
  - `npm run build` passed

## Finance Maturity Phase 9 (2026-02-14)

### Completed
- Maker/checker workflow implemented for invoice adjustments:
  - `InvoiceAdjustment` now supports:
    - `status` (`PENDING|APPROVED|REJECTED`)
    - `reviewed_by`
    - `reviewed_at`
    - `review_notes`
  - `signed_amount` now affects invoice balance only when adjustment is `APPROVED`.
  - Files:
    - `sms_backend/school/models.py`
    - `sms_backend/school/serializers.py`
    - `sms_backend/school/services.py`
    - `sms_backend/school/views.py`
- Adjustment processing behavior hardened:
  - Non-admin or high-value adjustments now create as `PENDING` (no immediate financial impact).
  - Admin can approve/reject pending adjustments:
    - `POST /api/finance/invoice-adjustments/{id}/approve/`
    - `POST /api/finance/invoice-adjustments/{id}/reject/`
  - On approval:
    - accounting journal is posted
    - invoice status is synchronized.
- Finance adjustments UI upgraded for review workflow:
  - `sms_frontend/src/pages/finance/FinanceAdjustmentsPage.tsx`
  - Added:
    - status column + status filter
    - adjustment type column
    - admin-only approve/reject actions for pending rows
    - action result feedback banner

### Migration
- New migration added:
  - `sms_backend/school/migrations/0024_invoiceadjustment_approval_fields.py`
- Apply it with:
  - `python manage.py migrate_schemas --schema=<tenant_schema>`

### Validation
- Backend:
  - `python manage.py makemigrations --check --dry-run school` passed
  - `python manage.py check` passed
- Frontend:
  - `npm run build` passed

## Finance Maturity Phase 10 (2026-02-14)

### Completed
- Dedicated write-off maker/checker workflow added:
  - New model:
    - `InvoiceWriteOffRequest`
      - `status` (`PENDING|APPROVED|REJECTED`)
      - requester/reviewer metadata
      - optional linked approved adjustment
  - Files:
    - `sms_backend/school/models.py`
    - `sms_backend/school/serializers.py`
    - `sms_backend/school/services.py`
    - `sms_backend/school/views.py`
    - `sms_backend/school/urls.py`
- New endpoints:
  - `GET/POST /api/finance/write-offs/`
  - `POST /api/finance/write-offs/{id}/approve/` (admin)
  - `POST /api/finance/write-offs/{id}/reject/` (admin)
- Approval behavior:
  - Approving a write-off creates an approved CREDIT adjustment and links it to the write-off request.
  - Rejecting preserves audit trail without financial posting.
- Finance Refunds page replaced with live write-off operations:
  - `sms_frontend/src/pages/finance/FinanceRefundsPage.tsx`
  - Added:
    - create write-off request form
    - pending/approved/rejected summary cards
    - status/search filters
    - admin approve/reject actions

### Migration
- New migration:
  - `sms_backend/school/migrations/0025_invoicewriteoffrequest.py`
- Apply with:
  - `python manage.py migrate_schemas --schema=<tenant_schema>`

### Validation
- Backend:
  - `python -m py_compile sms_backend/school/models.py sms_backend/school/serializers.py sms_backend/school/services.py sms_backend/school/views.py sms_backend/school/urls.py` passed
  - `python manage.py makemigrations --check --dry-run school` passed
  - `python manage.py check` passed
- Frontend:
  - `npm run build` passed

## Finance Maturity Phase 11 (2026-02-14)

### Completed
- Payment reversal workflow is now operational as a first-class finance queue:
  - Backend viewset upgraded from read-only to managed workflow:
    - `GET/POST /api/finance/payment-reversals/`
    - `POST /api/finance/payment-reversals/{id}/approve/`
    - `POST /api/finance/payment-reversals/{id}/reject/`
  - Added filtering support on reversal queue:
    - `status`, `payment`, `search`
  - Files:
    - `sms_backend/school/views.py`
- Finance Payments page now includes live reversal operations:
  - `sms_frontend/src/pages/finance/FinancePaymentsPage.tsx`
  - Added:
    - `Request reversal` action per active payment
    - payment status now shows `Reversed` when inactive
    - reversal requests queue table with search + status filter
    - admin approve/reject actions for pending reversal requests
- Regression coverage added for request + approve flow:
  - `sms_backend/school/test_finance_phase11.py`

### Validation
- Backend:
  - `python -m py_compile sms_backend/school/views.py sms_backend/school/test_finance_phase11.py` passed
- Frontend:
  - `npm run build` passed

## Finance Maturity Phase 12 (2026-02-14)

### Completed
- Scholarship operations moved from mock to live finance APIs.
- Backend scholarship contract added:
  - Model: `ScholarshipAward`
  - Migration:
    - `sms_backend/school/migrations/0026_scholarshipaward.py`
  - API endpoints:
    - `GET/POST /api/finance/scholarships/`
    - `GET/PATCH/DELETE /api/finance/scholarships/{id}/`
  - Files:
    - `sms_backend/school/models.py`
    - `sms_backend/school/serializers.py`
    - `sms_backend/school/views.py`
    - `sms_backend/school/urls.py`
- Frontend scholarships page now fully wired:
  - `sms_frontend/src/pages/finance/FinanceScholarshipsPage.tsx`
  - Added:
    - create scholarship form (fixed/percent/full award)
    - live scholarship roster
    - status controls (activate/pause/end)
    - search + status filter
    - summary cards (total/active/paused/ended)

### Migration reminder
- Apply tenant migration:
  - `python manage.py migrate_schemas --schema=<tenant_schema>`
- Regression test added:
  - `sms_backend/school/test_finance_phase15.py`
  - Verifies targeted installment allocation updates installment collected amount/status.

## Finance Maturity Phase 13 (2026-02-14)

### Completed
- Scholarship-to-invoice automation added in finance service layer.
- Batch invoice generation now applies active student scholarships automatically when building line items:
  - Supports `FULL` awards (full coverage).
  - Supports cumulative `PERCENT` awards (capped at 100%).
  - Supports pooled `FIXED` awards distributed across line items in batch order.
- API behavior preserved:
  - Existing `POST /api/finance/invoices/generate-batch/` flow unchanged.
  - Response now also includes `scholarships_applied` count from batch run.
- Backend file:
  - `sms_backend/school/services.py`
- Regression test added:
  - `sms_backend/school/test_finance_phase13.py`
  - Verifies percent + fixed scholarship blend correctly reduces generated invoice totals.

## Finance Maturity Phase 14 (2026-02-14)

### Completed
- Installments and collections automation hardened for finance-office operations.
- Backend enhancements:
  - Invoice installment endpoint expanded:
    - `GET /api/finance/invoices/{id}/installments/` (view current plan)
    - `POST /api/finance/invoices/{id}/installments/` (create/update plan)
  - Payment auto-allocation endpoint added:
    - `POST /api/finance/payments/{id}/auto-allocate/`
    - Allocates to oldest outstanding invoices for that student.
  - Installment status sync added in finance service:
    - Installments now auto-sync to `PAID/PENDING/OVERDUE` based on invoice paid progress.
  - Late-fee operation now supports preview mode:
    - `POST /api/finance/late-fee-rules/apply/` with `{"dry_run": true}`
  - Scheduled reminders endpoint added:
    - `POST /api/finance/reminders/send-scheduled/`
    - Modes: `PRE_DUE`, `DUE`, `OVERDUE`
  - Installment aging report endpoint added:
    - `GET /api/finance/reports/installments-aging/`
  - Files:
    - `sms_backend/school/services.py`
    - `sms_backend/school/views.py`
    - `sms_backend/school/urls.py`
- Frontend enhancements:
  - `sms_frontend/src/pages/finance/FinanceInvoicesPage.tsx`
    - installment plan viewer in invoice modal
    - installment plan create/update controls
    - auto-allocate button from invoice allocation panel
  - `sms_frontend/src/pages/finance/FinanceReportsPage.tsx`
    - installment aging cards
    - scheduled reminder buttons (pre-due, due)
    - late-fee preview/apply controls
- Regression test added:
  - `sms_backend/school/test_finance_phase14.py`
  - Covers auto-allocation + installment status progression.

## Finance Maturity Phase 15 (2026-02-14)

### Completed
- Installment-level payment operations added for tighter collections control.
- Backend enhancements:
  - `InvoiceInstallment` now tracks:
    - `collected_amount`
    - `paid_at`
  - New migration:
    - `sms_backend/school/migrations/0027_invoiceinstallment_collected_amount_paid_at.py`
  - Payment allocation endpoint now supports optional installment target:
    - `POST /api/finance/payments/{id}/allocate/` with `installment_id`
  - New installment-specific reminder action:
    - `POST /api/finance/reminders/send-installment-scheduled/`
  - Service logic now supports:
    - installment-aware allocation tracking
    - installment status sync from collected/outstanding amounts
    - installment reminder cadence (pre-due/due/overdue)
  - Files:
    - `sms_backend/school/models.py`
    - `sms_backend/school/serializers.py`
    - `sms_backend/school/services.py`
    - `sms_backend/school/views.py`
- Frontend enhancements:
  - `sms_frontend/src/pages/finance/FinanceInvoicesPage.tsx`
    - installment selector in allocation panel
    - installment collected/outstanding display in invoice detail
  - `sms_frontend/src/pages/finance/FinanceReportsPage.tsx`
    - trigger installment-overdue reminder run

### Migration reminder
- Apply tenant migration:
  - `python manage.py migrate_schemas --schema=<tenant_schema>`

## Finance Hardening Slice (2026-02-14)

### Completed
- Backend finance contract and filtering hardening:
  - `FeeStructure` now supports:
    - `category`
    - `grade_level` (optional)
  - `FeeAssignment` now supports:
    - `start_date`
    - `end_date`
  - `Expense` now supports:
    - `vendor`
    - `payment_method`
    - `invoice_number`
    - `approval_status` (`Pending|Approved|Rejected`)
  - New migration:
    - `sms_backend/school/migrations/0020_finance_hardening_fields.py`
- Backend list endpoint filtering now aligned with finance UI controls:
  - `GET /api/finance/fees/`:
    - `search`, `category`, `is_active`
  - `GET /api/finance/invoices/`:
    - `search`, `status`, `student`, `date_from`, `date_to`
  - `GET /api/finance/payments/`:
    - `search`, `student`, `payment_method`, `allocation_status`, `date_from`, `date_to`
  - `GET /api/finance/expenses/`:
    - `search`, `category`, `approval_status`, `vendor`, `date_from`, `date_to`
  - `GET /api/finance/fee-assignments/`:
    - `search`, `student`, `fee_structure`, `is_active`
  - `GET /api/finance/invoice-adjustments/`:
    - `search`, `invoice`, `min_amount`, `max_amount`, `date_from`, `date_to`
- Backend finance create-flow reliability fixes:
  - Payment allocation now validates:
    - positive amount
    - same student between payment and invoice
    - required `invoice_id` + `amount`
  - `FeeAssignmentViewSet.perform_create` now correctly sets serializer instance and persists optional dates/active flag.
  - `InvoiceAdjustmentViewSet.perform_create` now correctly sets serializer instance.
- Payment response enrichment:
  - `allocated_amount`
  - `unallocated_amount`
  - `student_name`
- Frontend finance bug fixes:
  - `FinanceFeeAssignmentFormPage` now normalizes paginated `/finance/fees/` response.
  - Reload dependencies fixed so list filters actually refresh API data:
    - `FinancePaymentsPage`
    - `FinanceFeeStructuresPage`
    - `FinanceExpensesPage`
  - Budget fetch now scopes by both `academic_year` and `term`.

### Validation
- Backend checks pass:
  - `python manage.py check`
  - `python manage.py makemigrations --check --dry-run school`
- Frontend build passes:
  - `npm run build`

### Known validation gap
- Existing backend test import issue still blocks some suite paths:
  - `school/tests.py` imports `MessagesRefView` from `communication.views`, but that symbol is currently absent there.
  - This is unrelated to Finance hardening changes and should be addressed separately before full-suite green runs.
- Added explicit module assignment utility:
  - `python manage.py assign_module_access --schema=<tenant_schema> --usernames=admin,teacher1 --dry-run`
  - `python manage.py assign_module_access --schema=<tenant_schema> --all-active-users`
  - `python manage.py assign_module_access --schema=<tenant_schema> --all-active-users --include-students`

## Admissions Phase B (Inquiry + normalized profile split) (2026-02-14)

### Backend additions
- New admissions domain models in standalone app:
  - `admissions.AdmissionInquiry`
  - `admissions.AdmissionApplicationProfile`
- Migration added:
  - `sms_backend/admissions/migrations/0001_initial.py`
- New endpoints added under `/api/admissions/`:
  - `GET/POST /api/admissions/inquiries/`
  - `GET/PATCH/DELETE /api/admissions/inquiries/{id}/`
  - `POST /api/admissions/inquiries/{id}/convert/`
  - `POST /api/admissions/inquiries/{id}/mark-lost/`
  - `GET/POST /api/admissions/application-profiles/`
  - `GET/PATCH/DELETE /api/admissions/application-profiles/{id}/`
- Review + shortlist endpoints added:
  - `GET/POST /api/admissions/reviews/`
  - `GET/PATCH/DELETE /api/admissions/reviews/{id}/`
  - `POST /api/admissions/applications/{id}/shortlist/`
  - `GET /api/admissions/shortlisted/`
- Assessment + interview endpoints added:
  - `GET/POST /api/admissions/assessments/`
  - `GET/PATCH/DELETE /api/admissions/assessments/{id}/`
  - `GET/POST /api/admissions/interviews/`
  - `GET/PATCH/DELETE /api/admissions/interviews/{id}/`
  - `POST /api/admissions/interviews/{id}/feedback/`
- Decision endpoints added:
  - `GET/POST /api/admissions/decisions/`
  - `GET/PATCH/DELETE /api/admissions/decisions/{id}/`
  - `POST /api/admissions/decisions/{id}/respond/`
- Enrollment hardening + analytics endpoints added:
  - `POST /api/admissions/applications/{id}/enrollment-check/`
  - `POST /api/admissions/applications/{id}/enrollment-complete/`
  - `GET /api/admissions/enrollment/ready/`
  - `GET /api/admissions/analytics/funnel/`
  - `GET /api/admissions/analytics/sources/`
- Existing applications endpoints remain intact and backward-compatible.

### Frontend additions
- New inquiries page:
  - `sms_frontend/src/pages/admissions/AdmissionsInquiriesPage.tsx`
- Admissions module nav now includes Inquiries:
  - `sms_frontend/src/pages/admissions/AdmissionsLayout.tsx`
- Route added:
  - `/modules/admissions/inquiries`
  - `/modules/admissions/reviews`
  - `/modules/admissions/assessments`
  - `/modules/admissions/interviews`
  - `/modules/admissions/decisions`
  - `/modules/admissions/enrollment`
  - `/modules/admissions/analytics`

### Run order for this slice
- `python manage.py migrate_schemas --schema=<tenant_schema>`
- `python manage.py seed_modules --schema=<tenant_schema>`
- `python manage.py assign_module_access --schema=<tenant_schema> --all-active-users --include-students`

## Admissions Hardening Slice (2026-02-14)

### Backend hardening completed
- Enrollment is now decision-gated in admissions endpoints:
  - `POST /api/admissions/applications/{id}/enroll/`
  - `POST /api/admissions/applications/{id}/enrollment-complete/`
- New enrollment preconditions enforced before enrollment:
  - application decision must be `Accept`
  - parent response must be `Accepted`
  - offer deadline must not be expired (if set)
- Enrollment check payload now includes:
  - `offer_deadline_valid`
- Offer letter PDF endpoint added:
  - `GET /api/admissions/decisions/{id}/offer-letter/`
  - Returns `application/pdf` for accepted decisions only
- Waitlist queue endpoint added:
  - `GET /api/admissions/waitlist/queue/`
  - Deterministic order by `decision_date`, then `created_at`, then `id`
  - Returns computed `queue_position`

### Frontend polish completed
- Decisions page now supports one-click offer letter download for accepted decisions:
  - `sms_frontend/src/pages/admissions/AdmissionsDecisionsPage.tsx`
- Decisions page now includes waitlist queue table from:
  - `GET /api/admissions/waitlist/queue/`

### Validation
- Admissions test suite passes:
  - `python manage.py test admissions.tests --keepdb`

## Admissions Hardening Pass 2 (2026-02-14)

### Backend hardening completed
- Decision workflow guardrails:
  - Duplicate decisions for the same application are now blocked with a clean `400` validation response.
  - Parent response is now allowed only when decision is `Accept`.
  - Parent response is one-time (cannot respond twice).
  - Offer acceptance is blocked when `offer_deadline` is expired.
- Decision response side-effect:
  - Declined offer now updates application to `status=Rejected`, `decision=Rejected`.
- Audit logging added for key admissions actions:
  - Inquiry conversion (`CONVERT`)
  - Decision create/update (`DECISION_CREATE`, `DECISION_UPDATE`)
  - Parent response (`DECISION_RESPONSE`)
  - Enrollment completion (`ENROLL`)
- Files:
  - `sms_backend/admissions/views.py`

### Frontend polish completed
- Decisions page now only shows response action buttons when:
  - decision is `Accept`
  - response status is `Pending`
- Non-actionable rows now show `No response action`.
- File:
  - `sms_frontend/src/pages/admissions/AdmissionsDecisionsPage.tsx`

### Test coverage additions
- Added admissions hardening tests:
  - duplicate decision blocked
  - non-accept decision response blocked
  - audit log entries exist for conversion/decision actions
- File:
  - `sms_backend/admissions/tests.py`

### Validation
- Admissions test suite passes:
  - `python manage.py test admissions.tests --keepdb`

## Admissions Operational Controls Slice (2026-02-15)

### Completed
- Admissions interviews page now supports full row-level operations in UI:
  - Reschedule interview date/time.
  - Update interview type and location.
  - Update interview status (`Scheduled`, `Completed`, `Cancelled`, `No-show`).
  - Existing feedback/score actions remain available.
  - File: `sms_frontend/src/pages/admissions/AdmissionsInterviewsPage.tsx`
- Admissions assessments page now supports row-level result management:
  - Update assessment status (`Scheduled`, `Completed`, `Missed`).
  - Enter/update score.
  - Set pass state (`Pass`, `Fail`, `Unknown`).
  - Add/update notes.
  - File: `sms_frontend/src/pages/admissions/AdmissionsAssessmentsPage.tsx`
- Admissions decisions create flow now surfaces backend validation errors more clearly (better 400 feedback in UI):
  - File: `sms_frontend/src/pages/admissions/AdmissionsDecisionsPage.tsx`

### Validation
- Frontend lint command run (`npm run lint`) confirms the codebase still has pre-existing global lint violations unrelated to this slice.
- New admissions edits are focused on functional UX/API behavior; no backend schema or route changes were required in this slice.

## Admissions Interaction Hardening Pass 3 (2026-02-15)

### Completed
- Inquiries page now supports operational status progression (inline status select + save):
  - `PATCH /api/admissions/inquiries/{id}/`
  - File: `sms_frontend/src/pages/admissions/AdmissionsInquiriesPage.tsx`
- Inquiries convert flow now supports per-inquiry gender selection at conversion time:
  - `POST /api/admissions/inquiries/{id}/convert/` with selected `student_gender`
  - File: `sms_frontend/src/pages/admissions/AdmissionsInquiriesPage.tsx`
- Reviews page now loads shortlisted applications and disables duplicate shortlist actions:
  - Uses `/api/admissions/shortlisted/` to mark already-shortlisted applications.
  - File: `sms_frontend/src/pages/admissions/AdmissionsReviewsPage.tsx`
- Enrollment page UX hardening:
  - Selected row is visually highlighted.
  - `Enroll selected` button is disabled until an application is selected.
  - File: `sms_frontend/src/pages/admissions/AdmissionsEnrollmentPage.tsx`

## Admissions Applications Modal Hardening (2026-02-15)

### Completed
- Students-side admissions manage modal (`StudentsAdmissionsPage`) now has safer operational controls:
  - Prefills and syncs modal state for:
    - `interview_date`
    - `assessment_score`
    - `status` (application stage)
  - Adds stage update control directly in manage modal (status progression within pipeline stages).
  - Adds score guardrail (`0-100`) before submit.
  - Adds saving state for metadata updates (`Save updates` / `Saving...`).
  - Blocks duplicate enrollment attempts when status is already `Enrolled`.
  - Adds confirm prompt before document deletion.
  - Clears stale form errors when opening/closing modal.
  - File: `sms_frontend/src/pages/students/StudentsAdmissionsPage.tsx`

### Validation
- Frontend production build passes:
  - `npm run build`

## Admissions Final Interaction Pass (2026-02-14)

### Frontend reliability hardening completed
- Cross-page action feedback standardized:
  - Added success banners and backend-detail error messaging for create/update actions in:
    - `AdmissionsInquiriesPage`
    - `AdmissionsAssessmentsPage`
    - `AdmissionsReviewsPage`
    - `AdmissionsDecisionsPage`
    - `AdmissionsEnrollmentPage`
    - `AdmissionsInterviewsPage`
- Button behavior hardening:
  - Added explicit `type="button"` / `type="submit"` on action buttons to avoid accidental form submits.
  - Disabled invalid inquiry actions:
    - Convert disabled when status is `Applied` or `Lost`
    - Mark-lost disabled when status is `Lost`
- Interview scheduling UX upgraded:
  - Separate date and time inputs for interview creation.
  - Added interview calendar grouping by day.
  - Added status filter for interview list.
  - Added per-row feedback + score save actions.

### Validation
- Frontend build passes:
  - `npm run build`

## Finance Office Maturity Kickoff (2026-02-14)

### Phase 1 foundations (implemented)
- Invoice lifecycle foundation added in backend:
  - `Invoice.status` now supports:
    - `DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `VOID`
    - `CONFIRMED` retained for backward compatibility
  - `Invoice.invoice_number` auto-generated (`INV-000001` pattern).
  - Status sync helper added in finance service and applied after allocations/adjustments.
- Receipt engine foundation added:
  - `Payment.receipt_number` auto-generated from `SchoolProfile.receipt_prefix`.
  - Receipt download endpoint added:
    - `GET /api/finance/payments/{id}/receipt/`
- Reversal approval workflow foundation added:
  - New model:
    - `PaymentReversalRequest` (`PENDING|APPROVED|REJECTED`)
  - Payment actions:
    - `POST /api/finance/payments/{id}/reversal-request/`
    - `POST /api/finance/payments/{id}/reverse-approve/` (admin only)
    - `POST /api/finance/payments/{id}/reverse-reject/` (admin only)
  - On reversal approval:
    - payment allocations are removed,
    - payment is marked inactive/reversed,
    - impacted invoices are re-synced.
- High-value control baseline:
  - Invoice adjustments above threshold currently require admin role.

### Phase 2 baseline (implemented)
- Auto invoice generation from fee assignments:
  - `POST /api/finance/invoices/generate-batch/`
  - Supports: `term`, `due_date`, optional `class_id`, `grade_level_id`, `issue_immediately`.
- Installment plan baseline:
  - New models:
    - `InvoiceInstallmentPlan`
    - `InvoiceInstallment`
  - Endpoint:
    - `POST /api/finance/invoices/{id}/installments/`
  - Supports equal-split schedule with explicit due-date list.
- Late fee rules + application run:
  - New model:
    - `LateFeeRule`
  - Endpoints:
    - `GET/POST/PATCH/DELETE /api/finance/late-fee-rules/`
    - `POST /api/finance/late-fee-rules/apply/`
  - Applies debit adjustments to overdue installments per active rule.
- Reminder pipeline baseline:
  - New model:
    - `FeeReminderLog`
  - Endpoints:
    - `GET /api/finance/reminders/`
    - `POST /api/finance/reminders/send-overdue/`
  - Current baseline logs reminder dispatch metadata (email/sms/in-app channel).

### Migration
- New migration generated:
  - `sms_backend/school/migrations/0021_latefeerule_invoice_invoice_number_and_more.py`

### Validation
- `python manage.py check` passed
- `python manage.py makemigrations --check --dry-run school` passed

### Next maturity slices (pending)
- Double-entry accounting postings (AR/Cash/Revenue/Discount/Write-off)
- Period close controls + lock/reopen workflow
- Branded PDF receipts/invoices + delivery workflows
- Full approval matrix UI and delegated approver policies

## Finance Office Maturity Phase 3 (2026-02-14)

### Implemented
- Accounting core models added:
  - `AccountingPeriod`
  - `ChartOfAccount`
  - `JournalEntry`
  - `JournalLine`
- Finance service posting engine added:
  - Balanced journal writer with period-close guard
  - Default account bootstrap:
    - `1100` Accounts Receivable
    - `1000` Cash/Bank
    - `4000` School Fee Revenue
    - `5000` Operating Expense
  - Auto postings now triggered on:
    - Invoice creation
    - Payment allocation
    - Invoice adjustments (credit/debit)
- Accounting period close guard:
  - Posting blocked when entry date falls in a closed period.
- Accounting endpoints added:
  - Router:
    - `GET/POST/PATCH/DELETE /api/finance/accounting/periods/`
    - `GET/POST/PATCH/DELETE /api/finance/accounting/accounts/`
    - `GET /api/finance/accounting/journals/`
  - Period controls:
    - `POST /api/finance/accounting/periods/{id}/close/` (admin)
    - `POST /api/finance/accounting/periods/{id}/reopen/` (admin)
  - Reporting:
    - `GET /api/finance/accounting/trial-balance/`
    - `GET /api/finance/accounting/ledger/?account_id=<id>`

### New migration
- `sms_backend/school/migrations/0022_chartofaccount_journalentry_journalline_and_more.py`

### Validation
- `python manage.py check` passed
- `python manage.py makemigrations --check --dry-run school` passed

## Students Maturity Phase 1 (2026-02-15)

### Implemented
- Backend student documents list endpoint added:
  - `GET /api/students/documents/`
  - Query params:
    - `student_id` or `student`
    - `search`
  - Response shape:
    - `count`
    - `results[]` with `id`, `student_id`, `student_name`, `admission_number`, `file_name`, `url`, `uploaded_at`
- Students Documents page hardening:
  - File: `sms_frontend/src/pages/students/StudentsDocumentsPage.tsx`
  - Replaced fallback/mixed behavior with strict live API reads from `/api/students/documents/`.
  - Added operational filters for `search` + `student` and explicit reload action.
  - Kept upload/delete flows:
    - `POST /api/students/{id}/documents/`
    - `DELETE /api/students/{id}/documents/{doc_id}/`
- Students Medical page hardening:
  - File: `sms_frontend/src/pages/students/StudentsMedicalPage.tsx`
  - Removed mock fallback datasets for profiles, immunizations, and clinic visits.
  - API failures now surface as explicit errors instead of silent mock substitution.
- Backend test coverage added:
  - `sms_backend/school/test_students_phase1.py`
  - Covers `/api/students/documents/` response contract on tenant schema.

### Notes
- This slice is focused on operational reliability (live data only) and contract clarity for student records/documents.

## Students Maturity Phase 2 (2026-02-15)

### Implemented
- Admissions page hardening (students-side alias page):
  - File: `sms_frontend/src/pages/students/StudentsAdmissionsPage.tsx`
  - Removed sample/mock admissions fallback.
  - API failures now surface explicit operational errors instead of rendering synthetic records.
- Reports page hardening:
  - File: `sms_frontend/src/pages/students/StudentsReportsPage.tsx`
  - Removed partial/fallback mode state and banner.
  - Module print now fails explicitly when `/api/students/reports/summary/` is unavailable (no synthetic print payload).
  - Data-source failures are now aggregated into a clear error message.
- Student profile UX hardening:
  - File: `sms_frontend/src/pages/students/StudentProfilePage.tsx`
  - Removed non-implemented tabs (`Financial`, `Notes`) from the active tab list.
  - Removed generic "backend integration pending" branch to avoid dead-end UI states.

### Notes
- This slice keeps the Students module in strict live-data mode and removes misleading mock/pending interaction paths.

## Students Maturity Phase 3 (2026-02-15)

### Implemented
- Attendance page operational hardening:
  - File: `sms_frontend/src/pages/students/StudentsAttendancePage.tsx`
  - Added student filter wired to backend (`student` query param).
  - Added filter reset control and post-create success banner.
  - Reset pagination to page 1 after create and filter reset.
- Behavior page operational hardening:
  - File: `sms_frontend/src/pages/students/StudentsBehaviorPage.tsx`
  - Added student and severity filters wired to backend (`student`, `severity` query params).
  - Added filter reset control and post-create success banner.
  - Reset pagination to page 1 after create and filter reset.
- Export/download consistency:
  - Added shared utility:
    - `sms_frontend/src/utils/download.ts`
  - Reused in:
    - `sms_frontend/src/pages/students/StudentsAttendancePage.tsx`
    - `sms_frontend/src/pages/students/StudentsReportsPage.tsx`
    - `sms_frontend/src/pages/students/StudentProfilePage.tsx`
- Backend behavior filtering enhancement:
  - File: `sms_backend/school/views.py`
  - `BehaviorIncidentViewSet` now supports `severity` query filtering.
- Backend regression test added:
  - `sms_backend/school/test_students_phase3.py`
  - Covers behavior incident list filtering by `severity`.

## Students Maturity Phase 4 (2026-02-15)

### Implemented
- Backend behavior incidents exports added:
  - `GET /api/behavior/incidents/export/csv/`
  - `GET /api/behavior/incidents/export/pdf/`
  - Supported query params:
    - `student` / `student_id`
    - `incident_type`
    - `severity`
    - `date_from`
    - `date_to`
  - Files:
    - `sms_backend/school/views.py`
    - `sms_backend/school/urls.py`
- Frontend behavior page export wiring completed:
  - File: `sms_frontend/src/pages/students/StudentsBehaviorPage.tsx`
  - Added `Download CSV` and `Download PDF` buttons.
  - Export requests now pass active filters (student/type/severity/date range).
  - Added export error banner handling for failed downloads.
- Backend regression test added:
  - `sms_backend/school/test_students_phase4.py`
  - Verifies behavior CSV export respects filter constraints.

## Students Maturity Phase 5 (2026-02-15)

### Implemented
- Backend attendance records exports added:
  - `GET /api/attendance/records/export/csv/`
  - `GET /api/attendance/records/export/pdf/`
  - Supported query params:
    - `student` / `student_id`
    - `status`
    - `date_from`
    - `date_to`
  - Files:
    - `sms_backend/school/views.py`
    - `sms_backend/school/urls.py`
- Attendance page export alignment:
  - File: `sms_frontend/src/pages/students/StudentsAttendancePage.tsx`
  - Export actions now use detailed records endpoints instead of summary endpoint.
  - Active page filters are passed into export request.
- Student profile operational drilldown exports:
  - File: `sms_frontend/src/pages/students/StudentProfilePage.tsx`
  - Added per-student attendance export buttons (CSV/PDF) inside Attendance tab.
  - Added per-student behavior export buttons (CSV/PDF) inside Behavior tab.
- Backend regression test added:
  - `sms_backend/school/test_students_phase5.py`
  - Verifies attendance CSV export respects status filtering.

## Students Maturity Phase 6 (2026-02-15)

### Implemented
- Backend consolidated operational endpoint added:
  - `GET /api/students/{id}/operational-summary/`
  - Returns one payload for profile operational tabs:
    - `attendance.summary`
    - `attendance.records` (latest 10)
    - `behavior` (latest 10)
    - `academics` (baseline placeholder list)
    - `medical.record` + `medical.visits` (latest 5)
  - Files:
    - `sms_backend/school/views.py`
    - `sms_backend/school/urls.py`
- Student profile operational data loading unified:
  - File: `sms_frontend/src/pages/students/StudentProfilePage.tsx`
  - Replaced multiple endpoint fan-out calls with a single fetch:
    - `/api/students/{id}/operational-summary/`
  - Operational tab states (`attendance`, `behavior`, `academics`, `medical`) now hydrate from one contract.
- Backend regression test added:
  - `sms_backend/school/test_students_phase6.py`
  - Verifies response shape and core aggregate values for operational summary.

## Students Maturity Phase 7 (2026-02-15)

### Implemented
- Backend operational dashboard endpoint added:
  - `GET /api/students/dashboard/`
  - Returns:
    - `kpis` (`students_active`, `enrollments_active`, `attendance_rate`, `pending_admissions`)
    - `alerts` (`low_attendance_students`, `critical_behavior_incidents`)
    - `recent_activity` (attendance, behavior, admissions timeline)
  - Files:
    - `sms_backend/school/views.py`
    - `sms_backend/school/urls.py`
- Students dashboard frontend hardening:
  - File: `sms_frontend/src/pages/StudentsDashboardPage.tsx`
  - Uses `/api/students/dashboard/` for operational cards and alerts.
  - Fixed students roster loading to support paginated backend responses via `normalizePaginatedResponse`.
  - Removed low-value debug block and replaced with operational widgets + recent activity panel.
- Backend regression test added:
  - `sms_backend/school/test_students_phase7.py`
  - Verifies dashboard payload contract and key aggregate values.

## Students Maturity Phase 8 (2026-02-15)

### Implemented
- Students directory filtering hardening in backend:
  - File: `sms_backend/school/views.py`
  - `StudentViewSet` now explicitly supports:
    - `search` (name/admission number)
    - `gender`
    - `is_active`
  - Pagination class set for predictable paged responses.
- Students directory export endpoints added:
  - `GET /api/students/export/csv/`
  - `GET /api/students/export/pdf/`
  - Supports same filters as directory listing (`search`, `gender`, `is_active`).
  - Files:
    - `sms_backend/school/views.py`
    - `sms_backend/school/urls.py`
- Students directory frontend export + pagination alignment:
  - File: `sms_frontend/src/pages/students/StudentsDirectoryPage.tsx`
  - Added `Download CSV` and `Download PDF` actions with active filter propagation.
  - Added `page_size` request parameter to align frontend pagination with backend page size.
  - Added export failure banner for operational visibility.
- Backend regression test added:
  - `sms_backend/school/test_students_phase8.py`
  - Verifies directory CSV export respects active filters.

## Students Maturity Phase 9 (2026-02-15)

### Implemented
- Medical export endpoints added in backend:
  - `GET /api/medical/records/export/csv/`
  - `GET /api/medical/records/export/pdf/`
  - `GET /api/medical/immunizations/export/csv/`
  - `GET /api/medical/immunizations/export/pdf/`
  - `GET /api/medical/visits/export/csv/`
  - `GET /api/medical/visits/export/pdf/`
  - Files:
    - `sms_backend/school/views.py`
    - `sms_backend/school/urls.py`
- Students Medical page operational hardening:
  - File: `sms_frontend/src/pages/students/StudentsMedicalPage.tsx`
  - Added filtering controls:
    - Student filter (all tabs)
    - Date range filters (clinic visits tab)
  - Added tab-aware export actions:
    - `Download CSV`
    - `Download PDF`
  - Export requests now pass active filter context.
  - Added explicit export error banner handling.
- Backend regression test added:
  - `sms_backend/school/test_students_phase9.py`
  - Verifies clinic visits CSV export respects date filtering.

## Students Maturity Phase 10 (2026-02-15)

### Implemented
- Student documents export endpoints added:
  - `GET /api/students/documents/export/csv/`
  - `GET /api/students/documents/export/pdf/`
  - Supports active Documents page filters:
    - `search`
    - `student` / `student_id`
  - Files:
    - `sms_backend/school/views.py`
    - `sms_backend/school/urls.py`
- Students Documents page operational hardening:
  - File: `sms_frontend/src/pages/students/StudentsDocumentsPage.tsx`
  - Added `Download CSV` and `Download PDF` actions.
  - Export requests now pass active search + student filters.
  - Added export error banner for failure visibility.
- Backend regression test added:
  - `sms_backend/school/test_students_phase10.py`
  - Verifies documents CSV export respects combined student + search filters.

## Students Maturity Phase 11 (2026-02-15)

### Implemented
- Students medical list filtering hardening in backend:
  - File: `sms_backend/school/views.py`
  - `MedicalRecordViewSet` now supports `search` filtering.
  - `ImmunizationRecordViewSet` now supports:
    - `search`
    - `date_from`
    - `date_to`
  - `ClinicVisitViewSet` now supports:
    - `search`
    - `date_from`
    - `date_to`
    - `severity`
- Students Medical frontend filter alignment:
  - File: `sms_frontend/src/pages/students/StudentsMedicalPage.tsx`
  - Added filter controls:
    - search input
    - severity filter (Clinic Visits)
    - reset action
  - List and export API calls now pass active filter context consistently.
- Backend regression test added:
  - `sms_backend/school/test_students_phase11.py`
  - Verifies clinic visit list endpoint respects date + severity filters.

## Students Maturity Phase 12 (2026-02-15)

### Implemented
- Students documents backend hardening:
  - File: `sms_backend/school/views.py`
  - Added date filtering support for documents register/list:
    - `date_from`
    - `date_to`
  - Students documents list action (`GET /api/students/documents/`) now supports server pagination output when paging params are provided.
- Students documents frontend hardening:
  - File: `sms_frontend/src/pages/students/StudentsDocumentsPage.tsx`
  - Added date-range filters (`date_from`, `date_to`) for listing and exports.
  - Added paginated browsing controls (page + prev/next).
  - Added reset action to clear filters and reload list.
  - Export requests now include date filters for parity with list view.
- Backend regression test added:
  - `sms_backend/school/test_students_phase12.py`
  - Verifies documents list action respects date filter and pagination contract.

## Finance Maturity Step 18 (2026-02-15)

### Implemented
- Payments page resilience hardening:
  - File: `sms_frontend/src/pages/finance/FinancePaymentsPage.tsx`
  - Added unified API error extraction helper for list/reversal/delete actions.
  - Added payment date-range guard:
    - blocks invalid `date_from > date_to` list requests.
    - surfaces explicit operational message.
  - Reversal workflow safety:
    - submit/review actions now prevent overlapping operations.
    - reviewer action buttons disable while any reversal action is in-flight.
  - Reversal and review failures now display backend detail when available.

## Finance Maturity Step 19 (2026-02-15)

### Implemented
- Expenses + budget planner guardrail hardening:
  - File: `sms_frontend/src/pages/finance/FinanceExpensesPage.tsx`
  - Added unified API error extraction helper for expense/budget API failures.
  - Added expense date-range guard:
    - blocks invalid `date_from > date_to` list requests.
    - surfaces explicit operational message.
  - Added budget planner validations:
    - requires academic year + term.
    - requires monthly/quarterly/annual values.
    - enforces numeric and non-negative values.
    - enforces `monthly <= quarterly <= annual`.
    - disables `Save budget` when validation fails and shows validation guidance.
  - Added budget list date filter guard:
    - invalid budget date range shows warning and suppresses invalid filtered result set.

## Finance Maturity Step 20 (2026-02-15)

### Implemented
- Fee structures list hardening:
  - File: `sms_frontend/src/pages/finance/FinanceFeeStructuresPage.tsx`
  - Added unified API error extraction for list/delete failures.
  - Added explicit reset control for search/category/status filters.
  - Improved status badge visuals (active vs inactive styling).
- Fee structure form hardening:
  - File: `sms_frontend/src/pages/finance/FinanceFeeStructureFormPage.tsx`
  - Reference loading now supports paginated contracts for academic years/terms.
  - Added client-side guardrails:
    - term must belong to selected academic year.
    - grade/class level must be a positive number when provided.
  - Hardened load/save error parsing for clearer backend detail display.
  - Numeric input controls enforced for amount and grade level.

## Finance Maturity Step 21 (2026-02-15)

### Implemented
- Fee assignments list hardening:
  - File: `sms_frontend/src/pages/finance/FinanceFeeAssignmentsPage.tsx`
  - Added unified API error extraction for list/delete failures.
  - Added explicit reset control for search/student/fee/status filters.
  - Improved status badge visuals (active vs inactive styling).
- Fee assignment form hardening:
  - File: `sms_frontend/src/pages/finance/FinanceFeeAssignmentFormPage.tsx`
  - Added client-side guardrails:
    - end date cannot be before start date.
    - discount cannot exceed selected fee amount (when fee amount is available in payload).
    - discount remains non-negative.
  - Numeric input control enforced for discount amount.
  - Hardened load/save error parsing for clearer backend detail display.

## Finance Maturity Step 22 (2026-02-15)

### Implemented
- Invoice adjustments list hardening:
  - File: `sms_frontend/src/pages/finance/FinanceAdjustmentsPage.tsx`
  - Added unified API error extraction for list/review failures.
  - Added filter guardrails:
    - date range validation (`date_from <= date_to`)
    - amount range validation (`min_amount <= max_amount`)
  - Added explicit filter `Reset` action.
  - Review actions now block concurrent approve/reject requests.
  - Added post-create flash support on adjustments list.
- Invoice adjustment form hardening:
  - File: `sms_frontend/src/pages/finance/FinanceAdjustmentFormPage.tsx`
  - Added unified API error extraction for load/create failures.
  - Added stricter notes validation (minimum content length).
  - Added numeric input controls for amount.
  - On successful create, returns to list with a flash message.

## Finance Maturity Step 23 (2026-02-15)

### Implemented
- Reconciliation workspace hardening:
  - File: `sms_frontend/src/pages/finance/FinanceReconciliationPage.tsx`
  - Added unified API error extraction for load/import/export/action failures.
  - Added action locking to prevent overlapping operations:
    - gateway `mark reconciled`
    - bank-line actions (`auto-match`, `clear`, `unmatch`, `ignore`)
  - Added per-action working states and disabled controls while busy.
  - Added filter `Reset` action for bank-line search/status.
  - Strengthened import/export/reload UX with guarded button states.

## Finance Maturity Step 24 (2026-02-15)

### Implemented
- Reports page operational hardening:
  - File: `sms_frontend/src/pages/finance/FinanceReportsPage.tsx`
  - Added unified API error extraction for summary/collections/download/reminder flows.
  - Added dedicated collections error state (separate from success notices).
  - Added action guardrails to prevent overlapping reminder/late-fee/export actions while busy.
  - Added overdue search `Reset` action and disabled filter/export controls during collections operations.
  - Improved failure visibility for overdue/aging exports and reminder dispatch actions.

## Finance Maturity Step 25 (2026-02-15)

### Implemented
- Accounting workspace hardening:
  - File: `sms_frontend/src/pages/finance/FinanceAccountsPage.tsx`
  - Added unified API error extraction for workspace/ledger/period actions.
  - Added dedicated ledger loading state (`ledgerBusy`) with inline feedback.
  - Added period action locking to prevent concurrent close/reopen requests.
  - Added safer control states:
    - refresh disabled during active operations.
    - period action buttons disabled with per-row working indicator.
  - Added account search reset action for quicker workspace recovery.

## Finance Maturity Step 26 (2026-02-15)

### Implemented
- Scholarships workspace hardening:
  - File: `sms_frontend/src/pages/finance/FinanceScholarshipsPage.tsx`
  - Added unified API error extraction for load/create/status-update actions.
  - Added create guardrails:
    - valid date range (`start_date <= end_date`)
    - fixed amount must be > 0
    - percentage must be between 0 and 100
  - Added operation locking between create and status-change actions.
  - Added filter reset control on scholarship roster.
  - Added working-state labels for row-level status actions.

## Finance Maturity Step 27 (2026-02-15)

### Implemented
- Write-offs workspace hardening:
  - File: `sms_frontend/src/pages/finance/FinanceRefundsPage.tsx`
  - Added unified API error extraction for list/options/create/review actions.
  - Added operation locking to prevent overlap between submit and review actions.
  - Added numeric guard input for amount (`type=number`, `min=0.01`, `step=0.01`).
  - Added list filter reset control for search/status.
  - Added per-row review action working labels with global in-flight guard.

## Finance Maturity Step 28 (2026-02-15)

### Implemented
- Finance dashboard summary hardening:
  - File: `sms_frontend/src/pages/finance/FinanceSummaryPage.tsx`
  - Added unified API error extraction for summary workspace loading.
  - Added safe date parsing helpers to prevent chart crashes on malformed dates.
  - Added explicit dashboard `Refresh` action with guarded in-flight state.
  - Hardened month-bucket and aging computations against invalid date values.

## Finance Maturity Step 29 (2026-02-15)

### Implemented
- Finance module navigation hardening:
  - File: `sms_frontend/src/pages/finance/FinanceLayout.tsx`
  - Added in-sidebar section search (`Find section`) for faster navigation.
  - Added empty-state hint when no nav items match search.
  - Added route-change auto-collapse behavior for mobile nav menu to avoid stale open-state after navigation.

## Finance Maturity Step 30 (2026-02-15)

### Implemented
- Payments create form hardening:
  - File: `sms_frontend/src/pages/finance/FinancePaymentFormPage.tsx`
  - Added unified API error extraction helper for load/submit failures.
  - Added payment date guardrail:
    - blocks future payment dates.
  - Added payment method guardrails:
    - switched from free text to controlled method select.
    - validates selected method against allowed list.
  - Strengthened amount input controls:
    - numeric input (`type=number`, `min=0.01`, `step=0.01`).
  - Improved submit error feedback to surface backend detail consistently.

## Parent Portal Hardening Slice (2026-02-16)

### Implemented
- Parent portal finance download endpoints are now operational (file download responses):
  - File: `sms_backend/parent_portal/views.py`
  - `GET /api/parent-portal/finance/invoices/{id}/download/` now returns invoice CSV attachment.
  - `GET /api/parent-portal/finance/payments/{id}/receipt/` now returns receipt CSV attachment.
- Parent portal timetable export endpoint is now operational:
  - File: `sms_backend/parent_portal/views.py`
  - `GET /api/parent-portal/timetable/export/` now returns timetable CSV attachment.
- Parent portal library baseline linkage improved:
  - File: `sms_backend/parent_portal/views.py`
  - `GET /api/parent-portal/library/borrowings/` now resolves current borrowings from library circulation records using child/member ID candidates.
  - `GET /api/parent-portal/library/history/` now resolves borrowing history from library circulation records using child/member ID candidates.

## Module Seeding Alignment (2026-02-16)

### Implemented
- Added missing operational module keys to tenant seed commands:
  - Files:
    - `sms_backend/school/management/commands/seed_modules.py`
    - `sms_backend/school/management/commands/seed_demo.py`
  - Added module keys:
    - `STAFF`
    - `PARENTS`
    - `LIBRARY`
  - Purpose: keep seeded module registry aligned with active module permission checks/routes.

## Communication + Routing Hardening (2026-02-16)

### Implemented
- Communication webhook verification hardening:
  - File: `sms_backend/communication/services.py`
  - Added case-insensitive header parsing.
  - Added bearer-token support via `Authorization: Bearer <token>`.
  - Added optional timestamp verification with replay window control:
    - `X-Webhook-Timestamp` / `X-Timestamp`
    - `COMMUNICATION_WEBHOOK_REQUIRE_TIMESTAMP`
    - `COMMUNICATION_WEBHOOK_MAX_AGE_SECONDS`
  - Signature verification now accepts:
    - raw-body HMAC SHA256
    - timestamped payload HMAC SHA256 (`<timestamp>.<body>`)
- Communication config placeholders expanded:
  - Files:
    - `sms_backend/config/settings.py`
    - `sms_backend/.env.example`
  - Added:
    - `COMMUNICATION_WEBHOOK_REQUIRE_TIMESTAMP`
    - `COMMUNICATION_WEBHOOK_MAX_AGE_SECONDS`
- Frontend module routing cleanup:
  - Files:
    - `sms_frontend/src/pages/DashboardPage.tsx`
    - `sms_frontend/src/App.tsx`
  - Main dashboard now shows buttons only for assigned modules with active operational routes.
  - Removed user path to generic placeholder shell:
    - `/modules/:moduleKey` now redirects to `/dashboard`.

## Continuation Stabilization (2026-02-26)

### Completed
- Library backend regression suite stabilized in tenant context:
  - File: `sms_backend/library/tests.py`
  - Migrated from URL-coupled client calls to authenticated `APIRequestFactory` + direct DRF view invocation.
  - Added tenant role/module assignment fixture setup to satisfy `HasModuleAccess` contract.
  - Corrected fine-flow assertion logic to only branch when `fine_amount > 0`.
- Library inventory audit create-flow bug fixed:
  - File: `sms_backend/library/views.py`
  - `InventoryAuditViewSet.perform_create` now sets `audit_date` with `date.today()` to guarantee `DateField` serialization safety under both timezone-aware and naive test settings.

### Validation (2026-02-26)
- Backend tests pass:
  - `python manage.py test library.tests --keepdb --noinput`
  - `python manage.py test admissions.tests --keepdb --noinput`
  - `python manage.py test communication.tests --keepdb --noinput`
- Frontend build passes:
  - `npm run build` (from `sms_frontend`)


## Presentation Finalization Checklist (2026-02-27)

### Strict Gate
- [x] Item 1: Production config hardening executed.
  - `config/settings.py` converted to env-first settings for `DEBUG`, `SECRET_KEY`, DB, hosts, CORS, CSRF, secure cookie flags.
  - Added deployment template: `sms_backend/.env.example`.
  - Local debug fallback kept for DB password to preserve current dev/test execution.
- [x] Item 2: Migration hygiene executed.
  - Added missing migration state for unmanaged wrapper apps:
    - `academics/migrations/0001_initial.py`
    - `reporting/migrations/0001_initial.py`
  - Converted to `SeparateDatabaseAndState` with empty DB operations to avoid duplicate table creation.
  - Check result: `python manage.py makemigrations --check --dry-run` => `No changes detected`.
- [x] Item 3: Coverage gap closure executed (role + finance closure matrix expansion).
  - Extended UAT fail-closure suite for:
    - Admin and Tenant Super Admin finance access allow-path assertions.
    - Accountant denied academics write.
    - Closed-period denial for payment posting.
    - Closed-period denial for adjustment approval.
  - Added architecture audit module for:
    - tenant resolution path (header/domain + middleware ordering/delegation)
    - cross-module direct-write guard (static boundary scan).
  - Fixed surfaced defect: `record_payment` now enforces open accounting period before mutation.

### Verification Snapshot
- [x] Targeted suites green:
  - `python manage.py test school.test_uat_fail_closure school.test_architecture_audit --keepdb --noinput`
- [x] Consolidated matrix green:
  - `python manage.py test school.test_architecture_audit school.test_production_readiness_gate school.test_uat_fail_closure school.tests admissions.tests parent_portal.tests communication.tests library.tests academics.tests.AcademicsClassManagementTests school.test_finance_phase4 school.test_finance_phase11 school.test_finance_phase13 school.test_finance_phase14 school.test_finance_phase15 --keepdb --noinput`
  - Result: `69/69 OK`

### Item 4 Execution (Presentation/Demo Readiness)
- [x] Demo runbook produced with strict script order and fallback path:
  - `docs/PRESENTATION_DEMO_RUNBOOK.md`
- [x] Strict execution checklist produced with pass/fail evidence:
  - `docs/PRESENTATION_CHECKLIST_EXECUTION.md`
- [x] Screenshot capture closure toolkit added:
  - `docs/PRESENTATION_SCREENSHOT_MANIFEST.md`
  - `docs/validate_presentation_evidence.ps1`
  - `docs/presentation_evidence/screenshots/.gitkeep`
- [x] Screenshot capture pack completed and validated:
  - Files captured in `docs/presentation_evidence/screenshots` using exact manifest filenames.
  - Validator result: `Missing files: 0` / `STATUS: PASS`
  - Command: `powershell -ExecutionPolicy Bypass -File docs/validate_presentation_evidence.ps1`

### Item 5 Execution (Release Gate Evidence Bundle)
- [x] Evidence bundle produced with command outputs + gate matrix + risk signoff:
  - `docs/RELEASE_EVIDENCE_BUNDLE.md`
- [x] Fresh backend gate run executed:
  - `Found 69 test(s)` / `Ran 69 tests` / `OK`
- [x] Fresh frontend production build executed:
  - `vite v7.3.1` / `1139 modules transformed` / `built in 48.59s`
- [x] Fresh migration hygiene check executed:
  - `python manage.py makemigrations --check --dry-run` => `No changes detected`

## Next Team Master Handoff (2026-02-27)

- Consolidated onboarding, environment, validation, evidence, risks, and first-week execution plan documented in:
  - `docs/NEXT_DEV_TEAM_MASTER_HANDOFF.md`
- `docs/INDEX.md` and `docs/NEXT_TEAM_PLAYBOOK.md` updated to include this handoff in mandatory read order.

## 2026-03-03 UI Module Visibility Fix + Super Admin Next Plan

### Completed now
- Removed hardcoded frontend module focus lock in `src/config/moduleFocus.ts`.
- Frontend now defaults to showing all tenant module routes that exist in the app.
- Added optional env-based UI module toggles in `.env.example`:
  - `VITE_ENABLED_BACKEND_MODULE_KEYS`
  - `VITE_ENABLED_ROUTE_KEYS`
  - `VITE_ENABLED_SETTINGS_KEYS`

### Why this mattered
- Users could authenticate successfully but still not see most modules due to frontend-only hardcoded restrictions.
- This created a mismatch with backend `MODULE_FOCUS_LOCK=false` and gave a false impression that modules were unavailable.

### Next Super Admin live-readiness slice
1. Tenant Management: schema onboarding UX hardening + validation and safer destructive actions.
2. Subscription/Billing: invoice/payment state transitions with explicit audit links in UI.
3. Support/Impersonation/Monitoring: enforce approval/timebox UX and clearer alert triage.
4. Security/Compliance/Action Logs: stronger filters, export, and incident/report traceability.
5. Deployment/Backup/Recovery: mark integration depth (record orchestration vs external execution hooks) in UI + runbooks.

## 2026-03-03 Step 1 Delivery: Deployment & Maintenance Hardening

Backend additions completed:
- New persistence models:
  - `clients.PlatformNotificationDispatch` (tenant notification fan-out tracking)
  - `clients.DeploymentHookRun` (CI/CD trigger/rollback hook execution tracking)
- New deployment endpoints:
  - `POST /api/platform/deployment/releases/{id}/trigger-pipeline/`
  - `GET /api/platform/deployment/releases/{id}/hook-runs/`
- Existing rollback flow now records external rollback hook execution result.
- Maintenance window lifecycle now queues persistent tenant notifications.
- Feature flag runtime evaluation endpoint added:
  - `GET /api/platform/deployment/feature-flags/evaluate/?key=...&tenant_id=...&actor_id=...`

Validation evidence:
- `python manage.py test clients.tests.PlatformDeploymentIntegrationStep1Tests --noinput` => `OK` (4 tests).
- `python manage.py check` => no issues.

## 2026-03-03 Step 2 Delivery: Backup & Recovery Orchestration Hardening

Backend additions completed:
- New persistence model:
  - `clients.BackupExecutionRun` (tracks backup engine execution runs)
- New backup orchestration endpoints:
  - `POST /api/platform/backup/jobs/{id}/execute-engine/`
  - `GET /api/platform/backup/jobs/{id}/executions/`
  - `POST /api/platform/backup/restores/{id}/execute/`
- Configurable backup execution mode via env:
  - `BACKUP_ENGINE_MODE=mock` (safe default)
  - `BACKUP_ENGINE_MODE=pg_dump` (requires infrastructure dependencies)

Remaining deep-integration gaps:
- PITR/WAL orchestration and geo-redundant DR automation are still pending.
- Snapshot/object-storage provider adapters beyond local/mock execution remain pending.

## 2026-03-03 Step 3 Delivery: Platform Settings Module

Implemented:
- New backend model + API:
  - `clients.PlatformSetting`
  - `/api/platform/settings/` (list/create/update/delete)
- New Super Admin frontend page:
  - `/platform/settings`
  - JSON value editing with create/update and listing

## 2026-03-03 Step 4 Delivery: Super Admin Users & Roles Management

Implemented:
- Extended `GlobalSuperAdmin` with role support:
  - `OWNER`, `ADMIN`, `SUPPORT`, `AUDITOR`
- New backend management API:
  - `GET/POST /api/platform/admin-users/`
  - `PATCH /api/platform/admin-users/{id}/update/`
  - `POST /api/platform/admin-users/{id}/revoke/`
- New Super Admin frontend page:
  - `/platform/admin-users`
  - grant/update/revoke platform admins directly in browser UI

## 2026-03-03 Final UX Pass: Deployment + Backup pages

Deployment page UX additions:
- Added direct actions for new hardening APIs:
  - Trigger pipeline (`/trigger-pipeline/`)
  - Run health checks (`/run-health-checks/`)
  - Load hook run history (`/hook-runs/`)
- Added runtime feature-flag evaluation panel (`/feature-flags/evaluate/`).

Backup page UX additions:
- Added backup engine execution action (`/execute-engine/`).
- Added backup execution history action (`/executions/`).
- Added restore execute action (`/backup/restores/{id}/execute/`).

Validation:
- Frontend production build completed successfully after this pass.
