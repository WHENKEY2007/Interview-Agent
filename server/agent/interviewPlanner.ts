import { CandidateProfile, Curriculum, getCurriculumDay } from '../data/dataLoader';
import { getCandidateInterviewFocus, buildPlannedFocusTopics, PlannedFocusTopic } from '../../src/utils/candidateFocus';

export interface PlanTopic {
  day: number;
  title: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface InterviewPlan {
  candidateId: string;
  selectedDays: number[];
  topics: PlanTopic[];
  targetDifficulty: 'Foundational' | 'Intermediate' | 'Advanced';
  plannedFocusTopics?: PlannedFocusTopic[];
}

/**
 * Deterministically determines the target difficulty for the candidate.
 * It combines years of experience with learning signals (completed missions, first-try success).
 */
export function determineTargetDifficulty(candidate: CandidateProfile): 'Foundational' | 'Intermediate' | 'Advanced' {
  const exp = candidate.member.yearsExperience;
  const completed = candidate.signals?.missionsCompleted ?? 0;
  const firstTry = candidate.signals?.missionsFirstTry ?? 0;

  // Foundational: low experience OR low completion rate
  if (exp <= 2 || completed < 15) {
    return 'Foundational';
  }

  // Advanced: high experience AND high completion signals
  if (exp >= 6 && completed >= 20 && firstTry >= 15) {
    return 'Advanced';
  }

  // Intermediate: standard fallback
  return 'Intermediate';
}

/**
 * Creates a candidate-aware interview plan using completed missions, attempts, and skipped topics.
 * Selects at least 4 valid curriculum days.
 */
export function generateInterviewPlan(candidate: CandidateProfile, curriculum: Curriculum): InterviewPlan {
  const candidateMissions = candidate.missions || [];
  const candidateId = candidate.member.id;

  const targetDifficulty = determineTargetDifficulty(candidate);

  // Group candidate missions by learning outcomes
  const weakCompletedMissions: typeof candidateMissions = [];
  const failedMissions: typeof candidateMissions = [];
  const skippedMissions: typeof candidateMissions = [];
  const strongCompletedMissions: typeof candidateMissions = [];

  candidateMissions.forEach((m) => {
    // Validate that the day exists in curriculum
    const currDay = curriculum.days.find((d) => d.day === m.day);
    if (!currDay) return;

    if (m.passed === false) {
      failedMissions.push(m);
    } else if (m.skipped) {
      skippedMissions.push(m);
    } else if (m.passed && m.attempts && m.attempts >= 3) {
      weakCompletedMissions.push(m);
    } else if (m.passed) {
      strongCompletedMissions.push(m);
    }
  });

  interface ExtendedPlanTopic extends PlanTopic {
    sequenceWeight: number;
  }

  const plannedTopics: ExtendedPlanTopic[] = [];
  const selectedDaysSet = new Set<number>();

  // 1. Completed but weak/low-confidence areas (attempts >= 3)
  weakCompletedMissions.forEach((m) => {
    const currDay = curriculum.days.find((d) => d.day === m.day)!;
    if (selectedDaysSet.size >= 5) return;
    
    selectedDaysSet.add(m.day);
    plannedTopics.push({
      day: m.day,
      title: currDay.title,
      reason: `Required multiple attempts (${m.attempts}) during the cohort. Testing to ensure core retention and conceptual clarity.`,
      priority: 'high',
      sequenceWeight: 4
    });
  });

  // 2. Failed/repeated-attempt areas
  failedMissions.forEach((m) => {
    const currDay = curriculum.days.find((d) => d.day === m.day)!;
    if (selectedDaysSet.size >= 5) return;
    
    selectedDaysSet.add(m.day);
    plannedTopics.push({
      day: m.day,
      title: currDay.title,
      reason: `Topic was failed during the cohort. Assessing baseline understanding to check for diagnostic gaps.`,
      priority: 'high',
      sequenceWeight: 3
    });
  });

  // 3. Skipped areas for baseline assessment (limit to max 2)
  let skippedAdded = 0;
  skippedMissions.forEach((m) => {
    const currDay = curriculum.days.find((d) => d.day === m.day)!;
    if (selectedDaysSet.size >= 5) return;
    if (skippedAdded >= 2) return;

    selectedDaysSet.add(m.day);
    skippedAdded++;
    plannedTopics.push({
      day: m.day,
      title: currDay.title,
      reason: `Topic was skipped or failed. Assessing baseline understanding to check for diagnostic gaps.`,
      priority: 'low',
      sequenceWeight: 2
    });
  });

  // 4. Stronger areas for challenge questions
  strongCompletedMissions.forEach((m) => {
    const currDay = curriculum.days.find((d) => d.day === m.day)!;
    if (selectedDaysSet.size >= 5) return;

    selectedDaysSet.add(m.day);
    plannedTopics.push({
      day: m.day,
      title: currDay.title,
      reason: `Successfully completed. Assessing depth, design choices, and scaling trade-offs on this topic.`,
      priority: m.attempts === 1 ? 'high' : 'medium',
      sequenceWeight: 1
    });
  });

  // Fallback: If we have less than 4 days, select other days from the curriculum that are not covered
  if (selectedDaysSet.size < 4) {
    const remainingDays = curriculum.days.filter((d) => !selectedDaysSet.has(d.day));
    for (const d of remainingDays) {
      if (selectedDaysSet.size >= 4) break;
      selectedDaysSet.add(d.day);
      plannedTopics.push({
        day: d.day,
        title: d.title,
        reason: `Standard curriculum topic. Testing general competency.`,
        priority: 'medium',
        sequenceWeight: 0
      });
    }
  }

  // Sort topics by sequence weight descending
  plannedTopics.sort((a, b) => b.sequenceWeight - a.sequenceWeight);

  // Sync selectedDays array to match sorted topics order
  const selectedDays = plannedTopics.map((t) => t.day);

  // Remove internal sequenceWeight field before returning
  const cleanPlannedTopics: PlanTopic[] = plannedTopics.map(({ sequenceWeight, ...rest }) => rest);

  // Calculate plannedFocusTopics
  const focus = getCandidateInterviewFocus(candidate);
  const plannedFocusTopics = buildPlannedFocusTopics(candidate, focus);

  console.log(`\n[Interview Focus]\ncandidateId: ${candidateId}\nfocusTopics:`, focus.map(f => ({ topic: f.topic, signal: f.signal })));
  console.log(`[Interview Plan]\ncandidateId: ${candidateId}\nplannedFocusTopics:`, plannedFocusTopics.map(p => ({ topic: p.topic, status: p.status, dayRange: p.dayRange })));

  return {
    candidateId,
    selectedDays,
    topics: cleanPlannedTopics,
    targetDifficulty,
    plannedFocusTopics
  };
}
