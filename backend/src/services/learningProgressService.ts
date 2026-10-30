
import mongoose, { Types } from "mongoose";
import {
  LearningProgress,
  type ILearningTask,
} from "../models/LearningProgress";

/** Retrieve the full learning progress document for a user. */
export async function getProgress(userId: string) {
  return LearningProgress.findOne({ userId }).lean();
}

/** Add a new learning task to the user's progress. */
export async function addTask(
  userId: string,
  taskData: Omit<ILearningTask, "_id">
): Promise<ILearningTask> {
  const updated = await LearningProgress.findOneAndUpdate(
    { userId },
    {
      $push: { tasks: taskData },
      $setOnInsert: { userId },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  ).lean();

  const added = updated?.tasks?.[updated.tasks.length - 1];

  if (!added) {
    throw new Error("Task creation failed.");
  }

  return added;
}

/** Update permitted fields of a task belonging to the user. */
export async function updateTask(
  userId: string,
  taskId: string,
  updates: Partial<
    Pick<
      ILearningTask,
      | "title"
      | "description"
      | "priority"
      | "status"
      | "estimatedDuration"
      | "progress"
    >
  >
): Promise<ILearningTask | null> {
  if (!Types.ObjectId.isValid(taskId)) {
    return null;
  }

  const updateFields: Record<string, unknown> = {};

  if (updates.title !== undefined) {
    updateFields["tasks.$.title"] = updates.title;
  }

  if (updates.description !== undefined) {
    updateFields["tasks.$.description"] = updates.description;
  }

  if (updates.priority !== undefined) {
    updateFields["tasks.$.priority"] = updates.priority;
  }

  if (updates.status !== undefined) {
    updateFields["tasks.$.status"] = updates.status;

    updateFields["tasks.$.completedAt"] =
      updates.status === "completed" ? new Date() : null;
  }

  if (updates.estimatedDuration !== undefined) {
    updateFields["tasks.$.estimatedDuration"] =
      updates.estimatedDuration;
  }

  if (updates.progress !== undefined) {
    updateFields["tasks.$.progress"] = updates.progress;
  }

  if (Object.keys(updateFields).length === 0) {
    return null;
  }

  const progress = await LearningProgress.findOneAndUpdate(
    {
      userId,
      "tasks._id": new Types.ObjectId(taskId),
    },
    {
      $set: updateFields,
    },
    {
      new: true,
      runValidators: true,
    }
  ).lean();

  return (
    progress?.tasks?.find(
      (task) => task._id.toString() === taskId
    ) ?? null
  );
}

/** Delete a task belonging to the user. */
export async function deleteTask(
  userId: string,
  taskId: string
): Promise<boolean> {
  if (!Types.ObjectId.isValid(taskId)) {
    return false;
  }

  const result = await LearningProgress.updateOne(
    {
      userId,
      "tasks._id": new Types.ObjectId(taskId),
    },
    {
      $pull: {
        tasks: { _id: new Types.ObjectId(taskId) },
      },
    }
  );

  return result.modifiedCount > 0;
}

/** Legacy: replace the completedTopics array. */
export async function setCompletedTopics(
  userId: string,
  topics: string[]
) {
  return LearningProgress.findOneAndUpdate(
    { userId },
    {
      $set: { completedTopics: topics },
      $setOnInsert: { userId },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  ).lean();
}
