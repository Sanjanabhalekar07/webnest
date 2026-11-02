import { strict as assert } from "node:assert";
import { test } from "node:test";
import "fake-indexeddb/auto";
import {
  defaultAssignee,
  seedData,
  type WorkspaceData,
} from "../app/lib/model";
import { changeProjectMembers } from "../app/lib/project-rules";
import { timelineBars, timelineLinks } from "../app/lib/timeline-rules";
import {
  parseWorkspace,
  saveTask,
  validateWorkspace,
} from "../app/lib/workspace-rules";
import { completeSprint, startSprint } from "../app/lib/sprint-rules";
import { loadWorkspace, saveWorkspace } from "../app/lib/storage";

function sample(): WorkspaceData {
  const data = seedData();
  data.tasks = data.tasks.slice(0, 3);
  return data;
}

test("task schedules accept inclusive single-day spans and reject reversed or invalid dates", () => {
  const data = sample(),
    task = data.tasks[0];
  assert.doesNotThrow(() =>
    saveTask(data, { ...task, startDate: "2026-11-02", dueDate: "2026-11-02" }),
  );
  assert.doesNotThrow(() =>
    saveTask(data, { ...task, startDate: "2026-11-02", dueDate: "2026-11-10" }),
  );
  assert.throws(
    () =>
      saveTask(data, {
        ...task,
        startDate: "2026-11-03",
        dueDate: "2026-11-02",
      }),
    /start date/,
  );
  assert.throws(
    () =>
      saveTask(data, {
        ...task,
        startDate: "2026-02-30",
        dueDate: "2026-03-01",
      }),
    /start date/,
  );
});

test("Gantt geometry clips inclusive date ranges and identifies tasks outside the window", () => {
  const data = sample();
  data.tasks[0] = {
    ...data.tasks[0],
    startDate: "2026-11-01",
    dueDate: "2026-11-03",
  };
  data.tasks[1] = {
    ...data.tasks[1],
    startDate: "2026-11-07",
    dueDate: "2026-11-10",
  };
  data.tasks[2] = {
    ...data.tasks[2],
    startDate: "2026-11-20",
    dueDate: "2026-11-20",
  };
  const bars = timelineBars(data.tasks, "2026-11-02", 7, 20);
  assert.deepEqual(
    bars.map(({ x, width, visible, clippedStart, clippedEnd }) => ({
      x,
      width,
      visible,
      clippedStart,
      clippedEnd,
    })),
    [
      { x: 0, width: 40, visible: true, clippedStart: true, clippedEnd: false },
      {
        x: 100,
        width: 40,
        visible: true,
        clippedStart: false,
        clippedEnd: true,
      },
      {
        x: 140,
        width: 0,
        visible: false,
        clippedStart: false,
        clippedEnd: true,
      },
    ],
  );
  const oneDay = timelineBars(
    [{ ...data.tasks[0], startDate: "2026-11-04", dueDate: "2026-11-04" }],
    "2026-11-02",
    7,
    20,
  )[0];
  assert.equal(oneDay.x, 40);
  assert.equal(oneDay.width, 20);
  assert.throws(
    () => timelineBars(data.tasks, "2026-11-02", 1000, 20),
    /1–366/,
  );
  assert.throws(
    () => timelineBars(data.tasks, "invalid", 7, 20),
    /valid timeline/,
  );
});

test("dependency links retain hidden prerequisites and flag overlapping inclusive dates", () => {
  const data = sample(),
    [task, prerequisite] = data.tasks;
  task.startDate = "2026-11-04";
  task.dependencies = [prerequisite.id];
  prerequisite.dueDate = "2026-11-03";
  const hidden = timelineLinks([task], data.tasks)[0];
  assert.equal(hidden.from, prerequisite.id);
  assert.equal(hidden.to, task.id);
  assert.equal(hidden.hiddenByFilter, true);
  assert.equal(hidden.overlap, false);
  prerequisite.dueDate = "2026-11-04";
  const visible = timelineLinks([task, prerequisite], data.tasks)[0];
  assert.equal(visible.hiddenByFilter, false);
  assert.equal(visible.overlap, true);
});

test("projects require at least one owner and unique, valid member roles", () => {
  const data = sample();
  data.projects[0].members = data.projects[0].members.map((member) => ({
    ...member,
    role: "Member",
  }));
  assert.throws(() => validateWorkspace(data), /at least one Owner/);
  const duplicate = sample();
  duplicate.projects[0].members.push({ ...duplicate.projects[0].members[0] });
  assert.throws(() => validateWorkspace(duplicate), /unique names/);
  const invalid = sample() as unknown as {
    projects: { members: { role: string }[] }[];
  };
  invalid.projects[0].members[0].role = "Administrator";
  assert.throws(() => parseWorkspace(invalid), /unsupported option/);
});

