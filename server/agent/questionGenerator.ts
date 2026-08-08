import { generateContent } from '../llm/llmClient';
import { CandidateProfile, CurriculumDay, getCurriculum } from '../data/dataLoader';
import { SessionState } from '../session/sessionStore';
import { validateQuestion, repairQuestion } from './validation';

/**
 * Dynamically selects a curriculum day to test next.
 * Ensures we pick a day that hasn't been covered in this session yet.
 */
export function selectNextDay(session: SessionState): number {
  const candidate = session.candidate;
  const covered = session.curriculumDaysCovered;
  const curriculum = getCurriculum();

  const candidateMissions = candidate.missions || [];
  
  const highAttemptDays = candidateMissions
    .filter(m => !covered.includes(m.day) && m.attempts && m.attempts >= 3)
    .map(m => m.day);

  const skippedDays = candidateMissions
    .filter(m => !covered.includes(m.day) && (m.skipped || m.passed === false))
    .map(m => m.day);

  const passedDays = candidateMissions
    .filter(m => !covered.includes(m.day) && m.passed && (!m.attempts || m.attempts < 3))
    .map(m => m.day);

  const allCurriculumDays = curriculum.days.map(d => d.day);
  const remainingDays = allCurriculumDays.filter(d => !covered.includes(d));

  if (highAttemptDays.length > 0) return highAttemptDays[0];
  if (skippedDays.length > 0) return skippedDays[0];
  if (passedDays.length > 0) return passedDays[0];
  if (remainingDays.length > 0) return remainingDays[0];
  
  return 12;
}

/**
 * Generates a deterministic fallback question when LLM calls or validations fail.
 */
export function getDefaultFallbackQuestion(day: CurriculumDay, difficulty: string): string {
  if (day.day === 12) {
    if (difficulty === 'Advanced') return "How would you design a latency-optimized validation layer to prevent malformed LLM JSON outputs under high load?";
    if (difficulty === 'Foundational') return "What is the difference between system instructions and user prompts in guiding LLM outputs?";
    return "How do you ensure JSON format compliance in LLM outputs?";
  }
  if (day.day === 14) {
    if (difficulty === 'Advanced') return "How do you optimize retrieval recall and latency when querying 10 million vectors under 50 milliseconds?";
    return "How would you set up a dual-encoder retrieval pipeline for RAG?";
  }
  return `How would you approach ${day.objectives[0] || day.title} in a production environment?`;
}

/**
 * Generates a primary interview question for a specific curriculum day.
 * Returns the question text and its classified intent.
 */
export async function generatePrimaryQuestion(
  candidate: CandidateProfile,
  day: CurriculumDay,
  difficulty: 'Foundational' | 'Intermediate' | 'Advanced' = 'Intermediate',
  previousQuestions: string[] = []
): Promise<{ question: string; intent: string }> {
  
  const systemInstruction = `You are an expert AI Technical Interviewer conducting a realistic, conversational, and focused interview.
Your goal is to evaluate the candidate's understanding of Day ${day.day} (${day.title}).

Candidate Info:
- Name: ${candidate.member.name}
- Job Role: ${candidate.member.jobRole} (${candidate.member.yearsExperience} yrs exp)

Curriculum Context:
- Day: ${day.day} - ${day.title}
- Main Objectives: ${day.objectives.slice(0, 2).join('; ')}
- Associated Tools: ${day.tools.join(', ')}

Target Difficulty: ${difficulty}

CONCISENESS & STYLE RULES (CRITICAL):
1. ASK EXACTLY ONE CLEAR QUESTION. Never ask multi-part questions or stack multiple question marks.
2. KEEP IT CONCISE: 1 to 2 sentences maximum (strictly around 10 to 30 words).
3. NO PREAMBLE / INTROS: Jump directly to the question. Do NOT greet the candidate or say "hello".
4. NO BULLET LISTS OR EXPLANATIONS before asking.
5. PREVENT REPETITION: You MUST NOT ask questions similar to the following previously asked questions:
   ${JSON.stringify(previousQuestions)}

You must return your response strictly as a JSON object matching this structure:
{
  "question": "The single technical question text",
  "intent": "conceptual" | "diagnostic" | "implementation" | "reasoning" | "tradeoff" | "architecture" | "debugging" | "scenario"
}`;

  const prompt = `Generate a concise ${difficulty}-level primary question and classify its intent for Day ${day.day}: ${day.title}.`;

  try {
    const rawResponse = await generateContent(prompt, systemInstruction, true);
    const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson) as { question: string; intent: string };

    let cleanedQuestion = parsed.question
      .replace(/^["']|["']$/g, '')
      .replace(/^(Interviewer|Question|AI):\s*/i, '')
      .trim();

    // Run the validation loop
    const validation = validateQuestion(cleanedQuestion, 'primary', previousQuestions);
    if (!validation.valid) {
      console.warn(`[Generator] Validation failed: ${validation.reason}. Running repair loop.`);
      
      const repaired = await repairQuestion(
        cleanedQuestion,
        'primary',
        validation.reason || 'Formatting failure',
        systemInstruction
      );

      // Re-validate repaired question
      const reValidation = validateQuestion(repaired, 'primary', previousQuestions);
      if (reValidation.valid) {
        cleanedQuestion = repaired;
      } else {
        console.warn(`[Generator] Repaired question still failed: ${reValidation.reason}. Using fallback.`);
        cleanedQuestion = getDefaultFallbackQuestion(day, difficulty);
      }
    }

    return {
      question: cleanedQuestion,
      intent: parsed.intent || 'conceptual'
    };
  } catch (error) {
    console.error('[Generator] Error generating primary question. Returning fallback.', error);
    return {
      question: getDefaultFallbackQuestion(day, difficulty),
      intent: 'conceptual'
    };
  }
}
