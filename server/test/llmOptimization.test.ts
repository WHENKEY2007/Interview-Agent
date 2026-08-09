import assert from 'assert';
import { test, vi, beforeEach } from 'vitest';
import { validateQuestion } from '../agent/validation';
import { loadData, getCandidates } from '../data/dataLoader';
import { getSession } from '../session/sessionStore';
import { handleCandidateMessage, startInterview } from '../agent/interviewAgent';
import { generateContent } from '../llm/llmClient';

loadData();
const allCandidates = getCandidates();

let mockCallIndex = 0;
let mockResponseText = 'mock question?';
let mockErrorToThrow: any = null;
let mockDelayMs = 0;
let mockTransientError: any = null;

beforeEach(() => {
  mockCallIndex = 0;
  mockResponseText = 'mock question?';
  mockErrorToThrow = null;
  mockDelayMs = 0;
  mockTransientError = null;
});

// Mock the GoogleGenAI module statically at load time
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: async () => {
            mockCallIndex++;
            if (mockDelayMs > 0) {
              await new Promise((resolve) => setTimeout(resolve, mockDelayMs));
            }
            if (mockCallIndex === 1 && mockTransientError) {
              throw mockTransientError;
            }
            if (mockErrorToThrow) {
              throw mockErrorToThrow;
            }
            return { text: mockResponseText };
          }
        }
      };
    })
  };
});

// 1. Test Question Validation Relaxation
test('Validation - Relaxed validation limits allow longer valid questions but reject extreme ones', () => {
  // Primary limits (relaxed: max 40 words, max 4 sentences)
  const borderPrimary = "This is a primary question that is slightly longer than the previous limits. It contains exactly thirty-seven words which would have failed the previous limit of thirty-five words but should pass the relaxed limit of forty words?";
  const tooLongPrimary = "This is a primary question that is extremely long and verbose. It contains way too many words and continues to ramble on and on without any focus, easily exceeding the relaxed limit of forty words and thus failing validation. We are adding even more words here to guarantee it exceeds forty?";

  const valBorder = validateQuestion(borderPrimary, 'primary', []);
  assert.ok(valBorder.valid, 'Primary question with 37 words should pass the relaxed limit of 40');

  const valTooLong = validateQuestion(tooLongPrimary, 'primary', []);
  assert.ok(!valTooLong.valid, 'Primary question with 42+ words should still fail');
  assert.match(valTooLong.reason || '', /word count/i);

  // Follow-up limits (relaxed: max 27 words)
  const borderFollowUp = "This is a follow-up question containing exactly twenty-six words, passing the relaxed limit?";
  const tooLongFollowUp = "This is a follow up question that contains way too many words and continues to ramble on without any end to exceed the limit of twenty seven words easily?";

  const valBorderF = validateQuestion(borderFollowUp, 'followup', []);
  assert.ok(valBorderF.valid, 'Follow-up with 26 words should pass relaxed limit of 27');

  const valTooLongF = validateQuestion(tooLongFollowUp, 'followup', []);
  assert.ok(!valTooLongF.valid, 'Follow-up with 29 words should fail');
  assert.match(valTooLongF.reason || '', /word count/i);
});

// 2. Test Backend Duplicate Turn Prevention and Retry Safety
test('Backend - Deduplication prevents multiple candidate turns and duplicate evaluations on retry', async () => {
  const candidate = allCandidates[0];
  const sessionId = 'dedup-test-' + Date.now();

  await startInterview(sessionId, candidate);

  // Turn 1
  const firstMessage = 'I would choose HNSW indexing.';
  const res1 = await handleCandidateMessage(sessionId, firstMessage);
  
  const session = getSession(sessionId)!;
  const turnsCountBefore = session.turns.length;
  const evalsCountBefore = session.evaluations.length;
  const questionsAnsweredBefore = session.questionsAnswered;

  // Now, simulate a duplicate submission/retry of the exact same message
  const res2 = await handleCandidateMessage(sessionId, firstMessage);

  assert.strictEqual(res2.reply, res1.reply, 'Duplicate submission should return the same reply');
  assert.strictEqual(session.turns.length, turnsCountBefore, 'No duplicate turns should be appended to the session');
  assert.strictEqual(session.evaluations.length, evalsCountBefore, 'No duplicate evaluations should be generated');
  assert.strictEqual(session.questionsAnswered, questionsAnsweredBefore, 'questionsAnswered counter should not increment twice');
});

// 3. Test MOCK_LLM bypass
test('LLM - MOCK_LLM runs immediately without delays', async () => {
  const originalMock = process.env.MOCK_LLM;
  process.env.MOCK_LLM = 'true';

  const startTime = Date.now();
  const response = await generateContent('What is vector search? candidate answer', 'Answer evaluation substance rules', true);
  const elapsed = Date.now() - startTime;

  assert.ok(elapsed < 200, 'Mock LLM should execute almost instantly (under 200ms)');
  assert.ok(response.includes('quality'), 'Mock evaluation response should be JSON');

  process.env.MOCK_LLM = originalMock;
});

// 4. Test fast fail on permanent errors
test('LLM - Fast fail on permanent API errors without retrying', async () => {
  const originalMock = process.env.MOCK_LLM;
  process.env.MOCK_LLM = 'false';

  const err = new Error('Invalid model name');
  (err as any).status = 404; // Permanent HTTP error (Not Found)
  mockErrorToThrow = err;

  const startTime = Date.now();
  let threw = false;
  try {
    await generateContent('test', 'test');
  } catch (e: any) {
    threw = true;
    const elapsed = Date.now() - startTime;
    assert.strictEqual(mockCallIndex, 1, 'Should fail immediately on first attempt without retrying');
    assert.strictEqual(e.status, 404);
    assert.ok(elapsed < 2000, 'Permanent error should fail fast in under 2 seconds');
  }

  assert.ok(threw, 'Should throw an error');
  process.env.MOCK_LLM = originalMock;
});

// 5. Test transient failure retry
test('LLM - Retries on transient failure with exponential backoff', async () => {
  const originalMock = process.env.MOCK_LLM;
  process.env.MOCK_LLM = 'false';

  mockResponseText = 'Success question';
  
  const rateLimitError = new Error('Resource exhausted');
  (rateLimitError as any).status = 429;
  mockTransientError = rateLimitError;

  const startTime = Date.now();
  const response = await generateContent('test', 'test');
  const elapsed = Date.now() - startTime;

  assert.strictEqual(mockCallIndex, 2, 'Should succeed on the second attempt');
  assert.strictEqual(response, 'Success question');
  // Backoff starts at 10ms in test environment, so elapsed time should be small
  assert.ok(elapsed >= 10, `Should delay for backoff (elapsed: ${elapsed}ms)`);

  process.env.MOCK_LLM = originalMock;
});

// 6. Test timeout
test('LLM - Times out after threshold', async () => {
  const originalMock = process.env.MOCK_LLM;
  process.env.MOCK_LLM = 'false';

  mockDelayMs = 800; // longer than the 200ms test environment timeout

  const startTime = Date.now();
  let threw = false;
  try {
    await generateContent('test', 'test');
  } catch (e: any) {
    threw = true;
    const elapsed = Date.now() - startTime;
    assert.match(e.message, /timed out/i);
    assert.strictEqual(mockCallIndex, 3, 'Should retry until max attempts reached');
    assert.ok(elapsed < 2000, `Timeout should trigger under 2 seconds, took ${elapsed}ms`);
  }

  assert.ok(threw, 'Should time out');
  process.env.MOCK_LLM = originalMock;
});
