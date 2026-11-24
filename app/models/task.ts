import mongoose, { Schema } from "mongoose";

const checklistSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    done: { type: Boolean, required: true },
  },
  { _id: false },
);
const commentSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    date: { type: String, required: true },
  },
  { _id: false },
);
const attachmentSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number, required: true, min: 1 },
    type: { type: String, required: true },
    date: { type: String, required: true },
  },
  { _id: false },
);

const taskSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    taskId: { type: String, required: true },
    projectId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true },
    status: { type: String, required: true },
    priority: { type: String, enum: ["Low", "Medium", "High", "Urgent"], required: true },
    assignee: { type: String, required: true },
    dueDate: { type: String, required: true },
    startDate: { type: String, required: true },
    labels: { type: String, required: true },
    sprint: { type: String, required: true },
    checklist: { type: [checklistSchema], default: [] },
    comments: { type: [commentSchema], default: [] },
    parentId: { type: String, default: null },
    dependencies: { type: [String], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
  },
  { timestamps: true },
);
taskSchema.index({ userId: 1, taskId: 1 }, { unique: true });

export const TaskRecord =
  mongoose.models.TaskRecord || mongoose.model("TaskRecord", taskSchema, "tasks");
