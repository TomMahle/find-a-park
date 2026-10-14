# find-a-park

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4.

## Setup

Requires Node 24 (pinned in `.tool-versions` / `.nvmrc`) and pnpm.

```bash
pnpm install
pnpm exec playwright install chromium   # once, for e2e tests
pnpm dev                                 # http://localhost:3000
```

## Scripts

| Script               | What it does                                        |
| -------------------- | --------------------------------------------------- |
| `pnpm dev`           | Dev server (Turbopack)                              |
| `pnpm build`/`start` | Production build / serve                            |
| `pnpm check`         | typecheck + lint + format check + unit tests        |
| `pnpm test`          | Vitest in watch mode (`test:run` for a single pass) |
| `pnpm test:coverage` | Unit tests with v8 coverage                         |
| `pnpm test:e2e`      | Playwright (desktop Chrome + mobile viewport)       |
| `pnpm lint`          | ESLint (Next core-web-vitals + TS), zero warnings   |
| `pnpm format`        | Prettier (with Tailwind class sorting)              |

## Conventions

- Unit/component tests live next to the code as `*.test.ts(x)`; e2e specs live in `e2e/`.
- The pre-commit hook only runs Prettier on staged files; lint, types and tests run in `pnpm check` and CI (`.github/workflows/ci.yml`).
