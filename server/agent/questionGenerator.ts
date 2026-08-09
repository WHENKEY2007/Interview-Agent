import { generateContent } from '../llm/llmClient';
import { CandidateProfile, CurriculumDay, getCurriculum } from '../data/dataLoader';
import { SessionState } from '../session/sessionStore';
import { validateQuestion, repairQuestion, safeParseJSON, validateAndNormalizePrimaryQuestion } from './validation';

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
 * Inspects previously asked questions to avoid returning a duplicate.
 */
export function getDefaultFallbackQuestion(day: CurriculumDay, difficulty: string, previousQuestions: string[] = []): string {
  const candidatesList = [];
  if (day.day === 12) {
    if (difficulty === 'Advanced') {
      candidatesList.push("How would you design a latency-optimized validation layer to prevent malformed LLM JSON outputs under high load?");
    } else if (difficulty === 'Foundational') {
      candidatesList.push("What is the difference between system instructions and user prompts in guiding LLM outputs?");
    }
    candidatesList.push("How do you ensure JSON format compliance in LLM outputs?");
    candidatesList.push("What are the main security risks when parsing unchecked JSON outputs from an LLM?");
  } else if (day.day === 14) {
    if (difficulty === 'Advanced') {
      candidatesList.push("How do you optimize retrieval recall and latency when querying 10 million vectors under 50 milliseconds?");
    }
    candidatesList.push("How would you set up a dual-encoder retrieval pipeline for RAG?");
    candidatesList.push("What strategies prevent chunk duplication and semantic drift in a vector registry?");
  }

  // Add objective-based fallbacks
  for (const obj of day.objectives) {
    candidatesList.push(`How would you approach ${obj} in a production environment?`);
    candidatesList.push(`What is a key technical challenge when implementing ${obj}?`);
  }
  candidatesList.push(`Could you explain how to design a production pipeline for ${day.title}?`);

  // Find the first one that is not duplicate (similarity < 0.8)
  for (const q of candidatesList) {
    const isDup = previousQuestions.some(prev => {
      // Lightweight similarity check
      const stopwords = new Set(['what', 'how', 'why', 'is', 'are', 'the', 'a', 'to', 'for', 'in', 'on', 'with', 'and', 'or', 'you', 'your']);
      const w1 = new Set(q.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopwords.has(w)));
      const w2 = new Set(prev.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopwords.has(w)));
      if (w1.size === 0 || w2.size === 0) return false;
      const intersection = [...w1].filter(x => w2.has(x));
      return intersection.length / new Set([...w1, ...w2]).size > 0.8;
    });
    if (!isDup) {
      return q;
    }
  }

  // Absolute fallback with random-ish salt to guarantee uniqueness
  const idx = previousQuestions.length;
  return `Regarding ${day.title}, what is the main production challenge you would anticipate in phase ${idx}?`;
}

/**
 * Generates a primary interview question for a specific curriculum day.
 * Returns the question text, its classified intent, and targeted objective.
 */
export async function generatePrimaryQuestion(
  candidate: CandidateProfile,
  day: CurriculumDay,
  difficulty: 'Foundational' | 'Intermediate' | 'Advanced' = 'Intermediate',
  previousQuestions: string[] = []
): Promise<{ question: string; intent: string; objective: string }> {
  
  const systemInstruction = `You are an expert AI Technical Interviewer conducting a realistic, conversational, and focused interview.
Your goal is to evaluate the candidate's understanding of Day ${day.day} (${day.title}).

Candidate Info:
- Name: ${candidate.member.name}
- Job Role: ${candidate.member.jobRole} (${candidate.member.yearsExperience} yrs exp)

Curriculum Context:
- Day: ${day.day} - ${day.title}
- Main Objectives: ${day.objectives.slice(0, 3).join('; ')}
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
  "intent": "conceptual" | "diagnostic" | "implementation" | "reasoning" | "tradeoff" | "architecture" | "debugging" | "scenario",
  "objective": "Select the EXACT objective from the curriculum objectives listed above that this question targets"
}`;

  const prompt = `Generate a concise ${difficulty}-level primary question, classify its intent, and specify its objective for Day ${day.day}: ${day.title}.`;

  try {
    const rawResponse = await generateContent(prompt, systemInstruction, true);
    const parsed = safeParseJSON(rawResponse);
    const validated = validateAndNormalizePrimaryQuestion(parsed, day, difficulty, previousQuestions);

    let cleanedQuestion = validated.question
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
        cleanedQuestion = getDefaultFallbackQuestion(day, difficulty, previousQuestions);
      }
    }

    return {
      question: cleanedQuestion,
      intent: validated.intent,
      objective: validated.objective
    };
  } catch (error) {
    console.error('[Generator] Error generating primary question. Returning fallback.', error);
    return {
      question: getDefaultFallbackQuestion(day, difficulty, previousQuestions),
      intent: 'conceptual',
      objective: day.objectives[0] || 'Understand curriculum topics.'
    };
  }
}
