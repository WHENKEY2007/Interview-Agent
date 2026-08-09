import { generateContent } from '../llm/llmClient';
import { CandidateProfile, CurriculumDay, getCurriculum, getCurriculumDay } from '../data/dataLoader';
import { AnswerEvaluation } from '../session/sessionStore';
import { getDefaultFallbackQuestion } from './questionGenerator';

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
    if (sim > 0.8) {
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

  // 1. Sentence count check (relaxed: max 4 for primary, max 3 for follow-up)
  const sentenceMatches = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
  const maxSentences = type === 'primary' ? 4 : 3;
  if (sentenceMatches.length > maxSentences) {
    return { valid: false, reason: `Sentence count is ${sentenceMatches.length} (max is ${maxSentences})` };
  }

  // 2. Word count check (relaxed: max 37 for primary, max 27 for follow-up)
  const wordCount = cleaned.split(/\s+/).length;
  const maxWords = type === 'primary' ? 37 : 27;
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
    const cleaned = result
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

/**
 * Safely parses LLM JSON outputs, handling markdown formatting and extracting JSON substrings if needed.
 */
export function safeParseJSON(text: string): any {
  if (!text) {
    console.warn('[Validation] safeParseJSON received empty/null text');
    return null;
  }
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn('[Validation] Direct JSON parsing failed. Attempting regex extraction...');
    // Match anything between the first '{' and the last '}'
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (innerErr) {
        console.error('[Validation] Regex JSON extraction failed as well:', innerErr);
      }
    }
    throw new Error('Failed to parse text as JSON: ' + (e as Error).message);
  }
}

/**
 * Validates and normalizes the generated primary question object.
 */
export function validateAndNormalizePrimaryQuestion(
  parsed: any,
  day: CurriculumDay,
  difficulty: string,
  previousQuestions: string[]
): { question: string; intent: string; objective: string } {
  if (!parsed || typeof parsed !== 'object') {
    console.warn('[Validation] Parsed primary question is null or not an object. Triggering fallback.');
    return {
      question: getDefaultFallbackQuestion(day, difficulty, previousQuestions),
      intent: 'conceptual',
      objective: day.objectives[0] || 'Understand curriculum topics.'
    };
  }

  let question = parsed.question;
  let intent = parsed.intent;
  let objective = parsed.objective;

  if (typeof question !== 'string' || question.trim().length === 0) {
    console.warn('[Validation] Missing or invalid question field in LLM response.');
    question = getDefaultFallbackQuestion(day, difficulty, previousQuestions);
  }

  const validIntents = ['conceptual', 'diagnostic', 'implementation', 'reasoning', 'tradeoff', 'architecture', 'debugging', 'scenario'];
  if (typeof intent !== 'string' || !validIntents.includes(intent.toLowerCase())) {
    intent = 'conceptual';
  }

  if (typeof objective !== 'string' || objective.trim().length === 0) {
    // Default to the first objective of the curriculum day
    objective = day.objectives[0] || 'Understand core curriculum concepts.';
  }

  return {
    question: question.trim(),
    intent: intent.toLowerCase(),
    objective: objective.trim()
  };
}

/**
 * Validates and normalizes the answer evaluation result.
 */
export function validateAndNormalizeEvaluation(
  parsed: any,
  question: string,
  answer: string,
  day: CurriculumDay
): {
  score: number;
  quality: 'strong' | 'partial' | 'incorrect' | 'irrelevant' | 'unknown';
  evaluation: string;
  strengths: string[];
  gaps: string[];
  misconceptions: string[];
  betterAnswerStructure: string[];
  metrics: {
    technical: number;
    problemSolving: number;
    communication: number;
    depth: number;
    practical: number;
  };
} {
  const defaultMetrics = (score: number) => ({
    technical: score,
    problemSolving: Math.max(0, Math.min(100, Math.round(score * 0.98))),
    communication: Math.max(0, Math.min(100, Math.round(score * 1.04))),
    depth: Math.max(0, Math.min(100, Math.round(score * 0.92))),
    practical: Math.max(0, Math.min(100, Math.round(score * 0.95)))
  });

  if (!parsed || typeof parsed !== 'object') {
    console.warn('[Validation] Parsed evaluation is null or not an object. Triggering fallback.');
    return {
      score: 70,
      quality: 'partial',
      evaluation: 'Candidate responded but the automated evaluation could not verify full details.',
      strengths: ['Addressed the general topic.'],
      gaps: ['Missed implementation details.'],
      misconceptions: [],
      betterAnswerStructure: ['Identify the core problem.', 'Explain the chosen strategy.', 'Discuss trade-offs.'],
      metrics: defaultMetrics(70)
    };
  }

  let score = typeof parsed.score === 'number' ? parsed.score : parseInt(parsed.score, 10);
  if (isNaN(score)) {
    score = 70;
  }
  score = Math.max(0, Math.min(100, score));

  let quality = parsed.quality;
  const validQualities = ['strong', 'partial', 'incorrect', 'irrelevant', 'unknown'];
  if (typeof quality !== 'string' || !validQualities.includes(quality.toLowerCase())) {
    quality = 'partial';
  }

  let evaluation = parsed.evaluation;
  if (typeof evaluation !== 'string' || evaluation.trim().length === 0) {
    evaluation = 'Candidate responded but the automated evaluation could not verify full details.';
  }

  const strengths = Array.isArray(parsed.strengths)
    ? parsed.strengths.filter((s: any) => typeof s === 'string').map((s: string) => s.trim())
    : ['Addressed the general topic.'];

  const gaps = Array.isArray(parsed.gaps)
    ? parsed.gaps.filter((g: any) => typeof g === 'string').map((g: string) => g.trim())
    : ['Missed implementation details.'];

  const misconceptions = Array.isArray(parsed.misconceptions)
    ? parsed.misconceptions.filter((m: any) => typeof m === 'string').map((m: string) => m.trim())
    : [];

  const betterAnswerStructure = Array.isArray(parsed.betterAnswerStructure)
    ? parsed.betterAnswerStructure.filter((b: any) => typeof b === 'string').map((b: string) => b.trim())
    : ['Identify the core problem.', 'Explain the chosen strategy.', 'Discuss trade-offs.'];

  // Normalize metrics
  let metrics = parsed.metrics;
  if (!metrics || typeof metrics !== 'object') {
    metrics = defaultMetrics(score);
  } else {
    const validateMetric = (val: any, fallback: number) => {
      const num = typeof val === 'number' ? val : parseInt(val, 10);
      return isNaN(num) ? fallback : Math.max(0, Math.min(100, num));
    };
    metrics = {
      technical: validateMetric(metrics.technical, score),
      problemSolving: validateMetric(metrics.problemSolving, score),
      communication: validateMetric(metrics.communication, score),
      depth: validateMetric(metrics.depth, score),
      practical: validateMetric(metrics.practical, score)
    };
  }

  return {
    score,
    quality: quality.toLowerCase() as any,
    evaluation: evaluation.trim(),
    strengths,
    gaps,
    misconceptions,
    betterAnswerStructure,
    metrics
  };
}
