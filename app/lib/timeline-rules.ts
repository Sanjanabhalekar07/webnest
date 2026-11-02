import type { Task } from "./model";
import { daysBetween, validDate } from "./date-utils";

export type TimelineBar = {
  task: Task;
  x: number;
  width: number;
  visible: boolean;
  clippedStart: boolean;
  clippedEnd: boolean;
};
export function timelineBars(
  tasks: Task[],
  windowStart: string,
  days: number,
  dayWidth: number,
): TimelineBar[] {
  if (
    !validDate(windowStart) ||
    !Number.isInteger(days) ||
    days < 1 ||
    days > 366 ||
    !Number.isFinite(dayWidth) ||
    dayWidth <= 0
  )
    throw new Error(
      "Choose a valid timeline date, a window of 1–366 days, and a positive scale.",
    );
  return tasks.map((task) => {
    const start = daysBetween(windowStart, task.startDate),
      end = daysBetween(windowStart, task.dueDate) + 1;
    const left = Math.min(days, Math.max(0, start)),
      right = Math.min(days, Math.max(0, end));
    return {
      task,
      x: left * dayWidth,
      width: Math.max(0, right - left) * dayWidth,
      visible: end > 0 && start < days,
      clippedStart: start < 0,
      clippedEnd: end > days,
    };
  });
}

export function timelineLinks(tasks: Task[], allTasks: Task[]) {
  const visibleIds = new Set(tasks.map((task) => task.id));
  const byId = new Map(allTasks.map((task) => [task.id, task]));
  return tasks.flatMap((task) =>
    task.dependencies.map((id) => {
      const dependency = byId.get(id);
      return {
        from: id,
        to: task.id,
        hiddenByFilter: !visibleIds.has(id),
        overlap: !!dependency && dependency.dueDate >= task.startDate,
        description: `${dependency?.title || id} → ${task.title}`,
      };
    }),
  );
}
