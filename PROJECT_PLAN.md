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

- [ ] Extract feature modules and a shared workspace state provider as the app grows
- [ ] Custom workflow columns and ordering; migrate existing tasks safely
- [ ] Accessible drag and drop with keyboard announcements and touch support
- [ ] Subtasks and task dependencies with cycle prevention
- [ ] Simulated attachments with metadata and clear size/type validation
- [ ] Sorting, multi-field filters, and per-view saved preferences
- [ ] Persistence schema validation and versioned migrations

## Milestone 3: sprint planning and advanced views

- [ ] Create/edit/start/complete sprints with valid date ranges
- [ ] Backlog planning and task assignment to sprints
- [ ] Daily completion snapshots and historical burndown
- [ ] Timeline/Gantt bars, start dates, and dependency display
- [ ] Project member role management

## Milestone 4: quality and delivery

- [ ] Mock service layer with controlled latency and reproducible failure cases
- [ ] Persistent appearance and notification read state
- [ ] Automated tests for dependency rules, persistence, migrations, and shared-view consistency
- [ ] Browser workflow checks: edit, move, refresh, restart, archive/restore, and delete
- [ ] Keyboard, screen-reader, mobile, and large-data performance checks
- [ ] Demo script, architecture notes, limitations, and assessment preparation

Build changes in reviewable commits. Do not mark workflows verified until they have actually been exercised.
