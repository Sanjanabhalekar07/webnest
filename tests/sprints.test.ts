import { strict as assert } from "node:assert";
import { test } from "node:test";
import "fake-indexeddb/auto";
import {
  seedData,
  type SprintDraft,
  type WorkspaceData,
} from "../app/lib/model";
import { addDays } from "../app/lib/date-utils";
import {
  assignToSprint,
  completeSprint,
  deleteSprint,
  recordActiveSprints,
  saveSprint,
  startSprint,
} from "../app/lib/sprint-rules";
import {
  parseWorkspace,
  removeTasks,
  saveTask,
  validateWorkspace,
} from "../app/lib/workspace-rules";
import { loadWorkspace, saveWorkspace } from "../app/lib/storage";

const day1 = "2026-11-02T12:00:00Z",
  day2 = "2026-11-03T12:00:00Z",
  day3 = "2026-11-04T12:00:00Z";
function draft(id = "sprint", projectId = "website"): SprintDraft {
  return {
    id,
    projectId,
    name: "Sprint 01",
    goal: "Ship the next useful thing",
    startDate: "2026-11-02",
    endDate: "2026-11-15",
  };
}
function fixture(): WorkspaceData {
  const data = seedData();
  data.sprints = [];
  data.tasks = data.tasks
    .slice(0, 3)
    .map((task) => ({ ...task, sprint: "Backlog", status: "To do" }));
  return data;
}
function planned() {
  const data = fixture();
  return assignToSprint(
    saveSprint(data, draft()),
    data.tasks.slice(0, 2).map((task) => task.id),
    "sprint",
  );
}

test("validates sprint dates, per-project names, and active sprint editing", () => {
  const data = saveSprint(fixture(), draft());
  assert.throws(
    () => saveSprint(data, { ...draft("other"), name: "sprint 01" }),
    /unique name/,
  );
  assert.throws(
    () => saveSprint(data, { ...draft(), endDate: "2026-11-02" }),
    /end dates/,
  );
  assert.throws(
    () => saveSprint(data, { ...draft(), endDate: addDays("2026-11-02", 91) }),
    /90 days/,
  );
  assert.throws(
    () => saveSprint(data, { ...draft(), startDate: "2026-02-30" }),
    /end dates/,
  );
  const active = startSprint(planned(), "sprint", day1);
  assert.throws(
    () => saveSprint(active, { ...draft(), endDate: "2026-11-16" }),
    /fixed/,
  );
  const renamed = saveSprint(active, { ...draft(), name: "Delivery sprint" });
  assert.equal(renamed.sprints[0].name, "Delivery sprint");
  assert.deepEqual(renamed.sprints[0].snapshots, active.sprints[0].snapshots);
});

test("starting requires assigned tasks, current scheduled dates, and an active project", () => {
  assert.throws(
    () => startSprint(saveSprint(fixture(), draft()), "sprint", day1),
    /at least one task/,
  );
  assert.throws(
    () => startSprint(planned(), "sprint", "2026-11-01T12:00:00Z"),
    /date range/,
  );
  assert.throws(
    () => startSprint(planned(), "sprint", "2026-11-16T12:00:00Z"),
    /date range/,
  );
  const archived = planned();
  archived.projects[0].archived = true;
  assert.throws(() => startSprint(archived, "sprint", day1), /Restore/);
  const active = startSprint(planned(), "sprint", day1);
  assert.equal(active.sprints[0].baselineTotal, 2);
  assert.equal(active.sprints[0].initialRemaining, 2);
  assert.deepEqual(active.sprints[0].snapshots, [
    { date: "2026-11-02", total: 2, remaining: 2 },
  ]);
  assert.throws(() => startSprint(active, "sprint", day1), /Only planned/);
});

test("a project can have one active sprint, while another project can run independently", () => {
  let data = startSprint(planned(), "sprint", day1);
  data = saveSprint(data, { ...draft("second"), name: "Sprint 02" });
  data = assignToSprint(data, [data.tasks[2].id], "second");
  assert.throws(() => startSprint(data, "second", day1), /only one active/);
  data = saveSprint(data, draft("mobile-sprint", "mobile"));
  data = {
    ...data,
    tasks: [
      ...data.tasks,
      {
        ...data.tasks[2],
        id: "MOBILE-1",
        projectId: "mobile",
        sprint: "mobile-sprint",
      },
    ],
  };
  assert.equal(
    startSprint(data, "mobile-sprint", day1).sprints.filter(
      (sprint) => sprint.state === "active",
    ).length,
    2,
  );
});

test("sprint assignment rejects missing tasks, other projects, and closed sprints", () => {
  const data = planned();
  assert.throws(
    () => assignToSprint(data, ["missing"], "sprint"),
    /existing tasks/,
  );
  const foreign = {
    ...data,
    tasks: [
      ...data.tasks,
      { ...data.tasks[2], id: "other", projectId: "mobile" },
    ],
  };
  assert.throws(
    () => assignToSprint(foreign, ["other"], "sprint"),
    /same project/,
  );
  const closed = completeSprint(
    startSprint(data, "sprint", day1),
    "sprint",
    day2,
  );
  assert.throws(
    () => assignToSprint(closed, [closed.tasks[0].id], "sprint"),
    /cannot receive/,
  );
  assert.throws(
    () => saveTask(closed, { ...closed.tasks[2], sprint: "sprint" }),
    /cannot receive/,
  );
});

