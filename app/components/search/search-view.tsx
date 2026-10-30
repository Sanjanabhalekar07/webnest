"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useWorkspace } from "@/app/providers/workspace-provider";
import { PageHeading } from "../layout/page-heading";
import { TaskTable } from "../tasks/task-table";

export function SearchView() {
  const query = useSearchParams().get("q")?.trim() || "";
  const { projects, allTasks, setEditingTask } = useWorkspace();
  const matches = query
    ? allTasks.filter((task) =>
        `${task.title} ${task.id} ${task.labels} ${task.assignee}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : [];
  return (
    <>
      <PageHeading
        title="Search"
        description="Find tasks across your workspace."
      />
      <section className="search-results">
        <div className="section-heading">
          <h2>
            {query ? `Results for “${query}”` : "Search your workspace"}
            <span className="count">{matches.length}</span>
          </h2>
          {query && (
            <Link className="text-button" href="/search">
              Clear search
            </Link>
          )}
        </div>
        {matches.length ? (
          <TaskTable
            tasks={matches}
            projects={projects}
            onEdit={setEditingTask}
          />
        ) : (
          <p className="empty">
            {query
              ? "No tasks match your search."
              : "Enter a task name, label, assignee, or task ID in the search field above."}
          </p>
        )}
      </section>
    </>
  );
}
