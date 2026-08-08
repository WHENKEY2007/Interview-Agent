import assert from 'assert';
import { loadData, getCandidates } from '../data/dataLoader';
import { createSession, getSession } from '../session/sessionStore';
import { startInterview, handleCandidateMessage } from '../agent/interviewAgent';
import { generateFinalFeedback } from '../agent/feedbackGenerator';

loadData();

const allCandidates = getCandidates();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, process.env.MOCK_LLM === 'true' ? 0 : ms));

console.log('================================================');
console.log('RUNNING FABRICATED FEEDBACK BUG REGRESSION TESTS');
console.log('================================================\n');

const tests = [
  {
    name: 'Bug Test 1: Zero answers (End immediately) produces null score and Insufficient Evidence',
    fn: async () => {
      const candidate = allCandidates[0];
      const sessionId = 'bug-session-t1-' + Date.now();
      
      // Start interview
      await startInterview(sessionId, candidate);
      
      // End interview immediately
      const result = await handleCandidateMessage(sessionId, '[END_EARLY]');
      const session = getSession(sessionId)!;

      console.log(`  - Done status: ${result.done}`);
      console.log(`  - Feedback Score: ${result.feedback?.overallScore}`);
      console.log(`  - Feedback Summary: "${result.feedback?.summary}"`);

      // Verifications
      assert.strictEqual(result.done, true, 'Interview must be finished');
      assert.strictEqual(session.status, 'COMPLETED', 'Session must be marked COMPLETED');
      assert.strictEqual(result.feedback?.overallScore, null, 'Score must be null when no questions are answered');
      assert.ok(result.feedback?.summary.includes('evidence'), 'Summary must mention insufficient evidence');
      assert.strictEqual(result.feedback?.strengths.length, 0, 'Strengths list must be empty');
      assert.strictEqual(result.feedback?.gaps.length, 0, 'Gaps list must be empty');
      assert.strictEqual(result.feedback?.topicPerformance.length, 0, 'Topic performance list must be empty');
    }
  },
  {
    name: 'Bug Test 2: One real answer evaluates only that answer, score based on evidence',
    fn: async () => {
      const candidate = allCandidates[0];
      const sessionId = 'bug-bypass-session-t2-' + Date.now();
      
      await startInterview(sessionId, candidate);
      
      console.log('[Test 2] Sleeping 13s to respect rate limits before turn...');
      await sleep(13000);

      // Submit one real answer
      const turnResult = await handleCandidateMessage(sessionId, 'To validate JSON compliance, I would use system prompts, structured schemas, and Pydantic output parsers.');
      
      console.log('[Test 2] Sleeping 13s to respect rate limits before end...');
      await sleep(13000);

      // End interview
      const endResult = await handleCandidateMessage(sessionId, '[END_EARLY]');
      
      console.log(`  - Answered Questions: ${getSession(sessionId)!.questionsAnswered}`);
      console.log(`  - Feedback Score: ${endResult.feedback?.overallScore}`);

      // Verifications
      assert.strictEqual(getSession(sessionId)!.questionsAnswered, 1, 'Exactly 1 question should be answered');
      assert.ok(typeof endResult.feedback?.overallScore === 'number', 'Overall score must be a number');
      assert.ok(endResult.feedback?.overallScore > 0, 'Score should be non-zero');
      assert.ok(endResult.feedback?.strengths.length > 0, 'Strengths should be generated based on the answer');
    }
  },
  {
    name: 'Bug Test 3: Empty and whitespace messages are rejected on the backend',
    fn: async () => {
      const candidate = allCandidates[0];
      const sessionId = 'bug-session-t3-' + Date.now();
      
      await startInterview(sessionId, candidate);
      const session = getSession(sessionId)!;
      
      const originalTurnsCount = session.turns.length;

      // 1. Submit empty string
      const res1 = await handleCandidateMessage(sessionId, '');
      console.log(`  - Empty string response: "${res1.reply}"`);
      assert.strictEqual(res1.done, false);
      assert.ok(res1.reply.includes('provide a response'), 'Warning message should request a response');
      assert.strictEqual(session.turns.length, originalTurnsCount, 'Turns should not be added for empty message');

      // 2. Submit whitespace string
      const res2 = await handleCandidateMessage(sessionId, '   ');
      console.log(`  - Whitespace response: "${res2.reply}"`);
      assert.strictEqual(res2.done, false);
      assert.strictEqual(session.turns.length, originalTurnsCount, 'Turns should not be added for whitespace message');
    }
  },
  {
    name: 'Bug Test 4: New session after old completed session does not leak data',
    fn: async () => {
      const candidate = allCandidates[0];
      
      // Session 1: One Answer
      const session1Id = 'bug-bypass-leak-s1-' + Date.now();
      await startInterview(session1Id, candidate);
      
      console.log('[Test 4] Sleeping 13s before turn...');
      await sleep(13000);
      await handleCandidateMessage(session1Id, 'To optimize vector indexing at 10M scale, I would utilize HNSW index parameters.');
      
      console.log('[Test 4] Sleeping 13s before ending Session 1...');
      await sleep(13000);
      const res1 = await handleCandidateMessage(session1Id, '[END_EARLY]');
      assert.ok(res1.feedback?.overallScore && res1.feedback.overallScore > 0, 'Session 1 should have a valid score');

      // Session 2: Immediate End
      console.log('[Test 4] Sleeping 13s before starting Session 2...');
      await sleep(13000);
      const session2Id = 'bug-leak-s2-' + Date.now();
      await startInterview(session2Id, candidate);
      const res2 = await handleCandidateMessage(session2Id, '[END_EARLY]');

      console.log(`  - Session 1 Score: ${res1.feedback?.overallScore}`);
      console.log(`  - Session 2 Score: ${res2.feedback?.overallScore}`);
      console.log(`  - Session 2 Strengths Count: ${res2.feedback?.strengths.length}`);

      // Verify Session 2 does not carry over Session 1's details
      assert.strictEqual(res2.feedback?.overallScore, null, 'Session 2 score must be null (unassessable)');
      assert.strictEqual(res2.feedback?.strengths.length, 0, 'Session 2 strengths list must be empty');
      assert.strictEqual(res2.feedback?.gaps.length, 0, 'Session 2 gaps list must be empty');
      assert.strictEqual(res2.feedback?.questionReviews.length, 0, 'Session 2 reviews must be empty');
    }
  }
];

import { test } from 'vitest';

tests.forEach((t) => {
  test(t.name, async () => {
    await t.fn();
    console.log('Sleeping 13s to respect free tier RPM rate limit...');
    await sleep(13000);
  });
});
