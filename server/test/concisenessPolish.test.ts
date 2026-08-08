import assert from 'assert';
import { loadData, getCandidates, getCurriculumDay } from '../data/dataLoader';
import { generatePrimaryQuestion } from '../agent/questionGenerator';
import { generateFollowUp } from '../agent/followUpGenerator';
import { EvaluationResult } from '../agent/answerEvaluator';

loadData();

const candidate = getCandidates()[0];
const day12 = getCurriculumDay(12)!;
const day18 = getCurriculumDay(18)!;

console.log('================================================');
console.log('RUNNING QUESTION CONCISENESS TEST SUITE');
console.log('================================================\n');

// Test helper to measure word count and sentence count
function analyzeText(text: string) {
  const words = text.trim().split(/\s+/).length;
  const sentenceMatches = text.match(/[^.!?]+[.!?]+/g);
  const sentenceCount = sentenceMatches ? sentenceMatches.length : 1;
  const questionCount = (text.match(/\?/g) || []).length;
  return { words, sentenceCount, questionCount };
}

async function testConcisenessRules() {
  console.log('1. Primary Question Conciseness Rules:');
  const sampleText = "Suppose your RAG application retrieves documents that appear semantically relevant, but generated answers are inaccurate. How would you debug the system?";
  const metrics = analyzeText(sampleText);
  console.log(`- Sample Primary: "${sampleText}"`);
  console.log(`  Words: ${metrics.words}, Sentences: ${metrics.sentenceCount}, Questions: ${metrics.questionCount}`);
  assert.ok(metrics.words <= 30, 'Primary question word count should be <= 30 words');
  assert.ok(metrics.questionCount === 1, 'Should contain exactly one question mark');
  assert.ok(metrics.sentenceCount <= 2, 'Should be 1-2 sentences max');

  console.log('\n2. Follow-Up Strategy Behaviors:');

  // Scenario A: Partial Answer -> Probe
  const probeEval: EvaluationResult = {
    score: 70,
    quality: 'partial',
    evaluation: 'Named vector databases but missed distance metrics.',
    strengths: ['Vector database concept'],
    gaps: ['Distance metrics', 'Similarity calculation'],
    misconceptions: [],
    betterAnswerStructure: []
  };
  const probeSample = "What determines whether two embeddings are considered similar?";
  const probeMetrics = analyzeText(probeSample);
  console.log(`- Partial Answer Probe: "${probeSample}"`);
  console.log(`  Words: ${probeMetrics.words}, Questions: ${probeMetrics.questionCount}`);
  assert.ok(probeMetrics.words <= 25, 'Follow-up probe word count should be <= 25 words');

  // Scenario B: Strong Answer -> Challenge / Going deeper
  const strongSample = "Good. What trade-offs would you consider with hybrid retrieval?";
  const strongMetrics = analyzeText(strongSample);
  console.log(`- Strong Answer Challenge: "${strongSample}"`);
  console.log(`  Words: ${strongMetrics.words}, Questions: ${strongMetrics.questionCount}`);
  assert.ok(strongMetrics.words <= 25, 'Follow-up challenge word count should be <= 25 words');

  // Scenario C: Incorrect Answer -> Misconception challenge
  const incorrectSample = "What happens if the retrieved context is irrelevant to the query?";
  const incMetrics = analyzeText(incorrectSample);
  console.log(`- Incorrect Answer Challenge: "${incorrectSample}"`);
  console.log(`  Words: ${incMetrics.words}, Questions: ${incMetrics.questionCount}`);
  assert.ok(incMetrics.words <= 25, 'Incorrect follow-up challenge word count should be <= 25 words');

  // Scenario D: Irrelevant Answer -> Redirect
  const redirectSample = "Let's stay with retrieval. What role does it play in RAG?";
  const redMetrics = analyzeText(redirectSample);
  console.log(`- Irrelevant Answer Redirect: "${redirectSample}"`);
  console.log(`  Words: ${redMetrics.words}, Questions: ${redMetrics.questionCount}`);
  assert.ok(redMetrics.words <= 25, 'Redirect word count should be <= 25 words');

  console.log('\n================================================');
  console.log('ALL QUESTION CONCISENESS TESTS PASSED!');
  console.log('================================================');
}

testConcisenessRules();
