"use client";

import { useRef, useState } from "react";
import { useWorkspace } from "@/app/providers/workspace-provider";
import { Icon } from "../ui/app-icon";
import { PageHeading } from "../layout/page-heading";

export function ActivityView() {
  const { data, unreadCount, setActivityRead } = useWorkspace();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [feedback, setFeedback] = useState("");
  const unreadFilter = useRef<HTMLButtonElement>(null);
  const activity = unreadOnly
    ? data.activity.filter((event) => event.readAt === null)
    : data.activity;
  function mark(ids: string[], read: boolean) {
    setActivityRead(ids, read);
    setFeedback(
      `${ids.length === 1 ? "Update" : `${ids.length} updates`} marked ${read ? "read" : "unread"}.`,
    );
    if (unreadOnly && read) unreadFilter.current?.focus();
  }
  return (
    <>
      <PageHeading
        title="Activity"
        description="Keep up with changes across your workspace."
      />
      <section className="panel activity-list">
        <div className="section-heading">
          <h2>
            Workspace updates{" "}
            <span className="count">{unreadCount} unread</span>
          </h2>
          <button
            className="secondary"
            disabled={!unreadCount}
            onClick={() =>
              mark(
                data.activity
                  .filter((event) => event.readAt === null)
                  .map((event) => event.id),
                true,
              )
            }
          >
            Mark all as read
          </button>
        </div>
        <div className="tabs activity-tabs">
          <button
            aria-pressed={!unreadOnly}
            className={!unreadOnly ? "selected" : ""}
            onClick={() => setUnreadOnly(false)}
          >
            All updates ({data.activity.length})
          </button>
          <button
            ref={unreadFilter}
            aria-pressed={unreadOnly}
            className={unreadOnly ? "selected" : ""}
            onClick={() => setUnreadOnly(true)}
          >
            Unread ({unreadCount})
          </button>
        </div>
        <p className="activity-feedback" role="status" aria-live="polite">
          {feedback}
        </p>
        {activity.map((event) => (
          <article
            className={`activity-update ${event.readAt === null ? "unread" : ""}`}
            key={event.id}
          >
            <span className="activity-bullet" aria-hidden="true">
              <Icon name="check" size={18} />
            </span>
            <div className="activity-update-body">
              <p>
                {event.text}
                {event.readAt === null && (
                  <span className="unread-tag">Unread</span>
                )}
              </p>
              <time dateTime={event.date}>
                {new Date(event.date).toLocaleString()}
              </time>
            </div>
            <button
              className="text-button"
              onClick={() => mark([event.id], event.readAt === null)}
            >
              {event.readAt === null ? "Mark read" : "Mark unread"}
            </button>
          </article>
        ))}
        {!activity.length && (
          <div className="empty">
            <h2>{unreadOnly ? "You’re all caught up" : "No updates yet"}</h2>
            <p>
              {unreadOnly
                ? "New workspace updates will appear here."
                : "Project, task, and sprint changes will appear here."}
            </p>
          </div>
        )}
        <p className="field-hint">
          Read state is saved with your workspace. Only the newest 100 updates
          are retained. These are in-app updates; no email or push notifications
          are sent.
        </p>
      </section>
    </>
  );
}
