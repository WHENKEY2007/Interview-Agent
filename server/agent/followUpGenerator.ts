import { generateContent } from '../llm/llmClient';
import { CandidateProfile, CurriculumDay } from '../data/dataLoader';
import { EvaluationResult } from './answerEvaluator';
import { FollowUpStrategy } from './interviewDecisionEngine';
import { validateQuestion, repairQuestion } from './validation';

/**
 * Generates a fallback follow-up question when generation or validation fails.
 */
export function getDefaultFallbackFollowUp(strategy: string): string {
  if (strategy === 'redirect') {
    return "Let's stay focused on today's curriculum. Can you explain your choice of architecture here?";
  }
  if (strategy === 'challenge') {
    return "What main latency or scale trade-offs would you consider in this setup?";
  }
  return "How would you handle failure recovery or edge cases in that step?";
}

/**
 * Generates a concise follow-up question.
 */
export async function generateFollowUp(
  candidate: CandidateProfile,
  day: CurriculumDay,
  question: string,
  answer: string,
  evaluation: EvaluationResult,
  strategy: FollowUpStrategy,
  previousQuestions: string[] = []
): Promise<{ text: string; badge: string; difficultyShift?: 'up' | 'down' | 'same' }> {
  const systemInstruction = `You are a professional, collaborative technical interviewer conducting a fast-paced conversational dialogue.
You are generating a short, sharp follow-up response based on the candidate's previous answer and the decided strategy.

CONTEXT:
- Candidate: ${candidate.member.name} (${candidate.member.jobRole}, ${candidate.member.yearsExperience} yrs exp)
- Topic: Day ${day.day} - ${day.title}
- Previous Question: "${question}"
- Candidate Answer: "${answer}"
- Evaluation Quality: ${evaluation.quality}
- Strategy: ${strategy}
- Gaps Identified: ${evaluation.gaps.join(', ') || 'None'}
- Misconceptions: ${evaluation.misconceptions.join(', ') || 'None'}

CONCISENESS & STYLE RULES (CRITICAL):
1. EXTREMELY CONCISE: 1 to 2 sentences maximum (strictly between 10 and 25 words).
2. NO CHATTY INTROS OR TUTORING: Do not explain the answer, lecture the candidate, or say "great job", "thank you", "correct", etc.
3. ASK EXACTLY ONE QUESTION at the end.
4. PREVENT REPETITION: You MUST NOT ask questions similar to these previously asked questions:
   ${JSON.stringify(previousQuestions)}

STRATEGY-SPECIFIC BEHAVIOR:
- "challenge" (and Quality is "strong"): Shift difficulty up. Ask a deeper trade-off, memory bound, or scale question.
- "challenge" (and Quality is "incorrect"): Challenge their misconception with a concrete counter-scenario.
- "probe": Focus directly on the specific concepts they missed (e.g. gaps).
- "redirect": Concise, polite redirect back to today's core curriculum topic.
- "clarify": Ask them to clarify one specific ambiguity.`;

  const prompt = `Generate a concise follow-up question (1-2 sentences, max 25 words) for strategy "${strategy}".`;

  try {
    const rawText = await generateContent(prompt, systemInstruction);
    let cleaned = rawText
      .replace(/^["']|["']$/g, '')
      .replace(/^(Interviewer|Follow-up|AI):\s*/i, '')
      .trim();

    // Run the validation loop
    const validation = validateQuestion(cleaned, 'followup', previousQuestions);
    if (!validation.valid) {
      console.warn(`[FollowUp] Validation failed: ${validation.reason}. Running repair loop.`);
      
      const repaired = await repairQuestion(
        cleaned,
        'followup',
        validation.reason || 'Formatting failure',
        systemInstruction
      );

      // Re-validate repaired follow-up
      const reValidation = validateQuestion(repaired, 'followup', previousQuestions);
      if (reValidation.valid) {
        cleaned = repaired;
      } else {
        console.warn(`[FollowUp] Repaired follow-up still failed: ${reValidation.reason}. Using fallback.`);
        cleaned = getDefaultFallbackFollowUp(strategy);
      }
    }

    let badge = 'Follow-up';
    let difficultyShift: 'up' | 'down' | 'same' = 'same';

    if (strategy === 'challenge') {
      if (evaluation.quality === 'strong') {
        badge = 'Going deeper';
        difficultyShift = 'up';
      } else {
        badge = 'Challenging misconception';
        difficultyShift = 'down';
      }
    } else if (strategy === 'redirect') {
      badge = 'Redirecting';
      difficultyShift = 'same';
    } else if (strategy === 'clarify') {
      badge = 'Clarifying reasoning';
      difficultyShift = 'same';
    } else if (strategy === 'probe') {
      badge = 'Probing concept';
      difficultyShift = 'same';
    }

    return {
      text: cleaned,
      badge,
      difficultyShift
    };
  } catch (error) {
    console.error('[FollowUp] Error generating follow-up. Returning fallback.', error);
    return {
      text: getDefaultFallbackFollowUp(strategy),
      badge: 'Follow-up',
      difficultyShift: 'same'
    };
  }
}
