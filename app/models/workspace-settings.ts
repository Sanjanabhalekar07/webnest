import mongoose, { Schema } from "mongoose";

const viewSchema = new Schema(
  {
    layout: { type: String, enum: ["Board", "List", "Timeline"], required: true },
    project: { type: String, required: true },
    priority: { type: String, required: true },
    status: { type: String, required: true },
    assignee: { type: String, required: true },
    label: { type: String, required: true },
    query: { type: String, required: true },
    overdue: { type: Boolean, required: true },
    sort: { type: String, enum: ["due", "title", "priority"], required: true },
  },
  { _id: false },
);

const settingsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    schemaVersion: { type: Number, required: true, default: 1 },
    columns: { type: [String], required: true },
    preferences: {
      theme: { type: String, enum: ["light", "dark"], required: true },
      views: { type: Map, of: viewSchema, default: {} },
    },
  },
  { timestamps: true },
);

export const WorkspaceSettings =
  mongoose.models.WorkspaceSettings ||
  mongoose.model("WorkspaceSettings", settingsSchema);
