import { connectToDatabase } from "./mongodb";
import { seedData, type WorkspaceData } from "./model";
import { parseWorkspace } from "./workspace-rules";
import { recordActiveSprints } from "./sprint-rules";
import { LegacyWorkspace } from "../models/workspace";
import { WorkspaceSettings } from "../models/workspace-settings";
import { ProjectRecord } from "../models/project";
import { TaskRecord } from "../models/task";
import { SprintRecord } from "../models/sprint";
import { ActivityRecord } from "../models/activity";

async function upsertDocuments(userId: string, data: WorkspaceData) {
  const writes = await Promise.all([
    ProjectRecord.bulkWrite(
      data.projects.map((project) => ({
        updateOne: {
          filter: { userId, projectId: project.id },
          update: {
            $set: {
              name: project.name,
              description: project.description,
              color: project.color,
              archived: project.archived,
              members: project.members,
            },
          },
          upsert: true,
        },
      })),
    ),
    TaskRecord.bulkWrite(
      data.tasks.map((task) => {
        const { id, ...fields } = task;
        return {
          updateOne: {
            filter: { userId, taskId: id },
            update: { $set: fields },
            upsert: true,
          },
        };
      }),
    ),
    SprintRecord.bulkWrite(
      data.sprints.map((sprint) => {
        const { id, ...fields } = sprint;
        return {
          updateOne: {
            filter: { userId, sprintId: id },
            update: { $set: fields },
            upsert: true,
          },
        };
      }),
    ),
    ActivityRecord.bulkWrite(
      data.activity.map((activity) => {
        const { id, ...fields } = activity;
        return {
          updateOne: {
            filter: { userId, activityId: id },
            update: { $set: fields },
            upsert: true,
          },
        };
      }),
    ),
  ]);
  return writes;
}

async function persistWorkspace(userId: string, data: WorkspaceData) {
  await upsertDocuments(userId, data);

  await WorkspaceSettings.updateOne(
    { userId },
    {
      $set: {
        schemaVersion: 1,
        columns: data.columns,
        preferences: data.preferences,
      },
    },
    { upsert: true, runValidators: true },
  );

  await Promise.all([
    ProjectRecord.deleteMany({
      userId,
      projectId: { $nin: data.projects.map((project) => project.id) },
    }),
    TaskRecord.deleteMany({
      userId,
      taskId: { $nin: data.tasks.map((task) => task.id) },
    }),
    SprintRecord.deleteMany({
      userId,
      sprintId: { $nin: data.sprints.map((sprint) => sprint.id) },
    }),
    ActivityRecord.deleteMany({
      userId,
      activityId: { $nin: data.activity.map((activity) => activity.id) },
    }),
  ]);
}

function viewsRecord(value: unknown) {
  if (value instanceof Map) return Object.fromEntries(value.entries());
  return value ?? {};
}

async function readSeparatedWorkspace(userId: string): Promise<WorkspaceData | null> {
  const [settings, projects, tasks, sprints, activity] = await Promise.all([
    WorkspaceSettings.findOne({ userId }).lean(),
    ProjectRecord.find({ userId }).lean(),
    TaskRecord.find({ userId }).lean(),
    SprintRecord.find({ userId }).lean(),
    ActivityRecord.find({ userId }).lean(),
  ]);
  if (!settings) return null;

  return parseWorkspace({
    schemaVersion: 5,
    columns: settings.columns,
    preferences: {
      theme: settings.preferences.theme,
      views: viewsRecord(settings.preferences.views),
    },
    projects: projects.map(({ projectId, ...project }) => ({
      ...project,
      id: projectId,
    })),
    tasks: tasks.map(({ taskId, ...task }) => ({ ...task, id: taskId })),
    sprints: sprints.map(({ sprintId, ...sprint }) => ({
      ...sprint,
      id: sprintId,
    })),
    activity: activity.map(({ activityId, ...item }) => ({
      ...item,
      id: activityId,
    })),
  });
}

export async function loadWorkspace(userId: string): Promise<WorkspaceData> {
  await connectToDatabase();

  const legacy = await LegacyWorkspace.findOne({ userId }).lean();
  if (legacy) {
    const migrated = recordActiveSprints(parseWorkspace(legacy.data));
    await persistWorkspace(userId, migrated);
    await LegacyWorkspace.deleteOne({ _id: legacy._id });
    return migrated;
  }

  const saved = await readSeparatedWorkspace(userId);
  if (!saved) {
    const initial = recordActiveSprints(parseWorkspace(seedData()));
    await persistWorkspace(userId, initial);
    return initial;
  }

  const normalized = recordActiveSprints(saved);
  if (JSON.stringify(normalized) !== JSON.stringify(saved))
    await persistWorkspace(userId, normalized);
  return normalized;
}

export async function saveWorkspace(
  userId: string,
  data: unknown,
): Promise<void> {
  const validated = parseWorkspace(data);
  await connectToDatabase();
  await persistWorkspace(userId, validated);
}
