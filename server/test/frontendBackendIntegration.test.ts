import assert from 'assert';
import { test } from 'vitest';
import router from '../routes/interview';
import { loadData, getCandidates } from '../data/dataLoader';
import { getSession } from '../session/sessionStore';

loadData();
const allCandidates = getCandidates();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to simulate request / response handler call
function simulatePost(body: any): Promise<{ status: number; data: any }> {
  return new Promise((resolve) => {
    let statusCode = 200;
    let responseData: any = null;

    const req = {
      body,
      params: {},
      query: {}
    } as any;

    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        responseData = data;
        resolve({ status: statusCode, data: responseData });
        return this;
      }
    } as any;

    // Retrieve handler of POST /interview from the router stack
    const layer = router.stack.find((s) => s.route && s.route.path === '/interview' && s.route.methods.post);
    if (!layer) {
      throw new Error('POST /interview handler not found in router stack');
    }

    layer.route.stack[0].handle(req, res, () => {
      resolve({ status: statusCode, data: responseData });
    });
  });
}

test('Test A — Start: Candidate selection -> Start -> Backend receives candidate -> Response displayed', async () => {
  const candidate = allCandidates[0];
  const sessionId = 'integration-test-a-' + Date.now();

  const res = await simulatePost({ sessionId, candidate });
  
  console.log(`  - Start Status: ${res.status}`);
  console.log(`  - Reply: "${res.data.reply}"`);
  console.log(`  - Done: ${res.data.done}`);

  assert.strictEqual(res.status, 200, 'Start response status must be 200');
  assert.strictEqual(res.data.done, false, 'Start done must be false');
  assert.ok(res.data.reply.length > 0, 'Reply must not be empty');
  assert.strictEqual(res.data.turns.length, 1, 'Turns list must contain first question');
});

test('Test B — Answer: Candidate submits answer -> Backend receives exact answer -> Response displayed', async () => {
  const candidate = allCandidates[0];
  const sessionId = 'integration-test-b-' + Date.now();

  // Start
  await simulatePost({ sessionId, candidate });

  console.log('[Test B] Sleeping 13s to respect RPM limits...');
  await sleep(13000);

  // Submit Answer
  const answer = 'To manage scaling, I would utilize HNSW vector index partitions.';
  const res = await simulatePost({ sessionId, message: answer });

  console.log(`  - Answer Status: ${res.status}`);
  console.log(`  - Reply: "${res.data.reply}"`);
  console.log(`  - Turns count: ${res.data.turns.length}`);

  assert.strictEqual(res.status, 200);
  assert.ok(res.data.reply.length > 0, 'Reply must be populated');
  assert.strictEqual(res.data.turns.length, 3, 'Turns must contain start, answer, and next question');
});

test('Test C — Empty answer: Empty input -> No request -> No candidate turn', async () => {
  const candidate = allCandidates[0];
  const sessionId = 'integration-test-c-' + Date.now();

  // Start
  await simulatePost({ sessionId, candidate });

  // Submit Empty Answer
  const res1 = await simulatePost({ sessionId, message: '' });
  console.log(`  - Empty Answer status: ${res1.status}, data: "${res1.data.reply || res1.data.error}"`);
  
  // Submit Whitespace Answer
  const res2 = await simulatePost({ sessionId, message: '   ' });
  console.log(`  - Whitespace Answer status: ${res2.status}, data: "${res2.data.reply || res2.data.error}"`);

  // Empty message returns 200 with validation warning from message handler
  assert.strictEqual(res1.status, 200);
  assert.strictEqual(res1.data.reply, 'Please provide a response before submitting.');
  assert.strictEqual(res2.status, 200);
  assert.strictEqual(res2.data.reply, 'Please provide a response before submitting.');
  
  const session = getSession(sessionId)!;
  assert.strictEqual(session.turns.length, 1, 'No new turns should be added to the session');
});

test('Test D — Session continuity: Three turns -> Same sessionId used for all requests', async () => {
  const candidate = allCandidates[0];
  const sessionId = 'integration-test-d-' + Date.now();

  // Start
  await simulatePost({ sessionId, candidate });

  // Turn 1
  console.log('[Test D] Sleeping 13s before Turn 1...');
  await sleep(13000);
  const res1 = await simulatePost({ sessionId, message: 'First answer for RAG.' });
  assert.strictEqual(res1.status, 200);

  // Turn 2
  console.log('[Test D] Sleeping 13s before Turn 2...');
  await sleep(13000);
  const res2 = await simulatePost({ sessionId, message: 'Second answer explaining HNSW.' });
  assert.strictEqual(res2.status, 200);

  // Turn 3
  console.log('[Test D] Sleeping 13s before Turn 3...');
  await sleep(13000);
  const res3 = await simulatePost({ sessionId, message: 'Third answer detailing MCP servers.' });
  assert.strictEqual(res3.status, 200);

  const session = getSession(sessionId)!;
  assert.strictEqual(session.sessionId, sessionId, 'Session ID must remain stable');
  assert.strictEqual(session.questionsAsked, 4, 'Questions asked must track 3 turns (initialized at 1, +3 turns = 4)');
});

test('Test E — Completion: Backend returns done: true -> Frontend transitions -> Feedback stored', async () => {
  const candidate = allCandidates[0];
  const sessionId = 'integration-test-e-' + Date.now();

  // Start
  await simulatePost({ sessionId, candidate });

  console.log('[Test E] Sleeping 13s before turn...');
  await sleep(13000);
  await simulatePost({ sessionId, message: 'To build ground truth, I would implement system prompt templates.' });

  console.log('[Test E] Sleeping 13s before ending early...');
  await sleep(13000);
  const res = await simulatePost({ sessionId, message: '[END_EARLY]' });

  console.log(`  - Completion Done: ${res.data.done}`);
  console.log(`  - Feedback Summary: "${res.data.feedback?.summary.slice(0, 60)}..."`);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.done, true, 'Done must be true');
  assert.ok(res.data.feedback, 'Feedback must be generated');
  assert.ok(res.data.feedback.overallScore > 0, 'Score must be calculated based on the answer');
});

test('Test F — Zero-answer: Start -> End early -> Feedback is null/N/A', async () => {
  const candidate = allCandidates[0];
  const sessionId = 'integration-test-f-' + Date.now();

  // Start
  await simulatePost({ sessionId, candidate });

  // End immediately
  const res = await simulatePost({ sessionId, message: '[END_EARLY]' });

  console.log(`  - Zero-Answer Done: ${res.data.done}`);
  console.log(`  - Zero-Answer Score: ${res.data.feedback?.overallScore}`);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.data.done, true);
  assert.strictEqual(res.data.feedback?.overallScore, null, 'Score must be null on zero-answer completed interviews');
  assert.strictEqual(res.data.feedback?.questionReviews.length, 0, 'Reviews must be empty');
});

test('Test G — Error: Router intercepts malformed session and returns generic response', async () => {
  // Missing sessionId
  const res1 = await simulatePost({ candidate: allCandidates[0] });
  console.log(`  - Missing Session ID error: "${res1.data.error}"`);
  assert.strictEqual(res1.status, 400);

  // Missing message/candidate body payload
  const res2 = await simulatePost({ sessionId: 'some-session' });
  console.log(`  - Missing message/candidate payload error: "${res2.data.error}"`);
  assert.strictEqual(res2.status, 400);
});
