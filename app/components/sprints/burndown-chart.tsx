"use client";

import { useId } from "react";
import type { Sprint } from "@/app/lib/model";
import { daysBetween, localDay } from "@/app/lib/date-utils";

export function BurndownChart({ sprint }: { sprint: Sprint }) {
  const id = useId();
  if (!sprint.snapshots.length)
    return (
      <section className="panel">
        <h2>Sprint burndown</h2>
        <p className="empty">
          Start this sprint to record its baseline and daily remaining-task
          snapshots.
        </p>
      </section>
    );
  const start = localDay(sprint.startedAt!);
  const end =
    sprint.snapshots.at(-1)!.date > sprint.endDate
      ? sprint.snapshots.at(-1)!.date
      : sprint.endDate;
  const duration = Math.max(1, daysBetween(start, end));
  const maximum = Math.max(
    1,
    sprint.initialRemaining || 0,
    ...sprint.snapshots.map((point) => Math.max(point.total, point.remaining)),
  );
  const left = 44,
    top = 20,
    width = 568,
    height = 180;
  const x = (date: string) =>
    left + (daysBetween(start, date) / duration) * width;
  const y = (value: number) => top + height - (value / maximum) * height;
  const actual = sprint.snapshots
    .map((point) => `${x(point.date)},${y(point.remaining)}`)
    .join(" ");
  const ideal = `${x(start)},${y(sprint.initialRemaining || 0)} ${x(sprint.endDate)},${y(0)} ${x(end)},${y(0)}`;
  const ticks = [...new Set([0, Math.round(maximum / 2), maximum])];
  return (
    <section className="panel burndown-panel">
      <div className="section-heading">
        <h2>Sprint burndown</h2>
        <div className="chart-legend">
          <span>
            <i />
            Remaining tasks
          </span>
          <span className="ideal">
            <i />
            Original ideal
          </span>
        </div>
      </div>
      <svg
        viewBox="0 0 640 240"
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
      >
        <title id={`${id}-title`}>
          {sprint.name}: remaining tasks over time
        </title>
        <desc id={`${id}-description`}>
          The solid line shows recorded remaining tasks. The dashed line shows
          the original ideal from {sprint.initialRemaining} tasks to zero by{" "}
          {sprint.endDate}. Current scope: {sprint.snapshots.at(-1)!.total}{" "}
          tasks. A table of all measurements follows.
        </desc>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={left}
              x2={left + width}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--border)"
            />
            <text
              x={left - 10}
              y={y(tick) + 4}
              textAnchor="end"
              fill="var(--muted)"
              fontSize="11"
            >
              {tick}
            </text>
          </g>
        ))}
        <polyline
          points={ideal}
          fill="none"
          stroke="#b5accc"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <polyline
          points={actual}
          fill="none"
          stroke="var(--purple)"
          strokeWidth="2.5"
        />
        {sprint.snapshots.map((point) => (
          <circle
            key={point.date}
            cx={x(point.date)}
            cy={y(point.remaining)}
            r="3.5"
            fill="var(--purple)"
          >
            <title>
              {point.date}: {point.remaining} remaining, {point.total} in scope
            </title>
          </circle>
        ))}
        <text x={left} y="225" fill="var(--muted)" fontSize="10">
          {start}
        </text>
        <text
          x={left + width}
          y="225"
          textAnchor="end"
          fill="var(--muted)"
          fontSize="10"
        >
          {end}
        </text>
      </svg>
      <p className="field-hint">
        Baseline: {sprint.baselineTotal} tasks · Current recorded scope:{" "}
        {sprint.snapshots.at(-1)!.total}. Snapshots are recorded on changes and
        while the app is open. Days without observations are not backfilled;
        connecting lines link recorded observations.
      </p>
      <details className="snapshot-details">
        <summary>View recorded snapshots ({sprint.snapshots.length})</summary>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              Recorded daily sprint observations
            </caption>
            <thead>
              <tr>
                <th>Date</th>
                <th>Scope</th>
                <th>Remaining</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {sprint.snapshots.map((point) => (
                <tr key={point.date}>
                  <td>{point.date}</td>
                  <td>{point.total}</td>
                  <td>{point.remaining}</td>
                  <td>{point.total - point.remaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
