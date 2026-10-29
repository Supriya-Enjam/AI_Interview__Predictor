import { QuestionBankItem } from "../models/QuestionBank";

export interface QuestionBankEntry {
  questionText: string;
  category: string;
  difficulty: string;
  skills: string[];
  expectedConcepts: string[];
  roleContext?: string;
}

function randomPick<T>(items: T[]): T | undefined {
  if (items.length === 0) {
    return undefined;
  }

  return items[Math.floor(Math.random() * items.length)];
}

type QuestionBankDocument = {
  questionText: string;
  category: string;
  difficulty: string;
  skills?: string[];
  expectedConcepts?: string[];
  roleContext?: string;
};

export async function getQuestionBankForCategory(
  category: string,
  difficulty: string
): Promise<QuestionBankEntry[]> {
  const entries = (await QuestionBankItem.find({
    category: category as never,
    difficulty: difficulty as never,
  })
    .sort({ createdAt: -1 })
    .lean()) as QuestionBankDocument[];

  return entries.map((entry) => ({
    questionText: entry.questionText,
    category: entry.category,
    difficulty: entry.difficulty,
    skills: entry.skills ?? [],
    expectedConcepts: entry.expectedConcepts ?? [],
    roleContext: entry.roleContext,
  }));
}

export async function seedDefaultQuestionBank(): Promise<void> {
  const existing = await QuestionBankItem.countDocuments();
  if (existing > 0) {
    return;
  }

  const defaults = [
    {
      category: "technical",
      difficulty: "beginner",
      questionText: "Explain the difference between a variable and a constant.",
      skills: ["Programming fundamentals"],
      expectedConcepts: ["variables", "constants", "memory"],
    },
    {
      category: "technical",
      difficulty: "intermediate",
      questionText: "How would you debug a performance issue in an application?",
      skills: ["Debugging", "Performance analysis"],
      expectedConcepts: ["profiling", "bottlenecks", "metrics"],
    },
    {
      category: "behavioral",
      difficulty: "intermediate",
      questionText: "Describe a challenging problem you solved and the steps you took.",
      skills: ["Communication", "Problem solving"],
      expectedConcepts: ["ownership", "analysis", "follow-through"],
    },
    {
      category: "hr",
      difficulty: "beginner",
      questionText: "Why are you interested in this role and how does it fit your long-term goals?",
      skills: ["Motivation", "Career planning"],
      expectedConcepts: ["career goals", "role fit", "self-awareness"],
    },
    {
      category: "situational",
      difficulty: "advanced",
      questionText: "A major change is proposed late in a delivery cycle. How would you assess the impact and communicate trade-offs?",
      skills: ["Decision making", "Stakeholder management"],
      expectedConcepts: ["trade-offs", "risk", "communication"],
    },
    {
      category: "coding",
      difficulty: "advanced",
      questionText: "Describe how you would design a rate-limited API that handles burst traffic safely.",
      skills: ["System design", "API design"],
      expectedConcepts: ["rate limiting", "traffic shaping", "scalability"],
    },
  ];

  await QuestionBankItem.insertMany(defaults);
}

export async function generateQuestionSet(
  category: string,
  difficulty: string,
  targetRole: string,
  limit = 5
): Promise<QuestionBankEntry[]> {
  const categoriesToQuery = category === "mixed"
    ? ["technical", "behavioral", "hr", "situational", "coding"]
    : [category];

  const bankEntries: QuestionBankEntry[] = [];

  for (const queryCategory of categoriesToQuery) {
    const entries = await getQuestionBankForCategory(queryCategory, difficulty);
    bankEntries.push(...entries);
  }

  const fallbackEntries: QuestionBankEntry[] = [
    {
      questionText: `Describe your experience with ${targetRole} in a practical project setting.`,
      category: category === "mixed" ? "technical" : category,
      difficulty,
      skills: ["Role fit", "Experience"],
      expectedConcepts: [targetRole],
      roleContext: targetRole,
    },
    {
      questionText: `What would success look like in this ${targetRole} role after your first 90 days?`,
      category: category === "mixed" ? "behavioral" : category,
      difficulty,
      skills: ["Strategic thinking", "Role understanding"],
      expectedConcepts: ["execution", "goals", "ownership"],
      roleContext: targetRole,
    },
    {
      questionText: `How would you communicate progress and trade-offs to stakeholders while managing a ${targetRole} delivery goal?`,
      category: category === "mixed" ? "situational" : category,
      difficulty,
      skills: ["Communication", "Stakeholder management"],
      expectedConcepts: ["trade-offs", "clarity", "risk"],
      roleContext: targetRole,
    },
  ];

  const merged = [...bankEntries, ...fallbackEntries];
  const uniqueEntries: QuestionBankEntry[] = [];
  const seen = new Set<string>();

  for (const item of merged) {
    const key = `${item.category}-${item.difficulty}-${item.questionText}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEntries.push(item);
    }
  }

  const selected: QuestionBankEntry[] = [];
  for (let index = 0; index < limit; index += 1) {
    const available = uniqueEntries.filter(
      (entry) => !selected.some((current) => current.questionText === entry.questionText)
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
