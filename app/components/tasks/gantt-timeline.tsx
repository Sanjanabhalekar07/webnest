"use client";

import { useId, useState } from "react";
import type { Task } from "@/app/lib/model";
import { addDays, daysBetween, localDay } from "@/app/lib/date-utils";
import { timelineBars, timelineLinks } from "@/app/lib/timeline-rules";
import { formatDate } from "@/app/lib/task-utils";

export function GanttTimeline({
  tasks,
  allTasks,
  onEdit,
}: {
  tasks: Task[];
  allTasks: Task[];
  onEdit: (task: Task) => void;
}) {
  const id = useId();
  const ordered = [...tasks].sort(
    (a, b) =>
      a.startDate.localeCompare(b.startDate) ||
      a.dueDate.localeCompare(b.dueDate) ||
      a.title.localeCompare(b.title),
  );
  const [start, setStart] = useState(() =>
    addDays(ordered[0]?.startDate || localDay(), -2),
  );
  const [days, setDays] = useState(42);
  const scale = days <= 14 ? 48 : days <= 42 ? 26 : days <= 90 ? 18 : 8;
  const width = days * scale,
    header = 54,
    rowHeight = 52;
  const bars = timelineBars(ordered, start, days, scale);
  const barById = new Map(
    bars.map((bar, index) => [bar.task.id, { ...bar, index }]),
  );
  const links = timelineLinks(ordered, allTasks);
  const hiddenLinks = links.filter(
    (link) =>
      !barById.get(link.from)?.visible || !barById.get(link.to)?.visible,
  ).length;
  const overlapCount = links.filter((link) => link.overlap).length;
  const tickStep = days <= 14 ? 1 : days <= 90 ? 7 : 30;
  const tickDays = Array.from(
    { length: Math.ceil(days / tickStep) },
    (_, index) => index * tickStep,
  );
  const todayOffset = daysBetween(start, localDay());
  function fit() {
    const first = ordered[0]?.startDate || localDay();
    const last = ordered.reduce(
      (latest, task) => (task.dueDate > latest ? task.dueDate : latest),
      first,
    );
    setStart(addDays(first, -1));
    setDays(Math.max(14, Math.min(366, daysBetween(first, last) + 3)));
  }

  return (
    <section className="panel gantt-panel">
      <div className="section-heading">
        <div>
          <h2>Project timeline</h2>
          <p className="field-hint">
            {start} → {addDays(start, days - 1)} · Start and due dates are
            inclusive
          </p>
        </div>
        <div className="filter-controls">
          <button
            className="secondary"
            aria-label="Previous date window"
            onClick={() =>
              setStart(addDays(start, -Math.max(1, Math.floor(days / 2))))
            }
          >
            ←
          </button>
          <button
            className="secondary"
            onClick={() => setStart(addDays(localDay(), -2))}
          >
            Today
          </button>
          <button
            className="secondary"
            aria-label="Next date window"
            onClick={() =>
              setStart(addDays(start, Math.max(1, Math.floor(days / 2))))
            }
          >
            →
          </button>
          <select
            aria-label="Timeline zoom"
            value={[14, 42, 90].includes(days) ? days : "fit"}
            onChange={(event) => {
              if (event.target.value === "fit") fit();
              else setDays(Number(event.target.value));
            }}
          >
            <option value="14">2 weeks</option>
            <option value="42">6 weeks</option>
            <option value="90">3 months</option>
            {![14, 42, 90].includes(days) && (
              <option value="fit">Fit · {days} days</option>
            )}
          </select>
          <button className="secondary" onClick={fit} disabled={!tasks.length}>
            Fit tasks
          </button>
        </div>
      </div>
      <div className="gantt-legend">
        <span>
          <i />
          Task schedule
        </span>
        <span className="done">
          <i />
          Completed
        </span>
        <span className="warning">
          <i />
          Overlapping dependency dates
        </span>
      </div>
      {overlapCount > 0 && (
        <p className="gantt-advisory">
          {overlapCount} dependency link(s) have overlapping planned dates. Edit
          the task dates to resolve the overlap; dates are never changed
          automatically.
        </p>
      )}
      {hiddenLinks > 0 && (
        <p className="field-hint">
          {hiddenLinks} dependency link(s) are outside this date window or
          hidden by filters. The table below lists every linked prerequisite.
        </p>
      )}
      {!tasks.length ? (
        <p className="empty">No tasks match your filters.</p>
      ) : (
        <>
          <div
            className="gantt-scroll"
            tabIndex={0}
            role="region"
            aria-label="Scrollable task timeline"
          >
            <div
              className="gantt-grid"
              style={{
                gridTemplateColumns: `230px ${width}px`,
                width: width + 230,
              }}
            >
              <div className="gantt-labels">
                <div className="gantt-label-header">TASK / SCHEDULE</div>
                {bars.map((bar) => (
                  <button
                    className="gantt-label"
                    key={bar.task.id}
                    onClick={() => onEdit(bar.task)}
                  >
                    <strong>{bar.task.title}</strong>
                    <small>
                      {formatDate(bar.task.startDate)} –{" "}
                      {formatDate(bar.task.dueDate)}
                      {bar.task.parentId && " · Subtask"}
                    </small>
                  </button>
                ))}
              </div>
              <svg
                width={width}
                height={header + ordered.length * rowHeight}
                role="group"
                aria-labelledby={`${id}-title ${id}-description`}
              >
                <title id={`${id}-title`}>
                  Task schedules and dependencies
                </title>
                <desc id={`${id}-description`}>
                  Bars show inclusive start and due dates. Arrows point from
                  prerequisites to dependent tasks. Dashed amber arrows indicate
                  overlapping planned dates. Select a task label or bar to edit
                  it; a text table follows.
                </desc>
                <defs>
                  <marker
                    id={`${id}-arrow`}
                    markerWidth="7"
                    markerHeight="7"
                    refX="6"
                    refY="3.5"
                    orient="auto"
                  >
                    <path d="M0 0 7 3.5 0 7" fill="#aaa2be" />
                  </marker>
                  <marker
                    id={`${id}-warning`}
                    markerWidth="7"
                    markerHeight="7"
                    refX="6"
                    refY="3.5"
                    orient="auto"
                  >
                    <path d="M0 0 7 3.5 0 7" fill="#bd854b" />
                  </marker>
                  <clipPath id={`${id}-clip`}>
                    <rect
                      x="0"
                      y={header}
                      width={width}
                      height={ordered.length * rowHeight}
                    />
                  </clipPath>
                </defs>
                {bars.map((bar, index) => (
                  <g key={bar.task.id}>
                    <rect
                      x="0"
                      y={header + index * rowHeight}
                      width={width}
                      height={rowHeight}
                      fill={index % 2 ? "var(--bg)" : "var(--surface)"}
                    />
                    <line
                      x1="0"
                      x2={width}
                      y1={header + (index + 1) * rowHeight}
                      y2={header + (index + 1) * rowHeight}
                      stroke="var(--border)"
                    />
                  </g>
                ))}
                {tickDays.map((day) => (
                  <g key={day}>
                    <line
                      x1={day * scale}
                      x2={day * scale}
                      y1="0"
                      y2={header + ordered.length * rowHeight}
                      stroke="var(--border)"
                    />
                    <text
                      x={day * scale + 7}
                      y="30"
                      fontSize="10"
                      fill="var(--muted)"
                    >
                      {formatDate(addDays(start, day))}
                    </text>
                  </g>
                ))}
                {todayOffset >= 0 && todayOffset < days && (
                  <g>
                    <line
                      x1={(todayOffset + 0.5) * scale}
                      x2={(todayOffset + 0.5) * scale}
                      y1={header}
                      y2={header + ordered.length * rowHeight}
                      stroke="var(--purple)"
                      strokeDasharray="3 4"
                    />
                    <text
                      x={(todayOffset + 0.5) * scale}
                      y="47"
                      fontSize="9"
                      textAnchor="middle"
                      fill="var(--purple)"
                    >
                      Today
                    </text>
                  </g>
                )}
                <g clipPath={`url(#${id}-clip)`}>
                  {links.map((link) => {
                    const from = barById.get(link.from),
                      to = barById.get(link.to);
                    if (!from?.visible || !to?.visible) return null;
                    const sx = from.x + from.width,
                      sy = header + from.index * rowHeight + rowHeight / 2,
                      tx = to.x,
                      ty = header + to.index * rowHeight + rowHeight / 2,
                      bend = Math.max(sx + 12, tx - 12);
                    return (
                      <path
                        key={`${link.from}-${link.to}`}
                        d={`M${sx} ${sy}H${bend}V${ty}H${tx}`}
                        fill="none"
                        stroke={link.overlap ? "#bd854b" : "#aaa2be"}
                        strokeDasharray={link.overlap ? "4 3" : undefined}
                        strokeWidth="1.5"
                        markerEnd={`url(#${id}-${link.overlap ? "warning" : "arrow"})`}
                      >
                        <title>
                          {link.description}
                          {link.overlap ? ": planned dates overlap" : ""}
                        </title>
                      </path>
                    );
                  })}
                  {bars.map((bar, index) =>
                    bar.visible ? (
                      <g
                        className="gantt-task"
                        key={bar.task.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Edit ${bar.task.title}, ${bar.task.startDate} to ${bar.task.dueDate}, ${bar.task.status}`}
                        onClick={() => onEdit(bar.task)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onEdit(bar.task);
                          }
                        }}
                      >
                        <rect
                          x={bar.x + 1}
                          y={header + index * rowHeight + 13}
                          width={Math.max(2, bar.width - 2)}
                          height="26"
                          rx="5"
                          fill={
                            bar.task.status === "Done" ? "#39795c" : "#7761c6"
                          }
                          stroke={
                            bar.clippedStart || bar.clippedEnd
                              ? "var(--text)"
                              : "none"
                          }
                          strokeDasharray={
                            bar.clippedStart || bar.clippedEnd
                              ? "3 3"
                              : undefined
                          }
                        />
                        <title>
                          {bar.task.title} · {bar.task.startDate} to{" "}
                          {bar.task.dueDate} · {bar.task.status}
                          {bar.clippedStart || bar.clippedEnd
                            ? " · Extends beyond this date window"
                            : ""}
                        </title>
                        {bar.width > 85 && (
                          <text
                            x={bar.x + 9}
                            y={header + index * rowHeight + 30}
                            fill="white"
                            fontSize="10"
                            pointerEvents="none"
                          >
                            {bar.task.status.length * 6 < bar.width - 20
                              ? bar.task.status
                              : "Task"}
                          </text>
                        )}
                      </g>
                    ) : (
                      <text
                        key={bar.task.id}
                        x="12"
                        y={header + index * rowHeight + 30}
                        fill="var(--muted)"
                        fontSize="10"
                      >
                        Outside date window
                      </text>
                    ),
                  )}
                </g>
              </svg>
            </div>
          </div>
          <p className="field-hint">
            Use the scroll area to inspect longer schedules. Fit tasks displays
            up to one year; navigate to see work outside that window. Focus a
            bar and press Enter or Space to edit its dates.
          </p>
          <details className="snapshot-details">
            <summary>View timeline as a table ({tasks.length} tasks)</summary>
            <div className="table-scroll">
              <table>
                <caption className="sr-only">
                  Task schedules and prerequisites
                </caption>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Start</th>
                    <th>Due</th>
                    <th>Prerequisites</th>
                  </tr>
                </thead>
                <tbody>
                  {ordered.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <button
                          className="table-task"
                          onClick={() => onEdit(task)}
                        >
                          <strong>{task.title}</strong>
                        </button>
                      </td>
                      <td>{task.startDate}</td>
                      <td>{task.dueDate}</td>
                      <td className="gantt-dependency-cell">
                        {task.dependencies.length
                          ? task.dependencies
                              .map(
                                (id) =>
                                  allTasks.find((item) => item.id === id)
                                    ?.title || id,
                              )
                              .join(", ")
                          : "None"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
