import { CandidateProfile, Curriculum, CurriculumDay, getCurriculumDay } from '../data/dataLoader';

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
  const highAttemptMissions: typeof candidateMissions = [];
  const strongPassMissions: typeof candidateMissions = [];
  const skippedMissions: typeof candidateMissions = [];

  candidateMissions.forEach((m) => {
    // Validate that the day exists in curriculum
    const currDay = curriculum.days.find((d) => d.day === m.day);
    if (!currDay) return;

    if (m.skipped || m.passed === false) {
      skippedMissions.push(m);
    } else if (m.attempts && m.attempts >= 3) {
      highAttemptMissions.push(m);
    } else if (m.passed) {
      strongPassMissions.push(m);
    }
  });

  const plannedTopics: PlanTopic[] = [];
  const selectedDaysSet = new Set<number>();

  // 1. Prioritize high-attempt missions (up to 2-3 topics) to reinforce and probe retention
  highAttemptMissions.forEach((m) => {
    const currDay = curriculum.days.find((d) => d.day === m.day)!;
    if (selectedDaysSet.size >= 5) return;
    
    selectedDaysSet.add(m.day);
    plannedTopics.push({
      day: m.day,
      title: currDay.title,
      reason: `Required multiple attempts (${m.attempts}) during the cohort. Testing to ensure core retention and conceptual clarity.`,
      priority: 'high'
    });
  });

  // 2. Add strong passes to test deep understanding and advanced architectural limits
  strongPassMissions.forEach((m) => {
    const currDay = curriculum.days.find((d) => d.day === m.day)!;
    if (selectedDaysSet.size >= 5) return;

    selectedDaysSet.add(m.day);
    plannedTopics.push({
      day: m.day,
      title: currDay.title,
      reason: `Successfully completed. Assessing depth, design choices, and scaling trade-offs on this topic.`,
      priority: m.attempts === 1 ? 'high' : 'medium'
    });
  });

  // 3. Add skipped topics as diagnostic baseline (limit to max 1 or 2)
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
      priority: 'low'
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
        priority: 'medium'
      });
    }
  }

  // Sort topics: High priority first, then Medium, then Low
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  plannedTopics.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

  // Sync selectedDays array to match sorted topics order
  const selectedDays = plannedTopics.map((t) => t.day);

  return {
    candidateId,
    selectedDays,
    topics: plannedTopics,
    targetDifficulty
  };
}
