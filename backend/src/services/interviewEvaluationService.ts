
import type {
  IInterview,
  InterviewEvaluation,
  QuestionEvaluation,
} from "../models/Interview";

interface AnswerRubric {
  completeness: number;
  structure: number;
  specificity: number;
  relevance: number;
  communication: number;
  total: number;
}

interface ConceptMatchResult {
  matchedConcepts: string[];
  missingConcepts: string[];
  conceptCoverage: number;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countSentences(text: string): number {
  return text
    .split(/[.!?]+/)
    .filter((sentence) => sentence.trim().length > 0).length;
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "what", "when", "where", "which", "while", "would",
    "could", "should", "about", "their", "there", "these",
    "those", "this", "that", "with", "from", "have", "your",
    "does", "into", "then", "than", "them", "they", "will",
    "been", "being", "were", "was", "are", "the", "and",
    "for", "but", "not", "you", "how", "why", "who", "can",
    "use", "used", "using", "describe", "explain", "tell",
    "give", "example",
  ]);

  return [
    ...new Set(
      text
        .toLowerCase()
        .match(/\b[a-z][a-z0-9+#.-]{2,}\b/g) ?? []
    ),
  ].filter((word) => !stopWords.has(word));
}

// Normalize text before comparing expected concepts.
function normalizeConcept(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Compare the candidate's answer with the question's expected concepts.
function matchExpectedConcepts(
  answer: string,
  expectedConcepts: string[] = []
): ConceptMatchResult {
  const normalizedAnswer = normalizeConcept(answer);

  const concepts = [
    ...new Set(
      expectedConcepts
        .map((concept) => concept.trim())
        .filter(Boolean)
    ),
  ];

  const matchedConcepts: string[] = [];
  const missingConcepts: string[] = [];

  for (const concept of concepts) {
    const normalizedConcept = normalizeConcept(concept);

    if (
      normalizedConcept &&
      normalizedAnswer.includes(normalizedConcept)
    ) {
      matchedConcepts.push(concept);
    } else {
      missingConcepts.push(concept);
    }
  }

  const conceptCoverage =
    concepts.length > 0
      ? Math.round(
          (matchedConcepts.length / concepts.length) * 100
        )
      : 0;

  return {
    matchedConcepts,
    missingConcepts,
    conceptCoverage,
  };
}

function calculateRubric(
  question: string,
  answer: string
): AnswerRubric {
  const normalized = answer.trim().toLowerCase();
  const words = countWords(answer);
  const sentences = countSentences(answer);

  // 1. Completeness
  let completeness = 0;

  if (words >= 10) completeness = 1;
  if (words >= 25) completeness = 2;
  if (words >= 50) completeness = 3;
  if (words >= 80) completeness = 4;

  // 2. Structure
  let structure = 0;

  if (sentences >= 2) structure = 1;
  if (sentences >= 3) structure = 2;

  const transitions =
    /\b(because|therefore|however|first|second|finally|for example|as a result|in conclusion|specifically|consequently)\b/i;

  if (sentences >= 2 && transitions.test(normalized)) {
    structure = 3;
  }

  // 3. Specificity
  const evidence =
    /\b(for example|for instance|such as|specifically|measured|increased|decreased|reduced|improved|implemented|developed|designed|achieved|resulted|percent|percentage|project|customer|team|database|application|system)\b/i;

  let specificity = 0;

  if (words >= 15) specificity = 1;
  if (words >= 30 && evidence.test(normalized)) {
    specificity = 2;
  }

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

  // 4. Relevance
  const questionKeywords = extractKeywords(question);

  const matchedKeywords = questionKeywords.filter((keyword) =>
    normalized.includes(keyword)
  );

  let relevance = 0;

  if (questionKeywords.length > 0) {
    const relevanceRatio =
      matchedKeywords.length / questionKeywords.length;

    relevance = Math.min(5, Math.round(relevanceRatio * 5));
  } else {
    relevance = words >= 10 ? 3 : 1;
  }

  // 5. Communication
  let communication = 0;

  const averageSentenceLength =
    sentences > 0 ? words / sentences : words;

  if (sentences >= 2) communication += 1;

  if (
    averageSentenceLength >= 5 &&
    averageSentenceLength <= 30
  ) {
    communication += 1;
  }

  if (/[.!?]/.test(answer.trim())) communication += 1;
  if (words >= 25) communication += 1;
  if (words >= 50) communication += 1;

  communication = Math.min(5, communication);

  return {
    completeness,
    structure,
    specificity,
    relevance,
    communication,
    total:
      completeness +
      structure +
      specificity +
      relevance +
      communication,
  };
}

function evaluateAnswer(
  questionId: string,
  questionText: string,
  answer: string,
  expectedConcepts: string[] = []
): QuestionEvaluation {
  const rubric = calculateRubric(questionText, answer);

  const conceptResults = matchExpectedConcepts(
    answer,
    expectedConcepts
  );

  const strengths: string[] = [];
  const improvements: string[] = [];

  // Completeness feedback
  if (rubric.completeness >= 3) {
    strengths.push(
      "The answer provides a reasonably developed response."
    );
  } else {
    improvements.push(
      "Expand the answer with more explanation and supporting details."
    );
  }

  // Structure feedback
  if (rubric.structure >= 2) {
    strengths.push(
      "The answer uses multiple sentences and logical transitions."
    );
  } else {
    improvements.push(
      "Organize the response into clear points with logical transitions."
    );
  }

  // Specificity feedback
  if (rubric.specificity >= 2) {
    strengths.push(
      "The answer includes indicators of practical examples or evidence."
    );
  } else {
    improvements.push(
      "Include a concrete example, action taken, or measurable outcome where relevant."
    );
  }

  // Relevance feedback
  if (rubric.relevance >= 3) {
    strengths.push(
      "The answer includes several keywords related to the interview question."
    );
  } else {
    improvements.push(
      "Address the main concepts and keywords in the interview question more directly."
    );
  }

  // Communication feedback
  if (rubric.communication >= 3) {
    strengths.push(
      "The answer demonstrates reasonable sentence structure and readability."
    );
  } else {
    improvements.push(
      "Improve clarity by using complete sentences and explaining ideas in a logical order."
    );
  }

  // Expected-concept feedback
  if (expectedConcepts.length > 0) {
    if (conceptResults.matchedConcepts.length > 0) {
      strengths.push(
        `Covered expected concepts: ${conceptResults.matchedConcepts.join(", ")}.`
      );
    }

    if (conceptResults.missingConcepts.length > 0) {
      improvements.push(
        `Review these expected concepts: ${conceptResults.missingConcepts.join(", ")}.`
      );
    }

    if (conceptResults.conceptCoverage === 100) {
      strengths.push(
        "All expected concepts were identified in the answer."
      );
    }
  }

  if (countWords(answer) < 10) {
    improvements.push(
      "Provide a fuller response that directly addresses the interview question."
    );
  }

  const feedback =
    rubric.total >= 20
      ? "Strong preliminary response across completeness, relevance, structure, specificity, and communication indicators. Technical accuracy still requires separate verification."
      : rubric.total >= 14
        ? "The response demonstrates some useful development. Improve weaker areas with clearer explanations and relevant examples."
        : "The response needs further development. Focus on answering the question directly and supporting your points with relevant details.";

  return {
    questionId,
    score: rubric.total,
    maxScore: 25,
    feedback,
    strengths,
    improvements,
    matchedConcepts: conceptResults.matchedConcepts,
    missingConcepts: conceptResults.missingConcepts,
    conceptCoverage: conceptResults.conceptCoverage,
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
    evaluateAnswer(
      question.questionId,
      question.questionText,
      question.answer ?? "",
      question.expectedConcepts ?? []
    )
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
      "Your answers demonstrate strong preliminary performance across relevance, completeness, structure, specificity, and communication. Technical correctness has not been independently verified.";
  } else if (percentage >= 60) {
    summary =
      "Your answers demonstrate developing interview readiness. Focus on improving weaker areas and including relevant practical examples.";
  } else {
    summary =
      "Your answers need further development. Practice answering questions directly, explaining concepts clearly, and supporting your answers with examples.";
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
