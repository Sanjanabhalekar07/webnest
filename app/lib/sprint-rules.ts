import type {
  Sprint,
  SprintDraft,
  SprintSnapshot,
  WorkspaceData,
} from "./model";
import { addDays, daysBetween, localDay, validDate } from "./date-utils";

function sprintById(data: WorkspaceData, id: string) {
  const sprint = data.sprints.find((sprint) => sprint.id === id);
  if (!sprint) throw new Error("This sprint no longer exists.");
  return sprint;
}

function snapshot(
  data: WorkspaceData,
  sprint: Sprint,
  date: string,
): SprintSnapshot {
  const tasks = data.tasks.filter((task) => task.sprint === sprint.id);
  return {
    date,
    total: tasks.length,
    remaining: tasks.filter((task) => task.status !== "Done").length,
  };
}

export function validateSprints(data: WorkspaceData) {
  const ids = new Set<string>(),
    names = new Set<string>(),
    activeProjects = new Set<string>();
  for (const sprint of data.sprints) {
    if (!sprint.id || sprint.id === "Backlog" || ids.has(sprint.id))
      throw new Error("Sprint IDs must be unique.");
    ids.add(sprint.id);
    const name = `${sprint.projectId}:${sprint.name.trim().toLowerCase()}`;
    if (!sprint.name.trim() || sprint.name.length > 80 || names.has(name))
      throw new Error(
        "Give each sprint a unique name of up to 80 characters within its project.",
      );
    names.add(name);
    if (!data.projects.some((project) => project.id === sprint.projectId))
      throw new Error("A sprint references a missing project.");
    if (
      !validDate(sprint.startDate) ||
      !validDate(sprint.endDate) ||
      sprint.endDate <= sprint.startDate ||
      daysBetween(sprint.startDate, sprint.endDate) > 90
    )
      throw new Error(
        "Sprint end dates must be after the start date and within 90 days.",
      );
    if (!["planned", "active", "completed"].includes(sprint.state))
      throw new Error("Invalid sprint state.");
    if (sprint.state === "planned") {
      if (
        sprint.startedAt !== null ||
        sprint.completedAt !== null ||
        sprint.baselineTotal !== null ||
        sprint.initialRemaining !== null ||
        sprint.snapshots.length ||
        sprint.closedTasks.length
      )
        throw new Error("Planned sprints cannot contain completion history.");
    } else {
      if (
        !sprint.startedAt ||
        !Number.isFinite(Date.parse(sprint.startedAt)) ||
        !Number.isInteger(sprint.baselineTotal) ||
        sprint.baselineTotal! < 1 ||
        !Number.isInteger(sprint.initialRemaining) ||
        sprint.initialRemaining! < 0 ||
        sprint.initialRemaining! > sprint.baselineTotal!
      )
        throw new Error(
          "Started sprints need a valid baseline and start timestamp.",
        );
      if (
        localDay(sprint.startedAt) < sprint.startDate ||
        localDay(sprint.startedAt) > sprint.endDate
      )
        throw new Error(
          "The recorded sprint start must be within its scheduled dates.",
        );
      if (!sprint.snapshots.length)
        throw new Error("Started sprints need at least one recorded snapshot.");
      if (sprint.state === "active") {
        if (activeProjects.has(sprint.projectId))
          throw new Error("Each project can have only one active sprint.");
        activeProjects.add(sprint.projectId);
        if (sprint.completedAt !== null || sprint.closedTasks.length)
          throw new Error("Active sprints cannot contain a completed report.");
      } else if (
        !sprint.completedAt ||
        !Number.isFinite(Date.parse(sprint.completedAt)) ||
        Date.parse(sprint.completedAt) < Date.parse(sprint.startedAt)
      )
        throw new Error("Completed sprints need a valid completion timestamp.");
    }
    let previousDate = "";
    for (const point of sprint.snapshots) {
      if (
        !validDate(point.date) ||
        point.date <= previousDate ||
        (sprint.startedAt && point.date < localDay(sprint.startedAt)) ||
        (sprint.completedAt && point.date > localDay(sprint.completedAt)) ||
        !Number.isInteger(point.total) ||
        !Number.isInteger(point.remaining) ||
        point.total < 0 ||
        point.remaining < 0 ||
        point.remaining > point.total
      )
        throw new Error(
          "Sprint snapshots must have unique ordered dates and valid task counts.",
        );
      previousDate = point.date;
    }
    if (
      new Set(sprint.closedTasks.map((task) => task.id)).size !==
      sprint.closedTasks.length
    )
      throw new Error("Closed sprint task records must be unique.");
    if (sprint.state === "completed") {
      const final = sprint.snapshots.at(-1)!;
      if (
        final.date !== localDay(sprint.completedAt!) ||
        final.total !== sprint.closedTasks.length ||
        final.remaining !==
          sprint.closedTasks.filter((task) => task.status !== "Done").length
      )
        throw new Error(
          "The closed sprint report must match its final snapshot.",
        );
    }
  }
  for (const task of data.tasks)
    if (task.sprint !== "Backlog") {
      const sprint = data.sprints.find((sprint) => sprint.id === task.sprint);
      if (!sprint || sprint.projectId !== task.projectId)
        throw new Error(
          "Assign tasks to a sprint in the same project, or to the backlog.",
        );
      if (
        sprint.state === "completed" &&
        (task.status !== "Done" ||
          !sprint.closedTasks.some((item) => item.id === task.id))
      )
        throw new Error(
          "Completed sprints are closed. Move this task to the backlog before reopening it.",
        );
    }
}

