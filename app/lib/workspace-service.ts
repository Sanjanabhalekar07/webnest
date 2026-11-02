import type { WorkspaceData } from "./model";
import { parseWorkspace } from "./workspace-rules";
import { loadWorkspace, saveWorkspace } from "./storage";

export type DemoScenario = "normal" | "slow" | "load-error" | "save-error";
type Operation = "load" | "save";
export type WorkspaceRepository = {
  load: () => Promise<unknown>;
  save: (data: WorkspaceData) => Promise<void>;
};
export class WorkspaceServiceError extends Error {
  constructor(
    public readonly code: "UNAVAILABLE" | "VALIDATION" | "STORAGE",
    message: string,
  ) {
    super(message);
    this.name = "WorkspaceServiceError";
  }
}
export function demoScenario(
  search: string,
  development: boolean,
): DemoScenario {
  const value = development ? new URLSearchParams(search).get("demo") : null;
  return value === "slow" || value === "load-error" || value === "save-error"
    ? value
    : "normal";
}

export function createWorkspaceService(
  repository: WorkspaceRepository = {
    load: loadWorkspace,
    save: saveWorkspace,
  },
  options: {
    latencyMs?: number;
    scenario?: DemoScenario;
    wait?: (ms: number) => Promise<void>;
  } = {},
) {
  let latency = options.scenario === "slow" ? 1500 : (options.latencyMs ?? 350);
  const failures = {
    load: options.scenario === "load-error" ? 1 : 0,
    save: options.scenario === "save-error" ? 1 : 0,
  };
  const wait =
    options.wait ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  function validateLatency(ms: number) {
    if (!Number.isFinite(ms) || ms < 0 || ms > 5000)
      throw new Error("Mock latency must be between 0 and 5000 ms.");
  }
  validateLatency(latency);
  async function request<T>(
    operation: Operation,
    execute: () => Promise<T>,
  ): Promise<T> {
    const fail = failures[operation] > 0;
    if (fail) failures[operation]--;
    await wait(latency);
    if (fail)
      throw new WorkspaceServiceError(
        "UNAVAILABLE",
        operation === "load"
          ? "The workspace service is temporarily unavailable. Please try again."
          : "Changes could not be saved right now. Please retry saving.",
      );
    try {
      return await execute();
    } catch (reason) {
      if (reason instanceof WorkspaceServiceError) throw reason;
      throw new WorkspaceServiceError(
        "STORAGE",
        reason instanceof Error
          ? reason.message
          : "The local workspace could not be accessed.",
      );
    }
  }
  function validated(data: unknown) {
    try {
      return parseWorkspace(data);
    } catch (reason) {
      throw new WorkspaceServiceError(
        "VALIDATION",
        reason instanceof Error
          ? reason.message
          : "Workspace validation failed.",
      );
    }
  }
  return {
    load: () =>
      request("load", async () =>
        structuredClone(validated(await repository.load())),
      ),
    async save(data: WorkspaceData) {
      const snapshot = structuredClone(validated(data));
      await request("save", () => repository.save(snapshot));
    },
    failNext(operation: Operation) {
      failures[operation]++;
    },
    setLatency(ms: number) {
      validateLatency(ms);
      latency = ms;
    },
  };
}
export type WorkspaceService = ReturnType<typeof createWorkspaceService>;

// Strict Mode may run the initial effect twice; both subscribers share one attempt.
export function createLoadController<T>(load: () => Promise<T>) {
  let request: Promise<T> | null = null;
  return {
    get(fresh = false) {
      if (!request || fresh) request = load();
      return request;
    },
  };
}
