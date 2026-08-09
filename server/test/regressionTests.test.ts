import assert from 'assert';
import { test } from 'vitest';
import { loadData, getCandidates, getCurriculum, getCurriculumDay } from '../data/dataLoader';
import { getSession, createSession, saveSession, AnswerEvaluation } from '../session/sessionStore';
import { startInterview, handleCandidateMessage } from '../agent/interviewAgent';
import { generateInterviewPlan } from '../agent/interviewPlanner';
import { generateFinalFeedback } from '../agent/feedbackGenerator';
import { safeParseJSON, validateAndNormalizePrimaryQuestion, validateAndNormalizeEvaluation } from '../agent/validation';

loadData();
const allCandidates = getCandidates();
const curriculum = getCurriculum();

// =========================================================================
// TEST A: Synchronized Question Counter
// =========================================================================
test('TEST A: Question counter increments correctly from 1 to 2 to 3', async () => {
  const candidate = allCandidates[0]; // Sarah Johnson
  const sessionId = 'test-a-counter-' + Date.now();

  // 1. Start interview
  await startInterview(sessionId, candidate);
  const session = getSession(sessionId)!;
  assert.strictEqual(session.questionsAsked, 1, 'Initial questionsAsked must be 1');
  assert.strictEqual(session.currentQuestionNumber, 1, 'Initial currentQuestionNumber must be 1');

  // 2. Submit answer to trigger follow-up
  const turn1 = await handleCandidateMessage(sessionId, 'I use strict Pydantic models for format validation.');
  assert.strictEqual(session.questionsAsked, 2, 'Follow-up question should make questionsAsked 2');
  assert.strictEqual(session.currentQuestionNumber, 2, 'currentQuestionNumber should match 2');

  // 3. Submit follow-up response to move to next topic
  const turn2 = await handleCandidateMessage(sessionId, 'I set ef_search to 64 for optimal lookup latency.');
  assert.strictEqual(session.questionsAsked, 3, 'Moving to next day should make questionsAsked 3');
  assert.strictEqual(session.currentQuestionNumber, 3, 'currentQuestionNumber should match 3');
});

// =========================================================================
// TEST B: Question Reviews in Incomplete Sessions
// =========================================================================
test('TEST B: Incomplete sessions question reviews are populated correctly', async () => {
  const candidate = allCandidates[0];
  const sessionId = 'test-b-reviews-' + Date.now();

  await startInterview(sessionId, candidate);
  const session = getSession(sessionId)!;

  // Simulate 3 answered questions
  session.evaluations = Array.from({ length: 3 }).map((_, idx) => ({
    id: `ev-${idx}`,
    topic: 'Prompt Engineering',
    day: 'Day 12',
    status: 'Good',
    question: `Question ${idx}`,
    answer: `Answer ${idx}`,
    evaluation: 'Notes',
    strengths: ['Concepts'],
    improvements: [],
    betterAnswer: [],
    questionId: `q-${idx}`,
    questionNumber: idx + 1,
    objective: 'Objective',
    difficulty: 'Intermediate',
    questionType: 'primary',
    score: 80
  }));
  session.questionsAnswered = 3;

  const result = await handleCandidateMessage(sessionId, '[END_EARLY]');
  const feedback = result.feedback;

  assert.ok(feedback, 'Feedback must be returned');
  assert.strictEqual(feedback.questionReviews.length, 3, 'Question reviews count must match evaluations length');
  assert.strictEqual(feedback.questionReviews[0].question, 'Question 0', 'Question text must match');
});

// =========================================================================
// TEST C: Incomplete Interview Score Calculation
// =========================================================================
test('TEST C: Incomplete interview with >=1 answered question calculates score and strengths', async () => {
  const candidate = allCandidates[0];
  const sessionId = 'test-c-incomplete-score-' + Date.now();

  await startInterview(sessionId, candidate);
  const session = getSession(sessionId)!;

  // Answer 1 question
  session.evaluations = [{
    id: 'ev-0',
    topic: 'Prompt Engineering',
    day: 'Day 12',
    status: 'Strong',
    question: 'How do you do schema validation?',
    answer: 'I use strict Pydantic schemas in Python.',
    evaluation: 'Perfect.',
    strengths: ['Pydantic validation'],
    improvements: [],
    betterAnswer: [],
    questionId: 'q-0',
    questionNumber: 1,
    objective: 'Pydantic integration',
    difficulty: 'Intermediate',
    questionType: 'primary',
    score: 95
  }];
  session.questionsAnswered = 1;

  const result = await handleCandidateMessage(sessionId, '[END_EARLY]');
  const feedback = result.feedback;

  assert.ok(feedback, 'Feedback report must exist');
  assert.ok(typeof feedback.overallScore === 'number' && feedback.overallScore > 0, 'Should calculate numeric score');
  assert.ok(feedback.strengths.length > 0, 'Strengths must be populated from evaluation');
  assert.ok(feedback.summary.toLowerCase().includes('incomplete'), 'Summary must mention incomplete state');
});

