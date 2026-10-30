# WebNest project workspace

A project management frontend built with Next.js App Router, strict TypeScript, and Tailwind CSS. This checkout contains the first implementation milestone.

## Run locally

Requires Node.js 20.9 or newer and npm.

```sh
npm install
npm run dev
```

Open http://localhost:3000. Use `npm run build` for a production build and `npm start` to serve it. System fonts keep builds independent of Google Fonts availability.

## Implemented

- Responsive workspace shell and overview dashboard with project progress and overdue task counts.
- Project creation, editing, archiving, restoration, and deletion.
- Task creation, editing, deletion, assignment, priorities, labels, due dates, and status changes.
- Task checklists and comments, saved with the task.
- Kanban board with native drag and drop; keyboard and touch users can change status in the task editor.
- Shared list, monthly calendar, and chronological delivery views.
- Task search, project and priority filters, activity history, light/dark appearance.
- Project completion, workload, task distribution, and sample sprint progress summaries.
- IndexedDB persistence, first-run sample data, loading state, save feedback, and retry on save errors.

## Current assumptions

The app is a single-browser workspace with four sample members. Membership and roles are illustrative; there is no authentication, server, or collaboration sync. Data belongs to the current browser profile and origin. Clearing site data deletes the workspace. There is no real attachment upload or external notification service.

The timeline currently lists delivery dates; it is not yet a Gantt chart. Sprint options are sample values; creating and completing sprints and historical burndown are future work. Workflow columns are currently fixed. Theme preference currently lasts for the open session.

## Architecture

- `app/(workspace)/`: independent route pages and the shared layout.
- `app/providers/workspace-provider.tsx`: shared workspace state, persistence, and lazily loaded editors.
- `app/components/`: separate feature views, shared navigation, cards, tables, dialogs, and editors.
- `app/lib/task-utils.ts`: shared task creation, date formatting, overdue checks, and progress calculations.
- `app/lib/model.ts`: shared entities and deterministic first-run sample content (dates are relative to first launch).
- `app/lib/storage.ts`: IndexedDB database lifecycle and transaction-based load/save operations.
- `app/globals.css`: workspace tokens, component styles, dark appearance, and responsive layouts.

All views derive from the same task collection. Mutations update the in-memory snapshot and queue complete snapshots in order. Save status tracks the newest revision. Failed saves retain the in-memory changes and expose a retry. Task/project deletion is confirmed; deleting a project also deletes its tasks. Archiving preserves tasks and removes them from active reports; restoring makes them visible again. Activity is capped at the newest 100 entries.

## Remaining milestones

Navigation uses real URLs: `/`, `/tasks`, `/projects`, `/projects/[projectId]`, `/calendar`, `/reports`, `/activity`, and `/search?q=...`. Each page imports its own feature component. The shared route-group layout retains workspace data and pending saves during navigation. Direct visits load the same IndexedDB workspace.

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the remaining implementation and validation work.
