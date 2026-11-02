"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useState, type FormEvent, type ReactNode } from "react";
import { members } from "@/app/lib/model";
import { accountInitials } from "@/app/lib/auth";
import { useAuth } from "@/app/providers/auth-provider";
import { useWorkspace } from "@/app/providers/workspace-provider";
import { Icon } from "../ui/app-icon";
import { AccountDialog } from "../auth/account-dialog";

const navigation = [
  { href: "/", name: "Overview", icon: "grid" },
  { href: "/tasks", name: "My tasks", icon: "check" },
  { href: "/projects", name: "Projects", icon: "folder" },
  { href: "/sprints", name: "Sprints", icon: "flag" },
  { href: "/calendar", name: "Calendar", icon: "calendar" },
  { href: "/reports", name: "Reports", icon: "chart" },
  { href: "/activity", name: "Activity", icon: "bell" },
];

type NavigationLinkProps = {
  href: string;
  children: ReactNode;
  onNavigate: () => void;
};

function NavigationLink({
  href,
  children,
  onNavigate,
  active = false,
}: NavigationLinkProps & { active?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`nav-item ${active ? "active" : ""}`}
      onClick={onNavigate}
    >
      {children}
    </Link>
  );
}

function CurrentNavigationLink(props: NavigationLinkProps) {
  const pathname = usePathname();
  return <NavigationLink {...props} active={pathname === props.href} />;
}

function ActiveNavigationLink(props: NavigationLinkProps) {
  return (
    <Suspense fallback={<NavigationLink {...props} />}>
      <CurrentNavigationLink {...props} />
    </Suspense>
  );
}

function CurrentPageTitle() {
  const pathname = usePathname();
  const { projects } = useWorkspace();
  const selectedProject = projects.find(
    (project) => pathname === `/projects/${project.id}`,
  );
  const title =
    selectedProject?.name ||
    navigation.find((item) => item.href === pathname)?.name ||
    (pathname === "/search" ? "Search" : "Project");
  return <strong>{title}</strong>;
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const {
    projects,
    allTasks,
    setEditingProject,
    saving,
    error,
    retrySave,
    dark,
    setDark,
    ready,
    loading,
    unreadCount,
  } = useWorkspace();
  const { user } = useAuth();
  const router = useRouter();
  const [mobileNav, setMobileNav] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const displayName = user?.name || "Account";
  const displayInitials = accountInitials(displayName);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = String(
      new FormData(event.currentTarget).get("q") || "",
    ).trim();
    router.push(
      query ? `/search?${new URLSearchParams({ q: query })}` : "/search",
    );
    setMobileNav(false);
  }

  return (
    <>
      {mobileNav && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <Link
          className="brand"
          href="/"
          onClick={() => setMobileNav(false)}
          aria-label="WebNest home"
        >
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path
                d="m6.5 10 4.75 13L16 14l4.75 9L25.5 10"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="24.5" cy="6.5" r="2" fill="#d8ceff" />
            </svg>
          </span>
          <span className="brand-wordmark">
            Web<span>Nest</span>
          </span>
        </Link>
        <div className="workspace-picker">
          <span className="workspace-icon">S</span>
          <span>
            <strong>Studio workspace</strong>
            <small>
              Pro plan <span>✦</span>
            </small>
          </span>
          <span className="muted">⌄</span>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Workspace">
          {navigation.map((item) => (
            <ActiveNavigationLink
              key={item.href}
              href={item.href}
              onNavigate={() => setMobileNav(false)}
            >
              <Icon name={item.icon} />
              {item.name}
              {item.href === "/tasks" && (
                <span className="nav-count">
                  {
                    allTasks.filter(
                      (task) =>
                        task.assignee === members[0] && task.status !== "Done",
                    ).length
                  }
                </span>
              )}
              {item.href === "/activity" && unreadCount > 0 && (
                <span className="nav-count">{unreadCount}</span>
              )}
            </ActiveNavigationLink>
          ))}
        </nav>
        <div className="nav-label project-label">
          YOUR PROJECTS
          <button
            aria-label="Create project"
            disabled={!ready}
            onClick={() => setEditingProject("new")}
          >
            <Icon name="plus" size={15} />
          </button>
        </div>
        <nav aria-label="Projects">
          {projects.map((project) => (
            <ActiveNavigationLink
              key={project.id}
              href={`/projects/${project.id}`}
              onNavigate={() => setMobileNav(false)}
            >
              <span
                className="project-dot"
                style={{ background: project.color }}
              />
              {project.name}
            </ActiveNavigationLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-note">
            <span>✧ Room for your next big idea</span>
            <p>Bring a little clarity to the way your team works.</p>
            <button disabled={!ready} onClick={() => setEditingProject("new")}>
              Start a new project <Icon name="arrow" size={15} />
            </button>
          </div>
          <button className="nav-item" onClick={() => setDark(!dark)}>
            <Icon name="sun" />
            {dark ? "Light appearance" : "Dark appearance"}
          </button>
          <button
            className="profile profile-button"
            onClick={() => setAccountOpen(true)}
            aria-label="Open account settings"
          >
            <span className="avatar">{displayInitials}</span>
            <span>
              <strong>{displayName}</strong>
              <small>{user?.email || "Workspace member"}</small>
            </span>
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              aria-label="Toggle navigation"
              aria-expanded={mobileNav}
              onClick={() => setMobileNav(!mobileNav)}
            >
              ☰
            </button>
            <Link href="/">Workspace</Link>
            <span>/</span>
            <Suspense fallback={<strong>Workspace</strong>}>
              <CurrentPageTitle />
            </Suspense>
          </div>
          <div className="top-actions">
            <form className="search" onSubmit={search} role="search">
              <Icon name="search" size={17} />
              <input
                name="q"
                aria-label="Search tasks"
                placeholder="Search anything..."
                type="search"
              />
              <button type="submit" aria-label="Submit search">
                <kbd>↵</kbd>
              </button>
            </form>
            <Link
              className="icon-button notification"
              href="/activity"
              aria-label={
                ready
                  ? `${unreadCount} unread workspace updates. Open activity feed`
                  : "Open activity feed"
              }
            >
              <Icon name="bell" />
              {unreadCount > 0 && (
                <span className="notification-count" aria-hidden="true">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
            <button
              className="avatar small top-avatar"
              onClick={() => setAccountOpen(true)}
              aria-label="Open account settings"
            >
              {displayInitials}
            </button>
          </div>
        </header>
        <main className="main-content">
          {error && ready && (
            <div role="alert" className="error-banner">
              <div>
                <strong>Changes have not been saved.</strong>
                <p>{error} Your edits are still available in this tab.</p>
              </div>
              <button onClick={retrySave} disabled={saving}>
                Retry save
              </button>
            </div>
          )}
          <div className="save-state" aria-live="polite">
            {!ready
              ? loading
                ? "Loading saved workspace..."
                : "Workspace could not be loaded"
              : saving
                ? "Saving changes..."
                : error
                  ? "Changes are not saved"
                  : "All changes saved locally"}
          </div>
          {children}
          <footer className="page-footer">
            <span>
              <span className="online-dot" /> A little more organized. A lot
              more possible.
            </span>
            <span>Made for your next big thing.</span>
          </footer>
        </main>
      </div>
      {accountOpen && <AccountDialog onClose={() => setAccountOpen(false)} />}
    </>
  );
}
