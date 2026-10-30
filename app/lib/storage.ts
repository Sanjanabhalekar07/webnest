import { seedData, type WorkspaceData } from "./model";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("orbit-workspace", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("workspace");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Your workspace could not be opened."));
  });
}
export async function loadWorkspace(): Promise<WorkspaceData> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("workspace", "readwrite");
    let loaded: WorkspaceData;
    const request = transaction.objectStore("workspace").get("data");
    request.onsuccess = () => {
      loaded = request.result ?? seedData();
      if (!request.result) transaction.objectStore("workspace").put(loaded, "data");
    };
    request.onerror = () => reject(new Error("Your saved workspace could not be read."));
    transaction.oncomplete = () => { db.close(); resolve(loaded); };
    transaction.onabort = () => { db.close(); reject(new Error("Loading was interrupted.")); };
  });
}
export async function saveWorkspace(data: WorkspaceData): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("workspace", "readwrite");
    transaction.objectStore("workspace").put(data, "data");
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(new Error("Changes could not be saved. Please retry.")); };
    transaction.onabort = () => { db.close(); reject(new Error("Saving was interrupted.")); };
  });
}
