import mongoose, { Schema } from "mongoose";

const snapshotSchema = new Schema(
  {
    date: { type: String, required: true },
    total: { type: Number, required: true },
    remaining: { type: Number, required: true },
  },
  { _id: false },
);
const closedTaskSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    status: { type: String, required: true },
    assignee: { type: String, required: true },
  },
  { _id: false },
);
const sprintSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sprintId: { type: String, required: true },
    projectId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    goal: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    state: { type: String, enum: ["planned", "active", "completed"], required: true },
    startedAt: { type: String, default: null },
    completedAt: { type: String, default: null },
    baselineTotal: { type: Number, default: null },
    initialRemaining: { type: Number, default: null },
    snapshots: { type: [snapshotSchema], default: [] },
    closedTasks: { type: [closedTaskSchema], default: [] },
  },
  { timestamps: true },
);
sprintSchema.index({ userId: 1, sprintId: 1 }, { unique: true });

export const SprintRecord =
  mongoose.models.SprintRecord ||
  mongoose.model("SprintRecord", sprintSchema, "sprints");