// =========================================================================
// TEST D: Completed Interview Metrics & Focus Topics
// =========================================================================
test('TEST D: Completed interview returns full metrics and dynamic focus topics', async () => {
  const candidate = allCandidates[0];
  const sessionId = 'test-d-completed-' + Date.now();

  await startInterview(sessionId, candidate);
  const session = getSession(sessionId)!;

  // Answer 8 questions across 4 days
  session.evaluations = Array.from({ length: 8 }).map((_, idx) => ({
    id: `ev-${idx}`,
    topic: idx < 2 ? 'Vector Databases' : idx < 4 ? 'RAG' : idx < 6 ? 'Prompt Engineering' : 'Agentic AI',
    day: idx < 2 ? 'Day 8' : idx < 4 ? 'Day 10' : idx < 6 ? 'Day 12' : 'Day 18',
    status: 'Strong',
    question: 'Q',
    answer: 'A',
    evaluation: 'Notes',
    strengths: ['Concepts'],
    improvements: [],
    betterAnswer: [],
    questionId: `q-${idx}`,
    questionNumber: idx + 1,
    objective: 'Obj',
    difficulty: 'Intermediate',
    questionType: 'primary',
    score: 90
  }));
  session.questionsAnswered = 8;
  session.curriculumDaysCovered = [8, 10, 12, 18];

  const result = await handleCandidateMessage(sessionId, '[END_EARLY]');
  const feedback = result.feedback;

  assert.ok(feedback, 'Feedback must be returned');
  assert.ok(feedback.metrics && feedback.metrics.length === 5, 'Must contain 5 performance breakdown dimensions');
  assert.ok(feedback.plannedFocusTopics && feedback.plannedFocusTopics.length === 5, 'Must contain 5 planned focus topics');
  
  const ragFocus = feedback.plannedFocusTopics.find(t => t.topic === 'RAG');
  assert.ok(ragFocus, 'Should contain focus details for RAG');
  assert.strictEqual(ragFocus.signal, 'Strong', 'RAG focus signal should reflect Strong performance');
});

// =========================================================================
// TEST E: Candidate Personalization
// =========================================================================
test('TEST E: Emily Chen (Advanced) vs Ethan Brooks (Foundational) planning and focus topics', async () => {
  const emily = allCandidates.find(c => c.member.id === 'CAND-003')!;
  const ethan = allCandidates.find(c => c.member.id === 'CAND-007')!;

  assert.ok(emily && ethan, 'Emily and Ethan profiles must be loaded');

  const planEmily = generateInterviewPlan(emily, curriculum);
  const planEthan = generateInterviewPlan(ethan, curriculum);

  assert.strictEqual(planEmily.targetDifficulty, 'Advanced', 'Emily should be Advanced');
  assert.strictEqual(planEthan.targetDifficulty, 'Foundational', 'Ethan should be Foundational');

  // Verify focus topics differ dynamically based on their baseline completions
  const feedbackEmily = await generateFinalFeedback(emily, []);
  const feedbackEthan = await generateFinalFeedback(ethan, []);

  const focusEmily = feedbackEmily.plannedFocusTopics!;
  const focusEthan = feedbackEthan.plannedFocusTopics!;

  assert.notDeepStrictEqual(focusEmily, focusEthan, 'Focus topics must differ dynamically by candidate baseline');
});

// =========================================================================
// TEST F: Dynamic Recommended Next Steps
// =========================================================================
test('TEST F: Poor performance on Vector Databases and MCP updates next steps', async () => {
  const candidate = allCandidates[0];
  const sessionId = 'test-f-nextsteps-' + Date.now();

  await startInterview(sessionId, candidate);
  const session = getSession(sessionId)!;

  // Submit evaluations indicating poor performance on Day 8 (Vector Databases) and Day 23 (MCP)
  session.evaluations = [
    {
      id: 'ev-0',
      topic: 'Vector Databases',
      day: 'Day 8',
      status: 'Needs Improvement',
      question: 'HNSW index structures?',
      answer: 'I do not know.',
      evaluation: 'Failed vector databases baseline.',
      strengths: [],
      improvements: ['Review vector index trade-offs.'],
      betterAnswer: [],
      questionId: 'q-0',
      questionNumber: 1,
      objective: 'Similarity indices',
      difficulty: 'Intermediate',
      questionType: 'primary',
      score: 40
    },
    {
      id: 'ev-1',
      topic: 'MCP',
      day: 'Day 23',
      status: 'Needs Improvement',
      question: 'How does MCP handle tools?',
      answer: 'I skip this.',
      evaluation: 'Candidate has no familiarity with MCP protocols.',
      strengths: [],
      improvements: ['Review model context protocols.'],
      betterAnswer: [],
      questionId: 'q-1',
      questionNumber: 2,
      objective: 'MCP architecture',
      difficulty: 'Intermediate',
      questionType: 'primary',
      score: 30
    }
  ];
  session.questionsAnswered = 2;

  const result = await handleCandidateMessage(sessionId, '[END_EARLY]');
  const feedback = result.feedback;

  // Verify next steps list maps to failed days
  const mcpNext = feedback.next.find((n: any) => n.day.includes('23') || n.topic === 'MCP');
  const vecNext = feedback.next.find((n: any) => n.day.includes('8') || n.topic === 'Vector Databases');

  assert.ok(mcpNext || vecNext, 'Next steps must reference the weak curriculum areas');
});

