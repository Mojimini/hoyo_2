# hoyo_2

UI-first web application for analyzing a HoYo account and answering four practical questions:

1. Is this character built well enough yet?
2. What is missing from the build?
3. Is it worth continuing to invest in this character?
4. Which character should be built next?

## Current phase

Phase 1 is **web UI/UX with mock data**. Backend scoring, live account integration, and recommendation algorithms are intentionally out of scope until the page flows and data contracts are stable.

## Stack

- React + TypeScript
- Vite
- React Router
- CSS design tokens and reusable UI components

## Core routes

- `/` — Account Dashboard
- `/characters` — Character roster
- `/characters/:id` — Character detail
- `/planner` — Build planner
- `/teams` — Team overview
- `/account` — Account overview
- `/settings` — Settings shell

## Multi-agent workflow

Six worker branches are reserved for isolated UI slices. Read `docs/UI_ARCHITECTURE.md` and the assigned GitHub issue before making changes. Each worker must open a **Draft PR** into `main` and must not merge it.
