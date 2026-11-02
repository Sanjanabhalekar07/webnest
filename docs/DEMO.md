# WebNest review walkthrough

These are manual verification steps, not a claim that browser checks have passed. Existing user data stays in the browser. Use a dedicated demo project rather than clearing site data.

## Preparation

1. Run `npm install`, `npm test`, and `npm run dev`.
2. Open the printed local URL. Wait for **All changes saved locally** before refreshing during the walkthrough.
3. Create a project named **Review demo**. It starts with Alex Morgan as Owner. Add Jamie Chen as a Member through the project's **Members** button.

## Shared task state and relationships

1. Create two tasks with valid start/due dates: **Design review** and **Build approved design**.
2. Make the second depend on the first. Attempt to complete the second before the first: expect a validation message and unchanged status.
3. Complete the first, then the second. Check the board, list, calendar, timeline, and dashboard for the same statuses/counts.
4. Reopen the dependent task before reopening its prerequisite. Create a subtask and try a relationship cycle: expect rejection.
5. Add attachment metadata. Try an unsupported file or a file above 10 MB: expect validation without a saved attachment. File contents are never uploaded.

## Workflow, membership, and scheduling

1. Add a custom workflow column, rename it, and reorder it. Move a task using mouse, touch, keyboard, and the alternative status selector.
2. Remove a populated column after choosing a task destination. Confirm all its tasks move and the old column disappears from reports and editor options.
3. Change an assigned Member to Viewer. Choose a replacement assignee and save. Confirm the task editor and filters use the current roster.
4. Attempt to leave the project without an Owner: expect rejection.
5. Inspect the Timeline arrows, overlapping-date warnings, zoom/navigation, and schedule table. Use only keyboard controls to open a bar's task editor.

## Sprints and history

1. Create a sprint whose date range includes today. Select backlog tasks and assign them in bulk.
2. Start the sprint. Confirm the baseline and first recorded snapshot.
3. Change task status and scope. The current day's observation updates; earlier dates remain unchanged.
4. Complete the sprint with some work unfinished. Confirm unfinished tasks return to the backlog and the frozen report retains their original titles/statuses/assignees.
5. Edit or reassign one of those tasks. Confirm the closed report does not change.

## Read state and save recovery

1. Open **Activity** and note the unread badge. Mark an entry read, then unread. Mark all read and check the header/sidebar counts.
2. Wait for saving to finish and reload. Expect read state to persist without extra activity entries being generated.
3. In development, fully load `/?demo=load-error`. Expect a loading state followed by a recoverable error. Click **Try again**, without refreshing: expect the saved workspace to load. Refreshing the same URL intentionally re-arms the failure.
4. Fully load the demo project's URL with `?demo=save-error`. Make a task edit. Expect the edit to remain visible while the save fails and the banner offers **Retry save**.
5. Click **Retry save** and wait for the saved indicator. Reload without the query parameter. Expect the complete edit, activity entry, and preferences to persist with no duplicate event.
6. Fully load `/?demo=slow` to observe the 1500 ms loading/save states. Type several filter changes quickly: expect the latest values to be retained while pending saves coalesce.

Simulation query parameters only apply in development, once per mounted workspace. Production ignores them. Ordinary client navigation reuses the existing service; use a full reload to select a new scenario. There is no production backend, email, push delivery, or multi-user synchronization.

## Remaining manual checks

- Navigate and refresh every route, including a project detail URL and search.
- Check browser restart persistence after all writes finish.
- Check keyboard focus, screen-reader announcements, mobile layouts, and touch dragging.
- Test large task sets and long dependency chains; record measured performance before claiming readiness.
- Rehearse a small change, such as adding another filter or changing a validation rule, and explain the model, schema migration, tests, and shared state flow.

Automated coverage includes schema migrations, IndexedDB round trips, relationship/role rules, sprint history, date geometry, notification state, request failures, and save-queue ordering/coalescing. Browser behavior remains a separate verification step.
