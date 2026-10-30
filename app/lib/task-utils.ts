import { members, type Task } from "./model";
export const formatDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
export const isOverdue = (task: Task) =>
  task.status !== "Done" &&
  task.dueDate < new Date().toLocaleDateString("en-CA");
export const percent = (tasks: Task[]) =>
  tasks.length
    ? Math.round(
        (tasks.filter((task) => task.status === "Done").length / tasks.length) *
          100,
      )
    : 0;
export function newTask(projectId: string, status = "To do"): Task {
  return {
    id: `ORB-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
    projectId,
    title: "",
    description: "",
    status,
    priority: "Medium",
    assignee: members[0],
    dueDate: new Date().toLocaleDateString("en-CA"),
    labels: "Design",
    sprint: "Backlog",
    checklist: [],
    comments: [],
    parentId: null,
    dependencies: [],
    attachments: [],
  };
}
