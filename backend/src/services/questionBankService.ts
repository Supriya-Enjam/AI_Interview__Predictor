
import { QuestionBankItem } from "../models/QuestionBank";
import type {
  QuestionBankCategory,
  QuestionBankDifficulty,
} from "../models/QuestionBank";

// =========================================================
// TYPES
// =========================================================

export interface QuestionBankEntry {
  questionText: string;
  category: QuestionBankCategory;
  difficulty: QuestionBankDifficulty;
  skills: string[];
  expectedConcepts: string[];
  roleContext?: string;
}

type DefaultQuestion = QuestionBankEntry;

// =========================================================
// HELPERS
// =========================================================

function randomPick<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

// =========================================================
// DEFAULT QUESTION BANK
// =========================================================

const defaultQuestions: DefaultQuestion[] = [
  // TECHNICAL
  {
    category: "technical",
    difficulty: "beginner",
    questionText: "Explain the difference between a variable and a constant.",
    skills: ["Programming fundamentals"],
    expectedConcepts: ["variables", "constants", "assignment", "scope"],
  },
  {
    category: "technical",
    difficulty: "beginner",
    questionText: "What is the difference between an array and an object?",
    skills: ["JavaScript", "Data structures"],
    expectedConcepts: ["arrays", "objects", "index", "key-value pairs"],
  },
  {
    category: "technical",
    difficulty: "intermediate",
    questionText: "How would you debug a performance issue in an application?",
    skills: ["Debugging", "Performance analysis"],
    expectedConcepts: ["profiling", "bottlenecks", "metrics", "optimization"],
  },
  {
    category: "technical",
    difficulty: "intermediate",
    questionText: "Explain how REST APIs work and how HTTP methods are used.",
    skills: ["API development", "Backend development"],
    expectedConcepts: ["REST", "HTTP methods", "GET", "POST", "status codes"],
  },
  {
    category: "technical",
    difficulty: "advanced",
    questionText: "How would you design a scalable backend application?",
    skills: ["System design", "Backend architecture"],
    expectedConcepts: [
      "scalability",
      "load balancing",
      "caching",
      "database optimization",
    ],
  },

  // BEHAVIORAL
  {
    category: "behavioral",
    difficulty: "beginner",
    questionText: "Tell me about yourself and your professional strengths.",
    skills: ["Communication", "Self-awareness"],
    expectedConcepts: ["background", "strengths", "experience", "career goals"],
  },
  {
    category: "behavioral",
    difficulty: "intermediate",
    questionText: "Describe a challenging problem you solved and the steps you took.",
    skills: ["Communication", "Problem solving"],
    expectedConcepts: ["situation", "analysis", "ownership", "solution", "outcome"],
  },
  {
    category: "behavioral",
    difficulty: "intermediate",
    questionText: "Tell me about a time you worked with a team to achieve a goal.",
    skills: ["Teamwork", "Collaboration"],
    expectedConcepts: ["collaboration", "communication", "responsibility", "shared goal"],
  },
  {
    category: "behavioral",
    difficulty: "advanced",
    questionText: "Describe a time you received critical feedback and how you responded.",
    skills: ["Adaptability", "Growth mindset"],
    expectedConcepts: ["feedback", "self-reflection", "improvement", "adaptability"],
  },

  // HR
  {
    category: "hr",
    difficulty: "beginner",
    questionText: "Why are you interested in this role and how does it fit your long-term goals?",
    skills: ["Motivation", "Career planning"],
    expectedConcepts: ["career goals", "role fit", "motivation", "self-awareness"],
  },
  {
    category: "hr",
    difficulty: "intermediate",
    questionText: "What are your greatest strengths and one area you are working to improve?",
    skills: ["Self-awareness", "Professional development"],
    expectedConcepts: ["strengths", "weaknesses", "self-awareness", "improvement plan"],
  },
  {
    category: "hr",
    difficulty: "advanced",
    questionText: "Why should we select you over other candidates?",
    skills: ["Confidence", "Communication"],
    expectedConcepts: ["relevant skills", "experience", "achievements", "role requirements"],
  },

  // SITUATIONAL
  {
    category: "situational",
    difficulty: "beginner",
    questionText: "How would you handle a disagreement with a teammate?",
    skills: ["Conflict resolution", "Communication"],
    expectedConcepts: ["active listening", "respect", "communication", "resolution"],
  },
  {
    category: "situational",
    difficulty: "intermediate",
    questionText: "How would you manage multiple tasks with competing deadlines?",
    skills: ["Time management", "Prioritization"],
    expectedConcepts: ["prioritization", "urgency", "planning", "time management"],
  },
  {
    category: "situational",
    difficulty: "advanced",
    questionText: "A major change is proposed late in a delivery cycle. How would you assess the impact and communicate trade-offs?",
    skills: ["Decision making", "Stakeholder management"],
    expectedConcepts: ["trade-offs", "risk assessment", "impact analysis", "communication"],
  },

  // CODING
  {
    category: "coding",
    difficulty: "beginner",
    questionText: "How would you find the largest number in an array?",
    skills: ["Problem solving", "Arrays", "Programming"],
    expectedConcepts: ["array traversal", "comparison", "maximum value", "time complexity"],
  },
  {
    category: "coding",
    difficulty: "intermediate",
    questionText: "How would you find duplicate elements in an array efficiently?",
    skills: ["Data structures", "Algorithm design"],
    expectedConcepts: ["hash set", "duplicate detection", "array traversal", "time complexity"],
  },
  {
    category: "coding",
    difficulty: "intermediate",
    questionText: "Explain how you would reverse a linked list.",
    skills: ["Data structures", "Algorithms"],
    expectedConcepts: ["linked list", "pointers", "previous node", "next node"],
  },
  {
    category: "coding",
    difficulty: "advanced",
    questionText: "Describe how you would design a rate-limited API that handles burst traffic safely.",
    skills: ["System design", "API design"],
    expectedConcepts: ["rate limiting", "token bucket", "traffic shaping", "scalability"],
  },
];

