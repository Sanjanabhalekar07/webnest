import mongoose, { Schema } from "mongoose";

// Compatibility model used only to migrate old monolithic workspace records.
const workspaceSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    schemaVersion: { type: Number, required: true, default: 5 },
    data: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, minimize: false },
);

export const LegacyWorkspace =
  mongoose.models.Workspace ||
  mongoose.model("Workspace", workspaceSchema, "workspaces");
