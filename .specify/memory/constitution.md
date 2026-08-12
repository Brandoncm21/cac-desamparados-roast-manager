<!-- Sync Impact Report
Version change: 0.0.0 → 1.0.0
List of modified principles: initial constitution
Added sections: Core Principles, Security & Access, Data Integrity, Testing, Development Workflow, Governance
Removed sections: none
Follow-up TODOs: none
-->

# SCACR Constitution

## Core Principles

### I. Security First
All database tables exposed through the application MUST have Row Level Security (RLS) enabled with explicit policies. Admin bypass of RLS through the service role key MUST occur only inside server-side helpers that verify the caller's role first. The service role key MUST NOT be present in client code, environment files committed to the repository, or conversation history. Every API route MUST authenticate the caller before executing business logic.

### II. Single Source of Truth for Business Logic
Business calculations, validation, and state transitions MUST run on the server. The client MAY render derived values for UX convenience but MUST NOT rely on client-computed values for security or correctness. All database writes go through authenticated API routes or server actions, never directly from the browser.

### III. Unified Authentication
Authentication and authorization use Supabase Auth and the `empleados` table exclusively. The middleware verifies sessions via `@supabase/ssr`. Role checks on the server use `requireRole()` from `lib/api-helpers`. Client-side role helpers in `lib/auth-helpers.ts` are for UI gating only and MUST NOT replace server-side enforcement.

### IV. Validation at Every Boundary
Every API route MUST validate incoming payloads with Zod before touching the database. Form submissions use `react-hook-form` with `zodResolver`. Numeric IDs in dynamic routes MUST be validated with `validateIdParam()`. Invalid input returns structured `fieldErrors` so the UI can show precise messages.

### V. File Size and Modular Architecture
Pages, API routes, and client components MUST remain small enough to reason about. A file exceeding ~200 lines without clear separation triggers refactoring into hooks, components, or helpers. Monolithic modules MUST be decomposed into focused, testable units, as was done with the tueste capture page.

### VI. Database Migrations as Code
Every schema change lives in a numbered migration under `supabase/migrations/`. Migrations MUST be reversible whenever possible. Seed and fixture data belong in `supabase/seed.sql`. RLS policy updates that fix runtime errors also require a migration so the fix is reproducible across environments.

### VII. Explicit Error Handling
Server code MUST catch and normalize errors before returning them to the client. API routes use `withErrorHandler()` and return consistent `{ data }` / `{ error }` shapes. Unexpected errors are logged; user-facing messages are safe and actionable. The client MUST handle both success and structured error responses.

### VIII. Test Critical Logic
Zod schemas, error handlers, and pure business logic MUST have unit tests. New schema rules require tests before being considered complete. Integration tests for API routes are encouraged for critical paths. Tests run with `npm run test` and MUST pass before merging.

### IX. Progressive Enhancement and Offline Resilience
The application is a PWA. Core flows SHOULD work with reasonable degradation when offline. IndexedDB and service workers are used for caching; sync with Supabase happens when connectivity is restored. Offline state MUST NOT bypass server validation on sync.

## Technology Stack

- **Language**: TypeScript in strict mode.
- **Framework**: Next.js 16 with the App Router.
- **Database**: PostgreSQL through Supabase (project `nwnldvzoxjjsmfeyouaw`).
- **Authentication**: `@supabase/ssr` and Supabase Auth; roles stored in the `empleados` table.
- **Styling/UI**: Tailwind CSS v4, shadcn/ui components, Recharts for dashboards.
- **Validation**: Zod, react-hook-form, `@hookform/resolvers`.
- **Testing**: Vitest.
- **Offline/PWA**: IndexedDB, service worker registered in production.
- **PDF generation**: html-to-image + jspdf.

## Development Workflow

1. **Plan before building**: Use `/speckit.specify` for new features, `/speckit.plan` for implementation details, and `/speckit.tasks` to break work into reviewable units.
2. **Keep changes minimal**: A commit should address one concern. Avoid mixing unrelated refactors with feature work.
3. **Verify locally**: Run `npm run typecheck` and `npm run test` before considering a change complete.
4. **Document in code**: Complex logic gets inline comments; architectural decisions that affect multiple features are recorded in ADRs under the decision log.
5. **Review RLS impact**: Any schema or policy change must be checked against existing roles and the seed data.

## Known Technical Debt

- The Supabase service role key was exposed in conversation history and local `.env.local`. It MUST be rotated through the Supabase Dashboard and the old value removed from all storage.
- Several API routes rely on RLS for authorization and do not call `requireRole()`. Each route SHOULD be audited and hardened where role checks are required by business rules.
- API route integration tests are missing. They SHOULD be added for order creation, profile creation, and other critical mutations.

## Governance

This constitution overrides ad-hoc conventions. Amendments require updating `.specify/memory/constitution.md`, bumping the version according to semantic versioning, and documenting the rationale in the Sync Impact Report. All contributors SHOULD review the constitution before proposing significant features, and the active agent MUST verify compliance with these principles during implementation.

**Version**: 1.0.0 | **Ratified**: 2026-08-12 | **Last Amended**: 2026-08-12
