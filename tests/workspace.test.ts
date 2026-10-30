import { strict as assert } from "node:assert";
import { test } from "node:test";
import "fake-indexeddb/auto";
import {
  defaultTaskView,
  seedData,
  type WorkspaceData,
} from "../app/lib/model";
import {
  changeWorkflow,
  parseWorkspace,
  removeTasks,
  saveTask,
  selectTasks,
  validateAttachment,
  validateWorkspace,
} from "../app/lib/workspace-rules";
import { loadWorkspace, saveWorkspace } from "../app/lib/storage";

function sample(): WorkspaceData {
  const data = seedData();
  data.tasks = data.tasks
    .slice(0, 3)
    .map((task) => ({ ...task, status: "To do" }));
  return data;
}
test("migrates the original workspace without losing task IDs, comments, or project data", () => {
  const data = sample();
  data.tasks[0].comments.push({
    id: "comment",
    text: "Keep this note",
    date: new Date().toISOString(),
  });
  const { schemaVersion, columns, preferences, ...legacy } = data;
  void schemaVersion;
  void columns;
  void preferences;
  const migrated = parseWorkspace(legacy);
  assert.equal(migrated.schemaVersion, 2);
  assert.deepEqual(migrated.projects, data.projects);
  assert.deepEqual(migrated.tasks, data.tasks);
  assert.deepEqual(migrated.preferences, { theme: "light", views: {} });
});
test("rejects direct, indirect, and mixed subtask/dependency cycles", () => {
  const data = sample();
  const [a, b, c] = data.tasks;
  a.dependencies = [b.id];
  b.dependencies = [a.id];
  assert.throws(() => validateWorkspace(data), /cycle/);
  b.dependencies = [c.id];
  c.dependencies = [a.id];
  assert.throws(() => validateWorkspace(data), /cycle/);
  a.dependencies = [];
  b.dependencies = [a.id];
  c.dependencies = [];
  b.parentId = a.id;
  assert.throws(() => validateWorkspace(data), /cycle/);
});
test("rejects missing, self, and cross-project relationships", () => {
  const data = sample();
  const [a, b] = data.tasks;
  for (const id of [a.id, "missing"]) {
    a.dependencies = [id];
    assert.throws(() => validateWorkspace(data), /same project/);
  }
  a.dependencies = [b.id];
  b.projectId = "mobile";
  assert.throws(() => validateWorkspace(data), /same project/);
});
test("blocks completion until prerequisites and subtasks are done, and protects reopening", () => {
  const data = sample();
  const [a, b, c] = data.tasks;
  a.dependencies = [b.id];
  c.parentId = a.id;
  assert.throws(() => saveTask(data, { ...a, status: "Done" }), /Finish/);
  b.status = "Done";
  assert.throws(() => saveTask(data, { ...a, status: "Done" }), /Finish/);
  c.status = "Done";
  const completed = saveTask(data, { ...a, status: "Done" });
  assert.equal(completed.tasks[0].status, "Done");
  assert.throws(() => saveTask(completed, { ...b, status: "To do" }), /Reopen/);
});
test("deleting a parent preserves its children and removes incoming dependencies", () => {
  const data = sample();
  const [a, b, c] = data.tasks;
  b.parentId = a.id;
  c.dependencies = [a.id];
  const next = removeTasks(data, [a.id]);
  assert.equal(next.tasks.length, 2);
  assert.equal(next.tasks[0].parentId, null);
  assert.deepEqual(next.tasks[1].dependencies, []);
  validateWorkspace(next);
});
test("renames and removes columns with explicit task and filter migration", () => {
  const data = sample();
  data.preferences.views.project = { ...defaultTaskView, status: "To do" };
  const renamed = changeWorkflow(
    data,
    ["Backlog", "Ready", "In progress", "In review", "Done"],
    { "To do": "Ready" },
  );
  assert.ok(renamed.tasks.every((task) => task.status === "Ready"));
  assert.equal(renamed.preferences.views.project.status, "Ready");
  assert.equal(data.tasks[0].status, "To do");
  assert.throws(
    () => changeWorkflow(renamed, ["Backlog", "Done"]),
    /missing project or workflow/,
  );
  const removed = changeWorkflow(renamed, ["Backlog", "Done"], {
    Ready: "Backlog",
  });
  assert.ok(removed.tasks.every((task) => task.status === "Backlog"));
  assert.throws(
    () => changeWorkflow(data, ["Backlog", "To do"]),
    /including Done/,
  );
  assert.throws(
    () => changeWorkflow(data, ["Backlog", "Done"], { Done: "Backlog" }),
    /completion column/,
  );
});
test("validates attachment size, file extension, MIME type, and per-task count", () => {
  assert.doesNotThrow(() =>
    validateAttachment({
      name: "brief.PDF",
      size: 100,
      type: "application/pdf",
    }),
  );
  assert.throws(
    () => validateAttachment({ name: "tool.exe", size: 100 }),
    /PDF/,
  );
  assert.throws(
    () => validateAttachment({ name: "brief.pdf", size: 0 }),
    /10 MB/,
  );
  assert.throws(
    () => validateAttachment({ name: "brief.pdf", size: 11 * 1024 * 1024 }),
    /10 MB/,
  );
  assert.throws(
    () =>
      validateAttachment({
        name: "image.png",
        size: 100,
        type: "application/x-msdownload",
      }),
    /type/,
  );
  const data = sample();
  data.tasks[0].attachments = Array.from({ length: 6 }, (_, index) => ({
    id: String(index),
    name: "brief.pdf",
    size: 100,
    type: "application/pdf",
    date: new Date().toISOString(),
  }));
  assert.throws(() => validateWorkspace(data), /5 attachments/);
});
test("rejects malformed dates, duplicate task IDs, and unsupported schema versions", () => {
  const data = sample();
  data.tasks[0].dueDate = "2026-02-30";
  assert.throws(() => validateWorkspace(data), /due date/);
  data.tasks[0].dueDate = "2026-02-28";
  data.tasks[1].id = data.tasks[0].id;
  assert.throws(() => validateWorkspace(data), /unique/);
  assert.throws(() => parseWorkspace({ schemaVersion: 99 }), /newer version/);
});
test("combines filters and sorts matching tasks without mutating the source", () => {
  const data = sample();
  const [a, b, c] = data.tasks;
  a.title = "Zebra";
  b.title = "Alpha";
  c.priority = "Low";
  a.dueDate = b.dueDate = "2026-01-01";
  a.labels = b.labels = "Design, Research";
  a.assignee = b.assignee = "Alex Morgan";
  const preferences = {
    ...defaultTaskView,
    project: "website",
    priority: "High",
    status: "To do",
    assignee: "Alex Morgan",
    label: "Research",
    overdue: true,
    sort: "title" as const,
  };
  assert.deepEqual(
    selectTasks(data.tasks, preferences, "2026-10-30").map(
      (task) => task.title,
    ),
    ["Alpha", "Zebra"],
  );
  assert.equal(data.tasks[0].title, "Zebra");
  assert.equal(
    selectTasks(data.tasks, { ...preferences, query: "zeb" }, "2026-10-30")
      .length,
    1,
  );
});

