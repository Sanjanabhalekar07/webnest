import {
  defaultProjectMembers,
  members,
  type ProjectMember,
  type WorkspaceData,
} from "./model";

export function validateMembership(data: WorkspaceData) {
  for (const project of data.projects) {
    if (
      !project.members.length ||
      !project.members.some((member) => member.role === "Owner")
    )
      throw new Error("Every project must keep at least one Owner.");
    const names = new Set<string>();
    for (const member of project.members) {
      if (
        !member.name.trim() ||
        member.name !== member.name.trim() ||
        member.name.length > 80 ||
        names.has(member.name) ||
        !["Owner", "Member", "Viewer"].includes(member.role)
      )
        throw new Error(
          "Project members need unique names of up to 80 characters and a valid role.",
        );
      names.add(member.name);
    }
  }
  for (const task of data.tasks) {
    const member = data.projects
      .find((project) => project.id === task.projectId)
      ?.members.find((member) => member.name === task.assignee);
    if (!member || member.role === "Viewer")
      throw new Error(
        `Choose an Owner or Member of this project to assign ${task.title}.`,
      );
  }
}

export function changeProjectMembers(
  data: WorkspaceData,
  projectId: string,
  members: ProjectMember[],
  reassign: Record<string, string> = {},
): WorkspaceData {
  if (!data.projects.some((project) => project.id === projectId))
    throw new Error("This project no longer exists.");
  const eligible = new Set(
    members
      .filter((member) => member.role !== "Viewer")
      .map((member) => member.name),
  );
  const tasks = data.tasks.map((task) => {
    if (task.projectId !== projectId || eligible.has(task.assignee))
      return task;
    const replacement = Object.prototype.hasOwnProperty.call(
      reassign,
      task.assignee,
    )
      ? reassign[task.assignee]
      : "";
    if (!eligible.has(replacement))
      throw new Error(
        `Choose a current Owner or Member to take ${task.assignee}'s tasks before removing them or changing them to Viewer.`,
      );
    return { ...task, assignee: replacement };
  });
  const next = {
    ...data,
    projects: data.projects.map((project) =>
      project.id === projectId
        ? { ...project, members: members.map((member) => ({ ...member })) }
        : project,
    ),
    tasks,
  };
  validateMembership(next);
  return next;
}

export function migrateMembership(data: WorkspaceData): WorkspaceData {
  return {
    ...data,
    projects: data.projects.map((project) => ({
      ...project,
      members: defaultProjectMembers([
        ...members,
        ...data.tasks
          .filter((task) => task.projectId === project.id)
          .map((task) => task.assignee),
      ]),
    })),
  };
}
