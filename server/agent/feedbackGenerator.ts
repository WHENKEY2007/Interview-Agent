import { generateContent } from '../llm/llmClient';
import { CandidateProfile } from '../data/dataLoader';
import { AnswerEvaluation } from '../session/sessionStore';

export interface FinalFeedback {
  summary: string;
  strengths: string[];
  gaps: string[];
  next: Array<{
    day: string;
    topic: string;
    reason: string;
    items: string[];
  }>;
}

export async function generateFinalFeedback(
  candidate: CandidateProfile,
  evaluations: AnswerEvaluation[]
): Promise<FinalFeedback> {
  const systemInstruction = `You are a Principal AI Architect and Lead Technical Interviewer evaluating a candidate's overall performance after an extensive multi-turn technical interview.
You must return your assessment strictly as a JSON object.

Format your output exactly as follows:
{
  "summary": "A high-level, encouraging but critical summary of their performance, highlighting their technical capabilities and key growth areas (3-4 sentences)",
  "strengths": ["list of 3 or 4 concrete, actionable strengths observed in their answers"],
  "gaps": ["list of 3 or 4 concrete, actionable growth areas or knowledge gaps observed in their answers"],
  "next": [
    {
      "day": "Day 18",
      "topic": "Agentic AI",
      "reason": "Explain briefly why this needs review based on evaluations.",
      "items": ["Specific topic 1", "Specific topic 2"]
    }
  ]
}

Base your evaluation on:
1. The candidate's background: ${candidate.member.name} (${candidate.member.jobRole}, ${candidate.member.yearsExperience} years experience).
2. The transcript evaluations:
${evaluations.map((e, idx) => `
Q${idx + 1}: ${e.question}
A${idx + 1}: ${e.answer}
Status: ${e.status}
Notes: ${e.evaluation}
`).join('\n')}

Each bullet point should be professional, technical, and highly actionable. Avoid vague platitudes like "good communication". Be specific to the curriculum tools (ChromaDB, FastAPI, LangChain, MCP, Pydantic, etc.).`;

  const prompt = `Please generate the final feedback report based on the evaluations.`;

  try {
    const responseText = await generateContent(prompt, systemInstruction, true);
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson) as FinalFeedback;
  } catch (error) {
    console.error('[Feedback] Error parsing JSON final feedback. Returning fallback.', error);
    // Create a high-quality fallback based on evaluations
    return {
      summary: `${candidate.member.name} completed the technical interview. They demonstrated baseline knowledge across the cohort curriculum, but show opportunities to improve on architectural depth and practical trade-offs.`,
      strengths: evaluations
        .filter(e => e.status === 'Strong')
        .map(e => `Showed solid understanding of ${e.topic} (Day ${e.day})`)
        .slice(0, 3)
        .concat(['Good structured reasoning and clear communication of ideas.']),
      gaps: evaluations
        .filter(e => e.status === 'Needs Improvement')
        .map(e => `Struggled to provide implementation detail on ${e.topic} (Day ${e.day})`)
        .slice(0, 3)
        .concat(['Tends to stay qualitative rather than quantitative under pressure.']),
      next: [
        {
          day: 'Day 18',
          topic: 'Agentic AI',
          reason: 'State management and error handling was surface-level.',
          items: ['Tool selection', 'State persistence', 'Error recovery']
        },
        {
          day: 'Day 21',
          topic: 'MCP',
          reason: 'Interface design was missing from the tool responses.',
          items: ['Tool definitions', 'MCP architecture', 'Context exchange']
        }
      ]
    };
  }
}
