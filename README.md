# WebNest project workspace

A project management frontend built with Next.js App Router, strict TypeScript, and Tailwind CSS. The workspace, task/workflow, sprint planning, Gantt timeline, and project membership features are implemented.

## Run locally

Requires Node.js 20.9 or newer and npm.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Set `MONGODB_URI` in `.env.local` to a reachable MongoDB database before using sign in or the workspace. The example uses a local MongoDB server at `127.0.0.1:27017`. Open http://localhost:3000. Use `npm run build` for a production build and `npm start` to serve it. System fonts keep builds independent of Google Fonts availability.

## Implemented

- Responsive workspace shell and overview dashboard with project progress and overdue task counts.
- Project creation, editing, archiving, restoration, and deletion.
- Task creation, editing, deletion, assignment, priorities, labels, due dates, and status changes.
- Task checklists, comments, parent/subtask relationships, and dependencies with cycle detection and completion rules.
- Simulated attachments with file metadata, extension/MIME validation, a 10 MB limit, and up to five attachments per task.
- Configurable workspace workflow: add, rename, reorder, and remove columns with explicit task migration. Done remains the completion column.
- Kanban movement using mouse, touch, or keyboard through dnd-kit, live announcements, and an alternative status selector on each card.
- Shared list, monthly calendar, and Gantt timeline views with start/due dates, dependency arrows, overlap warnings, zoom, date navigation, and an accessible schedule table.
- Project member management with Owner/Member/Viewer roles, actual roster avatars, and explicit reassignment when removing assignees or making them Viewers.
- Task search and combined project, priority, status, assignee, label, overdue, and text filters, with sorting and saved preferences for each task page.
- Activity history and persistent light/dark appearance.
- Persistent unread/read activity state, unread badges, unread-only filtering, and individual/bulk read controls.
- Project-specific sprint creation, editing, start/completion, bulk backlog planning, and task assignment.
- Recorded sprint snapshots, an accessible SVG burndown chart and data table, scope/baseline tracking, and frozen completion reports.
- Project completion, workload, task distribution, and active sprint progress summaries.
- Mongoose persistence in MongoDB, schema validation, first-run sample data, loading state, save feedback, and retry on save errors.
- MongoDB-backed accounts with scrypt password hashes, expiring HTTP-only sessions, and per-account workspace documents.
- A mock asynchronous service with controlled latency, development-only one-shot failures, recoverable load retries, and a coalescing save queue.

## Current assumptions

Each account owns an independent workspace document in MongoDB, initially populated with four sample project members. Project roles enforce workspace ownership and assignment rules; they do not invite real users or provide team collaboration. Passwords are hashed on the server, and sessions use HTTP-only cookies. Existing browser-only accounts and IndexedDB workspaces are not imported automatically. There is no real attachment upload or external notification service.

The timeline displays inclusive calendar-day ranges and warns about overlapping prerequisite dates. It does not automatically reschedule dependencies or offer drag-to-resize scheduling; select a bar or task label to edit dates. Fit tasks is capped at a one-year display window; use date navigation to inspect longer ranges. Browser/assistive-technology verification and large-data performance checks remain pending. Workflow configuration is shared across projects. Task order within a column follows the selected sort, rather than manual card ranking.

## Architecture

- `app/(workspace)/`: independent route pages and the shared layout.
- `app/providers/workspace-provider.tsx`: shared workspace state, persistence, and lazily loaded editors.
- `app/components/`: separate feature views, shared navigation, cards, tables, dialogs, and editors.
- `app/lib/task-utils.ts`: shared task creation, date formatting, overdue checks, and progress calculations.
- `app/lib/workspace-rules.ts`: schema parsing, migration, task and workflow validation, deletion cleanup, and task filtering/sorting.
- `app/lib/sprint-rules.ts`: sprint lifecycle, task assignment, daily observations, and migration of legacy sprint labels.
- `app/lib/date-utils.ts`: date validation, local calendar days, and date arithmetic.
- `app/lib/project-rules.ts`: project roster validation, ownership invariants, reassignment, and membership migration.
- `app/lib/timeline-rules.ts`: inclusive date geometry, clipping, and dependency/overlap information.
- `app/components/sprints/`: sprint planning, lifecycle editor, reports, and accessible burndown visualization.
- `app/lib/model.ts`: shared entities and deterministic first-run sample content (dates are relative to first launch).
- `app/lib/mongodb.ts` and `app/models/`: shared Mongoose connection and MongoDB models for users, sessions, and workspaces.
- `app/api/`: authenticated account and workspace route handlers.
- `app/lib/auth-server.ts`: password hashing, HTTP-only session handling, and account operations.
- `app/lib/storage.ts`: Mongoose workspace reads and writes scoped to the authenticated user.
- `app/actions/workspace.ts` and `app/actions/auth.ts`: authenticated Server Actions for workspace and account changes.
- `app/lib/workspace-service.ts`: mock request latency, development-only one-shot failures, structured errors, and a shared initial-load controller.
- `app/lib/save-queue.ts`: serialized writes, coalescing of waiting snapshots, and observable save/error status.
- `app/lib/notification-rules.ts`: unread counts and idempotent read/unread updates.
- `app/globals.css`: workspace tokens, component styles, dark appearance, and responsive layouts.

