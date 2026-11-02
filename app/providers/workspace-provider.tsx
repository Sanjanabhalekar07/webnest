"use client";
import dynamic from "next/dynamic";
import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import {
  statuses,
  members,
  defaultProjectMembers,
  defaultAssignee,
  type Project,
  type Task,
  type WorkspaceData,
  type Status,
  type TaskViewPreferences,
} from "../lib/model";
import {
  createWorkspaceService,
  createLoadController,
  demoScenario,
  type WorkspaceService,
} from "../lib/workspace-service";
import { createSaveQueue } from "../lib/save-queue";
import { unreadActivityCount, markActivity } from "../lib/notification-rules";
import { newTask } from "../lib/task-utils";
import {
  validateWorkspace,
  saveTask,
  removeTasks,
  changeWorkflow,
  defaultTaskView,
} from "../lib/workspace-rules";
import { recordActiveSprints } from "../lib/sprint-rules";
const TaskEditor = dynamic(() => import("../components/tasks/task-editor"));
const ProjectEditor = dynamic(
  () => import("../components/projects/project-editor"),
);
function useWorkspaceState() {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [editingTask, setEditingTask] = useState<Task | "new" | null>(null);
  const [editingProject, setEditingProject] = useState<Project | "new" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const dataRef = useRef<WorkspaceData | null>(null);
  const mounted = useRef(false);
  const service = useRef<WorkspaceService | null>(null);
  const loadRequest = useRef<ReturnType<
    typeof createLoadController<WorkspaceData>
  > | null>(null);
  const loadVersion = useRef(0);
  const saveQueue = useRef<ReturnType<
    typeof createSaveQueue<WorkspaceData>
  > | null>(null);
  function getService() {
    if (!service.current) {
      const configured = Number(process.env.NEXT_PUBLIC_MOCK_LATENCY_MS ?? 350);
      const latencyMs =
        Number.isFinite(configured) && configured >= 0 && configured <= 5000
          ? configured
          : 350;
      service.current = createWorkspaceService(undefined, {
        latencyMs,
        scenario: demoScenario(
          window.location.search,
          process.env.NODE_ENV === "development",
        ),
      });
    }
    return service.current;
  }
  function runLoad(fresh = false) {
    const version = ++loadVersion.current;
    setLoading(true);
    setError("");
    if (!loadRequest.current)
      loadRequest.current = createLoadController(() => getService().load());
    void loadRequest.current
      .get(fresh)
      .then((saved) => {
        if (!mounted.current || version !== loadVersion.current) return;
        dataRef.current = saved;
        setData(saved);
        setLoading(false);
      })
      .catch((reason: Error) => {
        if (mounted.current && version === loadVersion.current) {
          setError(reason.message);
          setLoading(false);
        }
      });
  }
  useEffect(() => {
    mounted.current = true;
    runLoad();
    return () => {
      mounted.current = false;
    };
  }, []);
  function persist(next: WorkspaceData) {
    if (!saveQueue.current)
      saveQueue.current = createSaveQueue<WorkspaceData>(
        (snapshot) => getService().save(snapshot),
        (state) => {
          if (!mounted.current) return;
          setSaving(state.status === "saving");
          setError(state.error || "");
        },
      );
    saveQueue.current.enqueue(next);
  }
  function update(
    change: (previous: WorkspaceData) => WorkspaceData,
    message?: string,
  ) {
    if (!dataRef.current) return false;
    let next = recordActiveSprints(change(dataRef.current));
    validateWorkspace(next);
    if (next === dataRef.current && !message) return true;
    if (message) {
      next = {
        ...next,
        activity: [
          {
            id: crypto.randomUUID(),
            text: message,
            date: new Date().toISOString(),
            readAt: null,
          },
          ...next.activity,
        ].slice(0, 100),
      };
    }
    dataRef.current = next;
    setData(next);
    persist(next);
    if (message) setNotice(message);
    return true;
  }
  function moveTask(id: string, status: Status) {
    try {
      return update(
        (previous) => ({
          ...previous,
          tasks: previous.tasks.map((task) =>
            task.id === id ? { ...task, status } : task,
          ),
        }),
        `Moved ${id} to ${status}`,
      );
    } catch (reason) {
      setNotice(
        reason instanceof Error ? reason.message : "Task could not be moved.",
      );
      return false;
    }
  }
  useEffect(() => {
    const recordDay = () => {
      if (document.visibilityState !== "visible") return;
      try {
        update((previous) => previous);
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Sprint history could not be updated.",
        );
      }
    };
    const timer = window.setInterval(recordDay, 60000);
    document.addEventListener("visibilitychange", recordDay);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", recordDay);
    };
  }, []);
  function setDark(dark: boolean) {
    update((previous) => ({
      ...previous,
      preferences: { ...previous.preferences, theme: dark ? "dark" : "light" },
    }));
  }
  function setViewPreferences(
    key: string,
    patch: Partial<TaskViewPreferences>,
  ) {
    update((previous) => ({
      ...previous,
      preferences: {
        ...previous.preferences,
        views: {
          ...previous.preferences.views,
          [key]: {
            ...defaultTaskView,
            ...previous.preferences.views[key],
            ...patch,
          },
        },
      },
    }));
  }
  function setWorkflow(
    columns: string[],
    mapping: Record<string, string> = {},
  ) {
    return update(
      (previous) => changeWorkflow(previous, columns, mapping),
      "Updated the workspace workflow",
    );
  }

  const projects =
    data?.schemaVersion === 5
      ? data.projects.filter((project) => !project.archived)
      : [];
  const activeIds = new Set(projects.map((project) => project.id));
  const allTasks =
    data?.schemaVersion === 5
      ? data.tasks.filter((task) => activeIds.has(task.projectId))
      : [];
  return {
    data,
    ready: data?.schemaVersion === 5,
    loading,
    retryLoad: () => runLoad(true),
    unreadCount: data?.schemaVersion === 5 ? unreadActivityCount(data) : 0,
    setActivityRead: (ids: string[], read: boolean) =>
      update((previous) => markActivity(previous, ids, read)),
    projects,
    allTasks,
    error,
    saving,
    dark: data?.preferences.theme === "dark",
    setDark,
    setWorkflow,
    setViewPreferences,
    notice,
    editingTask,
    setEditingTask,
    editingProject,
    setEditingProject,
    update,
    moveTask,
    retrySave: () => {
      if (dataRef.current) persist(dataRef.current);
    },
  };
}
type WorkspaceState = ReturnType<typeof useWorkspaceState> & {
  data: WorkspaceData;
};
const Context = createContext<WorkspaceState | null>(null);
const emptyWorkspace: WorkspaceData = {
  schemaVersion: 5,
  sprints: [],
  columns: [...statuses],
  preferences: { theme: "light", views: {} },
  projects: [],
  tasks: [],
  activity: [],
};
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw Error("WorkspaceProvider is required");
  return value;
}
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const state = useWorkspaceState();
  const {
    projects,
    dark,
    editingTask,
    setEditingTask,
    editingProject,
    setEditingProject,
    update,
  } = state;
  const data = state.data?.schemaVersion === 5 ? state.data : emptyWorkspace;
  return (
    <Context.Provider value={{ ...state, data }}>
      <div className={`workspace ${dark ? "dark" : ""}`}>
        {children}
        {editingTask && (
          <TaskEditor
            key={typeof editingTask === "string" ? "new" : editingTask.id}
            task={
              editingTask === "new"
                ? newTask(
                    projects[0]?.id || "",
                    data.columns.includes("To do") ? "To do" : data.columns[0],
                    defaultAssignee(projects[0]),
                  )
                : editingTask
            }
            projects={projects}
            workspace={data}
            onCreateSubtask={(parent) => {
              update(
                (previous) => saveTask(previous, parent),
                `Updated ${parent.title}`,
              );
              setEditingTask({
                ...newTask(
                  parent.projectId,
                  data.columns.includes("To do") ? "To do" : data.columns[0],
                  parent.assignee,
                ),
                parentId: parent.id,
                sprint: parent.sprint,
              });
            }}
            onClose={() => setEditingTask(null)}
            onSave={(task) => {
              const exists = data.tasks.some((item) => item.id === task.id);
              update(
                (previous) => saveTask(previous, task),
                `${exists ? "Updated" : "Created"} ${task.title}`,
              );
              setEditingTask(null);
            }}
            onDelete={(task) => {
              update(
                (previous) => removeTasks(previous, [task.id]),
                `Deleted ${task.title}`,
              );
              setEditingTask(null);
            }}
          />
        )}
        {editingProject && (
          <ProjectEditor
            project={
              editingProject === "new"
                ? {
                    id: crypto.randomUUID(),
                    name: "",
                    description: "",
                    color: "#7765e8",
                    archived: false,
                    members: defaultProjectMembers([members[0]]),
                  }
                : editingProject
            }
            onClose={() => setEditingProject(null)}
            onSave={(project) => {
              update(
                (previous) => ({
                  ...previous,
                  projects: previous.projects.some(
                    (item) => item.id === project.id,
                  )
                    ? previous.projects.map((item) =>
                        item.id === project.id ? project : item,
                      )
                    : [...previous.projects, project],
                }),
                `${project.archived ? "Archived" : "Saved"} project ${project.name}`,
              );
              setEditingProject(null);
            }}
            onDelete={(project) => {
              update(
                (previous) => ({
                  ...removeTasks(
                    previous,
                    previous.tasks
                      .filter((task) => task.projectId === project.id)
                      .map((task) => task.id),
                  ),
                  projects: previous.projects.filter(
                    (item) => item.id !== project.id,
                  ),
                  sprints: previous.sprints.filter(
                    (sprint) => sprint.projectId !== project.id,
                  ),
                }),
                `Deleted project ${project.name}`,
              );
              setEditingProject(null);
            }}
          />
        )}{" "}
      </div>
    </Context.Provider>
  );
}
