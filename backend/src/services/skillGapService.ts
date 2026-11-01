
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
    skills?: string[];
    expectedConcepts?: string[];
  }>;
  evaluation?: {
    questionEvaluations?: Array<{
      questionId: string;
      score: number;
      maxScore: number;
      strengths: string[];
      improvements: string[];
      matchedConcepts?: string[];
      missingConcepts?: string[];
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

  return map[value.toLowerCase()] ?? value.trim();
}

function uniqueStrings(values: string[]): string[] {
  return [
    ...new Set(
      values
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    ),
  ];
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

    if (!interview.questions?.length) continue;

    const evaluation = interview.evaluation;
    if (!evaluation?.questionEvaluations?.length) continue;

    const evaluationByQuestionId = new Map(
      evaluation.questionEvaluations.map((entry) => [
        entry.questionId,
        entry,
      ])
    );

    for (const question of interview.questions) {
      const result = evaluationByQuestionId.get(question.questionId);
      if (!result || result.maxScore <= 0) continue;

      // Use actual question skills where available.
      // Fall back to the question category for older questions.
      const skills = uniqueStrings(
        (question.skills ?? []).map(normalizeSkillName)
      );

      const resolvedSkills =
        skills.length > 0
          ? skills
          : [
              normalizeSkillName(
                question.category ?? "technical"
              ),
            ];

      for (const skill of resolvedSkills) {
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

        // Missing expected concepts become specific practice topics.
        entry.weakAreas.push(
          ...(result.missingConcepts ?? []).map(
            (concept) => `Review the concept: ${concept}`
          )
        );

        const scorePercentage =
          (result.score / result.maxScore) * 100;

        if (scorePercentage < 60) {
          entry.recommendedPractice.push(
            `Strengthen your ${skill} fundamentals with beginner-level exercises and guided examples.`
          );
        } else if (scorePercentage < 80) {
          entry.recommendedPractice.push(
            `Practice intermediate ${skill} questions and explain your reasoning with practical examples.`
          );
        } else {
          entry.recommendedPractice.push(
            `Attempt advanced ${skill} questions to improve depth and consistency.`
          );
        }

        entry.recommendedPractice.push(
          ...(result.missingConcepts ?? []).map(
            (concept) => `Study and practice ${concept}.`
          )
        );

        bySkill.set(skill, entry);
      }
    }
  }

  const summaries = [...bySkill.entries()].map(
    ([skill, value]) => {
      const averageScore =
        value.totalPossible > 0
          ? Math.round(
              (value.totalScore / value.totalPossible) * 100
            )
          : 0;

      const readiness: SkillGapSummary["readiness"] =
        averageScore >= 80
          ? "Strong"
          : averageScore >= 60
            ? "Solid"
            : averageScore >= 40
              ? "Developing"
              : "Needs work";

      return {
        skill,
        assessments: value.assessments,
        averageScore,
        readiness,
        strongAreas: uniqueStrings(value.strongAreas).slice(0, 3),
        weakAreas: uniqueStrings(value.weakAreas).slice(0, 3),
        recommendedPractice: uniqueStrings(
          value.recommendedPractice
        ).slice(0, 3),
      } satisfies SkillGapSummary;
    }
  );

  return summaries.sort(
    (a, b) => a.averageScore - b.averageScore
  );
}
