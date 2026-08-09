import assert from 'assert';
import { test } from 'vitest';
import { loadData, getCandidates } from '../data/dataLoader';
import { getSession } from '../session/sessionStore';
import { startInterview, handleCandidateMessage } from '../agent/interviewAgent';

loadData();
const allCandidates = getCandidates();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, process.env.MOCK_LLM === 'true' ? 0 : ms));

// Helper to run a fast interview turn sequence
async function runInterviewTurns(sessionId: string, candidate: any, answers: string[]): Promise<any> {
  await startInterview(sessionId, candidate);
  for (const ans of answers) {
    await sleep(200);
    await handleCandidateMessage(sessionId, ans);
  }
  await sleep(200);
  const endResult = await handleCandidateMessage(sessionId, '[END_EARLY]');
  return endResult.feedback;
}

// Test 1 — Summary
test('Test 1 — Summary: Summary is non-empty, evidence-based, and changes with transcript', async () => {
  const candidate = allCandidates[0]; // Sarah Johnson
  const s1Id = 'test-summary-s1-' + Date.now();
  const s2Id = 'test-summary-s2-' + Date.now();

  const answers1 = [
    'I use strict Pydantic models for format validation.',
    'I use HNSW index partitions to optimize vector latency.',
    'We use LangChain agents with MCP servers to route tools.'
  ];

  const answers2 = [
    'don\'t know',
    'irrelevant response',
    'incorrect claims'
  ];

  const feedback1 = await runInterviewTurns(s1Id, candidate, answers1);
  const feedback2 = await runInterviewTurns(s2Id, candidate, answers2);

  console.log(`- Summary 1: "${feedback1?.summary}"`);
  console.log(`- Summary 2: "${feedback2?.summary}"`);

  assert.ok(feedback1?.summary && feedback1.summary.length > 20, 'Summary 1 should be non-empty');
  assert.ok(feedback2?.summary && feedback2.summary.length > 20, 'Summary 2 should be non-empty');
  assert.notStrictEqual(feedback1.summary, feedback2.summary, 'Summary should change based on different transcript answers');
});

// Test 2 — Question reviews
test('Test 2 — Question reviews: Reviews correspond to correct turns and are not identical', async () => {
  const candidate = allCandidates[0];
  const sessionId = 'test-bypass-reviews-' + Date.now();

  const answers = [
    'Pydantic validation schemas prevent bad formatting.',
    'HNSW graph index structures maintain fast similarity search.',
    'FastAPI backends stream chunks using Server-Sent Events.'
  ];

  const feedback = await runInterviewTurns(sessionId, candidate, answers);
  const reviews = feedback?.questionReviews || [];

  console.log(`- Question reviews count: ${reviews.length}`);
  assert.ok(reviews.length >= 3, 'Should have at least 3 question reviews');

  // Verify reviews are unique and not identical
  assert.notStrictEqual(reviews[0].evaluation, reviews[1].evaluation, 'Review 0 and 1 evaluations must not be identical');
  assert.notStrictEqual(reviews[1].evaluation, reviews[2].evaluation, 'Review 1 and 2 evaluations must not be identical');

  // Verify reviews correspond to their specific answers
  assert.ok(reviews[0].answer.includes('Pydantic') && reviews[0].evaluation.toLowerCase().includes('pydantic'), 'Review 0 should contain Pydantic details');
  assert.ok(reviews[1].answer.includes('HNSW') && reviews[1].evaluation.toLowerCase().includes('hnsw'), 'Review 1 should contain HNSW details');
  assert.ok(reviews[2].answer.includes('FastAPI') && reviews[2].evaluation.toLowerCase().includes('fastapi'), 'Review 2 should contain FastAPI details');
});

