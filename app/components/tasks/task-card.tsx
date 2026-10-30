"use client";

import { useDraggable } from "@dnd-kit/core";
import { initials, type Task } from "@/app/lib/model";
import { formatDate, isOverdue } from "@/app/lib/task-utils";

export function TaskCard({
  task,
  onEdit,
  columns,
  onMove,
  blocked = false,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  columns: string[];
  onMove: (id: string, status: string) => void;
  blocked?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: { title: task.title, status: task.status },
  });
  return (
    <article
      ref={setNodeRef}
      className={`task-card ${isDragging ? "dragging" : ""}`}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        zIndex: isDragging ? 5 : undefined,
      }}
    >
      <div className="task-top">
        <span
          className={`label label-${task.labels.split(",")[0]?.trim().toLowerCase()}`}
        >
          {task.labels.split(",")[0] || "General"}
        </span>
        <button
          type="button"
          className="drag-handle"
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          aria-label={`Move ${task.title}`}
        >
          <svg
            width="16"
            height="18"
            viewBox="0 0 16 18"
            fill="currentColor"
            aria-hidden="true"
          >
            {[5, 9, 13].flatMap((y) =>
              [5, 11].map((x) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" />
              )),
            )}
          </svg>
        </button>
      </div>
      <button className="task-title-button" onClick={() => onEdit(task)}>
        {task.title}
      </button>
      <span className="task-id">
        {task.id}
        {task.parentId && " · Subtask"}
      </span>
      {blocked && <span className="blocked-label">Waiting on linked work</span>}
      {task.attachments.length > 0 && (
        <span className="field-hint">
          {task.attachments.length} attachment
          {task.attachments.length === 1 ? "" : "s"}
        </span>
      )}
      <div className="task-bottom">
        <span className={`priority priority-${task.priority.toLowerCase()}`}>
          {task.priority}
        </span>
        <span className={isOverdue(task) ? "overdue" : "muted"}>
          {formatDate(task.dueDate)}
        </span>
        <span className="avatar small" title={task.assignee}>
          {initials(task.assignee)}
        </span>
      </div>
      <label className="card-move">
        Move to
        <select
          aria-label={`Status for ${task.title}`}
          value={task.status}
          onChange={(event) => onMove(task.id, event.target.value)}
        >
          {columns.map((column) => (
            <option key={column}>{column}</option>
          ))}
        </select>
      </label>
    </article>
  );
}