// =========================================================
// GET QUESTIONS BY CATEGORY AND DIFFICULTY
// =========================================================

export async function getQuestionBankForCategory(
  category: string,
  difficulty: string
): Promise<QuestionBankEntry[]> {
  const typedCategory = category as QuestionBankCategory;
  const typedDifficulty = difficulty as QuestionBankDifficulty;

  const entries = await QuestionBankItem.find({
    category: typedCategory,
    difficulty: typedDifficulty,
  })
    .sort({ createdAt: -1 })
    .lean();

  return entries.map((entry) => ({
    questionText: entry.questionText,
    category: entry.category,
    difficulty: entry.difficulty,
    skills: entry.skills ?? [],
    expectedConcepts: entry.expectedConcepts ?? [],
    roleContext: entry.roleContext,
  }));
}

// =========================================================
// SEED DEFAULT QUESTION BANK
// =========================================================

export async function seedDefaultQuestionBank(): Promise<void> {
  for (const question of defaultQuestions) {
    const existingQuestion = await QuestionBankItem.findOne({
      questionText: question.questionText,
      category: question.category,
      difficulty: question.difficulty,
    });

    if (existingQuestion) {
      existingQuestion.skills = question.skills;
      existingQuestion.expectedConcepts = question.expectedConcepts;
      existingQuestion.roleContext = question.roleContext;

      await existingQuestion.save();
    } else {
      await QuestionBankItem.create(question);
    }
  }

  console.log(
    `Question bank initialized: ${defaultQuestions.length} default questions checked.`
  );
}

// =========================================================
// GENERATE INTERVIEW QUESTION SET
// =========================================================

export async function generateQuestionSet(
  category: string,
  difficulty: string,
  targetRole: string,
  limit = 5
): Promise<QuestionBankEntry[]> {
  const typedDifficulty = difficulty as QuestionBankDifficulty;
  const requestedCategory = category as QuestionBankCategory;

  const categoriesToQuery: QuestionBankCategory[] =
    category === "mixed"
      ? ["technical", "behavioral", "hr", "situational", "coding"]
      : [requestedCategory];

  const bankEntries: QuestionBankEntry[] = [];

  for (const queryCategory of categoriesToQuery) {
    const entries = await getQuestionBankForCategory(
      queryCategory,
      typedDifficulty
    );

    bankEntries.push(...entries);
  }

  // Role-specific fallback questions.
  const fallbackCategory: QuestionBankCategory =
    category === "mixed" ? "technical" : requestedCategory;

  const fallbackEntries: QuestionBankEntry[] = [
    {
      questionText: `Describe your experience with ${targetRole} in a practical project setting.`,
      category: fallbackCategory,
      difficulty: typedDifficulty,
      skills: ["Role fit", "Experience"],
      expectedConcepts: [
        "relevant experience",
        "technical skills",
        "practical application",
        "project contribution",
      ],
      roleContext: targetRole,
    },
    {
      questionText: `What would success look like in this ${targetRole} role after your first 90 days?`,
      category: category === "mixed" ? "behavioral" : requestedCategory,
      difficulty: typedDifficulty,
      skills: ["Strategic thinking", "Role understanding"],
      expectedConcepts: [
        "execution",
        "goals",
        "ownership",
        "learning",
        "measurable outcomes",
      ],
      roleContext: targetRole,
    },
    {
      questionText: `How would you communicate progress and trade-offs to stakeholders while managing a ${targetRole} delivery goal?`,
      category: category === "mixed" ? "situational" : requestedCategory,
      difficulty: typedDifficulty,
      skills: ["Communication", "Stakeholder management"],
      expectedConcepts: [
        "trade-offs",
        "clarity",
        "risk assessment",
        "stakeholder communication",
      ],
      roleContext: targetRole,
    },
  ];

  // Merge bank and fallback questions.
  const merged = [...bankEntries, ...fallbackEntries];

  // Remove duplicate questions.
  const uniqueEntries: QuestionBankEntry[] = [];
  const seen = new Set<string>();

  for (const item of merged) {
    const key = `${item.category}-${item.difficulty}-${item.questionText}`;

    if (!seen.has(key)) {
      seen.add(key);
      uniqueEntries.push(item);
    }
  }

  // Randomly select the requested number of questions.
  const selected: QuestionBankEntry[] = [];

  for (let index = 0; index < limit; index += 1) {
    const available = uniqueEntries.filter(
      (entry) =>
        !selected.some(
          (current) => current.questionText === entry.questionText
        )
    );

    const chosen = randomPick(available);

    if (!chosen) break;

    selected.push(chosen);
  }

  if (selected.length === 0) {
    return fallbackEntries.slice(0, 1);
  }

  return selected;
}
