# UI Architecture and Multi-Agent Contract

## Product goal

Build a web application that goes beyond a character showcase. The UI must help a player understand:

- whether a character is built well enough,
- what is missing,
- whether more investment is worthwhile,
- which character should be built next,
- which character is currently being built and what comes after it.

Phase 1 is UI-first and uses mock data only.

## Canonical routes

| Route | Owner slice |
| --- | --- |
| `/` | Dashboard |
| `/characters` | Character roster |
| `/characters/:id` | Character detail |
| `/planner` | Build planner |
| `/teams` | Team readiness |
| `/account` | Account overview |
| `/settings` | Shared/future |

Do not change route paths without a coordinator decision.

## Shared contracts

Canonical shared files:

- `src/App.tsx` — route map; workers must not modify it.
- `src/types/models.ts` — baseline view-model contract; do not make incompatible changes.
- `src/data/mock.ts` — common mock dataset; prefer local derived data over changing it.
- `src/layout/AppShell.tsx` — global shell.
- `src/styles.css` — global design tokens and base classes.

## UI direction

Use a polished dark HoYo-inspired visual language without copying proprietary assets or exact layouts. Priorities:

1. character artwork/identity should remain visually dominant,
2. build state should be understandable in seconds,
3. recommendations should explain the next action,
4. dense numeric detail belongs below the summary layer,
5. desktop first but all pages must remain usable on mobile.

## Status vocabulary

- `needs-work`
- `good`
- `recommended`
- `complete`

These mean build readiness, not character power or meta rank.

## Build queue vocabulary

- `current`
- `next`
- `later`
- `done`

## Worker isolation

Each worker gets one branch and one owned directory set. Do not modify another worker's owned page directory. Shared-component worker may modify only the shared areas named in its issue.

All workers must:

1. start from the assigned branch,
2. keep the work UI-only and mock-data driven,
3. preserve the canonical data contract,
4. avoid backend, scraping, scoring, percentile, or recommendation-engine logic,
5. run `npm install`, `npm run typecheck`, and `npm run build`,
6. open a Draft PR into `main`,
7. never merge their own PR.

## Integration order

1. Shared design system/app shell
2. Dashboard
3. Characters
4. Character detail
5. Planner
6. Teams + account overview

Because page directories are isolated, page PRs can be implemented in parallel. During final integration, page PRs should sync to the shared design-system PR after it lands if necessary.