All views derive from the same task collection. Mutations update the in-memory snapshot and submit full snapshots to the save queue. One write runs at a time; rapid pending changes coalesce to the latest full snapshot. An older failed write cannot leave an error after a newer snapshot saves successfully. Failed latest saves retain in-memory changes and expose a retry of the complete working state. Wait for the saved indicator before closing/reloading a tab; pending or failed edits are not durable yet. Task/project deletion is confirmed; deleting a project also deletes its tasks. Archiving preserves tasks and removes them from active reports; restoring makes them visible again. Activity is capped at the newest 100 entries.

Dependencies and parents must belong to the same project. Completion edges (dependencies plus subtasks) cannot form cycles. A task cannot become Done until all dependencies and subtasks are Done; reopen completed dependent/parent tasks before reopening prerequisites. Deleting a task unlinks its dependencies and promotes its subtasks to independent tasks. Moving a task to another project is rejected if it would invalidate existing relationships.

Workspace schema version 5 is validated on each MongoDB load and save. Settings, projects, tasks, sprints, and activity are stored in separate per-user MongoDB collections with typed Mongoose schemas and compound indexes. Existing records in the legacy `workspaces` collection are migrated automatically the first time the workspace is loaded; the legacy record is removed only after the split records are saved. Browser IndexedDB content is not automatically copied to MongoDB. Attachments store metadata only, and cannot be downloaded or previewed.

Every project must retain at least one Owner. Owners and Members can receive tasks; Viewers cannot. Removing an assignee or changing them to Viewer requires explicitly choosing another eligible member for all their tasks. This includes current completed tasks, while frozen sprint reports retain their original recorded assignees. Custom project member names are supported and appear in assignee choices, filters, workload reports, and avatars. New projects initially include the current sample admin as Owner.

## Sprint rules

Each project can have one active sprint. A sprint spans more than one calendar day and at most 90 days between its start/end dates. Starting requires at least one assigned task and today's local date within the scheduled range. Active dates/project and the original task-count baseline stay fixed; the name and goal can still be edited. Tasks can enter or leave active sprints, and their scope changes appear in recorded snapshots.

Snapshots store the latest observed task counts for each local date. The app records them when loading saved data, on mutations, when a visible tab crosses into a new day, and when returning to the tab. Historical observations are not overwritten by later days; days when the app was closed are not backfilled. The chart connects recorded observations and keeps the original ideal line separate from scope changes. Counts represent tasks, not story points or hours.

Completing a sprint freezes task titles, assignees, statuses, and the final counts. Unfinished tasks return to the backlog; they remain listed as carryover in the closed report. Later task edits/deletion do not rewrite the report. Completed sprints cannot receive new tasks or be edited/deleted. To reopen a completed task, move it out of the closed sprint first. Deleting a planned sprint returns its tasks to the backlog; deleting a project also removes its sprint history.

## Checks and demonstration

`npm test` runs domain and workspace serialization tests with Node's test runner and tsx. `npm run build` checks the production routes. `npm run format:check` checks formatting.

The mock service defaults to 350 ms for loads and saves. Change `NEXT_PUBLIC_MOCK_LATENCY_MS` (0–5000) in `.env.local` to adjust the delay. Validation failures happen before MongoDB writes. Service errors distinguish unavailable requests, invalid data, and database access failures.

During `npm run dev`, fully load or reload a URL with `?demo=slow`, `?demo=load-error`, or `?demo=save-error` to reproduce a slow request or a one-shot failure. Scenarios are selected once per mounted workspace, so ordinary client navigation does not re-arm them. **Try again** retries a failed load without reloading the page; **Retry save** preserves and resubmits all edits. A full reload re-arms the URL scenario. These query parameters are ignored in production. See [docs/DEMO.md](docs/DEMO.md) for a review walkthrough and failure-recovery checks.

To explore this milestone:

1. Open a project and choose **Customize workflow**. Add a column, reorder it, or remove a column after choosing where its tasks should move.
2. Open a task and link another task under **Depends on**. Attempt to mark it Done before its dependency is complete to see validation.
3. Choose **Save and add subtask**, or create a new task and select a parent. Save attachment metadata using **Add files**.
4. Move a task using its drag handle. With the handle focused, press Space, use Left/Right, then Space to drop; Escape cancels. Touch users can hold the handle briefly or use the card's **Move to** selector.
5. Combine filters and choose a sort. Refresh the page to confirm preferences and theme are retained.
6. Open **Sprints**, select a project, and create a sprint with today's date in its range. Select backlog tasks and choose **Add selected to sprint**.
7. Start the sprint, edit a task's status, and inspect its burndown snapshot table. Complete the sprint to see unfinished tasks return to the backlog while the closed report stays fixed.
8. Open a project's **Timeline** tab. Edit task start/due dates, inspect dependency arrows, use the date/zoom controls, and open **View timeline as a table** to inspect prerequisites hidden by filters.
9. Choose **Members** on a project task page. Add a member, change their role, or remove an assignee after choosing a replacement. Attempting to remove the last Owner or assign a Viewer is rejected.
10. Open **Activity**, mark individual or all updates read, filter unread updates, and reload after saving to confirm the read state and badges remain consistent.

Browser interaction and assistive-technology checks are still pending; the browser automation host was unavailable in this environment.

## Remaining milestones

Navigation uses real URLs: `/`, `/tasks`, `/projects`, `/projects/[projectId]`, `/sprints`, `/calendar`, `/reports`, `/activity`, and `/search?q=...`. Each page imports its own feature component. The shared route-group layout retains workspace data and pending saves during navigation. Direct visits load the signed-in user's MongoDB workspace.

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the remaining implementation and validation work.