export function recordActiveSprints(
  data: WorkspaceData,
  now = new Date().toISOString(),
): WorkspaceData {
  const date = localDay(now);
  let changed = false;
  const sprints = data.sprints.map((sprint) => {
    if (
      sprint.state !== "active" ||
      !sprint.startedAt ||
      date < localDay(sprint.startedAt) ||
      (sprint.snapshots.at(-1)?.date || "") > date
    )
      return sprint;
    const point = snapshot(data, sprint, date),
      last = sprint.snapshots.at(-1);
    if (
      last?.date === date &&
      last.total === point.total &&
      last.remaining === point.remaining
    )
      return sprint;
    changed = true;
    return {
      ...sprint,
      snapshots: [
        ...sprint.snapshots.filter((item) => item.date !== date),
        point,
      ],
    };
  });
  return changed ? { ...data, sprints } : data;
}

export function saveSprint(
  data: WorkspaceData,
  draft: SprintDraft,
): WorkspaceData {
  const existing = data.sprints.find((sprint) => sprint.id === draft.id);
  const project = data.projects.find(
    (project) => project.id === draft.projectId,
  );
  if (!project || project.archived)
    throw new Error("Choose an active project for this sprint.");
  if (existing?.state === "completed")
    throw new Error("Completed sprints are read only.");
  if (
    existing &&
    existing.state !== "planned" &&
    (draft.projectId !== existing.projectId ||
      draft.startDate !== existing.startDate ||
      draft.endDate !== existing.endDate)
  )
    throw new Error(
      "Active sprint dates and project are fixed. You can still edit its name and goal.",
    );
  if (
    existing &&
    draft.projectId !== existing.projectId &&
    data.tasks.some((task) => task.sprint === existing.id)
  )
    throw new Error(
      "Return assigned tasks to the backlog before changing this sprint's project.",
    );
  const sprint: Sprint = {
    ...(existing || {
      state: "planned",
      startedAt: null,
      completedAt: null,
      baselineTotal: null,
      initialRemaining: null,
      snapshots: [],
      closedTasks: [],
    }),
    id: draft.id,
    projectId: draft.projectId,
    startDate: draft.startDate,
    endDate: draft.endDate,
    name: draft.name.trim(),
    goal: draft.goal.trim(),
  };
  const next = {
    ...data,
    sprints: existing
      ? data.sprints.map((item) => (item.id === sprint.id ? sprint : item))
      : [...data.sprints, sprint],
  };
  validateSprints(next);
  return next;
}

