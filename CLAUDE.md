# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all workspace deps
pnpm install

# Run everything together
pnpm dev                        # all three apps in parallel

# Run individual apps
pnpm dev:api                    # NestJS API     → :3001
pnpm dev:web                    # Member portal  → :3000
pnpm dev:admin                  # Staff portal   → :3002

# Database
pnpm db:generate                # prisma generate (after schema changes)
pnpm db:migrate                 # prisma migrate dev (creates + applies migration)
pnpm db:studio                  # open Prisma Studio

# Type check a specific app
pnpm --filter @hone/api exec tsc --noEmit
pnpm --filter @hone/web exec tsc --noEmit
pnpm --filter @hone/admin exec tsc --noEmit
```

After changing `packages/database/prisma/schema.prisma`, always run `pnpm db:generate` before type-checking dependent apps.

The database scripts in root delegate to the named scripts inside `packages/database` (e.g. `db:migrate` → `packages/database` `db:migrate` script). Both `packages/database/.env` and `apps/api/.env` must have the same `DATABASE_URL`.

## Architecture

**Monorepo:** Turborepo + pnpm workspaces. Three apps share one `packages/database` Prisma client and `packages/tsconfig` base configs.

```
hone/
├── apps/
│   ├── admin/   :3002  Staff portal — Next.js 15, light mode, desktop-first
│   ├── web/     :3000  Member portal — Next.js 15, dark mode (#0f1117), volt green (#ccff00) accents
│   └── api/     :3001  NestJS — JWT auth, serves both frontends and future mobile
└── packages/
    ├── database/       Prisma schema (Organization → Branch → User) + PrismaClient singleton
    ├── types/          Shared TS enums/types (not yet populated)
    └── tsconfig/       base.json / nextjs.json / nestjs.json
```

## Multi-Tenancy

Logical isolation via `organizationId` / `branchId` on every user/resource. URL pattern: `hone.fit/[gym-slug]`. Reserved slugs (`admin`, `api`, `www`, etc.) are blocked at onboarding.

## Auth Flow

- NestJS issues stateless JWTs (`access_token` 15 min, `refresh_token` 7 days).
- Next.js apps POST tokens to their own `/api/auth/session` route handler, which sets an `httpOnly` cookie (`hone_token` for web, `hone_admin_token` for admin).
- `middleware.ts` in each Next.js app checks the cookie and redirects unauthenticated requests to `/login`.
- `apps/admin/middleware.ts` additionally decodes the JWT role client-side and 403-redirects `CLIENT` tokens.

## Roles

`SUPER_ADMIN` → `ORG_ADMIN` → `BRANCH_MANAGER` → `TRAINER` → `CLIENT`

Staff roles (all except `CLIENT`) use `apps/admin`. Members use `apps/web`.

## Design Tokens

| App | Background | Accent |
|-----|-----------|--------|
| `apps/web` | `#0f1117` (deep slate) | `#ccff00` (volt green) |
| `apps/admin` | `#f8f9fa` (soft gray) | `#111827` (near-black) |

## API Endpoints (implemented)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Create user, return tokens |
| POST | `/api/auth/login` | — | Validate credentials, return tokens |
| POST | `/api/auth/refresh` | refresh JWT in body | Return new access token |
| GET | `/api/auth/me` | Bearer token | Return current user profile |

## Env Files

- `apps/api/.env` — `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `PORT`
- `apps/web/.env.local` — `NEXT_PUBLIC_API_URL`
- `apps/admin/.env.local` — `NEXT_PUBLIC_API_URL`
- `packages/database/.env` — `DATABASE_URL` (for prisma CLI)
