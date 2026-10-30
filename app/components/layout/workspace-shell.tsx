"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { members } from "@/app/lib/model";
import { useWorkspace } from "@/app/providers/workspace-provider";
import { Icon } from "../ui/app-icon";

const navigation = [
  { href: "/", name: "Overview", icon: "grid" },
  { href: "/tasks", name: "My tasks", icon: "check" },
  { href: "/projects", name: "Projects", icon: "folder" },
  { href: "/calendar", name: "Calendar", icon: "calendar" },
  { href: "/reports", name: "Reports", icon: "chart" },
  { href: "/activity", name: "Activity", icon: "bell" },
];

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { projects, allTasks, setEditingProject, saving, error, retrySave, dark, setDark, ready } = useWorkspace();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNav, setMobileNav] = useState(false);
  const selectedProject = projects.find((project) => pathname === `/projects/${project.id}`);
  const title = selectedProject?.name || navigation.find((item) => item.href === pathname)?.name || (pathname === "/search" ? "Search" : "Project");

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("q") || "").trim();
    router.push(query ? `/search?${new URLSearchParams({ q: query })}` : "/search");
    setMobileNav(false);
  }

  return <>
    {mobileNav && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>}
    <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
      <Link className="brand" href="/" onClick={() => setMobileNav(false)} aria-label="Orbit home"><span className="brand-mark">o</span>orbit<span className="brand-dot">.</span></Link>
      <div className="workspace-picker"><span className="workspace-icon">S</span><span><strong>Studio workspace</strong><small>Pro plan <span>✦</span></small></span><span className="muted">⌄</span></div>
      <span className="nav-label">WORKSPACE</span>
      <nav aria-label="Workspace">{navigation.map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={`nav-item ${pathname === item.href ? "active" : ""}`} onClick={() => setMobileNav(false)}><Icon name={item.icon}/>{item.name}{item.href === "/tasks" && <span className="nav-count">{allTasks.filter((task) => task.assignee === members[0] && task.status !== "Done").length}</span>}</Link>)}</nav>
      <div className="nav-label project-label">YOUR PROJECTS<button aria-label="Create project" disabled={!ready} onClick={() => setEditingProject("new")}><Icon name="plus" size={15}/></button></div>
      <nav aria-label="Projects">{projects.map((project) => <Link key={project.id} href={`/projects/${project.id}`} aria-current={selectedProject?.id === project.id ? "page" : undefined} className={`nav-item ${selectedProject?.id === project.id ? "active" : ""}`} onClick={() => setMobileNav(false)}><span className="project-dot" style={{ background: project.color }}/>{project.name}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="workspace-note"><span>✧ Room for your next big idea</span><p>Bring a little clarity to the way your team works.</p><button disabled={!ready} onClick={() => setEditingProject("new")}>Start a new project <Icon name="arrow" size={15}/></button></div><button className="nav-item" onClick={() => setDark(!dark)}><Icon name="sun"/>{dark ? "Light appearance" : "Dark appearance"}</button><div className="profile"><span className="avatar">AM</span><span><strong>Alex Morgan</strong><small>Workspace admin</small></span></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><button className="mobile-menu" aria-label="Toggle navigation" aria-expanded={mobileNav} onClick={() => setMobileNav(!mobileNav)}>☰</button><Link href="/">Workspace</Link><span>/</span><strong>{title}</strong></div><div className="top-actions"><form className="search" onSubmit={search} role="search"><Icon name="search" size={17}/><input name="q" aria-label="Search tasks" placeholder="Search anything..." type="search"/><button type="submit" aria-label="Submit search"><kbd>↵</kbd></button></form><Link className="icon-button notification" href="/activity" aria-label="Open activity feed"><Icon name="bell"/><i/></Link><span className="avatar small">AM</span></div></header>
      <main className="main-content">
        {error && ready && <div role="alert" className="error-banner">{error}<button onClick={retrySave}>Retry save</button></div>}
        <div className="save-state" aria-live="polite">{!ready ? "Loading saved workspace..." : saving ? "Saving changes..." : error ? "Changes are not saved" : "All changes saved locally"}</div>
        {children}
        <footer className="page-footer"><span><span className="online-dot"/> A little more organized. A lot more possible.</span><span>Made for your next big thing.</span></footer>
      </main>
    </div>
  </>;
}
