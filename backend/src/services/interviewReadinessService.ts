
import type { IInterview } from "../models/Interview";

export interface InterviewReadinessSummary {
  score: number;
  label: string;
  summary: string;
  averageInterviewScore: number;
  interviewCount: number;
  lastUpdated: Date | null;
  strongestSkills: string[];
  improvementAreas: string[];
  method: string;

  // ML prediction information
  averagePredictedScore: number | null;
  predictionLabel: string;
  predictionCount: number;
  predictionNotice: string;
}

type ReadinessCandidate = {
  status?: string;
  evaluation?: {
    percentage?: number;
    strengths?: string[];
    improvements?: string[];
    mlPrediction?: {
      predictedScore?: number;
      notice?: string;
    };
  };
  completedAt?: Date | string;
  createdAt?: Date | string;
};

function uniqueStrings(values: string[]): string[] {
  return [
    ...new Set(
      values.filter(
        (value) => typeof value === "string" && value.trim().length > 0
      )
    ),
  ];
}

function getReadinessLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Interview Ready";
  if (score >= 40) return "Developing";
  return "Beginner";
}

function getPredictionLabel(score: number | null): string {
  if (score === null) return "Prediction unavailable";
  if (score >= 80) return "Excellent predicted performance";
  if (score >= 65) return "Strong predicted performance";
  if (score >= 40) return "Developing predicted performance";
  return "Needs more preparation";
}

export function estimateInterviewReadiness(
  interviews: ReadinessCandidate[]
): InterviewReadinessSummary {
  const completedInterviews = interviews.filter(
    (interview) =>
      interview.status === "completed" &&
      typeof interview.evaluation?.percentage === "number"
  );

  const predictionNotice =
    "ML predictions are experimental estimates based on available interview assessment features. They are not hiring or job-selection guarantees.";

  if (completedInterviews.length === 0) {
    return {
      score: 0,
      label: "No completed interviews yet",
      summary:
        "Complete at least one mock interview to generate your preliminary readiness profile.",
      averageInterviewScore: 0,
      interviewCount: 0,
      lastUpdated: null,
      strongestSkills: [],
      improvementAreas: [
        "Complete a mock interview to begin building your readiness profile.",
      ],
      method: "rubric-based evaluation",

      averagePredictedScore: null,
      predictionLabel: "Prediction unavailable",
      predictionCount: 0,
      predictionNotice,
    };
  }

  const scores = completedInterviews.map(
    (interview) => interview.evaluation!.percentage!
  );

  const averageInterviewScore = Math.round(
    scores.reduce((total, score) => total + score, 0) /
      scores.length
  );

  const predictions = completedInterviews
    .map((interview) => interview.evaluation?.mlPrediction?.predictedScore)
    .filter(
      (score): score is number =>
        typeof score === "number" &&
        Number.isFinite(score) &&
        score >= 0 &&
        score <= 100
    );

  const averagePredictedScore =
    predictions.length > 0
      ? Math.round(
          predictions.reduce((total, score) => total + score, 0) /
            predictions.length
        )
      : null;

  const latestInterview = [...completedInterviews].sort(
    (a, b) => {
      const aTime = new Date(
        a.completedAt ?? a.createdAt ?? 0
      ).getTime();

      const bTime = new Date(
        b.completedAt ?? b.createdAt ?? 0
      ).getTime();

      return bTime - aTime;
    }
  )[0];

  const strongestSkills = uniqueStrings(
    completedInterviews.flatMap(
      (interview) => interview.evaluation?.strengths ?? []
    )
  ).slice(0, 4);

  const improvementAreas = uniqueStrings(
    completedInterviews.flatMap(
      (interview) => interview.evaluation?.improvements ?? []
    )
  ).slice(0, 4);

  let summary =
    "Your readiness estimate is based on completed interview rubric evaluations. Continue practicing to improve your performance.";

  if (averageInterviewScore >= 80) {
    summary =
      "Your interview results indicate strong performance. Continue practicing with challenging, role-specific questions.";
  } else if (averageInterviewScore >= 65) {
    summary =
      "Your results indicate good progress. Focus on improving answer depth, examples, and communication.";
  } else if (averageInterviewScore >= 40) {
    summary =
      "Your results show developing interview skills. Practice answer structure, technical concepts, and clear explanations.";
  } else {
    summary =
      "Your current results indicate that more foundational preparation is needed. Practice core concepts and build confidence with structured answers.";
  }

  return {
    score: averageInterviewScore,
    label: getReadinessLabel(averageInterviewScore),
    summary,
    averageInterviewScore,
    interviewCount: completedInterviews.length,
    lastUpdated: latestInterview?.completedAt
      ? new Date(latestInterview.completedAt)
      : latestInterview?.createdAt
        ? new Date(latestInterview.createdAt)
        : null,
    strongestSkills:
      strongestSkills.length > 0
        ? strongestSkills
        : ["Continue practicing consistently."],
    improvementAreas:
      improvementAreas.length > 0
        ? improvementAreas
        : ["Practice stronger examples and clearer answer structure."],
    method: "rubric-based evaluation",

    averagePredictedScore,
    predictionLabel: getPredictionLabel(averagePredictedScore),
    predictionCount: predictions.length,
    predictionNotice,
  };
}
