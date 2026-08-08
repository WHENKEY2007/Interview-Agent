import { generateContent } from '../llm/llmClient';

/**
 * Extract keywords from a question, ignoring common stopwords.
 */
export function getQuestionKeywords(text: string): Set<string> {
  const stopwords = new Set([
    'what', 'how', 'why', 'is', 'are', 'the', 'a', 'an', 'to', 'for', 'in', 'on', 'at',
    'with', 'and', 'or', 'you', 'your', 'would', 'could', 'should', 'about', 'choose',
    'between', 'when', 'which', 'who', 'whom', 'whose', 'where', 'here', 'there',
    'can', 'please', 'explain', 'describe', 'detail', 'consider', 'using', 'based'
  ]);
  
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopwords.has(word))
  );
}

/**
 * Calculates a lightweight Jaccard similarity score between two questions.
 */
export function calculateSimilarity(q1: string, q2: string): number {
  const w1 = getQuestionKeywords(q1);
  const w2 = getQuestionKeywords(q2);
  
  if (w1.size === 0 || w2.size === 0) return 0;
  
  const intersection = new Set([...w1].filter(x => w2.has(x)));
  const union = new Set([...w1, ...w2]);
  
  return intersection.size / union.size;
}

/**
 * Checks if the proposed question is semantically duplicate to any previous question.
 */
export function isDuplicateQuestion(newQuestion: string, previousQuestions: string[]): boolean {
  for (const prev of previousQuestions) {
    const sim = calculateSimilarity(newQuestion, prev);
    if (sim > 0.6) {
      console.warn(`[Validation] Semantic duplicate detected. Similarity: ${sim.toFixed(2)} between: \n  1. "${newQuestion}"\n  2. "${prev}"`);
      return true;
    }
  }
  return false;
}

/**
 * Validates question format, length, and content constraints.
 */
export function validateQuestion(
  text: string,
  type: 'primary' | 'followup',
  previousQuestions: string[]
): { valid: boolean; reason?: string } {
  if (!text || text.trim().length === 0) {
    return { valid: false, reason: 'Empty question content' };
  }

  const cleaned = text.trim();

  // 1. Sentence count check (max 3 for primary, max 2 for follow-up)
  const sentenceMatches = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
  const maxSentences = type === 'primary' ? 3 : 2;
  if (sentenceMatches.length > maxSentences) {
    return { valid: false, reason: `Sentence count is ${sentenceMatches.length} (max is ${maxSentences})` };
  }

  // 2. Word count check (max 35 for primary, max 25 for follow-up)
  const wordCount = cleaned.split(/\s+/).length;
  const maxWords = type === 'primary' ? 35 : 25;
  if (wordCount > maxWords) {
    return { valid: false, reason: `Word count is ${wordCount} (max is ${maxWords})` };
  }
  if (wordCount < 5) {
    return { valid: false, reason: `Word count is too short (${wordCount} words)` };
  }

  // 3. Question mark count (must contain exactly one question mark to represent a focused intent)
  const questionMarks = (cleaned.match(/\?/g) || []).length;
  if (questionMarks !== 1) {
    return { valid: false, reason: `Must contain exactly 1 question mark, found ${questionMarks}` };
  }

  // 4. Repetition check
  if (isDuplicateQuestion(cleaned, previousQuestions)) {
    return { valid: false, reason: 'Duplicate question detected' };
  }

  // 5. Preamble/Greeting/Intro check
  const lowercase = cleaned.toLowerCase();
  const forbiddenIntros = [
    'hello', 'welcome', 'great job', 'excellent', 'spot on', 'thank you', 
    'thanks for', 'rephrased', 'clarified', 'in this turn', 'let us transition', 'now i will ask'
  ];
  for (const intro of forbiddenIntros) {
    if (lowercase.startsWith(intro)) {
      return { valid: false, reason: `Question contains forbidden preamble intro: "${intro}"` };
    }
  }

  return { valid: true };
}

/**
 * Calls the LLM to rewrite and repair a question that failed validation rules.
 */
export async function repairQuestion(
  invalidQuestion: string,
  type: 'primary' | 'followup',
  reason: string,
  systemInstruction: string
): Promise<string> {
  console.log(`[Validation] Launching self-repair loop for question. Reason: "${reason}"`);
  
  const repairPrompt = `The following generated question failed validation.
Failed Question: "${invalidQuestion}"
Validation Failure Reason: ${reason}

Please rewrite the question to fix this issue.
Ensure it:
1. Is a single focused question (exactly 1 question mark).
2. Contains NO greeting, welcome, feedback, or transition preamble.
3. Is extremely concise: strictly under ${type === 'primary' ? 30 : 22} words and ${type === 'primary' ? 2 : 1} sentence(s).
Output ONLY the clean corrected question text.`;

  try {
    const result = await generateContent(repairPrompt, systemInstruction);
    let cleaned = result
      .replace(/^["']|["']$/g, '')
      .replace(/^(Interviewer|AI|Question):\s*/i, '')
      .trim();
    
    console.log(`[Validation] Repaired question: "${cleaned}"`);
    return cleaned;
  } catch (error) {
    console.error('[Validation] Failed to repair question, returning original.', error);
    return invalidQuestion;
  }
}
