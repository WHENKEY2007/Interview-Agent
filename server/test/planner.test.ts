import assert from 'assert';
import { loadData, getCurriculum, getCandidates, getCurriculumDay, CandidateProfile } from '../data/dataLoader';
import { generateInterviewPlan, determineTargetDifficulty } from '../agent/interviewPlanner';
import { createSession, getSession, saveSession } from '../session/sessionStore';
import { startInterview, handleCandidateMessage } from '../agent/interviewAgent';

// Ensure data is loaded
loadData();

const curriculum = getCurriculum();
const allCandidates = getCandidates();

console.log('================================================');
console.log('RUNNING AI INTERVIEW PLANNER TEST SUITE (PHASE 2)');
console.log('================================================\n');

function runTest(name: string, testFn: () => void) {
  try {
    testFn();
    console.log(`[PASS] ${name}`);
  } catch (error: any) {
    console.error(`[FAIL] ${name}`);
    console.error(error.stack || error);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------
// TEST A: A strong candidate receives appropriate deeper topics
// ---------------------------------------------------------------------
runTest('Test A: Strong candidate gets Advanced difficulty and deep topics', () => {
  // CAND-003 (Emily Chen) is an AI Engineer, 6 years experience, 31 completed, 30 first-try
  const emily = allCandidates.find(c => c.member.id === 'CAND-003');
  assert(emily, 'Emily Chen (CAND-003) should be present in the dataset');

  const diff = determineTargetDifficulty(emily);
  assert.strictEqual(diff, 'Advanced', 'Emily should be classified as Advanced');

  const plan = generateInterviewPlan(emily, curriculum);
  assert.strictEqual(plan.targetDifficulty, 'Advanced');
  
  // Advanced topics should focus on strong completions
  const firstTopic = plan.topics[0];
  assert.strictEqual(firstTopic.priority, 'high', 'Strong passes should be high priority');
  assert(firstTopic.reason.includes('Assessing depth'), 'Reason should explain testing of advanced limits');
});

// ---------------------------------------------------------------------
// TEST B: A candidate with multiple attempts receives reinforcement topics
// ---------------------------------------------------------------------
runTest('Test B: Candidate with multiple attempts receives reinforcement topics', () => {
  // CAND-002 (Alex Turner) has 3 attempts on Day 7, 4 attempts on Day 10, 5 on Day 12
  const alex = allCandidates.find(c => c.member.id === 'CAND-002');
  assert(alex, 'Alex Turner (CAND-002) should be present');

  const plan = generateInterviewPlan(alex, curriculum);
  
  // Find Day 10 (4 attempts) in the plan
  const day10Topic = plan.topics.find(t => t.day === 10);
  assert(day10Topic, 'Day 10 should be selected in the plan');
  assert.strictEqual(day10Topic.priority, 'high');
  assert(day10Topic.reason.toLowerCase().includes('multiple attempts'), 'Reason should detail the attempts reinforcement logic');
});

// ---------------------------------------------------------------------
// TEST C: A candidate with skipped topics receives limited diagnostic coverage
// ---------------------------------------------------------------------
runTest('Test C: Skipped topics receive limited diagnostic coverage (max 2)', () => {
  // Let's create a custom candidate profile with multiple skipped topics to enforce the limit
  const mockCandidate: CandidateProfile = {
    member: {
      id: 'CAND-MOCK-SKIP',
      name: 'Skip Tester',
      jobRole: 'Developer',
      yearsExperience: 4,
      education: 'BS',
      status: 'COMPLETED'
    },
    missions: [
      { day: 7, title: "Embeddings Explained", skipped: true },
      { day: 8, title: "Vector Databases Overview", skipped: true },
      { day: 10, title: "Retrieval & Matching Engine", skipped: true },
      { day: 12, title: "Prompt Engineering Fundamentals", passed: true, attempts: 1 },
      { day: 16, title: "Chatbot Backend & API Integration", passed: true, attempts: 1 },
      { day: 22, title: "Multi-Agent Orchestration", passed: true, attempts: 1 },
      { day: 23, title: "Model Context Protocol (MCP)", passed: true, attempts: 1 }
    ],
    signals: { commitDays: 10, missionsCompleted: 4, missionsFirstTry: 4 }
  };

  const plan = generateInterviewPlan(mockCandidate, curriculum);
  
  // Count how many skipped topics were added
  const skippedInPlan = plan.topics.filter(t => 
    mockCandidate.missions.find(m => m.day === t.day && m.skipped)
  );

  assert(skippedInPlan.length <= 2, `Should add at most 2 skipped topics, but found ${skippedInPlan.length}`);
  skippedInPlan.forEach(t => {
    assert.strictEqual(t.priority, 'low', 'Skipped topics must be low priority');
    assert(t.reason.includes('skipped or failed'), 'Reason must detail diagnostic check');
  });
});

// ---------------------------------------------------------------------
// TEST D: The planner selects at least 4 valid curriculum days
// ---------------------------------------------------------------------
runTest('Test D: Selected days count is at least 4', () => {
  allCandidates.forEach(cand => {
    const plan = generateInterviewPlan(cand, curriculum);
    assert(plan.selectedDays.length >= 4, `Candidate ${cand.member.name} plan has only ${plan.selectedDays.length} days`);
  });
});

// ---------------------------------------------------------------------
// TEST E: The selected days actually exist in curriculum.json
// ---------------------------------------------------------------------
runTest('Test E: Selected days actually exist in curriculum.json', () => {
  allCandidates.forEach(cand => {
    const plan = generateInterviewPlan(cand, curriculum);
    plan.selectedDays.forEach(dayNum => {
      const day = getCurriculumDay(dayNum);
      assert(day, `Selected day ${dayNum} for candidate ${cand.member.name} does not exist in curriculum`);
    });
  });
});

// ---------------------------------------------------------------------
// TEST F: The same session keeps the same interview plan across multiple requests
// ---------------------------------------------------------------------
runTest('Test F: Stored plan is preserved across multiple turns', async () => {
  const sarah = allCandidates[0];
  const sessionId = 'session-test-f-' + Date.now();

  // 1. Start interview
  const firstQuestion = await startInterview(sessionId, sarah);
  const session1 = getSession(sessionId);
  assert(session1, 'Session should exist');
  assert(session1.interviewPlan, 'Session should have an interview plan');
  const initialPlanId = session1.interviewPlan.candidateId;
  const initialSelectedDays = [...session1.interviewPlan.selectedDays];

  // 2. Submit candidate message (Turn 1)
  const result1 = await handleCandidateMessage(sessionId, 'My first technical response.');
  const session2 = getSession(sessionId);
  assert(session2, 'Session should exist after turn 1');
  assert(session2.interviewPlan, 'Session plan should still be present');
  assert.strictEqual(session2.interviewPlan.candidateId, initialPlanId, 'Candidate ID in plan must remain the same');
  assert.deepStrictEqual(session2.interviewPlan.selectedDays, initialSelectedDays, 'Plan selected days must remain identical');

  // 3. Submit candidate message (Turn 2)
  const result2 = await handleCandidateMessage(sessionId, 'My second technical response.');
  const session3 = getSession(sessionId);
  assert(session3, 'Session should exist after turn 2');
  assert(session3.interviewPlan, 'Session plan should still be present');
  assert.deepStrictEqual(session3.interviewPlan.selectedDays, initialSelectedDays, 'Plan selected days must remain identical');
});

// ---------------------------------------------------------------------
// TEST G: First question is generated using the selected curriculum context
// ---------------------------------------------------------------------
runTest('Test G: First question is generated using selected curriculum context', async () => {
  const sarah = allCandidates[0];
  const sessionId = 'session-test-g-' + Date.now();

  const firstQuestion = await startInterview(sessionId, sarah);
  const session = getSession(sessionId);
  
  assert(session, 'Session should exist');
  const plan = session.interviewPlan!;
  const firstPlannedDayNum = plan.selectedDays[0];
  const firstPlannedDay = getCurriculumDay(firstPlannedDayNum)!;

  // The turns list should record the first turn details correctly
  const firstTurn = session.turns[0];
  assert.strictEqual(firstTurn.role, 'interviewer');
  assert.strictEqual(firstTurn.day, `Day ${firstPlannedDay.day}`);
  assert.strictEqual(firstTurn.topic, firstPlannedDay.title);
  assert.strictEqual(firstTurn.difficulty, plan.targetDifficulty);
  assert.strictEqual(firstTurn.isPrimary, true);

  // Assert that first question is a non-empty string
  assert(firstQuestion.length > 0);
  assert(session.currentQuestion.length > 0);
  assert.strictEqual(session.currentQuestion, firstQuestion);
});

console.log('\n================================================');
console.log('ALL PHASE 2 PLANNER TESTS COMPLETED SUCCESSFULLY!');
console.log('================================================');
