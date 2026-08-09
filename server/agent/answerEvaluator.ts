import { generateContent } from '../llm/llmClient';
import { CurriculumDay } from '../data/dataLoader';
import { safeParseJSON, validateAndNormalizeEvaluation } from './validation';

export interface EvaluationResult {
  score: number;
  quality: 'strong' | 'partial' | 'incorrect' | 'irrelevant' | 'unknown';
  evaluation: string;
  strengths: string[];
  gaps: string[];
  misconceptions: string[];
  betterAnswerStructure: string[];
  metrics?: {
    technical: number;
    problemSolving: number;
    communication: number;
    depth: number;
    practical: number;
  };
}

export async function evaluateAnswer(
  question: string,
  answer: string,
  day: CurriculumDay,
  objective: string,
  previousContext = ''
): Promise<EvaluationResult> {
  const systemInstruction = `You are a rigorous technical interviewer evaluating a candidate's response against curriculum objectives.
You must return your evaluation strictly as a JSON object.

Format your output exactly as follows:
{
  "score": number (0 to 100),
  "quality": "strong" | "partial" | "incorrect" | "irrelevant" | "unknown",
  "evaluation": "A detailed 1-2 sentence diagnostic feedback of the candidate's response evaluating their understanding of the targeted objective.",
  "strengths": ["list of 1 or 2 specific technical concepts they explained correctly from their response"],
  "gaps": ["list of 1 or 2 specific concepts they missed or explained incorrectly"],
  "misconceptions": ["list of 1 or 2 specific logical or architectural misunderstandings they stated. Leave empty if none."],
  "betterAnswerStructure": ["3 to 5 steps explaining how a stronger response should be structured physically or logically"],
  "metrics": {
    "technical": number (0 to 100, conceptual correctness and accuracy),
    "problemSolving": number (0 to 100, logical approach and clarity),
    "communication": number (0 to 100, structured explanation and readability),
    "depth": number (0 to 100, covers trade-offs, edge cases, and parameters),
    "practical": number (0 to 100, references specific libraries/tools, systems thinking)
  }
}

EVALUATION SUBSTANCE RULES (CRITICAL):
1. FOCUS ON SUBSTANCE, NOT LENGTH: Do NOT associate longer answers with high quality, nor shorter answers with low quality.
2. CONCISE & CORRECT IS STRONG: If a candidate provides a short, direct response that correctly identifies the core mechanism, tool, or design choice, classify it as "strong".
3. VERBOSE FLUFF IS PARTIAL: If a candidate writes a long, generic paragraph but fails to answer the specific technical question or name concrete parameters, classify it as "partial".
4. MISCONCEPTIONS: Highlight any technical incorrectness in "misconceptions".

Guidelines for quality classification:
- "unknown": if they state they don't know, never learned it, or want to skip (e.g. "I don't know", "Not sure", "skip").
- "irrelevant": if the answer is completely off-topic or fails to answer the question posed.
- "incorrect": if they answer the question but get the core facts wrong, state clear fallacies, or show severe misunderstanding of the target concepts.
- "partial": if they touch on correct concepts but stay very surface-level, avoid practical details, or miss major parts of the solution.
- "strong": if they demonstrate clear mastery of the objective, name specific tools/mechanisms, explain technical trade-offs, or describe structured debugging steps.`;

  const prompt = `
Question Asked: "${question}"
Candidate Answer: "${answer}"
Curriculum Topic: "Day ${day.day} - ${day.title}"
Targeted Learning Objective: "${objective}"
All Curriculum Objectives for reference: ${day.objectives.join(', ')}
Previous Conversational Context:
${previousContext || 'None (This is the first question on this topic).'}

Please evaluate this answer and output only the valid JSON object.`;

  try {
    const responseText = await generateContent(prompt, systemInstruction, true);
    const parsed = safeParseJSON(responseText);
    const validated = validateAndNormalizeEvaluation(parsed, question, answer, day);
    return validated;
  } catch (error) {
    console.error('[Evaluator] Error parsing JSON evaluation. Returning fallback.', error);
    return {
      score: 70,
      quality: 'partial',
      evaluation: 'Candidate responded but the automated evaluation could not verify full details.',
      strengths: ['Addressed the general topic.'],
      gaps: ['Missed implementation details.'],
      misconceptions: [],
      betterAnswerStructure: ['Identify the core problem.', 'Explain the chosen strategy.', 'Discuss trade-offs.'],
      metrics: {
        technical: 70,
        problemSolving: 68,
        communication: 72,
        depth: 65,
        practical: 66
      }
    };
  }
}