async function rawWrite(value: unknown) {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("orbit-workspace", 1);
    request.onsuccess = () => {
      const db = request.result,
        tx = db.transaction("workspace", "readwrite");
      tx.objectStore("workspace").put(value, "data");
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
    request.onerror = () => reject(request.error);
  });
}
test("IndexedDB saves and reloads relationships, custom columns, attachments, and preferences", async () => {
  await loadWorkspace();
  const data = sample();
  data.tasks[0].dependencies = [data.tasks[1].id];
  data.tasks[2].parentId = data.tasks[0].id;
  data.tasks[0].attachments = [
    {
      id: "file",
      name: "brief.pdf",
      size: 100,
      type: "application/pdf",
      date: new Date().toISOString(),
    },
  ];
  data.columns.push("Waiting");
  data.tasks[0].status = "Waiting";
  data.preferences = {
    theme: "dark",
    views: {
      "my-tasks": { ...defaultTaskView, layout: "List", sort: "priority" },
    },
  };
  await saveWorkspace(data);
  assert.deepEqual(await loadWorkspace(), data);
  const invalid = structuredClone(data);
  invalid.tasks[0].dependencies = ["missing"];
  await assert.rejects(saveWorkspace(invalid), /same project/);
  assert.deepEqual(await loadWorkspace(), data);
});
test("IndexedDB migrates legacy saves and leaves unsupported data untouched", async () => {
  const { schemaVersion, columns, preferences, ...legacy } = sample();
  void schemaVersion;
  void columns;
  void preferences;
  await rawWrite(legacy);
  assert.equal((await loadWorkspace()).schemaVersion, 2);
  const raw = { schemaVersion: 99, userContent: "Do not overwrite me" };
  await rawWrite(raw);
  await assert.rejects(loadWorkspace(), /newer version/);
  await assert.rejects(loadWorkspace(), /newer version/);
});
