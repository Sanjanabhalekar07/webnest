import mongoose, { Schema } from "mongoose";

const memberSchema = new Schema(
  {
    name: { type: String, required: true },
    role: { type: String, enum: ["Owner", "Member", "Viewer"], required: true },
  },
  { _id: false },
);

const projectSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    projectId: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, required: true },
    color: { type: String, required: true, match: /^#[0-9a-f]{6}$/i },
    archived: { type: Boolean, required: true, default: false },
    members: { type: [memberSchema], required: true, default: [] },
  },
  { timestamps: true },
);
projectSchema.index({ userId: 1, projectId: 1 }, { unique: true });

export const ProjectRecord =
  mongoose.models.ProjectRecord ||
  mongoose.model("ProjectRecord", projectSchema, "projects");
