import type {
  IInterview,
  InterviewEvaluation,
  QuestionEvaluation,
} from "../models/Interview";

interface AnswerRubric {
  completeness: number;
  structure: number;
  specificity: number;
  total: number;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countSentences(text: string): number {
  return text
    .split(/[.!?]+/)
    .filter((sentence) => sentence.trim().length > 0).length;
}

function calculateRubric(answer: string): AnswerRubric {
  const normalized = answer.trim().toLowerCase();
  const words = countWords(answer);
  const sentences = countSentences(answer);

  // Completeness: answer length and development.
  let completeness = 0;

  if (words >= 10) completeness = 1;
  if (words >= 25) completeness = 2;
  if (words >= 50) completeness = 3;
  if (words >= 80) completeness = 4;

  // Structure: use of sentences and explanatory transitions.
  let structure = 0;

  if (sentences >= 2) structure = 1;
  if (sentences >= 3) structure = 2;

  const transitions =
    /\b(because|therefore|however|first|second|finally|for example|as a result|in conclusion|specifically)\b/i;

  if (sentences >= 2 && transitions.test(normalized)) {
    structure = 3;
  }

  // Specificity: evidence of examples, actions, or measurable outcomes.
  const evidence =
    /\b(for example|for instance|such as|specifically|measured|increased|decreased|reduced|improved|implemented|developed|designed|achieved|resulted|percent|percentage|project|customer|team|database|application|system)\b/i;

  let specificity = 0;

  if (words >= 15) specificity = 1;
  if (words >= 30 && evidence.test(normalized)) specificity = 2;

  const hasConcreteEvidence =
    /\b\d+(?:\.\d+)?%?\b/.test(normalized) ||
    /\b(for example|for instance|such as)\b/i.test(normalized);

  if (
    words >= 50 &&
    evidence.test(normalized) &&
    hasConcreteEvidence
  ) {
    specificity = 3;
  }

  return {
    completeness,
    structure,
    specificity,
    total: completeness + structure + specificity,
  };
}

function evaluateAnswer(
  questionId: string,
  answer: string
): QuestionEvaluation {
  const rubric = calculateRubric(answer);

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (rubric.completeness >= 3) {
    strengths.push("The answer provides a reasonably developed response.");
  } else {
    improvements.push(
      "Expand the answer with more explanation and supporting details."
    );
  }

  if (rubric.structure >= 2) {
    strengths.push("The answer uses multiple sentences to explain its points.");
  } else {
    improvements.push(
      "Organize the response into clear points with logical transitions."
    );
  }

  if (rubric.specificity >= 2) {
    strengths.push("The answer includes indicators of practical examples or evidence.");
  } else {
    improvements.push(
      "Include a concrete example, action taken, or measurable outcome where relevant."
    );
  }

  if (countWords(answer) < 10) {
    improvements.push(
      "Provide a fuller response that directly addresses the interview question."
    );
  }

  const feedback =
    rubric.total >= 8
      ? "The response demonstrates good length, structure, or supporting detail under this rubric. Review its accuracy and relevance before considering it interview-ready."
      : rubric.total >= 5
        ? "The response demonstrates some useful development. Improve its structure and support your points with relevant examples."
        : "The response needs further development. Explain your reasoning and include relevant details or examples.";

  return {
    questionId,
    score: rubric.total,
    maxScore: 10,
    feedback,
    strengths,
    improvements,
  };
}

export function evaluateCompletedInterview(
  interview: IInterview
): InterviewEvaluation {
  if (interview.status !== "completed") {
    throw new Error(
      "Only completed interviews can be evaluated."
    );
  }

  if (interview.questions.length === 0) {
    throw new Error(
      "This interview has no questions to evaluate."
    );
  }

  const unansweredQuestions = interview.questions.filter(
    (question) => !question.answer?.trim()
  );

  if (unansweredQuestions.length > 0) {
    throw new Error(
      "All interview questions must have saved answers before evaluation."
    );
  }

  const questionEvaluations = interview.questions.map((question) =>
    evaluateAnswer(question.questionId, question.answer ?? "")
  );

  const overallScore = questionEvaluations.reduce(
    (total, evaluation) => total + evaluation.score,
    0
  );

  const maxScore = questionEvaluations.reduce(
    (total, evaluation) => total + evaluation.maxScore,
    0
  );

  const percentage =
    maxScore > 0
      ? Math.round((overallScore / maxScore) * 100)
      : 0;

  const strengths = [
    ...new Set(
      questionEvaluations.flatMap(
        (evaluation) => evaluation.strengths
      )
    ),
  ];

  const improvements = [
    ...new Set(
      questionEvaluations.flatMap(
        (evaluation) => evaluation.improvements
      )
    ),
  ];

  let summary: string;

  if (percentage >= 80) {
    summary =
      "Your answers score well on this preliminary completeness, structure, and specificity rubric. Factual correctness and job-specific quality have not been assessed.";
  } else if (percentage >= 50) {
    summary =
      "Your answers show some development. Focus on clearer explanations and relevant supporting examples. This preliminary rubric does not assess factual correctness.";
  } else {
    summary =
      "Your answers would benefit from more explanation, structure, and supporting details. This preliminary rubric does not assess factual correctness.";
  }

  return {
    overallScore,
    maxScore,
    percentage,
    summary,
    strengths,
    improvements,
    questionEvaluations,
    evaluatedAt: new Date(),
    evaluationMethod: "rubric",
  };
}