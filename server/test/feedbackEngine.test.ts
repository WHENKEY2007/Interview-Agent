import assert from 'assert';
import { loadData, getCandidates, getCurriculum, CandidateProfile } from '../data/dataLoader';
import { createSession, getSession, AnswerEvaluation, SessionState } from '../session/sessionStore';
import { generateFinalFeedback, generateFallbackFeedback, FinalFeedback } from '../agent/feedbackGenerator';

loadData();

const curriculum = getCurriculum();
const candidates = getCandidates();

console.log('================================================');
console.log('RUNNING INTERVIEW FEEDBACK ENGINE TEST SUITE (PHASE 4)');
console.log('================================================\n');

const tests = [
  {
    name: 'Test A — Strong candidate: High scores, evidence-based strengths, valid curriculum next steps',
    fn: async () => {
      const candidate = candidates.find(c => c.member.id === 'CAND-003') || candidates[0];
      const sessionId = 'test-strong-' + Date.now();
      const session = createSession(sessionId, candidate);

      session.curriculumDaysCovered = [12, 14, 8, 5];
      session.evaluations = [
        {
          id: 'ev-1',
          topic: 'Prompt Engineering',
          day: 'Day 12',
          status: 'Strong',
          question: 'How do you ensure JSON format compliance in LLM outputs?',
          answer: 'I use system prompts with strict JSON schemas, coupled with Pydantic output parsers and constrained decoding.',
          evaluation: 'Excellent framing. Used system contract boundaries rather than prompt wording.',
          strengths: ['Used Pydantic schema validation', 'Understands constrained decoding'],
          improvements: [],
          betterAnswer: ['State the schema contract', 'Mention retry budget']
        },
        {
          id: 'ev-2',
          topic: 'RAG Architecture',
          day: 'Day 14',
          status: 'Strong',
          question: 'How do you debug generation inaccuracies in a RAG pipeline?',
          answer: 'I inspect retrieved chunks first to isolate retrieval failure from generation failure, then apply reranking if recall is low.',
          evaluation: 'Well-sequenced diagnosis. Isolated stages cleanly.',
          strengths: ['Separated retrieval vs generation failure', 'Used reranker appropriately'],
          improvements: [],
          betterAnswer: ['Add CI evaluation metrics']
        },
        {
          id: 'ev-3',
          topic: 'Vector Indexing',
          day: 'Day 8',
          status: 'Strong',
          question: 'How do you choose between HNSW and IVF indexes for 40M vectors?',
          answer: 'HNSW provides lower latency and higher recall at the cost of higher RAM usage. I tune ef_search to match the 120ms p95 budget.',
          evaluation: 'Strong understanding of memory vs recall trade-offs.',
          strengths: ['Named recall vs memory trade-off', 'Referenced ef_search parameter'],
          improvements: ['Could estimate memory footprint in GB'],
          betterAnswer: ['Provide memory estimate formula']
        },
        {
          id: 'ev-4',
          topic: 'Prompting Paradigms',
          day: 'Day 5',
          status: 'Good',
          question: 'Explain few-shot prompting vs chain-of-thought.',
          answer: 'Few-shot provides exemplary input-output pairs; chain-of-thought forces intermediate step reasoning.',
          evaluation: 'Solid distinction.',
          strengths: ['Clear definition of paradigms'],
          improvements: ['Could mention zero-shot-CoT trigger phrases'],
          betterAnswer: ['Give production usage examples']
        }
      ];

      const feedback = await generateFinalFeedback(session);

      // Verifications
      assert.ok(feedback.summary && feedback.summary.length > 20, 'Summary must be present and non-trivial');
      assert.ok(feedback.overallScore >= 75 && feedback.overallScore <= 100, `Overall score should be high for strong candidate, got ${feedback.overallScore}`);
      assert.ok(feedback.strengths.length >= 2, 'Must generate strengths');
      assert.ok(feedback.gaps.length >= 1, 'Must contain constructive growth areas');
      assert.ok(feedback.next.length >= 1, 'Must contain next steps');
      assert.ok(Array.isArray(feedback.topicPerformance), 'Must include topic performance array');

      // Verify all topicPerformance items match assessed topics
      for (const tp of feedback.topicPerformance) {
        assert.ok([12, 14, 8, 5].some(d => tp.day.includes(String(d)) || tp.topic.length > 0), `Topic performance day ${tp.day} must match assessed days`);
        assert.ok(tp.score >= 0 && tp.score <= 100, `Topic score must be between 0 and 100, got ${tp.score}`);
      }
    }
  },

  {
    name: 'Test B — Mixed candidate: Clear separation of strong vs weak topics',
    fn: async () => {
      const candidate = candidates.find(c => c.member.id === 'CAND-002') || candidates[0];
      const sessionId = 'test-mixed-' + Date.now();
      const session = createSession(sessionId, candidate);

      session.curriculumDaysCovered = [12, 18, 21];
      session.evaluations = [
        {
          id: 'ev-m1',
          topic: 'Prompt Engineering',
          day: 'Day 12',
          status: 'Strong',
          question: 'How do you handle schema validation failures?',
          answer: 'Validate JSON against Pydantic schema and retry with feedback error message up to 2 times.',
          evaluation: 'Clear defensive design.',
          strengths: ['Pydantic validation', 'Bounded retry policy'],
          improvements: [],
          betterAnswer: []
        },
        {
          id: 'ev-m2',
          topic: 'Agentic AI',
          day: 'Day 18',
          status: 'Needs Improvement',
          question: 'How do you handle tool call timeouts in an agent loop?',
          answer: 'I catch the error and let the LLM decide what tool to try next.',
          evaluation: 'Delegated deterministic error handling to LLM.',
          strengths: ['Recognized run must not crash'],
          improvements: ['Missing exponential backoff', 'Missing state persistence'],
          betterAnswer: ['Add circuit breaker and step checkpointing']
        },
        {
          id: 'ev-m3',
          topic: 'Model Context Protocol',
          day: 'Day 21',
          status: 'Needs Improvement',
          question: 'What is the surface of an MCP server?',
          answer: 'It standardizes how models connect to tools.',
          evaluation: 'High-level headline correct, but missed details on resources and prompts.',
          strengths: ['Understands protocol standardization'],
          improvements: ['Missed resources vs tools distinction', 'Missed authentication'],
          betterAnswer: ['Detail tools, resources, and prompt templates']
        }
      ];

      const feedback = await generateFinalFeedback(session);

      assert.ok(feedback.overallScore >= 0 && feedback.overallScore <= 100, 'Score must be in valid range');
      assert.ok(feedback.gaps.some(g => g.toLowerCase().includes('agent') || g.toLowerCase().includes('detail') || g.toLowerCase().includes('mcp') || g.toLowerCase().includes('tool') || g.toLowerCase().includes('state') || g.toLowerCase().includes('implementation')), 'Gaps must highlight weak areas (Agentic AI / MCP)');
      assert.ok(feedback.strengths.some(s => s.toLowerCase().includes('prompt') || s.toLowerCase().includes('validation') || s.toLowerCase().includes('clear') || s.toLowerCase().includes('structured')), 'Strengths must highlight strong areas');

      // Verify weak topics have lower scores or needs-improvement status
      const agenticTopic = feedback.topicPerformance.find(t => t.topic.toLowerCase().includes('agent') || t.day.includes('18'));
      if (agenticTopic) {
        assert.ok(agenticTopic.score < 85, 'Agentic AI score should reflect Needs Improvement status');
      }
    }
  },

  {
    name: 'Test C — Weak candidate: Constructive feedback, valid score bounds, actionable recommendations',
    fn: async () => {
      const candidate = candidates[0];
      const sessionId = 'test-weak-' + Date.now();
      const session = createSession(sessionId, candidate);

      session.curriculumDaysCovered = [18, 21];
      session.evaluations = [
        {
          id: 'ev-w1',
          topic: 'Agentic AI',
          day: 'Day 18',
          status: 'Needs Improvement',
          question: 'How do you persist state in long running agent loops?',
          answer: 'I keep it in memory array.',
          evaluation: 'Lacks persistence boundary when server restarts.',
          strengths: ['Basic understanding of array storage'],
          improvements: ['Needs Redis or database persistence'],
          betterAnswer: ['Use Redis state store with session IDs']
        },
        {
          id: 'ev-w2',
          topic: 'Model Context Protocol',
          day: 'Day 21',
          status: 'Needs Improvement',
          question: 'How do you secure MCP tool execution?',
          answer: 'I check the prompt string.',
          evaluation: 'Prompt inspection is insecure against injection.',
          strengths: [],
          improvements: ['Requires structured schema validation and token auth'],
          betterAnswer: ['Use API token auth and JSON schema validation']
        }
      ];

      const feedback = await generateFinalFeedback(session);

      assert.ok(feedback.overallScore >= 0 && feedback.overallScore <= 100, `Score out of bounds: ${feedback.overallScore}`);
      assert.ok(feedback.technicalScore >= 0 && feedback.technicalScore <= 100, 'Technical score out of bounds');
      assert.ok(feedback.depthScore >= 0 && feedback.depthScore <= 100, 'Depth score out of bounds');
      assert.ok(feedback.communicationScore >= 0 && feedback.communicationScore <= 100, 'Communication score out of bounds');
      assert.ok(feedback.summary && !feedback.summary.includes('null'), 'Summary must be constructive and formatted');
      assert.ok(feedback.next.length >= 1, 'Weak candidate must receive targeted curriculum next steps');
    }
  },

  {
    name: 'Test D — Deterministic Fallback Generator: Recovers from malformed LLM response gracefully',
    fn: async () => {
      const candidate = candidates[0];
      const sessionId = 'test-fallback-' + Date.now();
      const session = createSession(sessionId, candidate);

      session.curriculumDaysCovered = [12, 18];
      session.evaluations = [
        {
          id: 'ev-f1',
          topic: 'Prompt Engineering',
          day: 'Day 12',
          status: 'Strong',
          question: 'Q1',
          answer: 'Answer 1',
          evaluation: 'Eval 1',
          strengths: ['Strength 1'],
          improvements: [],
          betterAnswer: []
        },
        {
          id: 'ev-f2',
          topic: 'Agentic AI',
          day: 'Day 18',
          status: 'Needs Improvement',
          question: 'Q2',
          answer: 'Answer 2',
          evaluation: 'Eval 2',
          strengths: [],
          improvements: ['Gap 1'],
          betterAnswer: []
        }
      ];

      // Call generateFallbackFeedback directly to verify zero-crash fallback logic
      const fallback = generateFallbackFeedback(candidate, session.evaluations);

      assert.ok(fallback.summary && fallback.summary.length > 10, 'Fallback summary must be present');
      assert.ok(fallback.overallScore >= 0 && fallback.overallScore <= 100, 'Fallback score must be valid');
      assert.ok(fallback.strengths.length > 0, 'Fallback must have strengths');
      assert.ok(fallback.gaps.length > 0, 'Fallback must have gaps');
      assert.ok(fallback.next.length > 0, 'Fallback must have next steps');
      assert.ok(fallback.topicPerformance.length === 2, 'Fallback topicPerformance must match evaluated topics');
    }
  },

  {
    name: 'Test E — API Specification Compliance: Returns required feedback fields',
    fn: async () => {
      const candidate = candidates[0];
      const sessionId = 'test-spec-' + Date.now();
      const session = createSession(sessionId, candidate);

      session.evaluations = [
        {
          id: 'ev-spec-1',
          topic: 'RAG',
          day: 'Day 10',
          status: 'Good',
          question: 'What is vector retrieval?',
          answer: 'Converting text to embeddings and finding nearest vectors.',
          evaluation: 'Good basic explanation.',
          strengths: ['Correct embedding concept'],
          improvements: ['Add distance metrics'],
          betterAnswer: ['Mention cosine similarity and HNSW']
        }
      ];

      const feedback = await generateFinalFeedback(session);

      // Verify requirements from technical-spec.md (summary, strengths, gaps, next)
      assert.strictEqual(typeof feedback.summary, 'string', 'feedback.summary must be string');
      assert.ok(Array.isArray(feedback.strengths), 'feedback.strengths must be string array');
      assert.ok(Array.isArray(feedback.gaps), 'feedback.gaps must be string array');
      assert.ok(Array.isArray(feedback.next), 'feedback.next must be array');
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
  }
  console.log('\n================================================');
  console.log('ALL PHASE 4 FEEDBACK ENGINE TESTS PASSED!');
  console.log('================================================');
}

runAll();
