import type { WorkspaceData } from "./model";

export function unreadActivityCount(data: WorkspaceData) {
  return data.activity.filter((event) => event.readAt === null).length;
}

export function markActivity(
  data: WorkspaceData,
  ids: string[],
  read: boolean,
  now = new Date().toISOString(),
): WorkspaceData {
  if (!Number.isFinite(Date.parse(now)))
    throw new Error("Choose a valid notification timestamp.");
  const selected = new Set(ids);
  let changed = false;
  const activity = data.activity.map((event) => {
    if (
      !selected.has(event.id) ||
      (read ? event.readAt !== null : event.readAt === null)
    )
      return event;
    changed = true;
    return { ...event, readAt: read ? now : null };
  });
  return changed ? { ...data, activity } : data;
}
