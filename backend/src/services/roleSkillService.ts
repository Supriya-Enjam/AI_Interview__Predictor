
export interface RoleSkill {
  skill: string;
  category:
    | "Technical"
    | "Communication"
    | "Problem Solving"
    | "Domain Knowledge";
  importance: "High" | "Medium" | "Low";
  description: string;
  learningTopics: string[];
}

/**
 * Retries Gemini requests when temporary server or rate-limit errors occur.
 */
async function retryGeminiRequest<T>(
  operation: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);

      const status =
        typeof error === "object" && error !== null && "status" in error
          ? Number((error as { status?: unknown }).status)
          : 0;

      const isTemporaryError =
        [429, 500, 502, 503, 504].includes(status) ||
        /429|500|502|503|504|UNAVAILABLE|high demand|overloaded/i.test(
          message
        );

      if (!isTemporaryError || attempt === maxAttempts) {
        throw error;
      }

      const delay = 1000 * Math.pow(2, attempt - 1);

      console.warn(
        `Gemini skill generation failed. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts}).`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Gemini skill generation failed after all retries.");
}

/**
 * Generates role-specific skills and learning topics dynamically
 * using the Gemini API.
 */
export async function generateRoleSkills(
  targetRole: string
): Promise<RoleSkill[]> {
  const normalizedRole = targetRole.trim();

  if (!normalizedRole) {
    throw new Error("Target role is required.");
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  // Dynamic import avoids the CommonJS / ES module import conflict.
  const { GoogleGenAI } = await import("@google/genai");

  const ai = new GoogleGenAI({
    apiKey,
  });

  const prompt = `
You are an expert technical recruiter and career learning advisor.

Generate a practical skill profile for this job role:
"${normalizedRole}"

Identify 8 to 12 important skills that a candidate should develop
to perform well in interviews and in this role.

Requirements:
- Adapt the skills to the exact job title.
- Include role-specific technical and domain skills where relevant.
- Include communication and problem-solving skills when appropriate.
- Do not assume every role is a software engineering role.
- Avoid generic skills unless genuinely relevant.
- Do not invent certifications or claim they are mandatory.
- Provide 2 to 4 actionable learning topics for each skill.
- Use clear, concise descriptions.
- Avoid duplicate skills.

Return ONLY valid JSON in this exact structure:
{
  "skills": [
    {
      "skill": "Skill name",
      "category": "Technical",
      "importance": "High",
      "description": "Short explanation of why this skill matters.",
      "learningTopics": ["Topic one", "Topic two"]
    }
  ]
}

Allowed category values:
Technical, Communication, Problem Solving, Domain Knowledge

Allowed importance values:
High, Medium, Low
`;

  const response = await retryGeminiRequest(() =>
    ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    })
  );

  const responseText = response.text;

  if (!responseText) {
    throw new Error("Gemini returned an empty skill profile.");
  }

  let parsed: { skills?: unknown };

  try {
    parsed = JSON.parse(responseText) as { skills?: unknown };
  } catch {
    throw new Error("Gemini returned invalid JSON.");
  }

  if (!Array.isArray(parsed.skills) || parsed.skills.length === 0) {
    throw new Error("Gemini did not return a valid skill profile.");
  }

  const validCategories = [
    "Technical",
    "Communication",
    "Problem Solving",
    "Domain Knowledge",
  ];

  const validImportance = ["High", "Medium", "Low"];

  const skills: RoleSkill[] = parsed.skills
    .filter((item): item is Record<string, unknown> => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const skill = item as Record<string, unknown>;

      return (
        typeof skill.skill === "string" &&
        skill.skill.trim().length > 0 &&
        typeof skill.category === "string" &&
        validCategories.includes(skill.category) &&
        typeof skill.importance === "string" &&
        validImportance.includes(skill.importance) &&
        typeof skill.description === "string" &&
        Array.isArray(skill.learningTopics)
      );
    })
    .map((item) => ({
      skill: (item.skill as string).trim(),
      category: item.category as RoleSkill["category"],
      importance: item.importance as RoleSkill["importance"],
      description: (item.description as string).trim(),
      learningTopics: (item.learningTopics as unknown[])
        .filter(
          (topic): topic is string =>
            typeof topic === "string" && topic.trim().length > 0
        )
        .map((topic) => topic.trim())
        .slice(0, 4),
    }))
    .filter((item) => item.learningTopics.length > 0);

  if (skills.length === 0) {
    throw new Error("No valid role skills were generated.");
  }

  return skills;
}
