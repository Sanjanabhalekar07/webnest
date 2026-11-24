import mongoose, { Schema } from "mongoose";

const activitySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    activityId: { type: String, required: true },
    text: { type: String, required: true },
    date: { type: String, required: true },
    readAt: { type: String, default: null },
  },
  { timestamps: true },
);
activitySchema.index({ userId: 1, activityId: 1 }, { unique: true });

export const ActivityRecord =
  mongoose.models.ActivityRecord ||
  mongoose.model("ActivityRecord", activitySchema, "workspace_activity");