// Test 3 — Follow-ups
test('Test 3 — Follow-ups: Follow-up strategy/question differs appropriately', async () => {
  const candidate = allCandidates[0];

  const startAndGetFollowUp = async (ans: string): Promise<string> => {
    const sId = 'test-followup-' + Math.random().toString(36).substring(7);
    await startInterview(sId, candidate);
    const turn = await handleCandidateMessage(sId, ans);
    return turn.reply;
  };

  const followUpStrong = await startAndGetFollowUp('I use strict Pydantic validation schemas to force JSON outputs.');
  const followUpWeak = await startAndGetFollowUp('I forgot similarity but I know the main idea.');
  const followUpIrrelevant = await startAndGetFollowUp('python and react');

  console.log(`- Follow-up to strong: "${followUpStrong}"`);
  console.log(`- Follow-up to weak: "${followUpWeak}"`);
  console.log(`- Follow-up to irrelevant: "${followUpIrrelevant}"`);

  assert.notStrictEqual(followUpStrong, followUpWeak, 'Strong and weak follow-ups should differ');
  assert.notStrictEqual(followUpWeak, followUpIrrelevant, 'Weak and irrelevant follow-ups should differ');
  
  if (process.env.MOCK_LLM === 'true') {
    assert.ok(followUpStrong.toLowerCase().includes('trade-off') || followUpStrong.toLowerCase().includes('latency'), 'Strong follow-up should challenge');
    assert.ok(followUpWeak.toLowerCase().includes('missed') || followUpWeak.toLowerCase().includes('debug'), 'Weak follow-up should probe');
    assert.ok(followUpIrrelevant.toLowerCase().includes('bring it back') || followUpIrrelevant.toLowerCase().includes('redirect'), 'Irrelevant follow-up should redirect');
  }
});

// Test 4 — Repetition
test('Test 4 — Repetition: Prevents duplicate questions or follow-ups', async () => {
  const candidate = allCandidates[0];
  const sessionId = 'test-repetition-' + Date.now();

  await startInterview(sessionId, candidate);
  
  // Submit answers to trigger several questions/follow-ups
  const answers = [
    'I use strict JSON schemas.',
    'HNSW index partitions optimize search latency.',
    'Docker creates secure container boundaries.'
  ];

  for (const ans of answers) {
    await handleCandidateMessage(sessionId, ans);
    await sleep(200);
  }

  const session = getSession(sessionId)!;
  const questions = session.turns.filter(t => t.role === 'interviewer').map(t => t.text);

  console.log(`- Questions asked: \n  ${questions.join('\n  ')}`);

  // Assert no exact duplicate
  const uniqueSet = new Set(questions);
  assert.strictEqual(questions.length, uniqueSet.size, 'Should have no exact duplicate questions');
});

// Test 5 — Incomplete interview
test('Test 5 — Incomplete interview: Correct scoring and summary details', async () => {
  const candidate = allCandidates[0];
  const sessionId = 'test-incomplete-' + Date.now();

  // Answer 8 questions but across only 3 topics
  // (We simulate 8 turns but only on Day 12, Day 14, and Day 8)
  await startInterview(sessionId, candidate);
  const session = getSession(sessionId)!;

  const answers = [
    'Strict Pydantic schemas enforce format.',
    'We run JSON constraints.',
    'LangChain structured output parsers help.',
    'HNSW graph index structures.',
    'We choose IVF index partitions.',
    'Rerankers optimize retrieval recall.',
    'Dual encoder pipelines map chunks.',
    'FAISS database is fast.'
  ];

  // Force evaluations to belong to only 3 days/topics
  session.evaluations = answers.map((ans, idx) => ({
    id: `ev-${idx}`,
    topic: idx < 3 ? 'Prompt Engineering' : idx < 6 ? 'RAG Architecture' : 'Vector Database',
    day: idx < 3 ? 'Day 12' : idx < 6 ? 'Day 14' : 'Day 8',
    status: 'Good',
    question: 'Technical question?',
    answer: ans,
    evaluation: 'Notes',
    strengths: ['Concepts'],
    improvements: [],
    betterAnswer: ['Step 1']
  }));
  session.questionsAnswered = 8;
  session.curriculumDaysCovered = [12, 14, 8];

  const endResult = await handleCandidateMessage(sessionId, '[END_EARLY]');
  const feedback = endResult.feedback;

  console.log(`- Incomplete Report Score: ${feedback?.overallScore}`);
  console.log(`- Incomplete Report Summary: "${feedback?.summary}"`);

  assert.ok(typeof feedback?.overallScore === 'number' && feedback.overallScore > 0, 'Incomplete overallScore must be a number');
  assert.ok(feedback?.strengths.length > 0, 'Incomplete strengths list must be populated');
  assert.ok(feedback?.summary.toLowerCase().includes('incomplete'), 'Summary must mention incomplete state');
  assert.strictEqual(feedback?.questionReviews.length, 8, 'Question reviews must contain the 8 answered questions');
});

