import { generateContent } from '../llm/llmClient';
import { CandidateProfile, CurriculumDay, getCurriculum } from '../data/dataLoader';
import { SessionState } from '../session/sessionStore';

/**
 * Dynamically selects a curriculum day to test next.
 * Ensures we pick a day that hasn't been covered in this session yet.
 * Prioritizes:
 * 1. Days where candidate had multiple attempts (>=3) - test reinforcement.
 * 2. Days skipped or failed.
 * 3. Days passed with 1-2 attempts.
 */
export function selectNextDay(session: SessionState): number {
  const candidate = session.candidate;
  const covered = session.curriculumDaysCovered;
  const curriculum = getCurriculum();

  // Find all days represented in the candidate's profile
  const candidateMissions = candidate.missions || [];
  
  // Classify candidate days
  const highAttemptDays = candidateMissions
    .filter(m => !covered.includes(m.day) && m.attempts && m.attempts >= 3)
    .map(m => m.day);

  const skippedDays = candidateMissions
    .filter(m => !covered.includes(m.day) && (m.skipped || m.passed === false))
    .map(m => m.day);

  const passedDays = candidateMissions
    .filter(m => !covered.includes(m.day) && m.passed && (!m.attempts || m.attempts < 3))
    .map(m => m.day);

  // Fallback: any curriculum day not covered yet
  const allCurriculumDays = curriculum.days.map(d => d.day);
  const remainingDays = allCurriculumDays.filter(d => !covered.includes(d));

  if (highAttemptDays.length > 0) {
    return highAttemptDays[0];
  }
  if (skippedDays.length > 0) {
    return skippedDays[0];
  }
  if (passedDays.length > 0) {
    return passedDays[0];
  }
  if (remainingDays.length > 0) {
    return remainingDays[0];
  }
  
  // Default to day 12 (RAG debugging) if everything is exhausted
  return 12;
}

/**
 * Generates a primary interview question for a specific curriculum day.
 */
export async function generatePrimaryQuestion(
  candidate: CandidateProfile,
  day: CurriculumDay,
  difficulty: 'Foundational' | 'Intermediate' | 'Advanced' = 'Intermediate'
): Promise<string> {
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
3. NO PREAMBLE / INTROS: Jump directly to the question. Do NOT say "Hello", "Welcome", "Great to meet you", "Today we will discuss", or "In this turn...".
4. NO BULLET LISTS OR EXPLANATORY ESSAYS: Do not explain the background or list sub-topics before asking.
5. PRACTICAL SYSTEM DESIGN / DEBUGGING SCENARIO: Frame as a real-world engineering choice or problem matching ${difficulty} level:
   - Foundational: Basic mechanics, correct API/library usage, or baseline debugging.
   - Intermediate: Architecture choices, system trade-offs, or error handling.
   - Advanced: Scale/latency bounds, algorithmic limits, or failure modes under high load.`;

  const prompt = `Ask one concise ${difficulty}-level technical interview question (1-2 sentences, 10-30 words) for Day ${day.day}: ${day.title}.`;

  const rawQuestion = await generateContent(prompt, systemInstruction);
  
  let cleaned = rawQuestion
    .replace(/^["']|["']$/g, '')
    .replace(/^(Interviewer|Question|AI):\s*/i, '')
    .trim();

  return cleaned;
}
