import { generateContent } from '../llm/llmClient';
import { CandidateProfile, CurriculumDay } from '../data/dataLoader';
import { EvaluationResult } from './answerEvaluator';

export async function generateFollowUp(
  candidate: CandidateProfile,
  day: CurriculumDay,
  question: string,
  answer: string,
  evaluation: EvaluationResult
): Promise<{ text: string; badge: string; difficultyShift?: 'up' | 'down' | 'same' }> {
  const systemInstruction = `You are a professional, collaborative technical interviewer conducting a live dialogue.
You are generating a single follow-up question to probe the candidate's understanding further, based on their previous answer and your evaluation.

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

Guidelines for the Follow-Up Response:
1. Speak directly to the candidate in a supportive but rigorous tone. Acknowledge what they got right, then ask the follow-up.
2. If quality is "strong": Challenge them! Push the difficulty up. Ask about scale, latency, edge cases, cost, or alternative architectural choices (e.g. "Excellent. Now imagine memory cost is the binding constraint...").
3. If quality is "partial": Probe their gaps! Ask them directly about a specific detail they missed or left vague (e.g. "You mentioned chunking, but how do you handle metadata filtering at query time?").
4. If quality is "irrelevant" or "unknown": Give a guided prompt. Lower the difficulty or clarify the question. Point them in the right direction to help them start reasoning (e.g. "That's okay. Think about the retrieval stage first — what signal could you inspect...").
5. Keep your response concise (2 to 3 sentences maximum). Output ONLY the conversational interviewer response. No extra formatting.`;

  const prompt = `Generate the follow-up response. Candidate was classified as having a "${evaluation.quality}" response.`;

  const text = await generateContent(prompt, systemInstruction);

  let badge = 'Follow-up';
  let difficultyShift: 'up' | 'down' | 'same' = 'same';

  if (evaluation.quality === 'strong') {
    badge = 'Going deeper';
    difficultyShift = 'up';
  } else if (evaluation.quality === 'unknown') {
    badge = 'Guided prompt';
    difficultyShift = 'down';
  } else if (evaluation.quality === 'irrelevant') {
    badge = 'Clarifying the question';
    difficultyShift = 'down';
  }

  return {
    text: text.trim(),
    badge,
    difficultyShift
  };
}
