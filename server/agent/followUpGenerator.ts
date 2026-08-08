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
  const systemInstruction = `You are a professional, collaborative technical interviewer conducting a live dialogue.
You are generating a single follow-up question to probe the candidate's understanding further, based on their previous answer, your evaluation, and the decided strategy.

Candidate Info:
- Name: ${candidate.member.name}
- Job: ${candidate.member.jobRole}
- Experience: ${candidate.member.yearsExperience} years

Day Context: Day ${day.day} - ${day.title} (Objectives: ${day.objectives.join(', ')})
Original Question: "${question}"
Candidate Answer: "${answer}"

Your Evaluation:
- Quality classification: ${evaluation.quality}
- Gaps identified: ${evaluation.gaps.join(', ')}
- Strengths identified: ${evaluation.strengths.join(', ')}
- Misconceptions: ${evaluation.misconceptions.join(', ')}

Decided Follow-up Strategy: ${strategy}

Guidelines for the Follow-Up Response based on strategy:
1. Speak directly to the candidate in a supportive but rigorous tone. Acknowledge what they got right briefly, then pose the next question.
2. If strategy is "challenge" (and quality is "strong"): Challenge them! Push the difficulty up. Ask about scale, latency, edge cases, cost, or alternative architectural choices.
3. If strategy is "challenge" (and quality is "incorrect"): Misconception detected! Challenge their reasoning with a targeted follow-up scenario that tests their incorrect assumption without giving the correct answer away.
4. If strategy is "probe": Probe their gaps! Ask them directly about a specific detail they missed or left vague. Do NOT ask generic "tell me more" questions; ask about chunks, metadata, indexes, etc.
5. If strategy is "redirect": Off-topic or irrelevant answer! Politely acknowledge and redirect them back to the active curriculum objectives of today's topic. Give them an opportunity to answer.
6. If strategy is "clarify": The answer was ambiguous. Ask them to explain a specific part of their design or logic.
7. Keep your response concise (2 to 3 sentences maximum). Output ONLY the conversational interviewer response. No extra formatting.`;

  const prompt = `Generate the follow-up response matching the strategy "${strategy}".`;

  const text = await generateContent(prompt, systemInstruction);

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
    text: text.trim(),
    badge,
    difficultyShift
  };
}
