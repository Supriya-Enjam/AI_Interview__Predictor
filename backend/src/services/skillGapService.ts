import type { IInterview } from "../models/Interview";

export interface SkillGapSummary {
  skill: string;
  assessments: number;
  averageScore: number;
  readiness: "Strong" | "Solid" | "Developing" | "Needs work";
  strongAreas: string[];
  weakAreas: string[];
  recommendedPractice: string[];
}

type CandidateInterview = {
  status?: string;
  questions?: Array<{
    questionId: string;
    category?: string;
  }>;
  evaluation?: {
    questionEvaluations?: Array<{
      questionId: string;
      score: number;
      maxScore: number;
      strengths: string[];
      improvements: string[];
    }>;
  };
};

function normalizeSkillName(value: string): string {
  const map: Record<string, string> = {
    technical: "Technical reasoning",
    behavioral: "Behavioral communication",
    hr: "HR fit",
    situational: "Situational judgment",
    coding: "Coding and problem solving",
  };

  return map[value] ?? value;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter((item) => item.trim().length > 0))];
}

export function summarizeSkillGaps(
  interviews: CandidateInterview[]
): SkillGapSummary[] {
  const bySkill = new Map<
    string,
    {
      totalScore: number;
      totalPossible: number;
      assessments: number;
      strongAreas: string[];
      weakAreas: string[];
      recommendedPractice: string[];
    }
  >();

  for (const interview of interviews) {
    if (interview.status !== "completed") continue;

    if (!interview.questions || interview.questions.length === 0) continue;

    const evaluation = interview.evaluation;
    if (!evaluation || !evaluation.questionEvaluations) continue;

    const evaluationByQuestionId = new Map(
      evaluation.questionEvaluations.map((entry) => [entry.questionId, entry])
    );

    for (const question of interview.questions) {
      const result = evaluationByQuestionId.get(question.questionId);
      if (!result) continue;

      const skill = normalizeSkillName(question.category ?? "technical");
      const entry = bySkill.get(skill) ?? {
        totalScore: 0,
        totalPossible: 0,
        assessments: 0,
        strongAreas: [],
        weakAreas: [],
        recommendedPractice: [],
      };

      entry.totalScore += result.score;
      entry.totalPossible += result.maxScore;
      entry.assessments += 1;
      entry.strongAreas.push(...result.strengths);
      entry.weakAreas.push(...result.improvements);

      if (result.score < result.maxScore * 0.7) {
        entry.recommendedPractice.push(
          `Practice more ${skill.toLowerCase()} questions using clear examples and structured reasoning.`
        );
      } else {
        entry.recommendedPractice.push(
          `Continue practicing ${skill.toLowerCase()} scenarios with a stronger focus on nuance and detail.`
        );
      }

      bySkill.set(skill, entry);
    }
  }

  const summaries = [...bySkill.entries()].map(([skill, value]) => {
    const averageScore =
      value.assessments > 0
        ? Math.round((value.totalScore / value.totalPossible) * 100)
        : 0;

    const readiness: SkillGapSummary["readiness"] =
      averageScore >= 80
        ? "Strong"
        : averageScore >= 60
          ? "Solid"
          : averageScore >= 40
            ? "Developing"
            : "Needs work";

    const strongAreas = uniqueStrings(value.strongAreas).slice(0, 3);
    const weakAreas = uniqueStrings(value.weakAreas).slice(0, 3);
    const recommendedPractice = uniqueStrings(value.recommendedPractice).slice(0, 3);

    return {
      skill,
      assessments: value.assessments,
      averageScore,
      readiness,
      strongAreas,
      weakAreas,
      recommendedPractice,
    } satisfies SkillGapSummary;
  });

  return summaries.sort((a, b) => b.averageScore - a.averageScore);
}
