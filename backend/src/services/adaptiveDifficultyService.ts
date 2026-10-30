
import { Interview } from "../models/Interview";

export type InterviewDifficulty =
  | "beginner"
  | "intermediate"
  | "advanced";

export interface AdaptiveDifficultyResult {
  recommendedDifficulty: InterviewDifficulty;
  previousAverageScore: number | null;
  completedInterviewCount: number;
  reason: string;
}

export async function recommendAdaptiveDifficulty(
  candidateId: string
): Promise<AdaptiveDifficultyResult> {
  const completedInterviews = await Interview.find({
    candidateId,
    status: "completed",
    "evaluation.percentage": { $exists: true },
  })
    .select("evaluation.percentage")
    .sort({ completedAt: -1 })
    .limit(5)
    .lean();

  if (completedInterviews.length === 0) {
    return {
      recommendedDifficulty: "beginner",
      previousAverageScore: null,
      completedInterviewCount: 0,
      reason:
        "Complete your first interview to receive an adaptive difficulty recommendation.",
    };
  }

  const scores = completedInterviews
    .map((interview) => interview.evaluation?.percentage)
    .filter(
      (score): score is number =>
        typeof score === "number" && Number.isFinite(score)
    );

  if (scores.length === 0) {
    return {
      recommendedDifficulty: "beginner",
      previousAverageScore: null,
      completedInterviewCount: 0,
      reason: "Previous interview scores are not available yet.",
    };
  }

  const averageScore =
    scores.reduce((total, score) => total + score, 0) / scores.length;

  let recommendedDifficulty: InterviewDifficulty;
  let reason: string;

  if (averageScore >= 80) {
    recommendedDifficulty = "advanced";
    reason =
      "Your recent performance is strong. Try advanced questions to challenge yourself.";
  } else if (averageScore >= 50) {
    recommendedDifficulty = "intermediate";
    reason =
      "Your performance is developing well. Continue practicing at an intermediate level.";
  } else {
    recommendedDifficulty = "beginner";
    reason =
      "Strengthen your fundamentals with beginner-level questions before increasing difficulty.";
  }

  return {
    recommendedDifficulty,
    previousAverageScore: Math.round(averageScore * 100) / 100,
    completedInterviewCount: scores.length,
    reason,
  };
}
