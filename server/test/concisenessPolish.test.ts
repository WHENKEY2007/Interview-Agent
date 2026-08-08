import assert from 'assert';
import { validateQuestion, isDuplicateQuestion, calculateSimilarity } from '../agent/validation';

console.log('================================================');
console.log('RUNNING QUESTION CONCISENESS & VALIDATION TESTS');
console.log('================================================\n');

// 1. Length & Sentence Counts
const validPrimary = "Suppose your RAG application retrieves semantically relevant but incorrect chunks. How would you debug this pipeline?";
const invalidPrimaryTooLong = "Suppose your RAG application retrieves semantically relevant but incorrect chunks. How would you debug this pipeline? Please explain your design, trace the retrieval steps, identify memory boundaries, and list the concrete parameters you would tune to fix it.";
const invalidPrimaryTwoQuestions = "How does vector index latency scale? What index parameters would you adjust?";
const validFollowUp = "How does IVF index cell size affect recall?";
const invalidFollowUpTooLong = "Could you please elaborate on how the cell size of the IVF index affects search recall when scaling to ten million vectors under a fifty millisecond latency budget?";

// 2. Preambles
const invalidPreamble = "Hello! Let's transition to vector database scaling. How would you choose between HNSW and IVF?";

// 3. Duplication Overlaps
const questionA = "How do IVF indexes compare to HNSW under RAM constraints?";
const questionB = "Under RAM constraints, how do IVF indexes compare with HNSW?";
const questionDifferent = "What similarity metric is best for cosine distance calculations?";

function runTests() {
  // Test 1: Valid primary question
  const val1 = validateQuestion(validPrimary, 'primary', []);
  console.log(`- Valid primary question accepted: ${val1.valid}`);
  assert.ok(val1.valid, 'Valid primary question should pass');

  // Test 2: Too long primary question (fails word limit)
  const val2 = validateQuestion(invalidPrimaryTooLong, 'primary', []);
  console.log(`- Too long primary question rejected: ${!val2.valid} (Reason: ${val2.reason})`);
  assert.ok(!val2.valid, 'Too long primary question should fail');
  assert.match(val2.reason || '', /word count/i, 'Reason should mention word count');

  // Test 3: Multiple question marks rejected
  const val3 = validateQuestion(invalidPrimaryTwoQuestions, 'primary', []);
  console.log(`- Multiple questions rejected: ${!val3.valid} (Reason: ${val3.reason})`);
  assert.ok(!val3.valid, 'Multi-part questions should fail');
  assert.match(val3.reason || '', /question mark/i, 'Reason should mention question mark count');

  // Test 4: Valid follow-up question
  const val4 = validateQuestion(validFollowUp, 'followup', []);
  console.log(`- Valid follow-up question accepted: ${val4.valid}`);
  assert.ok(val4.valid, 'Valid follow-up should pass');

  // Test 5: Too long follow-up question
  const val5 = validateQuestion(invalidFollowUpTooLong, 'followup', []);
  console.log(`- Too long follow-up rejected: ${!val5.valid} (Reason: ${val5.reason})`);
  assert.ok(!val5.valid, 'Too long follow-up should fail');
  assert.match(val5.reason || '', /word count/i, 'Reason should mention word count');

  // Test 6: Greeting preamble rejected
  const val6 = validateQuestion(invalidPreamble, 'primary', []);
  console.log(`- Greeting preamble rejected: ${!val6.valid} (Reason: ${val6.reason})`);
  assert.ok(!val6.valid, 'Preamble question should fail');
  assert.match(val6.reason || '', /preamble/i, 'Reason should mention preamble');

  // Test 7: Duplicate detection
  const sim = calculateSimilarity(questionA, questionB);
  console.log(`- Semantic similarity score: ${sim.toFixed(2)}`);
  assert.ok(sim > 0.6, 'Word overlap score should be high for rephrased duplicates');
  
  const isDup = isDuplicateQuestion(questionA, [questionB]);
  console.log(`- Duplicate check triggered: ${isDup}`);
  assert.ok(isDup, 'Should detect duplicate question');

  const isNotDup = isDuplicateQuestion(questionA, [questionDifferent]);
  console.log(`- Different question duplicate check: ${isNotDup}`);
  assert.ok(!isNotDup, 'Should not detect duplicate for different topics');

  console.log('\n================================================');
  console.log('ALL QUESTION CONCISENESS & VALIDATION TESTS PASSED!');
  console.log('================================================');
}

runTests();
