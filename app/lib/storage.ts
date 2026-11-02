import { seedData, type WorkspaceData } from "./model";
import { parseWorkspace } from "./workspace-rules";
import { recordActiveSprints } from "./sprint-rules";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("orbit-workspace", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("workspace");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("Your workspace could not be opened."));
  });
}
export async function loadWorkspace(): Promise<WorkspaceData> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("workspace", "readwrite");
    let loaded: WorkspaceData;
    let loadError: Error | null = null;
    const request = transaction.objectStore("workspace").get("data");
    request.onsuccess = () => {
      try {
        const parsed = parseWorkspace(request.result ?? seedData());
        loaded = recordActiveSprints(parsed);
        if (
          !request.result ||
          request.result.schemaVersion !== 3 ||
          loaded !== parsed
        )
          transaction.objectStore("workspace").put(loaded, "data");
      } catch (reason) {
        loadError =
          reason instanceof Error
            ? reason
            : new Error("Invalid workspace data.");
        transaction.abort();
      }
    };
    request.onerror = () =>
      reject(new Error("Your saved workspace could not be read."));
    transaction.oncomplete = () => {
      db.close();
      resolve(loaded);
    };
    transaction.onabort = () => {
      db.close();
      reject(loadError ?? new Error("Loading was interrupted."));
    };
  });
}
export async function saveWorkspace(data: WorkspaceData): Promise<void> {
  const validated = parseWorkspace(data);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("workspace", "readwrite");
    transaction.objectStore("workspace").put(validated, "data");
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(new Error("Changes could not be saved. Please retry."));
    };
    transaction.onabort = () => {
      db.close();
      reject(new Error("Saving was interrupted."));
    };
  });
}
