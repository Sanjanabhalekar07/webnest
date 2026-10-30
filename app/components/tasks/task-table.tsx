"use client";
import {initials,type Task,type Project} from "@/app/lib/model";
import {formatDate,isOverdue} from "@/app/lib/task-utils";
export function TaskTable({tasks, projects, onEdit}:{tasks:Task[];projects:Project[];onEdit:(task:Task)=>void}) {
  return <div className="table-scroll"><table><thead><tr><th>Task name</th><th>Status</th><th>Due date</th><th>Assignee</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id}><td><button className="table-task" onClick={() => onEdit(task)}><span className={`task-checkbox ${task.status === "Done" ? "checked" : ""}`}>{task.status === "Done" ? "✓" : ""}</span><span><strong>{task.title}</strong><small>{projects.find((project) => project.id === task.projectId)?.name}</small></span></button></td><td><span className={`status-pill status-${task.status.replaceAll(" ","-").toLowerCase()}`}>{task.status}</span></td><td className={isOverdue(task) ? "overdue" : "muted"}>{formatDate(task.dueDate)}</td><td><span className="avatar small" title={task.assignee}>{initials(task.assignee)}</span></td></tr>)}</tbody></table></div>;
}
