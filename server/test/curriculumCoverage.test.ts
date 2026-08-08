import assert from 'assert';
import { loadData, getCandidates } from '../data/dataLoader';
import { getCurriculumCoverage } from '../../src/utils/curriculumCoverage';
import { test } from 'vitest';

loadData();
const allCandidates = getCandidates();

test('Curriculum Coverage — Dynamic calculations differ across candidates', () => {
  // Retrieve Sarah Johnson (CAND-001)
  const sarah = allCandidates.find(c => c.member.id === 'CAND-001');
  // Retrieve Wendy Foster (CAND-006)
  const wendy = allCandidates.find(c => c.member.id === 'CAND-006');
  // Retrieve Ethan Brooks (CAND-007)
  const ethan = allCandidates.find(c => c.member.id === 'CAND-007');
  // Retrieve David Miller (CAND-004)
  const david = allCandidates.find(c => c.member.id === 'CAND-004');

  assert.ok(sarah, 'Sarah must be present in candidates');
  assert.ok(wendy, 'Wendy must be present in candidates');
  assert.ok(ethan, 'Ethan must be present in candidates');
  assert.ok(david, 'David must be present in candidates');

  // Compute coverage for each
  const sarahCoverage = getCurriculumCoverage(sarah);
  const wendyCoverage = getCurriculumCoverage(wendy);
  const ethanCoverage = getCurriculumCoverage(ethan);
  const davidCoverage = getCurriculumCoverage(david);

  // Assert correct module count (8 modules from curriculum.json)
  assert.strictEqual(sarahCoverage.length, 8, 'Should produce exactly 8 module coverage objects');
  assert.strictEqual(wendyCoverage.length, 8, 'Should produce exactly 8 module coverage objects');

  // Verify that coverage progress values differ across candidates for Module 1
  const sarahM1 = sarahCoverage.find(m => m.id === 'module-1');
  const wendyM1 = wendyCoverage.find(m => m.id === 'module-1');
  const ethanM1 = ethanCoverage.find(m => m.id === 'module-1');

  assert.ok(sarahM1, 'Module 1 should exist in Sarah coverage');
  assert.ok(wendyM1, 'Module 1 should exist in Wendy coverage');
  assert.ok(ethanM1, 'Module 1 should exist in Ethan coverage');

  console.log(`Module 1 Progress - Sarah: ${sarahM1.progress}%, Wendy: ${wendyM1.progress}%, Ethan: ${ethanM1.progress}%`);
  
  // Verify progress calculations match candidates.json mission data
  assert.strictEqual(sarahM1.progress, 0, 'Sarah should have 0% progress on Module 1');
  assert.strictEqual(wendyM1.progress, 33, 'Wendy should have 33% progress on Module 1 (passed 1 of 3)');
  assert.strictEqual(ethanM1.progress, 67, 'Ethan should have 67% progress on Module 1 (passed 2 of 3)');

  // Verify status mapping:
  assert.strictEqual(sarahM1.status, 'not-completed', 'Sarah should be not-completed for Module 1');
  assert.strictEqual(wendyM1.status, 'in-progress', 'Wendy should be in-progress for Module 1');
  assert.strictEqual(ethanM1.status, 'in-progress', 'Ethan should be in-progress for Module 1');

  // Let's check status for Module 7 (Days 25–28)
  const sarahM7 = sarahCoverage.find(m => m.id === 'module-7');
  const davidM7 = davidCoverage.find(m => m.id === 'module-7');

  assert.ok(sarahM7, 'Module 7 should exist for Sarah');
  assert.ok(davidM7, 'Module 7 should exist for David');

  console.log(`Module 7 Status - Sarah: ${sarahM7.status}, David: ${davidM7.status}`);
  // In candidates.json, David has day 28 in missions as "skipped: true"
  // So he has 0 passed days for Module 7, progress 0%, and status 'in-progress' or 'not-completed'
  // Sarah has day 28 passed: true (progress 25%), so status 'in-progress'
  assert.strictEqual(sarahM7.status, 'in-progress', 'Sarah should be in-progress for Module 7');
  assert.strictEqual(davidM7.status, 'not-completed', 'David should be not-completed for Module 7 (only has a skipped day 28)');
});
