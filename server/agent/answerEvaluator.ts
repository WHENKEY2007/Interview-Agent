import { generateContent } from '../llm/llmClient';
import { CurriculumDay } from '../data/dataLoader';

export interface EvaluationResult {
  score: number;
  quality: 'strong' | 'partial' | 'irrelevant' | 'unknown';
  evaluation: string;
  strengths: string[];
  gaps: string[];
  betterAnswerStructure: string[];
}

export async function evaluateAnswer(
  question: string,
  answer: string,
  day: CurriculumDay
): Promise<EvaluationResult> {
  const systemInstruction = `You are a rigorous technical interviewer evaluating a candidate's response.
You must return your evaluation strictly as a JSON object.

Format your output exactly as follows:
{
  "score": number (0 to 100),
  "quality": "strong" | "partial" | "irrelevant" | "unknown",
  "evaluation": "A detailed 1-2 sentence diagnostic feedback of the candidate's response",
  "strengths": ["list of 1 or 2 specific technical concepts they explained correctly"],
  "gaps": ["list of 1 or 2 specific concepts they missed or explained incorrectly"],
  "betterAnswerStructure": ["3 to 5 steps explaining how a stronger response should be structured physically or logically"]
}

Guidelines for quality classification:
- "unknown": if they state they don't know, never learned it, or want to skip (e.g. "I don't know", "Not sure", "skip").
- "irrelevant": if the answer is completely off-topic or fails to answer the question posed.
- "partial": if they touch on correct concepts but stay very surface-level, avoid practical details, or miss major parts of the solution.
- "strong": if they demonstrate clear conceptual mastery, name specific tools/mechanisms, explain technical trade-offs, or describe structured debugging steps.`;

  const prompt = `
Question Asked: "${question}"
Candidate Answer: "${answer}"
Curriculum Topic: "Day ${day.day} - ${day.title}"
Curriculum Objectives: ${day.objectives.join(', ')}

Please evaluate this answer and output only the valid JSON object.`;

  try {
    const responseText = await generateContent(prompt, systemInstruction, true);
    // Parse the JSON output
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJson) as EvaluationResult;
    
    // Validate quality value
    if (!['strong', 'partial', 'irrelevant', 'unknown'].includes(result.quality)) {
      result.quality = 'partial';
    }
    // Limit score ranges
    result.score = Math.max(0, Math.min(100, result.score || 70));

    return result;
  } catch (error) {
    console.error('[Evaluator] Error parsing JSON evaluation. Returning fallback.', error);
    return {
      score: 70,
      quality: 'partial',
      evaluation: 'Candidate responded but the automated evaluation could not verify full details.',
      strengths: ['Addressed the general topic.'],
      gaps: ['Missed implementation details.'],
      betterAnswerStructure: ['Identify the core problem.', 'Explain the chosen strategy.', 'Discuss trade-offs.']
    };
  }
}
