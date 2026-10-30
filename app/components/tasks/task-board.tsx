"use client";

import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  useDroppable,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import type { Task } from "@/app/lib/model";
import { newTask } from "@/app/lib/task-utils";
import { TaskCard } from "./task-card";
import { Icon } from "../ui/app-icon";

function Column({
  name,
  index,
  tasks,
  allTasks,
  columns,
  projectId,
  onEdit,
  onMove,
}: {
  name: string;
  index: number;
  tasks: Task[];
  allTasks: Task[];
  columns: string[];
  projectId: string;
  onEdit: (task: Task) => void;
  onMove: (id: string, status: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${name}`,
    data: { status: name },
  });
  return (
    <section
      ref={setNodeRef}
      className={`kanban-column column-${index % 5} ${isOver ? "drop-target" : ""}`}
    >
      <h2>
        <span className="status-dot" />
        {name}
        <span className="count">{tasks.length}</span>
      </h2>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          columns={columns}
          onEdit={onEdit}
          onMove={onMove}
          blocked={
            task.dependencies.some(
              (id) =>
                allTasks.find((item) => item.id === id)?.status !== "Done",
            ) ||
            allTasks.some(
              (item) => item.parentId === task.id && item.status !== "Done",
            )
          }
        />
      ))}
      <button
        className="add-task"
        onClick={() => onEdit(newTask(projectId, name))}
      >
        <Icon name="plus" size={15} />
        Add task
      </button>
    </section>
  );
}

export function TaskBoard({
  tasks,
  allTasks,
  columns,
  projectId,
  onEdit,
  onMove,
}: {
  tasks: Task[];
  allTasks: Task[];
  columns: string[];
  projectId: string;
  onEdit: (task: Task) => void;
  onMove: (id: string, status: string) => void;
}) {
  const coordinates: KeyboardCoordinateGetter = (
    event,
    { context, currentCoordinates },
  ) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.code)) return;
    const current = String(
      context.over?.id || `column:${context.active?.data.current?.status}`,
    );
    const index = columns.findIndex((name) => `column:${name}` === current);
    const next = columns[index + (event.code === "ArrowRight" ? 1 : -1)];
    const target = next
      ? context.droppableRects.get(`column:${next}`)
      : undefined;
    if (target && context.collisionRect)
      return {
        x:
          currentCoordinates.x +
          target.left +
          target.width / 2 -
          context.collisionRect.left -
          context.collisionRect.width / 2,
        y:
          currentCoordinates.y +
          target.top +
          target.height / 2 -
          context.collisionRect.top -
          context.collisionRect.height / 2,
      };
  };
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 7 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: coordinates }),
  );
  return (
    <DndContext
      id="webnest-task-board"
      sensors={sensors}
      collisionDetection={(args) => {
        const collisions = pointerWithin(args);
        return collisions.length ? collisions : closestCenter(args);
      }}
      onDragEnd={({ active, over }) => {
        if (over?.data.current?.status)
          onMove(String(active.id), over.data.current.status);
      }}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "Press Space or Enter to pick up a task. Use Left and Right to choose a column. Press Space or Enter to drop, or Escape to cancel. You can also use the Move to selector on each card.",
        },
        announcements: {
          onDragStart: ({ active }) =>
            `Picked up ${active.data.current?.title}.`,
          onDragOver: ({ over }) =>
            over
              ? `Over ${over.data.current?.status}.`
              : "Outside workflow columns.",
          onDragEnd: ({ over }) =>
            over
              ? `Move requested to ${over.data.current?.status}. Check the task movement update for the result.`
              : "Task movement cancelled.",
          onDragCancel: () => "Task movement cancelled.",
        },
      }}
    >
      <div
        className="kanban"
        style={{
          gridTemplateColumns: `repeat(${columns.length}, minmax(210px, 1fr))`,
        }}
      >
        {columns.map((name, index) => (
          <Column
            key={name}
            name={name}
            index={index}
            columns={columns}
            tasks={tasks.filter((task) => task.status === name)}
            allTasks={allTasks}
            projectId={projectId}
            onEdit={onEdit}
            onMove={onMove}
          />
        ))}
      </div>
    </DndContext>
  );
}