// =========================================================================
// TEST G: LLM Output Format Resilience
// =========================================================================
test('TEST G: Parser handles malformed JSON correctly and falls back cleanly', () => {
  const malformedMD = `
\`\`\`json
{
  "question": "What is SSE?",
  "intent": "conceptual",
  "objective": "Understand Streaming"
}
\`\`\`
  `;
  
  const parsed = safeParseJSON(malformedMD);
  assert.strictEqual(parsed.question, 'What is SSE?', 'safeParseJSON must clean markdown code blocks');

  // Verify malformed object fallback
  const day = getCurriculumDay(12)!;
  const normalizedQ = validateAndNormalizePrimaryQuestion(null, day, 'Intermediate', []);
  assert.ok(normalizedQ.question.length > 0, 'Should fall back to deterministic question');
  assert.strictEqual(normalizedQ.intent, 'conceptual');
  assert.strictEqual(normalizedQ.objective, day.objectives[0]);

  const normalizedEval = validateAndNormalizeEvaluation({ score: 'invalid', quality: 'UNKNOWN' }, 'Q', 'A', day);
  assert.strictEqual(normalizedEval.score, 70, 'Invalid score string must fallback to 70');
  assert.strictEqual(normalizedEval.quality, 'unknown', 'Quality must be normalized to lowercase');
});

// =========================================================================
// TEST H: Session Isolation
// =========================================================================
test('TEST H: Multiple concurrent sessions maintain distinct history and state', async () => {
  const cand1 = allCandidates[0]; // Sarah Johnson
  const cand2 = allCandidates[1]; // Alex Turner

  const s1 = 'session-iso-1-' + Date.now();
  const s2 = 'session-iso-2-' + Date.now();

  await startInterview(s1, cand1);
  await startInterview(s2, cand2);

  await handleCandidateMessage(s1, 'First answer from Sarah.');
  await handleCandidateMessage(s2, 'First answer from Alex.');

  const session1 = getSession(s1)!;
  const session2 = getSession(s2)!;

  assert.strictEqual(session1.candidate.member.id, 'CAND-001');
  assert.strictEqual(session2.candidate.member.id, 'CAND-002');

  const s1CandidateTurns = session1.turns.filter(t => t.role === 'candidate');
  const s2CandidateTurns = session2.turns.filter(t => t.role === 'candidate');

  assert.strictEqual(s1CandidateTurns[0].text, 'First answer from Sarah.');
  assert.strictEqual(s2CandidateTurns[0].text, 'First answer from Alex.');
});

// =========================================================================
// TEST I: Candidate Isolation in Planning
// =========================================================================
test('TEST I: Emily Chen (Advanced) vs Alex Turner (Intermediate) yields distinct plans and target difficulties', () => {
  const emily = allCandidates.find(c => c.member.id === 'CAND-003')!;
  const alex = allCandidates.find(c => c.member.id === 'CAND-002')!;

  assert.ok(emily && alex);

  const planEmily = generateInterviewPlan(emily, curriculum);
  const planAlex = generateInterviewPlan(alex, curriculum);

  assert.strictEqual(planEmily.targetDifficulty, 'Advanced', 'Emily should be planned as Advanced');
  assert.strictEqual(planAlex.targetDifficulty, 'Intermediate', 'Alex should be planned as Intermediate');
  assert.notDeepStrictEqual(planEmily.selectedDays, planAlex.selectedDays, 'Days selected for plans must differ based on individual progress');
});

// =========================================================================
// TEST J: Switch Candidate State Reset & Restoration
// =========================================================================
test('TEST J: Restarting session or switching active candidate creates distinct session IDs and plans without leakage', async () => {
  const candA = allCandidates.find(c => c.member.id === 'CAND-001')!;
  const candB = allCandidates.find(c => c.member.id === 'CAND-002')!;

  const s1 = 'session-switch-1-' + Date.now();
  const s2 = 'session-switch-2-' + Date.now();

  await startInterview(s1, candA);
  await startInterview(s2, candB);

  const sessionA = getSession(s1)!;
  const sessionB = getSession(s2)!;

  assert.strictEqual(sessionA.candidate.member.id, 'CAND-001');
  assert.strictEqual(sessionB.candidate.member.id, 'CAND-002');
  
  assert.notDeepStrictEqual(sessionA.plannedFocusTopics, sessionB.plannedFocusTopics, 'Plans must not leak or be shared between sessions');
});
