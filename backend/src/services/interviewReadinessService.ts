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
}

type ReadinessCandidate = {
  status?: string;
  evaluation?: {
    percentage?: number;
    strengths?: string[];
    improvements?: string[];
  };
  completedAt?: Date | string;
  createdAt?: Date | string;
};

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

export function estimateInterviewReadiness(
  interviews: ReadinessCandidate[]
): InterviewReadinessSummary {
  const completedInterviews = interviews.filter(
    (interview) => interview.status === "completed" && interview.evaluation
  );

  if (completedInterviews.length === 0) {
    return {
      score: 0,
      label: "No completed interviews yet",
      summary:
        "Complete at least one mock interview to generate a preliminary readiness estimate based on actual evaluation results.",
      averageInterviewScore: 0,
      interviewCount: 0,
      lastUpdated: null,
      strongestSkills: [],
      improvementAreas: [
        "Finish a mock interview to start building your readiness profile.",
      ],
      method: "preliminary rubric-based estimate",
    };
  }

  const scores = completedInterviews
    .map((interview) => interview.evaluation?.percentage)
    .filter((score): score is number => typeof score === "number");

  const averageInterviewScore = Math.round(
    scores.reduce((total, score) => total + score, 0) / scores.length
  );

  const latestInterview = [...completedInterviews].sort((a, b) => {
    const bTime = new Date(b.completedAt ?? b.createdAt ?? Date.now()).getTime();
    const aTime = new Date(a.completedAt ?? a.createdAt ?? Date.now()).getTime();
    return bTime - aTime;
  })[0];

  const strongestSkills = uniqueStrings(
    completedInterviews.flatMap((interview) => interview.evaluation?.strengths ?? [])
  ).slice(0, 4);

  const improvementAreas = uniqueStrings(
    completedInterviews.flatMap((interview) => interview.evaluation?.improvements ?? [])
  ).slice(0, 4);

  let label = "Developing readiness";
  let summary =
    "This preliminary estimate is based on your recent completed interview evaluations and is meant to guide practice, not predict hiring outcomes.";

  if (averageInterviewScore >= 80) {
    label = "Strong readiness";
    summary =
      "Your completed interview results suggest strong readiness based on rubric-based evaluation. Continue practicing with targeted challenges to keep improving.";
  } else if (averageInterviewScore >= 60) {
    label = "Moderate readiness";
    summary =
      "Your interview results show a solid starting point. Focus on stronger examples, structure, and role-specific depth to improve your readiness.";
  } else if (averageInterviewScore >= 40) {
    label = "Developing readiness";
    summary =
      "Your scores show a developing baseline. Prioritize clearer answers, deeper explanations, and more concrete examples in practice interviews.";
  } else if (averageInterviewScore > 0) {
    label = "Needs foundational practice";
    summary =
      "Your current results indicate a need for more structured preparation. Start with foundational role-aligned questions and build confidence with repeated practice.";
  }

  return {
    score: averageInterviewScore,
    label,
    summary,
    averageInterviewScore,
    interviewCount: completedInterviews.length,
    lastUpdated:
      latestInterview?.completedAt || latestInterview?.createdAt
        ? new Date(
            (latestInterview?.completedAt ?? latestInterview?.createdAt) as
              | string
              | Date
          )
        : null,
    strongestSkills: strongestSkills.length > 0 ? strongestSkills : ["Practice consistency"],
    improvementAreas:
      improvementAreas.length > 0
        ? improvementAreas
        : ["Add stronger examples and clearer structure to your answers."],
    method: "preliminary rubric-based estimate",
  };
}
