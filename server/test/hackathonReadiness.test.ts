import assert from 'assert';
import { loadData, getCandidates, getCurriculumDay, getCurriculum } from '../data/dataLoader';
import { createSession, getSession, saveSession } from '../session/sessionStore';
import { startInterview, handleCandidateMessage } from '../agent/interviewAgent';
import { determineNextAction } from '../agent/interviewDecisionEngine';
import { validateQuestion } from '../agent/validation';
import { generateInterviewPlan } from '../agent/interviewPlanner';

loadData();

const allCandidates = getCandidates();
const curriculum = getCurriculum();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

console.log('================================================');
console.log('RUNNING HACKATHON READINESS TEST SUITE (PHASE 7)');
console.log('================================================\n');

const tests = [
  {
    name: 'Test 1: Candidate Adaptation - CAND-003 (Strong) target difficulty & plan relevance',
    fn: async () => {
      const sarah = allCandidates.find(c => c.member.id === 'CAND-003')!;
      const sessionId = 'session-t1-sarah-' + Date.now();
      
      const firstQuestion = await startInterview(sessionId, sarah);
      const session = getSession(sessionId)!;

      console.log(`  - Sarah Initial Difficulty: "${session.currentQuestionDifficulty}"`);
      console.log(`  - Sarah First Question: "${firstQuestion}"`);

      // Verify difficulty is Advanced for strong candidate
      assert.strictEqual(session.currentQuestionDifficulty, 'Advanced', 'Strong candidate must start at Advanced difficulty');
      assert.ok(session.interviewPlan!.selectedDays.length >= 4, 'Plan must select at least 4 days');
    }
  },
  {
    name: 'Test 2: Candidate Adaptation - CAND-007 (Weak) target difficulty & diagnostic bounds',
    fn: async () => {
      const ethan = allCandidates.find(c => c.member.id === 'CAND-007')!;
      const sessionId = 'session-t2-ethan-' + Date.now();
      
      const firstQuestion = await startInterview(sessionId, ethan);
      const session = getSession(sessionId)!;

      console.log(`  - Ethan Initial Difficulty: "${session.currentQuestionDifficulty}"`);
      console.log(`  - Ethan First Question: "${firstQuestion}"`);

      // Verify difficulty is Foundational for weak/intern candidate
      assert.strictEqual(session.currentQuestionDifficulty, 'Foundational', 'Struggling candidate must start at Foundational difficulty');
      assert.ok(session.interviewPlan!.selectedDays.length >= 4, 'Plan must select at least 4 days');
    }
  },
  {
    name: 'Test 3: Candidate Adaptation - CAND-002 (Alex) job role/experience relevance',
    fn: async () => {
      const alex = allCandidates.find(c => c.member.id === 'CAND-002')!;
      const sessionId = 'session-t3-alex-' + Date.now();
      
      const firstQuestion = await startInterview(sessionId, alex);
      const session = getSession(sessionId)!;

      console.log(`  - Alex Initial Difficulty: "${session.currentQuestionDifficulty}"`);
      console.log(`  - Alex First Question: "${firstQuestion}"`);

      // Verify difficulty is Intermediate (default fallback for standard profile)
      assert.strictEqual(session.currentQuestionDifficulty, 'Intermediate', 'Standard candidate should start at Intermediate difficulty');
    }
  },
  {
    name: 'Test 4: Question Objectives Mapping & Intent Classification',
    fn: async () => {
      const candidate = allCandidates[0];
      const sessionId = 'session-t4-' + Date.now();
      
      await startInterview(sessionId, candidate);
      const session = getSession(sessionId)!;

      const firstQuestion = session.currentQuestion;
      const turn = session.turns[0];
      const day12 = getCurriculumDay(12)!;

      console.log(`  - Generated Question: "${firstQuestion}"`);
      console.log(`  - Classified Intent: "${turn.intent}"`);

      // Verify intent is non-empty and valid
      assert.ok(turn.intent && turn.intent.length > 0, 'Question should have a classified intent');
      
      // Verify question is related to Day 12 prompt engineering objectives
      const lowercaseQ = firstQuestion.toLowerCase();
      const hasTopicKeywords = lowercaseQ.includes('prompt') || 
                               lowercaseQ.includes('system') || 
                               lowercaseQ.includes('instructions') || 
                               lowercaseQ.includes('output') || 
                               lowercaseQ.includes('format') || 
                               lowercaseQ.includes('json');
      assert.ok(hasTopicKeywords, 'Generated question should contain prompt engineering topic terms');
    }
  },
  {
    name: 'Test 5: API Contract - Start, Turn, and Completion Feedback Schema compliance',
    fn: async () => {
      const candidate = allCandidates[0];
      const sessionId = 'session-t5-' + Date.now();
      
      // 1. Verify Start Response
      const firstQuestion = await startInterview(sessionId, candidate);
      const session = getSession(sessionId)!;
      assert.ok(firstQuestion && firstQuestion.length > 0, 'Start response reply should be non-empty');
      assert.strictEqual(session.status, 'IN_PROGRESS', 'Status should be IN_PROGRESS initially');

      // 2. Set session to almost complete (simulate reaching pacing and coverage bounds)
      session.questionsAsked = 9;
      session.curriculumDaysCovered = [12, 14, 8, 5];
      session.currentTopicDepth = 2;

      // 3. Verify Turn Response and Completion Schema
      console.log('[Test Pacing] Sleeping 13s before completion call to respect free tier RPM rate limit...');
      await sleep(13000);
      
      const turnResult = await handleCandidateMessage(sessionId, 'To optimize vector indexing at 10M scale, I would utilize HNSW index parameters.');
      
      console.log(`  - Turn Done status: ${turnResult.done}`);
      console.log('  - Feedback Generated:', turnResult.feedback ? 'YES' : 'NO');

      // Assert complete
      assert.strictEqual(turnResult.done, true, 'Turn should complete because questions limit was reached');
      assert.strictEqual(session.status, 'COMPLETED', 'Session should be marked COMPLETED');

      // Assert full feedback schema compliance
      const fb = turnResult.feedback;
      assert.ok(fb, 'Feedback must be returned upon completion');
      assert.ok(fb.summary && fb.summary.length > 20, 'Feedback must contain non-trivial summary');
      assert.ok(fb.strengths && fb.strengths.length > 0, 'Feedback must list strengths');
      assert.ok(fb.gaps && fb.gaps.length > 0, 'Feedback must list gaps');
      assert.ok(fb.next && fb.next.length > 0, 'Feedback must list next curriculum day steps');
    }
  },
  {
    name: 'Test 6: Topic Progression and Pacing Guardrails',
    fn: async () => {
      const candidate = allCandidates[0];
      const sessionId = 'session-t6-' + Date.now();
      
      await startInterview(sessionId, candidate);
      const session = getSession(sessionId)!;

      // Set initial state
      session.questionsAsked = 5;
      session.curriculumDaysCovered = [12, 14];
      session.currentTopicDepth = 1;

      // Mock a strong evaluation that would normally trigger challenge, but force topic progression
      const evalResult = {
        score: 90,
        quality: 'strong' as const,
        evaluation: 'Strong vector database concept.',
        strengths: ['HNSW parameters'],
        gaps: [],
        misconceptions: [],
        betterAnswerStructure: []
      };

      // Transition to next topic by overriding depth and evaluations
      session.currentTopicDepth = 2;
      const action = determineNextAction(session, evalResult);
      assert.strictEqual(action.shouldFollowUp, false, 'Safeguard should force move_on transition at depth 2');

      // Execute messaging turn which advances topic
      console.log('[Test Pacing] Sleeping 13s before progression turn call...');
      await sleep(13000);

      const result = await handleCandidateMessage(sessionId, 'Actually, IVF is better for memory constraints.');
      
      const sessionAfter = getSession(sessionId)!;
      assert.strictEqual(sessionAfter.curriculumDaysCovered.length, 3, 'Days covered must increment to 3 upon topic transition');
      assert.strictEqual(sessionAfter.currentTopicDepth, 0, 'Topic depth must reset to 0 upon topic transition');
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
