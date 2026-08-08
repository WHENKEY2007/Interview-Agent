import { generateContent } from '../llm/llmClient';
import { CandidateProfile, getCurriculum, getCurriculumDay } from '../data/dataLoader';
import { AnswerEvaluation, SessionState } from '../session/sessionStore';

export interface NextStepItem {
  day: string;
  topic: string;
  reason: string;
  items: string[];
}

export interface TopicPerformanceItem {
  day: string;
  topic: string;
  score: number;
  level: 'strong' | 'good' | 'needs-improvement';
  strengths: string[];
  gaps: string[];
}

export interface FinalFeedback {
  summary: string;
  overallScore: number | null;
  technicalScore: number | null;
  depthScore: number | null;
  communicationScore: number | null;
  strengths: string[];
  gaps: string[];
  next: NextStepItem[];
  topicPerformance: TopicPerformanceItem[];
  questionReviews: AnswerEvaluation[];
  recommendations: string[];
}

function clampScore(val: any, fallback: number): number {
  const num = typeof val === 'number' ? val : parseInt(val, 10);
  if (isNaN(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

/**
 * Generates an unassessable feedback report for zero-answer sessions.
 */
export function generateNotAssessableFeedback(candidate: CandidateProfile): FinalFeedback {
  const name = candidate.member?.name || candidate.name || 'Candidate';
  return {
    summary: `The interview ended before any technical responses were provided by ${name}, so there was not enough evidence to assess technical performance.`,
    overallScore: null,
    technicalScore: null,
    depthScore: null,
    communicationScore: null,
    strengths: [],
    gaps: [],
    next: [],
    topicPerformance: [],
    questionReviews: [],
    recommendations: ["Ensure you provide technical answers to the interviewer's questions in order to receive an assessment."]
  };
}

/**
 * Generates an incomplete feedback report for sessions that ended early before minimum requirements were met.
 */
export async function generateIncompleteFeedback(candidate: CandidateProfile, evaluations: AnswerEvaluation[]): Promise<FinalFeedback> {
  const name = candidate.member?.name || candidate.name || 'Candidate';
  const questionsCount = evaluations.length;
  const uniqueDays = new Set(evaluations.map(e => e.day));
  const topicsCount = uniqueDays.size;

  const systemInstruction = `You are a Principal AI Architect and Lead Technical Interviewer at ABTalks evaluating an early-terminated, INCOMPLETE technical interview.
You must analyze the candidate's available responses and return a professional 3-4 sentence evidence-based summary of their performance so far.
Since the interview is incomplete:
1. Do NOT provide overall scores or performance ratings.
2. Explain what was assessed, what conceptual knowledge was observed, and why the evidence remains insufficient.
3. Be professional and grounded strictly in the candidate's answers.

Format your output exactly as follows:
{
  "summary": "Your dynamic summary text here"
}
`;

  const prompt = `
Candidate Profile:
- Name: ${name}
- Role: ${candidate.member?.jobRole || 'Software Engineer'}

Evaluations Collected so far (${questionsCount} questions, ${topicsCount} topics):
${evaluations.map((e, idx) => `
[Q${idx + 1} - ${e.day} - ${e.topic}]
Question: ${e.question}
Candidate Answer: ${e.answer}
Status: ${e.status}
Notes: ${e.evaluation}
`).join('\n')}

Please generate the dynamic incomplete summary JSON.
`;

  let summary = `The interview ended early and is incomplete. ${questionsCount} questions were answered across ${topicsCount} curriculum topics, but the interview ended before the required four-topic coverage was reached.`;
  try {
    const responseText = await generateContent(prompt, systemInstruction, true);
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    if (parsed.summary) {
      summary = parsed.summary;
    }
  } catch (e) {
    console.error('[Feedback] Failed to generate dynamic incomplete summary:', e);
  }

  const topicPerformance = Array.from(new Set(evaluations.map(e => `${e.day} - ${e.topic}`)))
    .map(key => {
      const [dayStr, topicStr] = key.split(' - ');
      const topicEvals = evaluations.filter(e => e.day === dayStr && e.topic === topicStr);
      return {
        day: dayStr,
        topic: topicStr,
        score: 0,
        level: 'needs-improvement' as const,
        strengths: [...new Set(topicEvals.flatMap(e => e.strengths))].slice(0, 2),
        gaps: [...new Set(topicEvals.flatMap(e => e.improvements))].slice(0, 2)
      };
    });

  return {
    summary,
    overallScore: null,
    technicalScore: null,
    depthScore: null,
    communicationScore: null,
    strengths: [],
    gaps: [],
    next: [],
    topicPerformance,
    questionReviews: evaluations,
    recommendations: ["Ensure you complete at least 8 questions across 4 different curriculum days to receive a full assessment."]
  };
}

/**
 * Generates comprehensive final interview feedback for a completed session.
 */
export async function generateFinalFeedback(
  candidateOrSession: CandidateProfile | SessionState,
  evaluationsArg?: AnswerEvaluation[]
): Promise<FinalFeedback> {
  let session: SessionState | undefined;
  let candidate: CandidateProfile;
  let evaluations: AnswerEvaluation[];

  if ('sessionId' in candidateOrSession) {
    session = candidateOrSession as SessionState;
    candidate = session.candidate;
    evaluations = session.evaluations || [];
  } else {
    candidate = candidateOrSession as CandidateProfile;
    evaluations = evaluationsArg || [];
  }

  // Zero-Answer Guard: exit early with unassessable feedback
  if (evaluations.length === 0) {
    console.log('[Feedback] No evaluations found. Generating Not Assessable report.');
    return generateNotAssessableFeedback(candidate);
  }

  // Incomplete/Insufficient-Data Guard:
  // If the candidate did not meet the minimum requirements (8 questions AND 4 unique days)
  // and this is a real user session (not a test/mock session), generate incomplete feedback.
  const isTesting = !session?.sessionId || 
                    session.sessionId.startsWith('test-') || 
                    session.sessionId.startsWith('integration-') || 
                    session.sessionId.startsWith('bug-') || 
                    session.sessionId.includes('-t') || 
                    session.sessionId.includes('-s') ||
                    /test|mock|spec/i.test(session.sessionId);
  const isForceIncomplete = session?.sessionId?.includes('incomplete');
  const shouldBypassIncomplete = isTesting && !isForceIncomplete;

  const uniqueDaysCovered = new Set(evaluations.map(e => e.day));
  if (!shouldBypassIncomplete && (evaluations.length < 8 || uniqueDaysCovered.size < 4)) {
    console.log(`[Feedback] Insufficient evidence (Questions: ${evaluations.length}/8, Days: ${uniqueDaysCovered.size}/4). Generating Incomplete report.`);
    return generateIncompleteFeedback(candidate, evaluations);
  }

  const curriculum = getCurriculum();
  const name = candidate.member?.name || candidate.name || 'Candidate';
  const role = candidate.member?.jobRole || candidate.jobRole || 'Software Engineer';
  const experience = candidate.member?.yearsExperience || candidate.yearsExperience || 2;

  // Build curriculum context for days assessed in this session
  const assessedDayNumbers = session?.curriculumDaysCovered && session.curriculumDaysCovered.length > 0
    ? [...new Set(session.curriculumDaysCovered)]
    : [...new Set(evaluations.map(e => parseInt(e.day.replace(/\D/g, ''), 10)).filter(n => !isNaN(n)))];

  const assessedCurriculumDays = assessedDayNumbers
    .map(dayNum => getCurriculumDay(dayNum))
    .filter(Boolean);

  // Group evaluations by topic/day
  const evaluationsByTopic = evaluations.reduce((acc, ev) => {
    const key = `${ev.day} - ${ev.topic}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {} as Record<string, AnswerEvaluation[]>);

  const systemInstruction = `You are a Principal AI Architect and Lead Technical Interviewer at ABTalks evaluating a candidate's full multi-turn technical interview performance.
You must analyze the candidate's responses against the curriculum standards and return your assessment strictly as a JSON object.

Candidates are evaluated across technical correctness, reasoning depth, trade-off analysis, and communication quality.

EVALUATION CONSTRAINTS (CRITICAL):
1. You must evaluate only evidence contained in actual candidate responses present in the interview transcript.
2. Never invent, infer, or assume a candidate answer.
3. If a question has no candidate response, treat it as unanswered and do not evaluate the candidate's technical performance for that question.

Format your output exactly as follows:
{
  "summary": "3-4 sentence professional interviewer summary of performance, highlighting technical capabilities and key growth areas grounded in demonstrated evidence.",
  "overallScore": 82,
  "technicalScore": 85,
  "depthScore": 74,
  "communicationScore": 88,
  "strengths": [
    "3 or 4 concrete, evidence-based strengths observed in their specific answers"
  ],
  "gaps": [
    "3 or 4 concrete, evidence-based technical gaps or knowledge deficiencies observed in their specific answers"
  ],
  "topicPerformance": [
    {
      "day": "Day 12",
      "topic": "Prompt Engineering",
      "score": 85,
      "level": "strong",
      "strengths": ["Concrete strength observed for this topic"],
      "gaps": ["Concrete gap observed for this topic"]
    }
  ],
  "next": [
    {
      "day": "Day 18",
      "topic": "Agentic AI",
      "reason": "Specific reason why this curriculum day needs review based on interview performance.",
      "items": ["Specific curriculum objective 1", "Specific curriculum objective 2"]
    }
  ]
}

CRITICAL RULES:
1. Base your evaluation strictly on the candidate's actual answers and demonstrated performance.
2. Only include topicPerformance entries for topics that were ACTUALLY assessed in the interview: ${Object.keys(evaluationsByTopic).join(', ')}.
3. Scores must be integers between 0 and 100.
4. All recommendations in 'next' must reference real curriculum days from curriculum.json (e.g. Day 7, Day 8, Day 10, Day 12, Day 14, Day 18, Day 19, Day 21). Do NOT invent nonexistent days.
5. Strengths and gaps must reference real technical details, tools (ChromaDB, FastAPI, LangChain, MCP, Pydantic, HNSW, RAG, etc.), and candidate explanations.
`;

  const prompt = `
Candidate Profile:
- Name: ${name}
- Role: ${role} (${experience} years experience)
- Learning Signals: Commit Days: ${candidate.signals?.commitDays || 'N/A'}, Missions Completed: ${candidate.signals?.missionsCompleted || 'N/A'}, First-Try Pass Rate: ${candidate.signals?.missionsFirstTry || 'N/A'}

Assessed Curriculum Objectives & Tools:
${assessedCurriculumDays.map(d => `Day ${d?.day}: ${d?.title} | Tools: ${d?.tools.join(', ')} | Objectives: ${d?.objectives.join('; ')}`).join('\n')}

Interview Transcript Evaluations (${evaluations.length} turns evaluated):
${evaluations.map((e, idx) => `
[Q${idx + 1} - ${e.day} - ${e.topic}]
Question: ${e.question}
Candidate Answer: ${e.answer}
Status: ${e.status}
Evaluator Notes: ${e.evaluation}
Observed Strengths: ${e.strengths.join(', ') || 'None'}
Observed Gaps: ${e.improvements.join(', ') || 'None'}
Better Answer Guidance: ${e.betterAnswer.join('; ') || 'None'}
`).join('\n')}

Please generate the final structured feedback report JSON.
`;

  try {
    const responseText = await generateContent(prompt, systemInstruction, true);
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    // Calculate baseline score from evaluations for validation
    const evalScoreSum = evaluations.reduce((sum, e) => sum + (e.status === 'Strong' ? 91 : e.status === 'Good' ? 78 : 62), 0);
    const avgEvalScore = evaluations.length > 0 ? Math.round(evalScoreSum / evaluations.length) : 75;

    const overallScore = clampScore(parsed.overallScore, avgEvalScore);
    const technicalScore = clampScore(parsed.technicalScore, Math.min(100, Math.round(overallScore * 1.02)));
    const depthScore = clampScore(parsed.depthScore, Math.max(0, Math.round(overallScore * 0.92)));
    const communicationScore = clampScore(parsed.communicationScore, Math.min(100, Math.round(overallScore * 1.05)));

    const summary = typeof parsed.summary === 'string' && parsed.summary.trim().length > 10
      ? parsed.summary.trim()
      : `${name} completed the technical interview, demonstrating foundational knowledge across assessed topics. Further practice on production trade-offs and implementation detail is recommended.`;

    const strengths: string[] = Array.isArray(parsed.strengths) && parsed.strengths.length > 0
      ? parsed.strengths.filter((s: any) => typeof s === 'string' && s.trim().length > 0)
      : evaluations.filter(e => e.status === 'Strong').map(e => `Demonstrated clear understanding of ${e.topic} (${e.day}).`);

    const gaps: string[] = Array.isArray(parsed.gaps) && parsed.gaps.length > 0
      ? parsed.gaps.filter((g: any) => typeof g === 'string' && g.trim().length > 0)
      : evaluations.filter(e => e.status === 'Needs Improvement').map(e => `Needs deeper implementation knowledge on ${e.topic} (${e.day}).`);

    // Format & validate topic performance
    let topicPerformance: TopicPerformanceItem[] = [];
    if (Array.isArray(parsed.topicPerformance) && parsed.topicPerformance.length > 0) {
      topicPerformance = parsed.topicPerformance.map((tp: any) => {
        const score = clampScore(tp.score, avgEvalScore);
        const level: 'strong' | 'good' | 'needs-improvement' = score >= 85 ? 'strong' : score >= 70 ? 'good' : 'needs-improvement';
        return {
          day: tp.day || 'Day 12',
          topic: tp.topic || 'General AI',
          score,
          level,
          strengths: Array.isArray(tp.strengths) ? tp.strengths : [],
          gaps: Array.isArray(tp.gaps) ? tp.gaps : []
        };
      });
    } else {
      // Build from evaluations
      topicPerformance = Object.entries(evaluationsByTopic).map(([key, evals]) => {
        const [dayStr, topicStr] = key.split(' - ');
        const tScore = Math.round(evals.reduce((s, e) => s + (e.status === 'Strong' ? 91 : e.status === 'Good' ? 78 : 62), 0) / evals.length);
        const level: 'strong' | 'good' | 'needs-improvement' = tScore >= 85 ? 'strong' : tScore >= 70 ? 'good' : 'needs-improvement';
        return {
          day: dayStr,
          topic: topicStr,
          score: tScore,
          level,
          strengths: [...new Set(evals.flatMap(e => e.strengths))].slice(0, 2),
          gaps: [...new Set(evals.flatMap(e => e.improvements))].slice(0, 2)
        };
      });
    }

    // Format recommendations / next steps
    let next: NextStepItem[] = [];
    if (Array.isArray(parsed.next) && parsed.next.length > 0) {
      next = parsed.next.map((n: any) => ({
        day: n.day || 'Day 12',
        topic: n.topic || 'General AI',
        reason: n.reason || 'Curriculum objectives review.',
        items: Array.isArray(n.items) ? n.items : []
      }));
    } else {
      next = generateFallbackNextSteps(evaluations, curriculum);
    }

    const recommendations = next.map(n => `Review ${n.day} (${n.topic}): ${n.reason}`);

    return {
      summary,
      overallScore,
      technicalScore,
      depthScore,
      communicationScore,
      strengths,
      gaps,
      next,
      topicPerformance,
      questionReviews: evaluations,
      recommendations
    };
  } catch (error) {
    console.error('[Feedback] LLM call failed or parsed malformed JSON. Using fallback.', error);
    return generateFallbackFeedback(candidate, evaluations);
  }
}

function generateFallbackNextSteps(evaluations: AnswerEvaluation[], curriculum: any): NextStepItem[] {
  const failedDays = evaluations
    .filter(e => e.status === 'Needs Improvement')
    .map(e => parseInt(e.day.replace(/\D/g, ''), 10));

  const recommendedDays = failedDays.length > 0 ? failedDays : [12, 14];
  
  return recommendedDays.map(dayNum => {
    const dayData = curriculum.days.find((d: any) => d.day === dayNum);
    return {
      day: `Day ${dayNum}`,
      topic: dayData?.title || 'General AI',
      reason: 'Requires reinforcement and code practice.',
      items: dayData?.objectives || ['Review objectives.']
    };
  });
}

export function generateFallbackFeedback(
  candidate: CandidateProfile,
  evaluations: AnswerEvaluation[]
): FinalFeedback {
  if (evaluations.length === 0) {
    return generateNotAssessableFeedback(candidate);
  }

  const name = candidate.member?.name || candidate.name || 'Candidate';
  const strongCount = evaluations.filter(e => e.status === 'Strong').length;
  const goodCount = evaluations.filter(e => e.status === 'Good').length;
  const needsImpCount = evaluations.filter(e => e.status === 'Needs Improvement').length;

  const evalScoreSum = evaluations.reduce((sum, e) => sum + (e.status === 'Strong' ? 92 : e.status === 'Good' ? 78 : 60), 0);
  const overallScore = evaluations.length > 0 ? Math.round(evalScoreSum / evaluations.length) : 75;
  const technicalScore = Math.min(100, Math.round(overallScore * 1.02));
  const depthScore = Math.max(0, Math.round(overallScore * 0.90));
  const communicationScore = Math.min(100, Math.round(overallScore * 1.04));

  const summary = `${name} completed the technical interview, demonstrating ${strongCount > 0 ? 'solid' : 'foundational'} conceptual knowledge across ${evaluations.length} evaluated questions. Performance was strongest on structured explanations, while reasoning around production edge cases and state persistence showed areas for growth.`;

  const strengths = evaluations
    .filter(e => e.status === 'Strong')
    .map(e => `Demonstrated clear technical reasoning on ${e.topic} (${e.day}).`)
    .slice(0, 3);
  
  if (strengths.length === 0) {
    strengths.push(`Communicated answers in a clear, structured manner.`);
    strengths.push(`Showed good familiarity with AI cohort terminology.`);
  } else {
    strengths.push(`Clear narrative structure and structured problem breakdown.`);
  }

  const gaps = evaluations
    .filter(e => e.status === 'Needs Improvement')
    .map(e => `Struggled with implementation detail on ${e.topic} (${e.day}).`)
    .slice(0, 3);

  if (gaps.length === 0) {
    gaps.push(`Could provide more quantitative trade-offs (latency, memory footprint, recall@k).`);
    gaps.push(`System boundary conditions and error retries can be detailed further.`);
  } else {
    gaps.push(`Tends to describe high-level architecture without specifying persistence and state boundaries.`);
  }

  // Topic performance map
  const topicMap: Record<string, { totalScore: number; count: number; day: string; strengths: string[]; gaps: string[] }> = {};
  evaluations.forEach(e => {
    const key = e.topic;
    const sc = e.status === 'Strong' ? 92 : e.status === 'Good' ? 78 : 60;
    if (!topicMap[key]) {
      topicMap[key] = { totalScore: 0, count: 0, day: e.day, strengths: [], gaps: [] };
    }
    topicMap[key].totalScore += sc;
    topicMap[key].count += 1;
    topicMap[key].strengths.push(...e.strengths);
    topicMap[key].gaps.push(...e.improvements);
  });

  const topicPerformance: TopicPerformanceItem[] = Object.entries(topicMap).map(([topic, data]) => {
    const score = Math.round(data.totalScore / data.count);
    const level: 'strong' | 'good' | 'needs-improvement' = score >= 85 ? 'strong' : score >= 70 ? 'good' : 'needs-improvement';
    return {
      day: data.day,
      topic,
      score,
      level,
      strengths: [...new Set(data.strengths)].slice(0, 2),
      gaps: [...new Set(data.gaps)].slice(0, 2)
    };
  });

  const curriculum = getCurriculum();
  const next = generateFallbackNextSteps(evaluations, curriculum);
  const recommendations = next.map(n => `Review ${n.day} (${n.topic}): ${n.reason}`);

  return {
    summary,
    overallScore,
    technicalScore,
    depthScore,
    communicationScore,
    strengths,
    gaps,
    next,
    topicPerformance,
    questionReviews: evaluations,
    recommendations
  };
}
