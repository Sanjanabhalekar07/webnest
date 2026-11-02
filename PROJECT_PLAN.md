# Implementation progress

## Milestone 1: workspace and persistent core

- [x] Application shell, responsive dashboard, sample workspace
- [x] Shared project and task types
- [x] Project CRUD, archive, and restore
- [x] Task CRUD, assignment, priorities, labels, status, and due date
- [x] Checklist and comments
- [x] IndexedDB persistence with sequential writes and retry
- [x] Board, table, calendar, and delivery-date list
- [x] Search, project/priority filters, derived dashboard reports
- [x] Activity feed and session appearance toggle

## Milestone 2: complete task and workflow behavior

- [x] Extract feature modules and a shared workspace state provider
- [x] Add separate route pages and project detail URLs with shared navigation
- [x] Custom workflow columns and ordering; migrate existing tasks safely
- [x] Drag and drop with keyboard announcements, touch sensors, and an alternative status selector (browser/assistive-technology QA pending)
- [x] Subtasks and task dependencies with cycle prevention
- [x] Simulated attachments with metadata and clear size/type validation
- [x] Sorting, multi-field filters, and per-view saved preferences
- [x] Persistence schema validation and versioned migrations

## Milestone 3: sprint planning and advanced views

- [x] Create/edit/start/complete sprints with valid date ranges
- [x] Backlog planning and task assignment to sprints
- [x] Recorded daily snapshots, baseline/scope tracking, and historical burndown (browser QA pending)
- [x] Timeline/Gantt bars, start dates, dependency display, zoom/navigation, and accessible schedule table (browser QA pending)
- [x] Project member role management with required ownership and explicit task reassignment

## Milestone 4: quality and delivery

- [ ] Mock service layer with controlled latency and reproducible failure cases
- [x] Persistent appearance
- [ ] Notification read state
- [x] Automated tests for dependency rules, workflow migration, attachment validation, filtering, and IndexedDB persistence
- [ ] Automated browser tests for shared-view consistency
- [ ] Browser workflow checks: edit, move, refresh, restart, archive/restore, and delete
- [ ] Keyboard, screen-reader, mobile, and large-data performance checks
- [ ] Demo script, architecture notes, limitations, and assessment preparation

Build changes in reviewable commits. Do not mark workflows verified until they have actually been exercised.