// Test 6 — Completed interview
test('Test 6 — Completed interview: Full metrics present', async () => {
  const candidate = allCandidates[0];
  const sessionId = 'test-completed-' + Date.now();

  await startInterview(sessionId, candidate);
  const session = getSession(sessionId)!;

  // Populate 8 questions across 4 unique days
  session.evaluations = Array.from({ length: 8 }).map((_, idx) => ({
    id: `ev-${idx}`,
    topic: idx < 2 ? 'Prompt Engineering' : idx < 4 ? 'RAG Architecture' : idx < 6 ? 'Vector Database' : 'Agentic AI',
    day: idx < 2 ? 'Day 12' : idx < 4 ? 'Day 14' : idx < 6 ? 'Day 8' : 'Day 18',
    status: 'Strong',
    question: 'Technical question?',
    answer: 'Standard answer text.',
    evaluation: 'Good evaluation.',
    strengths: ['Strong skills'],
    improvements: [],
    betterAnswer: ['Step 1']
  }));
  session.questionsAnswered = 8;
  session.curriculumDaysCovered = [12, 14, 8, 18];

  const endResult = await handleCandidateMessage(sessionId, '[END_EARLY]');
  const feedback = endResult.feedback;

  console.log(`- Completed Report Score: ${feedback?.overallScore}`);
  assert.ok(typeof feedback?.overallScore === 'number' && feedback.overallScore > 0, 'Completed interview must have a numeric score');
  assert.ok(feedback.summary && feedback.summary.length > 25, 'Summary must be generated');
  assert.ok(feedback.strengths.length > 0, 'Strengths must be populated');
  assert.ok(feedback.gaps.length > 0, 'Gaps must be populated');
  assert.ok(feedback.next.length > 0, 'Next steps must be populated');
  assert.ok(feedback.topicPerformance.length > 0, 'Topic performance list must be populated');
});

// Test 7 — Candidate isolation
test('Test 7 — Candidate isolation: Candidate reports are completely isolated', async () => {
  const candA = allCandidates[0]; // Sarah Johnson
  const candB = allCandidates[2]; // Emily Davis or David Miller

  const sAId = 'test-isolation-sa-' + Date.now();
  const sBId = 'test-isolation-sb-' + Date.now();

  const feedA = await runInterviewTurns(sAId, candA, ['Pydantic validation schema.', 'HNSW vector indexes.']);
  const feedB = await runInterviewTurns(sBId, candB, ['Different answer about redis caching.', 'Model context protocol servers.']);

  console.log(`- Report A Summary: "${feedA?.summary}"`);
  console.log(`- Report B Summary: "${feedB?.summary}"`);

  // Verify isolated summaries
  assert.notStrictEqual(feedA?.summary, feedB?.summary, 'Summaries for different candidates must differ');
  assert.ok(feedA?.summary.includes(candA.member.name), 'Report A summary must contain Candidate A name');
  assert.ok(feedB?.summary.includes(candB.member.name), 'Report B summary must contain Candidate B name');
  
  // Verify transcript isolation
  const sessionA = getSession(sAId)!;
  const sessionB = getSession(sBId)!;

  assert.ok(sessionA.turns.every(t => t.role !== 'candidate' || t.text.includes('Pydantic') || t.text.includes('HNSW')), 'Session A should only contain candidate A answers');
  assert.ok(sessionB.turns.every(t => t.role !== 'candidate' || t.text.includes('redis') || t.text.includes('protocol')), 'Session B should only contain candidate B answers');
});

// Test 8 — Question counter increments correctly
test('Test 8 — Question counter: primary questions and follow-ups are counted separately', async () => {
  const candidate = allCandidates[0];
  const sessionId = 'test-counter-inc-' + Date.now();

  // Start interview -> primaryQuestionsAsked = 1
  await startInterview(sessionId, candidate);
  const session = getSession(sessionId)!;
  assert.strictEqual(session.primaryQuestionsAsked, 1, 'First primary question should set counter to 1');
  assert.strictEqual(session.questionsAsked, 1, 'questionsAsked should be 1');

  // Submit strong answer -> triggers challenge follow-up
  await handleCandidateMessage(sessionId, 'I use strict Pydantic validation schemas to force JSON outputs.');
  assert.strictEqual(session.primaryQuestionsAsked, 1, 'Follow-up must not increase primary-question counter');
  assert.strictEqual(session.questionsAsked, 2, 'questionsAsked should increase to 2');

  // Submit another answer to complete the follow-up and move to next topic
  await handleCandidateMessage(sessionId, 'I tune ef_search parameter for HNSW memory footprints.');
  assert.strictEqual(session.primaryQuestionsAsked, 2, 'Transitioning to next topic must increase primary-question counter');
  assert.strictEqual(session.questionsAsked, 3, 'questionsAsked should increase to 3');
});

