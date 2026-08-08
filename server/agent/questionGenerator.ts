import { generateContent } from '../llm/llmClient';
import { CandidateProfile, CurriculumDay, getCurriculum, getCurriculumDay } from '../data/dataLoader';
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
  day: CurriculumDay
): Promise<string> {
  const systemInstruction = `You are an expert AI Technical Interviewer conducting a realistic, conversational, and practical technical interview. 
Your goal is to evaluate the candidate's understanding of a specific day's learning objectives from their AI Cohort curriculum.

Candidate Info:
- Name: ${candidate.member.name}
- Job Role: ${candidate.member.jobRole}
- Experience: ${candidate.member.yearsExperience} years
- Education: ${candidate.member.education}

Curriculum Context for Today's Topic:
- Day: ${day.day}
- Topic Title: ${day.title}
- Main Objectives: ${day.objectives.join(', ')}
- Associated Tools: ${day.tools.join(', ')}

Your Question Requirements:
1. Do NOT ask simple definitions (e.g. do not ask "What is a vector database?").
2. Ask a concrete, scenario-based system design or debugging question. Frame it as a real-world problem they would face on the job (e.g. diagnosing performance degradation, choosing between index types, handling schema validation failures, etc.).
3. Tailor the complexity to their experience: a Senior Engineer (${candidate.member.yearsExperience} years) should face architectural trade-offs, scalability, and fail-safe design. A junior/intern should focus on correct implementation details, basic debugging, and correct library usage.
4. Keep the question brief, direct, and conversational. Do not output multiple questions in one turn.`;

  const prompt = `Generate the primary technical interview question for Day ${day.day} (${day.title}). 
Focus on objectives: ${day.objectives.slice(0, 3).join(', ')}.
Use tools: ${day.tools.slice(0, 3).join(', ')}.`;

  const question = await generateContent(prompt, systemInstruction);
  return question.trim();
}
