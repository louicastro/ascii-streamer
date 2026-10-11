# ascii-streamer

A small TypeScript workspace for streaming ASCII-art and related backend services. This project is organized as a pnpm monorepo with a shared API contract, database layer, and application services.

## Run and operate

Use these commands from the repo root:

- `pnpm install` — install workspace dependencies
- `pnpm --filter @workspace/api-server run dev` — start the API server on port 5000
- `pnpm run typecheck` — run the TypeScript typecheck across the workspace
- `pnpm run build` — typecheck and build every package
- `pnpm --filter @workspace/api-spec run codegen` — regenerate client hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push schema changes to the dev database
- Required environment variable: `DATABASE_URL` — Postgres connection string used by the app and DB tooling

## Stack

- pnpm workspaces
- Node.js 24
- TypeScript 5.9
- API: Express 5
- Database: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`) and `drizzle-zod`
- API client generation: Orval from the OpenAPI spec
- Build tooling: esbuild with CJS bundles

## Repository map

- `apps/api-server/` — Express server entrypoints, route handlers, and runtime wiring
- `packages/api-spec/` — OpenAPI contract and generated API artifacts
- `packages/db/` — database schema, migrations, and query helpers
- `packages/shared/` — reusable types, utilities, and cross-package contracts
- `package.json` — workspace scripts and shared package configuration

Use the source-of-truth files below as the primary reference when making changes:

- DB schema: `packages/db/src/schema.ts` (or the schema entry under the DB package)
- API contract: `packages/api-spec/` and generated output under the API package
- Shared validation: `packages/shared/` and generated Zod models

## Architecture decisions

- The repo is split into package boundaries so API, DB, and shared types can evolve independently without coupling runtime code.
- The OpenAPI spec is treated as the contract source of truth; generated clients and Zod schemas should be refreshed via codegen instead of hand-edited.
- Database access is isolated behind the DB package to keep query logic close to schema definitions and easier to validate.
- The workspace favors explicit env configuration over implicit defaults so local setup and deployment behavior remain predictable.
- Type safety is enforced across the monorepo, with generated types and validation models used to reduce drift between API and backend logic.

## Product

This app is intended to provide a simple, high-signal way to generate and stream ASCII-based output over a lightweight API. The current focus is on backend infrastructure, shared contracts, and reusable platform primitives that make future user-facing features easier to build and extend.

## User preferences

- Keep changes small, explicit, and easy to reason about.
- Prefer existing package boundaries over ad hoc cross-package imports.
- Regenerate API artifacts after updating the OpenAPI contract rather than patching generated files by hand.
- Keep environment assumptions documented and avoid introducing hidden runtime requirements.

## Gotchas

- Always run the relevant typecheck or build command after changing shared contracts or schema code.
- If the API spec changes, run codegen before expecting the generated hooks or validators to be current.
- Do not treat the generated files as the source of truth; update the spec or schema definition first, then regenerate.
- The required `DATABASE_URL` environment variable must be set before running DB or server commands that depend on Postgres.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
- Keep this document aligned with the actual repo layout as the project grows.
- If a new subsystem is introduced, add it to the repository map and architecture decisions so onboarding stays fast.

