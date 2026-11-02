import { strict as assert } from "node:assert";
import { test } from "node:test";
import "fake-indexeddb/auto";
import { seedData, type WorkspaceData } from "../app/lib/model";
import {
  markActivity,
  unreadActivityCount,
} from "../app/lib/notification-rules";
import { createSaveQueue } from "../app/lib/save-queue";
import {
  createLoadController,
  createWorkspaceService,
  demoScenario,
  WorkspaceServiceError,
  type WorkspaceRepository,
} from "../app/lib/workspace-service";
import { parseWorkspace } from "../app/lib/workspace-rules";
import { loadWorkspace, saveWorkspace } from "../app/lib/storage";

const instant = async () => {};
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
function fakeRepository() {
  let stored = seedData();
  const calls = { loads: 0, saves: 0 };
  const repository: WorkspaceRepository = {
    load: async () => {
      calls.loads++;
      return stored;
    },
    save: async (next) => {
      calls.saves++;
      stored = structuredClone(next);
    },
  };
  return { repository, calls, read: () => structuredClone(stored) };
}

test("mock service uses controlled latency and immutable load/save snapshots", async () => {
  const repo = fakeRepository(),
    delays: number[] = [];
  const service = createWorkspaceService(repo.repository, {
    latencyMs: 420,
    wait: async (ms) => {
      delays.push(ms);
    },
  });
  const loaded = await service.load();
  loaded.projects[0].name = "Edited in this tab";
  assert.notEqual(repo.read().projects[0].name, loaded.projects[0].name);
  await service.save(loaded);
  assert.equal(repo.read().projects[0].name, loaded.projects[0].name);
  assert.deepEqual(delays, [420, 420]);
  service.setLatency(0);
  await service.load();
  assert.equal(delays.at(-1), 0);
  assert.throws(() => service.setLatency(-1), /0 and 5000/);
  assert.throws(
    () => createWorkspaceService(repo.repository, { latencyMs: Infinity }),
    /0 and 5000/,
  );
});

test("a shared initial load consumes one simulated failure, and explicit retry succeeds", async () => {
  const repo = fakeRepository();
  const service = createWorkspaceService(repo.repository, {
    scenario: "load-error",
    wait: instant,
  });
  const loads = createLoadController(() => service.load());
  const first = loads.get();
  assert.equal(loads.get(), first);
  await assert.rejects(
    first,
    (error) =>
      error instanceof WorkspaceServiceError && error.code === "UNAVAILABLE",
  );
  assert.equal(repo.calls.loads, 0);
  const retry = loads.get(true);
  assert.notEqual(retry, first);
  assert.deepEqual(await retry, repo.read());
  assert.equal(repo.calls.loads, 1);
  assert.equal(loads.get(), retry);
});

test("one-shot save failure preserves durable data and retries the complete working snapshot", async () => {
  const repo = fakeRepository(),
    original = repo.read();
  const service = createWorkspaceService(repo.repository, {
    scenario: "save-error",
    wait: instant,
  });
  const working = structuredClone(original);
  working.tasks[0].title = "Important unsaved edit";
  working.preferences.theme = "dark";
  working.activity.unshift({
    id: "edit",
    text: "Edited a task",
    date: new Date().toISOString(),
    readAt: null,
  });
  await assert.rejects(
    service.save(working),
    (error) =>
      error instanceof WorkspaceServiceError && error.code === "UNAVAILABLE",
  );
  assert.deepEqual(repo.read(), original);
  assert.equal(repo.calls.saves, 0);
  assert.equal(working.tasks[0].title, "Important unsaved edit");
  await service.save(working);
  assert.deepEqual(repo.read(), working);
  assert.equal(
    repo.read().activity.filter((event) => event.id === "edit").length,
    1,
  );
});

