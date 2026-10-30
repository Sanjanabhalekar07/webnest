# WebNest project workspace

A project management frontend built with Next.js App Router, strict TypeScript, and Tailwind CSS. The workspace foundation and task/workflow milestone are implemented.

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
- Task checklists, comments, parent/subtask relationships, and dependencies with cycle detection and completion rules.
- Simulated attachments with file metadata, extension/MIME validation, a 10 MB limit, and up to five attachments per task.
- Configurable workspace workflow: add, rename, reorder, and remove columns with explicit task migration. Done remains the completion column.
- Kanban movement using mouse, touch, or keyboard through dnd-kit, live announcements, and an alternative status selector on each card.
- Shared list, monthly calendar, and chronological delivery views.
- Task search and combined project, priority, status, assignee, label, overdue, and text filters, with sorting and saved preferences for each task page.
- Activity history and persistent light/dark appearance.
- Project completion, workload, task distribution, and sample sprint progress summaries.
- IndexedDB persistence, schema validation and versioned migration, first-run sample data, loading state, save feedback, and retry on save errors.

## Current assumptions

The app is a single-browser workspace with four sample members. Membership and roles are illustrative; there is no authentication, server, or collaboration sync. Data belongs to the current browser profile and origin. Clearing site data deletes the workspace. There is no real attachment upload or external notification service.

The timeline currently lists delivery dates; it is not yet a Gantt chart. Sprint options are sample values; creating and completing sprints and historical burndown are future work. Workflow configuration is shared across projects. Task order within a column follows the selected sort, rather than manual card ranking.

## Architecture

- `app/(workspace)/`: independent route pages and the shared layout.
- `app/providers/workspace-provider.tsx`: shared workspace state, persistence, and lazily loaded editors.
- `app/components/`: separate feature views, shared navigation, cards, tables, dialogs, and editors.
- `app/lib/task-utils.ts`: shared task creation, date formatting, overdue checks, and progress calculations.
- `app/lib/workspace-rules.ts`: schema parsing, migration, task and workflow validation, deletion cleanup, and task filtering/sorting.
- `app/lib/model.ts`: shared entities and deterministic first-run sample content (dates are relative to first launch).
- `app/lib/storage.ts`: IndexedDB database lifecycle and transaction-based load/save operations.
- `app/globals.css`: workspace tokens, component styles, dark appearance, and responsive layouts.

All views derive from the same task collection. Mutations update the in-memory snapshot and queue complete snapshots in order. Save status tracks the newest revision. Failed saves retain the in-memory changes and expose a retry. Task/project deletion is confirmed; deleting a project also deletes its tasks. Archiving preserves tasks and removes them from active reports; restoring makes them visible again. Activity is capped at the newest 100 entries.

Dependencies and parents must belong to the same project. Completion edges (dependencies plus subtasks) cannot form cycles. A task cannot become Done until all dependencies and subtasks are Done; reopen completed dependent/parent tasks before reopening prerequisites. Deleting a task unlinks its dependencies and promotes its subtasks to independent tasks. Moving a task to another project is rejected if it would invalidate existing relationships.

Storage schema version 2 migrates the original workspace in the existing IndexedDB database, retaining project and task IDs. Invalid or newer saved data is rejected without overwriting it. The legacy database name is retained to preserve existing browser data. Attachments store metadata only, and cannot be downloaded or previewed.

## Checks and demonstration

`npm test` runs domain and IndexedDB tests with Node's test runner, tsx, and fake-indexeddb. Tests use an isolated in-memory database, not browser data. `npm run build` checks the production routes. `npm run format:check` checks formatting.

To explore this milestone:

1. Open a project and choose **Customize workflow**. Add a column, reorder it, or remove a column after choosing where its tasks should move.
2. Open a task and link another task under **Depends on**. Attempt to mark it Done before its dependency is complete to see validation.
3. Choose **Save and add subtask**, or create a new task and select a parent. Save attachment metadata using **Add files**.
4. Move a task using its drag handle. With the handle focused, press Space, use Left/Right, then Space to drop; Escape cancels. Touch users can hold the handle briefly or use the card's **Move to** selector.
5. Combine filters and choose a sort. Refresh the page to confirm preferences and theme are retained.

Browser interaction and assistive-technology checks are still pending; the browser automation host was unavailable in this environment.

## Remaining milestones

Navigation uses real URLs: `/`, `/tasks`, `/projects`, `/projects/[projectId]`, `/calendar`, `/reports`, `/activity`, and `/search?q=...`. Each page imports its own feature component. The shared route-group layout retains workspace data and pending saves during navigation. Direct visits load the same IndexedDB workspace.

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the remaining implementation and validation work.
