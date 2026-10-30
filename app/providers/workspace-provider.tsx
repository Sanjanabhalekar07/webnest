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
  type Project,
  type Task,
  type WorkspaceData,
  type Status,
  type TaskViewPreferences,
} from "../lib/model";
import { loadWorkspace, saveWorkspace } from "../lib/storage";
import { newTask } from "../lib/task-utils";
import {
  validateWorkspace,
  saveTask,
  removeTasks,
  changeWorkflow,
  defaultTaskView,
} from "../lib/workspace-rules";
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
  const [notice, setNotice] = useState("");
  const dataRef = useRef<WorkspaceData | null>(null);
  const writes = useRef(Promise.resolve());
  const revision = useRef(0);
  useEffect(() => {
    let active = true;
    loadWorkspace()
      .then((saved) => {
        if (!active) return;
        dataRef.current = saved;
        setData(saved);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, []);
  function persist(next: WorkspaceData) {
    const currentRevision = ++revision.current;
    setSaving(true);
    setError("");
    writes.current = writes.current
      .catch(() => {})
      .then(() => saveWorkspace(next))
      .then(() => {
        if (currentRevision === revision.current) {
          setSaving(false);
          setError("");
        }
      })
      .catch((reason: Error) => {
        if (currentRevision === revision.current) {
          setError(reason.message);
          setSaving(false);
        }
      });
  }
  function update(
    change: (previous: WorkspaceData) => WorkspaceData,
    message?: string,
  ) {
    if (!dataRef.current) return false;
    const next = change(dataRef.current);
    validateWorkspace(next);
    if (message) {
      next.activity = [
        {
          id: crypto.randomUUID(),
          text: message,
          date: new Date().toISOString(),
        },
        ...next.activity,
      ].slice(0, 100);
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

  const projects = data?.projects.filter((project) => !project.archived) || [];
  const activeIds = new Set(projects.map((project) => project.id));
  const allTasks =
    data?.tasks.filter((task) => activeIds.has(task.projectId)) || [];
  return {
    data,
    ready: data !== null,
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
  schemaVersion: 2,
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
  const data = state.data ?? emptyWorkspace;
  return (
    <Context.Provider value={{ ...state, data }}>
      <div className={`workspace ${dark ? "dark" : ""}`}>
        {children}
        {editingTask && (
          <TaskEditor
            key={typeof editingTask === "string" ? "new" : editingTask.id}
            task={
              editingTask === "new"
                ? newTask(projects[0]?.id || "")
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
                ),
                parentId: parent.id,
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
