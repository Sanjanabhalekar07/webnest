export const statuses = [
  "Backlog",
  "To do",
  "In progress",
  "In review",
  "Done",
] as const;
export type Status = string;
export type Attachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  date: string;
};
export type TaskViewPreferences = {
  layout: "Board" | "List" | "Timeline";
  project: string;
  priority: string;
  status: string;
  assignee: string;
  label: string;
  query: string;
  overdue: boolean;
  sort: "due" | "title" | "priority";
};
export const defaultTaskView: TaskViewPreferences = {
  layout: "Board",
  project: "all",
  priority: "all",
  status: "all",
  assignee: "all",
  label: "all",
  query: "",
  overdue: false,
  sort: "due",
};
export type Project = {
  id: string;
  name: string;
  description: string;
  color: string;
  archived: boolean;
};
export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: Status;
  priority: "Low" | "Medium" | "High" | "Urgent";
  assignee: string;
  dueDate: string;
  labels: string;
  sprint: string;
  checklist: { id: string; title: string; done: boolean }[];
  comments: { id: string; text: string; date: string }[];
  parentId: string | null;
  dependencies: string[];
  attachments: Attachment[];
};
export type SprintSnapshot = { date: string; total: number; remaining: number };
export type Sprint = {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  state: "planned" | "active" | "completed";
  startedAt: string | null;
  completedAt: string | null;
  baselineTotal: number | null;
  initialRemaining: number | null;
  snapshots: SprintSnapshot[];
  closedTasks: Pick<Task, "id" | "title" | "status" | "assignee">[];
};
export type SprintDraft = Pick<
  Sprint,
  "id" | "projectId" | "name" | "goal" | "startDate" | "endDate"
>;
export type WorkspaceData = {
  schemaVersion: 3;
  sprints: Sprint[];
  columns: string[];
  preferences: {
    theme: "light" | "dark";
    views: Record<string, TaskViewPreferences>;
  };
  projects: Project[];
  tasks: Task[];
  activity: { id: string; text: string; date: string }[];
};
export const members = [
  "Alex Morgan",
  "Jamie Chen",
  "Sam Wilson",
  "Taylor Kim",
];
export const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("");
export function seedData(): WorkspaceData {
  const date = (offset: number) => {
    const value = new Date();
    value.setDate(value.getDate() + offset);
    return value.toLocaleDateString("en-CA");
  };
  const projects: Project[] = [
    {
      id: "website",
      name: "Website redesign",
      description: "A fresh digital experience for our next chapter.",
      color: "#7765e8",
      archived: false,
    },
    {
      id: "mobile",
      name: "Mobile application",
      description: "Bring the workspace wherever work happens.",
      color: "#e6a34f",
      archived: false,
    },
    {
      id: "brand",
      name: "Brand refresh",
      description: "Make every touchpoint feel unmistakably us.",
      color: "#56a992",
      archived: false,
    },
  ];
  const rows: [string, string, Status, Task["priority"], number, string][] = [
    [
      "website",
      "Design the new dashboard experience",
      "In progress",
      "High",
      2,
      "Design",
    ],
    [
      "website",
      "Build a reusable component library",
      "In progress",
      "High",
      4,
      "Development",
    ],
    [
      "website",
      "Review homepage wireframes",
      "In review",
      "Medium",
      1,
      "Design",
    ],
    ["website", "Map the customer journey", "Done", "Medium", -2, "Research"],
    ["website", "Update navigation architecture", "To do", "High", 5, "Design"],
    [
      "website",
      "Audit website accessibility",
      "Backlog",
      "Medium",
      8,
      "Research",
    ],
    [
      "mobile",
      "Implement onboarding flow",
      "In progress",
      "High",
      -1,
      "Development",
    ],
    ["mobile", "Test notification preferences", "To do", "Low", 6, "QA"],
    [
      "mobile",
      "Explore offline sync patterns",
      "Done",
      "Medium",
      -3,
      "Research",
    ],
    ["brand", "Create brand guidelines", "In review", "High", 3, "Branding"],
    ["brand", "Finalize the color palette", "Done", "Medium", -1, "Design"],
    ["brand", "Prepare launch assets", "To do", "Urgent", 7, "Branding"],
  ];
  return {
    schemaVersion: 3,
    sprints: projects.map((project) => ({
      id: `sprint-${project.id}-01`,
      projectId: project.id,
      name: "Sprint 01",
      goal: "Deliver the next useful step for this project.",
      startDate: date(0),
      endDate: date(13),
      state: "planned",
      startedAt: null,
      completedAt: null,
      baselineTotal: null,
      initialRemaining: null,
      snapshots: [],
      closedTasks: [],
    })),
    columns: [...statuses],
    preferences: { theme: "light", views: {} },
    projects,
    tasks: rows.map((row, index) => ({
      id: `ORB-${101 + index}`,
      projectId: row[0],
      title: row[1],
      description: "Collaborate with the team and deliver a thoughtful result.",
      status: row[2],
      priority: row[3],
      dueDate: date(row[4]),
      labels: row[5],
      assignee: members[index % members.length],
      sprint: index < 8 ? `sprint-${row[0]}-01` : "Backlog",
      checklist: [],
      comments: [],
      parentId: null,
      dependencies: [],
      attachments: [],
    })),
    activity: [
      {
        id: "welcome",
        text: "Jamie completed Map the customer journey",
        date: new Date().toISOString(),
      },
      {
        id: "review",
        text: "Taylor moved Create brand guidelines to In review",
        date: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
  };
}