// Test 9 — Difficulty adaptation
test('Test 9 — Difficulty: adapts based on performance and candidate experience', async () => {
  // Candidate A (Sarah Johnson) - starting target difficulty is Advanced/Intermediate
  const candA = allCandidates[0];
  const sessionIdA = 'test-diff-a-' + Date.now();
  await startInterview(sessionIdA, candA);
  const sessionA = getSession(sessionIdA)!;
  const initialDiffA = sessionA.currentQuestionDifficulty;
  console.log(`- Candidate A initial difficulty: ${initialDiffA}`);

  // Submit strong answer
  await handleCandidateMessage(sessionIdA, 'I use strict Pydantic validation schemas to force JSON outputs.');
  assert.strictEqual(sessionA.currentQuestionDifficulty, 'Advanced', 'Strong answer should maintain or adapt to Advanced');

  // Submit weak answer
  await handleCandidateMessage(sessionIdA, 'don\'t know');
  assert.ok(sessionA.currentQuestionDifficulty === 'Intermediate' || sessionA.currentQuestionDifficulty === 'Foundational', 'Incorrect/unknown answers should adapt difficulty down');
});

// Test 10 — Weak topics calculation helper
test('Test 10 — Weak topics: derived correctly from actual topic performance', async () => {
  // We can test the weak topic calculation logic directly
  const calculateWeakModule = (finalReport: any, evaluations: any[]): string | null => {
    const getModuleIdForDayLocal = (dayNumber: number): string => {
      if (dayNumber >= 1 && dayNumber <= 3) return 'module-1';
      if (dayNumber >= 4 && dayNumber <= 6) return 'module-2';
      if (dayNumber >= 7 && dayNumber <= 10) return 'module-3';
      if (dayNumber >= 11 && dayNumber <= 15) return 'module-4';
      if (dayNumber >= 16 && dayNumber <= 20) return 'module-5';
      if (dayNumber >= 21 && dayNumber <= 24) return 'module-6';
      if (dayNumber >= 25 && dayNumber <= 28) return 'module-7';
      if (dayNumber >= 29 && dayNumber <= 31) return 'module-8';
      return '';
    };

    let weakModuleId: string | null = null;
    if (finalReport && Array.isArray(finalReport.topicPerformance)) {
      const weakItems = finalReport.topicPerformance.filter((tp: any) => 
        tp.level === 'needs-improvement' || (typeof tp.score === 'number' && tp.score < 70)
      );
      if (weakItems.length > 0) {
        const sorted = [...weakItems].sort((a: any, b: any) => (a.score || 0) - (b.score || 0));
        const match = sorted[0];
        const dayNum = parseInt(match.day.replace(/\D/g, ''), 10);
        if (!isNaN(dayNum)) weakModuleId = getModuleIdForDayLocal(dayNum);
      }
    }
    if (!weakModuleId && Array.isArray(evaluations)) {
      const weakEvals = evaluations.filter((e: any) => e.status === 'Needs Improvement');
      if (weakEvals.length > 0) {
        const match = weakEvals[0];
        const dayNum = parseInt(match.day.replace(/\D/g, ''), 10);
        if (!isNaN(dayNum)) weakModuleId = getModuleIdForDayLocal(dayNum);
      }
    }
    return weakModuleId;
  };

  // Case A: All strong
  const reportAllStrong = {
    topicPerformance: [
      { day: 'Day 12', topic: 'Prompt Engineering', score: 90, level: 'strong' },
      { day: 'Day 14', topic: 'RAG Architecture', score: 85, level: 'strong' }
    ]
  };
  assert.strictEqual(calculateWeakModule(reportAllStrong, []), null, 'No weak topic should be returned if all are strong');

  // Case B: One weak topic
  const reportOneWeak = {
    topicPerformance: [
      { day: 'Day 12', topic: 'Prompt Engineering', score: 90, level: 'strong' },
      { day: 'Day 14', topic: 'RAG Architecture', score: 55, level: 'needs-improvement' }
    ]
  };
  assert.strictEqual(calculateWeakModule(reportOneWeak, []), 'module-4', 'Should resolve Day 14 weak topic to module-4');

  // Case C: Incomplete interview evaluations fallback
  const evalsIncomplete = [
    { day: 'Day 12', topic: 'Prompt Engineering', status: 'Strong' },
    { day: 'Day 7', topic: 'Embeddings Explained', status: 'Needs Improvement' }
  ];
  assert.strictEqual(calculateWeakModule(null, evalsIncomplete), 'module-3', 'Should resolve Day 7 weak evaluation to module-3');
});
