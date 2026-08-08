import assert from 'assert';
import { loadData, getCurriculum, getCandidates, getCurriculumDay } from '../data/dataLoader';
import { createSession, getSession, saveSession } from '../session/sessionStore';
import { startInterview, handleCandidateMessage } from '../agent/interviewAgent';
import { determineNextAction } from '../agent/interviewDecisionEngine';
import { evaluateAnswer } from '../agent/answerEvaluator';

loadData();

const curriculum = getCurriculum();
const allCandidates = getCandidates();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

console.log('================================================');
console.log('RUNNING AI ADAPTIVE INTERVIEW TEST SUITE (PHASE 3)');
console.log('================================================\n');

const tests = [
  {
    name: 'Scenario 1: Strong answer triggers challenge/Going deeper and pushes difficulty up',
    fn: async () => {
      const emily = allCandidates.find(c => c.member.id === 'CAND-003')!;
      const sessionId = 'session-s1-' + Date.now();
      
      await startInterview(sessionId, emily);
      const session = getSession(sessionId)!;

      const evalResult = {
        score: 95,
        quality: 'strong' as const,
        evaluation: 'Excellent implementation choice and trade-off details.',
        strengths: ['Vector indexing', 'HNSW distance calculation'],
        gaps: [],
        misconceptions: [],
        betterAnswerStructure: []
      };

      const action = determineNextAction(session, evalResult);
      assert.strictEqual(action.shouldFollowUp, true);
      assert.strictEqual(action.strategy, 'challenge');
      assert.strictEqual(action.difficultyShift, 'up');
    }
  },
  {
    name: 'Scenario 2: Partial answer triggers probe strategy targeting missing concepts',
    fn: async () => {
      const alex = allCandidates.find(c => c.member.id === 'CAND-002')!;
      const sessionId = 'session-s2-' + Date.now();
      
      await startInterview(sessionId, alex);
      const session = getSession(sessionId)!;

      const evalResult = {
        score: 72,
        quality: 'partial' as const,
        evaluation: 'Touched on chunking but forgot similarity calculation details.',
        strengths: ['Chunk size choices'],
        gaps: ['Similarity metrics', 'Distance algorithms'],
        misconceptions: [],
        betterAnswerStructure: []
      };

      const action = determineNextAction(session, evalResult);
      assert.strictEqual(action.shouldFollowUp, true);
      assert.strictEqual(action.strategy, 'probe');
      assert.strictEqual(action.difficultyShift, 'same');
    }
  },
  {
    name: 'Scenario 3: Incorrect answer triggers challenge strategy for misconceptions',
    fn: async () => {
      const candidate = allCandidates[0];
      const sessionId = 'session-s3-' + Date.now();
      
      await startInterview(sessionId, candidate);
      const session = getSession(sessionId)!;

      const evalResult = {
        score: 40,
        quality: 'incorrect' as const,
        evaluation: 'Candidate incorrectly claims vector dimension size reduces model costs.',
        strengths: [],
        gaps: ['Vector dimensions mapping'],
        misconceptions: ['Thinking dimensions affect input tokens billing'],
        betterAnswerStructure: []
      };

      const action = determineNextAction(session, evalResult);
      assert.strictEqual(action.shouldFollowUp, true);
      assert.strictEqual(action.strategy, 'challenge');
      assert.strictEqual(action.difficultyShift, 'down');
    }
  },
  {
    name: 'Scenario 4: Irrelevant answer triggers redirect strategy',
    fn: async () => {
      const candidate = allCandidates[0];
      const sessionId = 'session-s4-' + Date.now();
      
      await startInterview(sessionId, candidate);
      const session = getSession(sessionId)!;

      const evalResult = {
        score: 10,
        quality: 'irrelevant' as const,
        evaluation: 'Answer is completely unrelated to the topic.',
        strengths: [],
        gaps: [],
        misconceptions: [],
        betterAnswerStructure: []
      };

      const action = determineNextAction(session, evalResult);
      assert.strictEqual(action.shouldFollowUp, true);
      assert.strictEqual(action.strategy, 'redirect');
    }
  },
  {
    name: 'Scenario 5: uncertainty triggers diagnostic probe at lower difficulty',
    fn: async () => {
      const candidate = allCandidates[0];
      const sessionId = 'session-s5-' + Date.now();
      
      await startInterview(sessionId, candidate);
      const session = getSession(sessionId)!;

      const evalResult = {
        score: 0,
        quality: 'unknown' as const,
        evaluation: 'Candidate does not know the concept.',
        strengths: [],
        gaps: [],
        misconceptions: [],
        betterAnswerStructure: []
      };

      const action = determineNextAction(session, evalResult);
      assert.strictEqual(action.shouldFollowUp, true);
      assert.strictEqual(action.strategy, 'probe');
      assert.strictEqual(action.difficultyShift, 'down');
    }
  },
  {
    name: 'Scenario 6: Safeguard: Moves to next topic after maximum 2 follow-ups',
    fn: async () => {
      const candidate = allCandidates[0];
      const sessionId = 'session-s6-' + Date.now();
      
      await startInterview(sessionId, candidate);
      const session = getSession(sessionId)!;

      session.currentTopicDepth = 2;

      const evalResult = {
        score: 75,
        quality: 'partial' as const,
        evaluation: 'Still missing chunk overlap parameters.',
        strengths: [],
        gaps: [],
        misconceptions: [],
        betterAnswerStructure: []
      };

      const action = determineNextAction(session, evalResult);
      assert.strictEqual(action.shouldFollowUp, false, 'Should not follow up anymore');
      assert.strictEqual(action.strategy, 'move_on', 'Strategy must force move_on');
    }
  },
  {
    name: 'Scenario 7: Enforces minimum coverage (8 questions and 4 days) before done',
    fn: async () => {
      const candidate = allCandidates[0];
      const sessionId = 'session-s7-' + Date.now();
      
      await startInterview(sessionId, candidate);
      const session = getSession(sessionId)!;

      session.questionsAsked = 7;
      session.curriculumDaysCovered = [12, 28, 10]; // only 3 days covered
      session.currentTopicDepth = 2;
      
      const evalResult = {
        score: 95,
        quality: 'strong' as const,
        evaluation: 'Excellent answer.',
        strengths: [],
        gaps: [],
        misconceptions: [],
        betterAnswerStructure: []
      };

      const action1 = determineNextAction(session, evalResult);
      assert.strictEqual(action1.shouldFollowUp, false); // should move on to next topic

      // Execute handling turn (which simulates the agent advancement)
      // Provide a strong answer that will be evaluated as strong
      const result = await handleCandidateMessage(sessionId, 'For prompt engineering, I would use system prompts, clear delimiters, few-shot examples, and define JSON schemas to ensure reliable outputs.');
      assert.strictEqual(result.done, false, 'Interview must not finish yet because only 3 days are covered');

      // Verify next topic is loaded
      const sessionAfter = getSession(sessionId)!;
      assert.strictEqual(sessionAfter.curriculumDaysCovered.length, 4, 'Must have advanced to 4th day');
    }
  },
  {
    name: 'Scenario 8: Session context history, evaluations and stats persist across API calls',
    fn: async () => {
      const candidate = allCandidates[0];
      const sessionId = 'session-s8-' + Date.now();
      
      await startInterview(sessionId, candidate);
      
      // Make turn 1
      await handleCandidateMessage(sessionId, 'I would choose HNSW indexes.');
      const session1 = getSession(sessionId)!;
      const originalTurnsCount = session1.turns.length;
      const originalEvaluationsCount = session1.evaluations.length;
      const originalAsked = session1.questionsAsked;

      // Make turn 2
      await handleCandidateMessage(sessionId, 'Actually, IVF is better for memory constraints.');
      const session2 = getSession(sessionId)!;
      
      assert.strictEqual(session2.turns.length, originalTurnsCount + 2, 'Turns must grow by 2');
      assert.strictEqual(session2.evaluations.length, originalEvaluationsCount + 1, 'Evaluations count must increment');
      assert.strictEqual(session2.questionsAsked, originalAsked + 1, 'questionsAsked must increment');
    }
  }
];

async function runAll() {
  for (const test of tests) {
    console.log(`\n--- Running: ${test.name} ---`);
    try {
      await test.fn();
      console.log(`[PASS] ${test.name}`);
    } catch (error: any) {
      console.error(`[FAIL] ${test.name}`);
      console.error(error.stack || error);
      process.exit(1);
    }
    // Sleep 13 seconds between tests to respect 5 RPM limit
    console.log('Sleeping 13s to respect free tier RPM rate limit...');
    await sleep(13000);
  }
  console.log('\n================================================');
  console.log('ALL ADAPTIVE ENGINE TESTS COMPLETED SUCCESSFULLY!');
  console.log('================================================');
}

runAll();
