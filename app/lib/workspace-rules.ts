import {
  defaultTaskView,
  statuses,
  type Attachment,
  type Task,
  type TaskViewPreferences,
  type WorkspaceData,
  type Sprint,
} from "./model";
import { validDate } from "./date-utils";
import { migrateSprintLabels, validateSprints } from "./sprint-rules";
export { validDate } from "./date-utils";

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const attachmentExtensions = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "txt",
  "csv",
  "md",
  "docx",
  "xlsx",
  "pptx",
]);
export function validateAttachment(
  file: Pick<Attachment, "name" | "size"> & { type?: string },
) {
  if (
    !file.name.trim() ||
    !attachmentExtensions.has(file.name.split(".").pop()?.toLowerCase() || "")
  )
    throw new Error(
      "Use a PDF, image, text, CSV, Markdown, or Office document.",
    );
  if (
    !Number.isFinite(file.size) ||
    file.size <= 0 ||
    file.size > MAX_ATTACHMENT_SIZE
  )
    throw new Error("Attachments must be between 1 byte and 10 MB.");
  const mimeTypes = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "text/plain",
    "text/csv",
    "text/markdown",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/octet-stream",
    "application/csv",
    "application/vnd.ms-excel",
  ]);
  if (file.type && !mimeTypes.has(file.type))
    throw new Error("This attachment type is not supported.");
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Saved workspace contains an invalid record.");
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== "string")
    throw new Error("Saved workspace contains an invalid text field.");
  return value;
}
function bool(value: unknown): boolean {
  if (typeof value !== "boolean")
    throw new Error("Saved workspace contains an invalid checkbox field.");
  return value;
}
function list(value: unknown): unknown[] {
  if (!Array.isArray(value))
    throw new Error("Saved workspace contains an invalid collection.");
  return value;
}
function strings(value: unknown) {
  return list(value).map(text);
}
function oneOf<T extends string>(value: unknown, options: readonly T[]): T {
  if (!options.includes(value as T))
    throw new Error("Saved workspace contains an unsupported option.");
  return value as T;
}
function timestamp(value: unknown) {
  const date = text(value);
  if (!Number.isFinite(Date.parse(date)))
    throw new Error("Saved workspace contains an invalid timestamp.");
  return date;
}
function unique(values: string[], name: string) {
  if (
    values.some((value) => !value.trim()) ||
    new Set(values).size !== values.length
  )
    throw new Error(`${name} must have unique, non-empty IDs.`);
}
export function validateColumns(columns: string[]) {
  if (columns.length < 2 || columns.length > 10 || !columns.includes("Done"))
    throw new Error("Keep between 2 and 10 workflow columns, including Done.");
  if (
    columns.some(
      (name) =>
        !name.trim() ||
        name !== name.trim() ||
        name.length > 40 ||
        name.toLowerCase() === "all",
    ) ||
    new Set(columns.map((name) => name.toLowerCase())).size !== columns.length
  )
    throw new Error(
      "Column names must be unique, contain 1–40 characters, and cannot be named all.",
    );
}
export function validateRelations(tasks: Task[]) {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  for (const task of tasks) {
    unique(task.dependencies, "Dependencies");
    for (const id of [
      ...task.dependencies,
      ...(task.parentId ? [task.parentId] : []),
    ]) {
      const target = byId.get(id);
      if (
        !target ||
        target.id === task.id ||
        target.projectId !== task.projectId
      )
        throw new Error(
          "Dependencies and parent tasks must reference another task in the same project.",
        );
    }
  }
  // Completion edges include both explicit dependencies and unfinished child work.
  const children = new Map<string, string[]>();
  for (const task of tasks)
    if (task.parentId)
      children.set(task.parentId, [
        ...(children.get(task.parentId) || []),
        task.id,
      ]);
  const visited = new Set<string>(),
    visiting = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id))
      throw new Error("Dependencies and subtasks cannot create a cycle.");
    if (visited.has(id)) return;
    visiting.add(id);
    for (const next of [
      ...(byId.get(id)?.dependencies || []),
      ...(children.get(id) || []),
    ])
      visit(next);
    visiting.delete(id);
    visited.add(id);
  }
  for (const task of tasks) visit(task.id);
  for (const task of tasks)
    if (task.status === "Done") {
      const open = [
        ...task.dependencies,
        ...(children.get(task.id) || []),
      ].find((id) => byId.get(id)?.status !== "Done");
      if (open)
        throw new Error(
          `Finish ${byId.get(open)?.title} before completing ${task.title}. Reopen dependent or parent tasks first when reopening completed work.`,
        );
    }
}
export function validateWorkspace(data: WorkspaceData) {
  validateColumns(data.columns);
  unique(
    data.projects.map((project) => project.id),
    "Projects",
  );
  unique(
    data.tasks.map((task) => task.id),
    "Tasks",
  );
  const projectIds = new Set(data.projects.map((project) => project.id));
  for (const project of data.projects)
    if (
      !project.name.trim() ||
      project.name.length > 80 ||
      !/^#[0-9a-f]{6}$/i.test(project.color)
    )
      throw new Error(
        "Projects need a name of up to 80 characters and a valid color.",
      );
  for (const task of data.tasks) {
    if (
      !task.title.trim() ||
      task.title.length > 160 ||
      !validDate(task.dueDate)
    )
      throw new Error(
        "Tasks need a title of up to 160 characters and a valid due date.",
      );
    if (!projectIds.has(task.projectId) || !data.columns.includes(task.status))
      throw new Error(
        "A task references a missing project or workflow column.",
      );
    if (task.attachments.length > 5)
      throw new Error("Each task can have up to 5 attachments.");
    unique(
      task.attachments.map((item) => item.id),
      "Attachments",
    );
    task.attachments.forEach(validateAttachment);
  }
  validateRelations(data.tasks);
  validateSprints(data);
}
function integer(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value))
    throw new Error("Invalid sprint task count.");
  return value;
}
function parseSprint(value: unknown): Sprint {
  const sprint = record(value);
  return {
    id: text(sprint.id),
    projectId: text(sprint.projectId),
    name: text(sprint.name),
    goal: text(sprint.goal),
    startDate: text(sprint.startDate),
    endDate: text(sprint.endDate),
    state: oneOf(sprint.state, ["planned", "active", "completed"]),
    startedAt: sprint.startedAt === null ? null : timestamp(sprint.startedAt),
    completedAt:
      sprint.completedAt === null ? null : timestamp(sprint.completedAt),
    baselineTotal:
      sprint.baselineTotal === null ? null : integer(sprint.baselineTotal),
    initialRemaining:
      sprint.initialRemaining === null
        ? null
        : integer(sprint.initialRemaining),
    snapshots: list(sprint.snapshots).map((value) => {
      const point = record(value);
      return {
        date: text(point.date),
        total: integer(point.total),
        remaining: integer(point.remaining),
      };
    }),
    closedTasks: list(sprint.closedTasks).map((value) => {
      const task = record(value);
      return {
        id: text(task.id),
        title: text(task.title),
        status: text(task.status),
        assignee: text(task.assignee),
      };
    }),
  };
}
function parseView(value: unknown): TaskViewPreferences {
  const view = record(value);
  return {
    layout: oneOf(view.layout, ["Board", "List", "Timeline"]),
    project: text(view.project),
    priority: text(view.priority),
    status: text(view.status),
    assignee: text(view.assignee),
    label: text(view.label),
    query: text(view.query),
    overdue: bool(view.overdue),
    sort: oneOf(view.sort, ["due", "title", "priority"]),
  };
}
// Version 1 is the original unversioned workspace. Preserve IDs and all existing content.
export function parseWorkspace(input: unknown): WorkspaceData {
  const raw = record(input);
  const legacy = raw.schemaVersion === undefined || raw.schemaVersion === 1;
  if (!legacy && raw.schemaVersion !== 2 && raw.schemaVersion !== 3)
    throw new Error(
      "This workspace was saved by a newer version of WebNest. Update the app before opening it.",
    );
  const preferences = legacy
    ? { theme: "light", views: {} }
    : record(raw.preferences);
  let data: WorkspaceData = {
    schemaVersion: 3,
    sprints: raw.schemaVersion === 3 ? list(raw.sprints).map(parseSprint) : [],
    columns: legacy ? [...statuses] : strings(raw.columns),
    preferences: {
      theme: oneOf(preferences.theme, ["light", "dark"]),
      views: Object.fromEntries(
        Object.entries(record(preferences.views)).map(([key, view]) => [
          key,
          parseView(view),
        ]),
      ),
    },
    projects: list(raw.projects).map((value) => {
      const p = record(value);
      return {
        id: text(p.id),
        name: text(p.name),
        description: text(p.description),
        color: text(p.color),
        archived: bool(p.archived),
      };
    }),
    tasks: list(raw.tasks).map((value) => {
      const t = record(value);
      return {
        id: text(t.id),
        projectId: text(t.projectId),
        title: text(t.title),
        description: text(t.description),
        status: text(t.status),
        priority: oneOf(t.priority, ["Low", "Medium", "High", "Urgent"]),
        assignee: text(t.assignee),
        dueDate: text(t.dueDate),
        labels: text(t.labels),
        sprint: text(t.sprint),
        checklist: list(t.checklist).map((value) => {
          const item = record(value);
          return {
            id: text(item.id),
            title: text(item.title),
            done: bool(item.done),
          };
        }),
        comments: list(t.comments).map((value) => {
          const item = record(value);
          return {
            id: text(item.id),
            text: text(item.text),
            date: timestamp(item.date),
          };
        }),
        parentId: legacy || t.parentId === null ? null : text(t.parentId),
        dependencies: legacy ? [] : strings(t.dependencies),
        attachments: legacy
          ? []
          : list(t.attachments).map((value) => {
              const item = record(value);
              if (typeof item.size !== "number")
                throw new Error("Invalid attachment size.");
              return {
                id: text(item.id),
                name: text(item.name),
                size: item.size,
                type: text(item.type),
                date: timestamp(item.date),
              };
            }),
      };
    }),
    activity: list(raw.activity).map((value) => {
      const item = record(value);
      return {
        id: text(item.id),
        text: text(item.text),
        date: timestamp(item.date),
      };
    }),
  };
  if (raw.schemaVersion !== 3) data = migrateSprintLabels(data);
  validateWorkspace(data);
  return data;
}
export function saveTask(data: WorkspaceData, task: Task): WorkspaceData {
  const target = data.sprints.find((sprint) => sprint.id === task.sprint);
  if (
    target?.state === "completed" &&
    !data.tasks.some(
      (existing) => existing.id === task.id && existing.sprint === task.sprint,
    )
  )
    throw new Error("Completed sprints cannot receive new tasks.");
  const next = {
    ...data,
    tasks: data.tasks.some((item) => item.id === task.id)
      ? data.tasks.map((item) => (item.id === task.id ? task : item))
      : [...data.tasks, task],
  };
  validateWorkspace(next);
  return next;
}
export function removeTasks(data: WorkspaceData, ids: string[]): WorkspaceData {
  const removed = new Set(ids);
  return {
    ...data,
    tasks: data.tasks
      .filter((task) => !removed.has(task.id))
      .map((task) => ({
        ...task,
        dependencies: task.dependencies.filter((id) => !removed.has(id)),
        parentId:
          task.parentId && removed.has(task.parentId) ? null : task.parentId,
      })),
  };
}
export function changeWorkflow(
  data: WorkspaceData,
  columns: string[],
  mapping: Record<string, string> = {},
): WorkspaceData {
  validateColumns(columns);
  if (mapping.Done && mapping.Done !== "Done")
    throw new Error("Done must remain the completion column.");
  const next = {
    ...data,
    columns,
    preferences: {
      ...data.preferences,
      views: Object.fromEntries(
        Object.entries(data.preferences.views).map(([key, view]) => [
          key,
          {
            ...view,
            status:
              mapping[view.status] ??
              (columns.includes(view.status) ? view.status : "all"),
          },
        ]),
      ),
    },
    tasks: data.tasks.map((task) => ({
      ...task,
      status:
        mapping[task.status] ??
        (columns.includes(task.status) ? task.status : ""),
    })),
  };
  validateWorkspace(next);
  return next;
}
export function selectTasks(
  tasks: Task[],
  preferences: TaskViewPreferences,
  today: string,
) {
  const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
  return tasks
    .filter(
      (task) =>
        (preferences.project === "all" ||
          task.projectId === preferences.project) &&
        (preferences.priority === "all" ||
          task.priority === preferences.priority) &&
        (preferences.status === "all" || task.status === preferences.status) &&
        (preferences.assignee === "all" ||
          task.assignee === preferences.assignee) &&
        (preferences.label === "all" ||
          task.labels
            .split(",")
            .map((label) => label.trim())
            .includes(preferences.label)) &&
        (!preferences.overdue ||
          (task.status !== "Done" && task.dueDate < today)) &&
        `${task.title} ${task.id} ${task.labels} ${task.assignee}`
          .toLowerCase()
          .includes(preferences.query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        (preferences.sort === "title"
          ? a.title.localeCompare(b.title)
          : preferences.sort === "priority"
            ? priorityOrder[a.priority] - priorityOrder[b.priority]
            : a.dueDate.localeCompare(b.dueDate)) || a.id.localeCompare(b.id),
    );
}
export { defaultTaskView };