test("removing an assignee requires explicit reassignment and preserves all tasks", () => {
  const data = sample(),
    original = structuredClone(data);
  const roster = data.projects[0].members
    .filter((member) => member.name !== "Alex Morgan")
    .map((member) => ({
      ...member,
      role: member.name === "Jamie Chen" ? ("Owner" as const) : member.role,
    }));
  assert.throws(
    () => changeProjectMembers(data, "website", roster),
    /take Alex Morgan's tasks/,
  );
  const next = changeProjectMembers(data, "website", roster, {
    "Alex Morgan": "Jamie Chen",
  });
  assert.equal(next.tasks.length, data.tasks.length);
  assert.equal(next.tasks[0].assignee, "Jamie Chen");
  assert.equal(defaultAssignee(next.projects[0]), "Jamie Chen");
  assert.deepEqual(data, original);
  validateWorkspace(next);
});

test("viewers cannot receive tasks, while new project members become eligible", () => {
  const data = sample();
  const roster = data.projects[0].members.map((member) =>
    member.name === "Sam Wilson"
      ? { ...member, role: "Viewer" as const }
      : member,
  );
  assert.throws(
    () => changeProjectMembers(data, "website", roster),
    /take Sam Wilson's tasks/,
  );
  const next = changeProjectMembers(
    data,
    "website",
    [...roster, { name: "Riley Patel", role: "Member" }],
    { "Sam Wilson": "Riley Patel" },
  );
  assert.equal(next.tasks[2].assignee, "Riley Patel");
  assert.throws(
    () => saveTask(next, { ...next.tasks[0], assignee: "Sam Wilson" }),
    /Owner or Member/,
  );
  assert.throws(
    () => saveTask(next, { ...next.tasks[0], assignee: "Not in this project" }),
    /Owner or Member/,
  );
  assert.doesNotThrow(() =>
    saveTask(next, { ...next.tasks[0], assignee: "Riley Patel" }),
  );
});

test("version 3 migration retains assignees and frozen sprint reports while adding safe schedules", () => {
  let data = sample();
  data.tasks[0].assignee = "Morgan Guest";
  data.tasks[0].status = "Done";
  data.projects[0].members.push({ name: "Morgan Guest", role: "Member" });
  const sprint = data.sprints[0],
    now = new Date().toISOString();
  data = completeSprint(startSprint(data, sprint.id, now), sprint.id, now);
  const legacy = {
    ...data,
    schemaVersion: 3,
    projects: data.projects.map(({ members, ...project }) => project),
    tasks: data.tasks.map(({ startDate, ...task }) => task),
  };
  const migrated = parseWorkspace(legacy);
  assert.equal(migrated.schemaVersion, 4);
  assert.ok(migrated.tasks.every((task) => task.startDate === task.dueDate));
  assert.equal(migrated.tasks[0].assignee, "Morgan Guest");
  assert.ok(
    migrated.projects[0].members.some(
      (member) => member.name === "Morgan Guest" && member.role === "Member",
    ),
  );
  assert.deepEqual(migrated.sprints, data.sprints);
  const frozen = structuredClone(migrated.sprints[0]);
  const roster = migrated.projects[0].members.filter(
    (member) => member.name !== "Morgan Guest",
  );
  const reassigned = changeProjectMembers(migrated, "website", roster, {
    "Morgan Guest": "Alex Morgan",
  });
  assert.equal(reassigned.tasks[0].assignee, "Alex Morgan");
  assert.deepEqual(reassigned.sprints[0], frozen);
});

test("dates and member roles survive persistence, and invalid assignments cannot overwrite saved data", async () => {
  await loadWorkspace();
  const data = sample();
  data.projects[0].members.push({ name: "Riley Patel", role: "Member" });
  data.tasks[0] = {
    ...data.tasks[0],
    assignee: "Riley Patel",
    startDate: "2026-11-02",
    dueDate: "2026-11-10",
  };
  await saveWorkspace(data);
  assert.deepEqual(await loadWorkspace(), data);
  const invalid = structuredClone(data);
  invalid.projects[0].members.find(
    (member) => member.name === "Riley Patel",
  )!.role = "Viewer";
  await assert.rejects(saveWorkspace(invalid), /Owner or Member/);
  assert.deepEqual(await loadWorkspace(), data);
});