test("validation failures do not consume a simulated save failure or reach storage", async () => {
  const repo = fakeRepository();
  let waits = 0;
  const service = createWorkspaceService(repo.repository, {
    scenario: "save-error",
    wait: async () => {
      waits++;
    },
  });
  const invalid = repo.read();
  invalid.tasks[0].dependencies = ["missing"];
  await assert.rejects(
    service.save(invalid),
    (error) =>
      error instanceof WorkspaceServiceError && error.code === "VALIDATION",
  );
  assert.equal(waits, 0);
  assert.equal(repo.calls.saves, 0);
  await assert.rejects(
    service.save(repo.read()),
    (error) =>
      error instanceof WorkspaceServiceError && error.code === "UNAVAILABLE",
  );
  await service.save(repo.read());
  assert.equal(repo.calls.saves, 1);
});

test("service distinguishes invalid loaded data from storage access failures", async () => {
  const invalid = createWorkspaceService(
    { load: async () => ({ schemaVersion: 99 }), save: async () => {} },
    { wait: instant },
  );
  await assert.rejects(
    invalid.load(),
    (error) =>
      error instanceof WorkspaceServiceError && error.code === "VALIDATION",
  );
  const unavailable = createWorkspaceService(
    {
      load: async () => {
        throw new Error("Database access denied");
      },
      save: async () => {},
    },
    { wait: instant },
  );
  await assert.rejects(
    unavailable.load(),
    (error) =>
      error instanceof WorkspaceServiceError &&
      error.code === "STORAGE" &&
      error.message === "Database access denied",
  );
});

test("saving captures data before latency so later mutations cannot change the in-flight write", async () => {
  const repo = fakeRepository();
  let release = () => {};
  const service = createWorkspaceService(repo.repository, {
    wait: () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  });
  const data = repo.read();
  data.tasks[0].title = "Snapshot at submission";
  const request = service.save(data);
  data.tasks[0].title = "Changed while waiting";
  release();
  await request;
  assert.equal(repo.read().tasks[0].title, "Snapshot at submission");
});

test("save queue serializes writes and coalesces pending edits to the newest immutable snapshot", async () => {
  const starts: string[] = [],
    releases: (() => void)[] = [];
  let saved = "";
  const queue = createSaveQueue<{ title: string }>(async (snapshot) => {
    starts.push(snapshot.title);
    await new Promise<void>((resolve) => releases.push(resolve));
    saved = snapshot.title;
  });
  queue.enqueue({ title: "First" });
  queue.enqueue({ title: "Intermediate" });
  const latest = { title: "Latest" };
  queue.enqueue(latest);
  latest.title = "External mutation";
  assert.deepEqual(starts, ["First"]);
  const flushed = queue.flush();
  releases.shift()!();
  await tick();
  assert.deepEqual(starts, ["First", "Latest"]);
  assert.equal(queue.getState().status, "saving");
  releases.shift()!();
  const result = await flushed;
  assert.equal(saved, "Latest");
  assert.equal(result.status, "idle");
  assert.equal(result.requestedRevision, 3);
  assert.equal(result.savedRevision, 3);
});

test("an older failed write cannot leave a stale error after a newer successful save", async () => {
  let release = () => {},
    attempts = 0,
    saved = "";
  const errors: string[] = [];
  const queue = createSaveQueue<string>(
    async (snapshot) => {
      attempts++;
      if (attempts === 1) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        throw new Error("Older failure");
      }
      saved = snapshot;
    },
    (state) => {
      if (state.error) errors.push(state.error);
    },
  );
  queue.enqueue("Older");
  queue.enqueue("Newer");
  release();
  const result = await queue.flush();
  assert.equal(saved, "Newer");
  assert.equal(result.status, "idle");
  assert.equal(result.error, null);
  assert.deepEqual(errors, []);
});