test("daily snapshots replace today's measurement, preserve earlier days, and track scope changes", () => {
  let data = startSprint(planned(), "sprint", day1);
  data = saveTask(data, { ...data.tasks[0], status: "Done" });
  data = recordActiveSprints(data, day1);
  assert.deepEqual(data.sprints[0].snapshots, [
    { date: "2026-11-02", total: 2, remaining: 1 },
  ]);
  assert.equal(recordActiveSprints(data, day1), data);
  data = recordActiveSprints(
    assignToSprint(data, [data.tasks[2].id], "sprint"),
    day3,
  );
  assert.deepEqual(data.sprints[0].snapshots, [
    { date: "2026-11-02", total: 2, remaining: 1 },
    { date: "2026-11-04", total: 3, remaining: 2 },
  ]);
  assert.equal(data.sprints[0].baselineTotal, 2);
  assert.equal(recordActiveSprints(data, day2), data);
  assert.equal(
    data.sprints[0].snapshots.some((point) => point.date === "2026-11-03"),
    false,
  );
});

test("completion preserves the final report and returns only unfinished work to the backlog", () => {
  let data = startSprint(planned(), "sprint", day1);
  data = saveTask(data, { ...data.tasks[0], status: "Done" });
  const closed = completeSprint(data, "sprint", day2);
  const sprint = closed.sprints[0];
  assert.equal(sprint.state, "completed");
  assert.deepEqual(sprint.snapshots.at(-1), {
    date: "2026-11-03",
    total: 2,
    remaining: 1,
  });
  assert.equal(sprint.closedTasks.length, 2);
  assert.equal(closed.tasks[0].sprint, "sprint");
  assert.equal(closed.tasks[1].sprint, "Backlog");
  assert.throws(
    () => saveTask(closed, { ...closed.tasks[0], status: "To do" }),
    /before reopening/,
  );
  const reopened = saveTask(closed, {
    ...closed.tasks[0],
    status: "To do",
    sprint: "Backlog",
  });
  const edited = saveTask(reopened, {
    ...reopened.tasks[0],
    title: "A later title",
  });
  assert.deepEqual(
    recordActiveSprints(removeTasks(edited, [edited.tasks[0].id]), day3)
      .sprints[0],
    sprint,
  );
  assert.throws(() => saveSprint(closed, draft()), /read only/);
  assert.throws(() => completeSprint(closed, "sprint", day3), /Only active/);
});

test("only planned sprints can be deleted, and their tasks are preserved in the backlog", () => {
  const data = planned(),
    deleted = deleteSprint(data, "sprint");
  assert.equal(deleted.sprints.length, 0);
  assert.equal(deleted.tasks.length, data.tasks.length);
  assert.ok(deleted.tasks.every((task) => task.sprint === "Backlog"));
  assert.throws(
    () => deleteSprint(startSprint(data, "sprint", day1), "sprint"),
    /Only planned/,
  );
});

test("version 2 sprint labels become separate planned project sprints without fabricated history", () => {
  const data = fixture();
  data.tasks[0].sprint = "Sprint 01";
  data.tasks[1].sprint = "Sprint 01";
  data.tasks[2].projectId = "mobile";
  data.tasks[2].sprint = "Sprint 01";
  data.tasks[0].attachments = [
    {
      id: "file",
      name: "brief.pdf",
      size: 100,
      type: "application/pdf",
      date: day1,
    },
  ];
  data.tasks[0].dependencies = [data.tasks[1].id];
  data.preferences.theme = "dark";
  const migrated = parseWorkspace({
    ...data,
    schemaVersion: 2,
    sprints: undefined,
  });
  assert.equal(migrated.schemaVersion, 5);
  assert.equal(migrated.sprints.length, 2);
  assert.equal(migrated.tasks[0].sprint, migrated.tasks[1].sprint);
  assert.notEqual(migrated.tasks[0].sprint, migrated.tasks[2].sprint);
  assert.ok(
    migrated.sprints.every(
      (sprint) => sprint.state === "planned" && sprint.snapshots.length === 0,
    ),
  );
  assert.deepEqual(migrated.tasks[0].attachments, data.tasks[0].attachments);
  assert.deepEqual(migrated.tasks[0].dependencies, data.tasks[0].dependencies);
  assert.equal(migrated.preferences.theme, "dark");
  assert.deepEqual(
    migrated.tasks.map((task) => task.id),
    data.tasks.map((task) => task.id),
  );
});

test("corrupt sprint snapshots and invalid completed memberships are rejected", () => {
  const data = startSprint(planned(), "sprint", day1);
  const invalid = structuredClone(data);
  invalid.sprints[0].snapshots[0].remaining = 3;
  assert.throws(() => parseWorkspace(invalid), /task counts/);
  const duplicate = structuredClone(data);
  duplicate.sprints[0].snapshots.push({ ...duplicate.sprints[0].snapshots[0] });
  assert.throws(() => validateWorkspace(duplicate), /unique ordered/);
  const closed = completeSprint(data, "sprint", day2);
  closed.sprints[0].closedTasks.pop();
  assert.throws(() => parseWorkspace(closed), /final snapshot/);
});

test("closed sprint history and task assignments survive IndexedDB round trips", async () => {
  const closed = completeSprint(
    startSprint(planned(), "sprint", day1),
    "sprint",
    day2,
  );
  await loadWorkspace();
  await saveWorkspace(closed);
  assert.deepEqual(await loadWorkspace(), closed);
});