export function startSprint(
  data: WorkspaceData,
  id: string,
  now = new Date().toISOString(),
): WorkspaceData {
  const sprint = sprintById(data, id),
    today = localDay(now);
  if (sprint.state !== "planned")
    throw new Error("Only planned sprints can be started.");
  if (today < sprint.startDate || today > sprint.endDate)
    throw new Error(
      "Update the planned dates before starting. Today must fall within the sprint's date range.",
    );
  if (
    data.projects.find((project) => project.id === sprint.projectId)?.archived
  )
    throw new Error("Restore this project before starting its sprint.");
  const point = snapshot(data, sprint, today);
  if (!point.total)
    throw new Error("Assign at least one task before starting the sprint.");
  const next: WorkspaceData = {
    ...data,
    sprints: data.sprints.map((item) =>
      item.id === id
        ? {
            ...item,
            state: "active",
            startedAt: now,
            baselineTotal: point.total,
            initialRemaining: point.remaining,
            snapshots: [point],
          }
        : item,
    ),
  };
  validateSprints(next);
  return next;
}

export function completeSprint(
  data: WorkspaceData,
  id: string,
  now = new Date().toISOString(),
): WorkspaceData {
  const sprint = sprintById(data, id);
  if (sprint.state !== "active")
    throw new Error("Only active sprints can be completed.");
  const recorded = recordActiveSprints(data, now);
  const updated = sprintById(recorded, id);
  const next: WorkspaceData = {
    ...recorded,
    sprints: recorded.sprints.map((item) =>
      item.id === id
        ? {
            ...updated,
            state: "completed",
            completedAt: now,
            closedTasks: recorded.tasks
              .filter((task) => task.sprint === id)
              .map(({ id, title, status, assignee }) => ({
                id,
                title,
                status,
                assignee,
              })),
          }
        : item,
    ),
    tasks: recorded.tasks.map((task) =>
      task.sprint === id && task.status !== "Done"
        ? { ...task, sprint: "Backlog" }
        : task,
    ),
  };
  validateSprints(next);
  return next;
}

export function deleteSprint(data: WorkspaceData, id: string): WorkspaceData {
  if (sprintById(data, id).state !== "planned")
    throw new Error("Only planned sprints can be deleted.");
  return {
    ...data,
    sprints: data.sprints.filter((sprint) => sprint.id !== id),
    tasks: data.tasks.map((task) =>
      task.sprint === id ? { ...task, sprint: "Backlog" } : task,
    ),
  };
}

export function assignToSprint(
  data: WorkspaceData,
  taskIds: string[],
  sprintId: string,
): WorkspaceData {
  if (
    sprintId !== "Backlog" &&
    sprintById(data, sprintId).state === "completed"
  )
    throw new Error("Completed sprints cannot receive new tasks.");
  if (
    !taskIds.length ||
    new Set(taskIds).size !== taskIds.length ||
    taskIds.some((id) => !data.tasks.some((task) => task.id === id))
  )
    throw new Error("Choose existing tasks to assign.");
  const next = {
    ...data,
    tasks: data.tasks.map((task) =>
      taskIds.includes(task.id) ? { ...task, sprint: sprintId } : task,
    ),
  };
  validateSprints(next);
  return next;
}

// Legacy sprint values were labels shared by several projects, not real sprint records.
export function migrateSprintLabels(
  data: WorkspaceData,
  today = localDay(),
): WorkspaceData {
  const groups = new Map<string, Sprint>();
  const tasks = data.tasks.map((task) => {
    if (!task.sprint.trim() || task.sprint.toLowerCase() === "backlog")
      return { ...task, sprint: "Backlog" };
    const key = JSON.stringify([
      task.projectId,
      task.sprint.trim().toLowerCase(),
    ]);
    let sprint = groups.get(key);
    if (!sprint) {
      sprint = {
        id: `SPR-MIG-${groups.size + 1}`,
        projectId: task.projectId,
        name: task.sprint.trim(),
        goal: "Imported from your existing task assignments. Review the dates before starting.",
        startDate: today,
        endDate: addDays(today, 13),
        state: "planned",
        startedAt: null,
        completedAt: null,
        baselineTotal: null,
        initialRemaining: null,
        snapshots: [],
        closedTasks: [],
      };
      groups.set(key, sprint);
    }
    return { ...task, sprint: sprint.id };
  });
  return { ...data, tasks, sprints: [...groups.values()] };
}
