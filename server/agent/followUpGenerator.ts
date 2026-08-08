import { generateContent } from '../llm/llmClient';
import { CandidateProfile, CurriculumDay } from '../data/dataLoader';
import { EvaluationResult } from './answerEvaluator';
import { FollowUpStrategy } from './interviewDecisionEngine';

export async function generateFollowUp(
  candidate: CandidateProfile,
  day: CurriculumDay,
  question: string,
  answer: string,
  evaluation: EvaluationResult,
  strategy: FollowUpStrategy
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
2. NO CHATTY INTROS OR LECTURES: Do not give long praise, essays, or unnecessary explanations.
3. ASK EXACTLY ONE QUESTION at the end.
4. STRATEGY SPECIFIC BEHAVIOR:
   - "challenge" (and Quality is "strong"): Brief 1-3 word acknowledgment, then ask a deeper trade-off or scale question.
     Example: "Good. What trade-offs would you consider with hybrid retrieval?"
   - "challenge" (and Quality is "incorrect"): Briefly challenge their misconception with a concrete counter-scenario.
     Example: "What happens if the retrieved context is irrelevant to the query?"
   - "probe" (and Quality is "partial"): Focus directly on the specific concept or detail they missed.
     Example: "What determines whether two embeddings are considered similar?"
   - "redirect" (and Quality is "irrelevant"): Concise, polite redirect back to the core topic.
     Example: "Let's stay with retrieval. What role does it play in RAG?"
   - "clarify": Ask them to clarify one specific ambiguity.
     Example: "How would you handle failure recovery in that step?"`;

  const prompt = `Generate the concise follow-up response (1-2 sentences, max 25 words) for strategy "${strategy}".`;

  const rawText = await generateContent(prompt, systemInstruction);

  let cleaned = rawText
    .replace(/^["']|["']$/g, '')
    .replace(/^(Interviewer|Follow-up|AI):\s*/i, '')
    .trim();

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
}