test("read-state save failure remains retryable without generating extra activity", async () => {
  const repo = fakeRepository(),
    original = repo.read();
  const working = markActivity(
    original,
    original.activity.map((event) => event.id),
    true,
    "2026-11-02T12:00:00Z",
  );
  const service = createWorkspaceService(repo.repository, {
    scenario: "save-error",
    wait: instant,
  });
  const queue = createSaveQueue<WorkspaceData>((data) => service.save(data));
  queue.enqueue(working);
  assert.equal((await queue.flush()).status, "error");
  assert.equal(unreadActivityCount(repo.read()), original.activity.length);
  assert.equal(unreadActivityCount(working), 0);
  queue.enqueue(working);
  const result = await queue.flush();
  assert.equal(result.status, "idle");
  assert.equal(unreadActivityCount(repo.read()), 0);
  assert.equal(repo.read().activity.length, original.activity.length);
});

test("marking read and unread is idempotent and preserves update IDs, dates, and order", () => {
  const data = seedData(),
    now = "2026-11-02T12:00:00Z";
  const next = markActivity(data, [data.activity[0].id], true, now);
  assert.equal(unreadActivityCount(next), data.activity.length - 1);
  assert.equal(next.activity[0].readAt, now);
  assert.deepEqual(
    next.activity.map(({ readAt, ...event }) => event),
    data.activity.map(({ readAt, ...event }) => event),
  );
  assert.equal(
    markActivity(next, [data.activity[0].id], true, "2026-11-03T12:00:00Z"),
    next,
  );
  assert.equal(markActivity(next, ["no-longer-retained"], true), next);
  assert.equal(
    markActivity(next, [data.activity[0].id], false).activity[0].readAt,
    null,
  );
  assert.throws(() => markActivity(next, [], true, "invalid"), /timestamp/);
});

test("bulk marking a captured list leaves newly arrived updates unread", () => {
  const data = seedData(),
    ids = data.activity.map((event) => event.id);
  const arrived = {
    ...data,
    activity: [
      {
        id: "new",
        text: "A new update",
        date: new Date().toISOString(),
        readAt: null,
      },
      ...data.activity,
    ],
  };
  const next = markActivity(arrived, ids, true);
  assert.equal(unreadActivityCount(next), 1);
  assert.equal(next.activity[0].readAt, null);
});

test("version 4 migration retains all workspace content and initializes unread state", () => {
  const data = seedData();
  const legacy = {
    ...data,
    schemaVersion: 4,
    activity: data.activity.map(({ readAt, ...event }) => event),
  };
  const migrated = parseWorkspace(legacy);
  assert.equal(migrated.schemaVersion, 5);
  assert.equal(unreadActivityCount(migrated), data.activity.length);
  assert.deepEqual(migrated.projects, data.projects);
  assert.deepEqual(migrated.tasks, data.tasks);
  assert.deepEqual(migrated.sprints, data.sprints);
  assert.deepEqual(migrated.preferences, data.preferences);
  const invalid = structuredClone(migrated);
  invalid.activity[0].readAt = "not a timestamp";
  assert.throws(() => parseWorkspace(invalid), /timestamp/);
});

test("development scenarios are ignored in production and slow requests use the expected delay", async () => {
  for (const value of ["slow", "load-error", "save-error"])
    assert.equal(demoScenario(`?demo=${value}`, false), "normal");
  assert.equal(demoScenario("?demo=load-error", true), "load-error");
  assert.equal(demoScenario("?demo=unknown", true), "normal");
  const delays: number[] = [];
  const repo = fakeRepository();
  await createWorkspaceService(repo.repository, {
    scenario: "slow",
    wait: async (ms) => {
      delays.push(ms);
    },
  }).load();
  assert.deepEqual(delays, [1500]);
});

test("notification read state survives IndexedDB reload and failed service saves preserve durable data", async () => {
  const data = seedData();
  await saveWorkspace(data);
  const working = markActivity(
    data,
    [data.activity[0].id],
    true,
    "2026-11-02T12:00:00Z",
  );
  const service = createWorkspaceService(undefined, {
    scenario: "save-error",
    latencyMs: 0,
    wait: instant,
  });
  await assert.rejects(service.save(working), /retry saving/);
  assert.deepEqual(await loadWorkspace(), data);
  await service.save(working);
  assert.deepEqual(await loadWorkspace(), working);
});
