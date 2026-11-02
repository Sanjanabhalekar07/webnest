export type SaveState = {
  status: "idle" | "saving" | "error";
  error: string | null;
  requestedRevision: number;
  savedRevision: number;
};

// Keep one write in flight and retain only the newest waiting snapshot.
export function createSaveQueue<T>(
  save: (snapshot: T) => Promise<void>,
  onChange: (state: SaveState) => void = () => {},
) {
  let state: SaveState = {
    status: "idle",
    error: null,
    requestedRevision: 0,
    savedRevision: 0,
  };
  let pending: { snapshot: T; revision: number } | null = null;
  let running = false;
  let waiters: ((state: SaveState) => void)[] = [];
  function emit(patch: Partial<SaveState>) {
    state = { ...state, ...patch };
    onChange({ ...state });
  }
  async function drain() {
    running = true;
    while (pending) {
      const write = pending;
      pending = null;
      try {
        await save(write.snapshot);
        emit({
          savedRevision: write.revision,
          ...(!pending ? { status: "idle" as const, error: null } : {}),
        });
      } catch (reason) {
        if (!pending)
          emit({
            status: "error",
            error:
              reason instanceof Error
                ? reason.message
                : "Changes could not be saved. Please retry.",
          });
      }
    }
    running = false;
    const completed = waiters;
    waiters = [];
    completed.forEach((resolve) => resolve({ ...state }));
  }
  return {
    enqueue(snapshot: T) {
      const copy = structuredClone(snapshot);
      const revision = state.requestedRevision + 1;
      pending = { snapshot: copy, revision };
      emit({ status: "saving", error: null, requestedRevision: revision });
      if (!running) void drain();
    },
    getState: () => ({ ...state }),
    flush(): Promise<SaveState> {
      return running
        ? new Promise((resolve) => waiters.push(resolve))
        : Promise.resolve({ ...state });
    },
  };
}
