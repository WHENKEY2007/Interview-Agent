export const TOPIC_DAYS_MAP: Record<string, number[]> = {
  'Vector Databases': [7, 8, 9],
  'RAG': [10, 11, 14],
  'Prompt Engineering': [11, 12, 13, 15],
  'Agentic AI': [17, 18, 19, 20, 22, 24],
  'MCP': [21, 23]
};

export interface CandidateFocusTopic {
  topic: string;
  signal: 'Strong' | 'Moderate' | 'Needs Practice';
  status: 'Strong' | 'Moderate' | 'Needs Practice';
  days: number[];
  dayRange: string;
}

export interface PlannedFocusTopic {
  topic: string;
  status: 'Strong' | 'Moderate' | 'Needs Practice';
  signal: 'Strong' | 'Moderate' | 'Needs Practice';
  days: number[];
  dayRange: string;
  reason: string;
  priority: 'high' | 'medium' | 'low' | 'normal';
}

/**
 * Calculates candidate focus signals dynamically based on candidate mission progress.
 * This is the single source of truth for both dashboard Focus Card and Planner.
 */
export function getCandidateInterviewFocus(candidate: any): CandidateFocusTopic[] {
  if (!candidate) return [];
  const candidateMissions = candidate.missions || [];

  return Object.entries(TOPIC_DAYS_MAP).map(([topic, days]) => {
    const topicMissions = candidateMissions.filter((m: any) => days.includes(m.day));
    const passedCount = topicMissions.filter((m: any) => m.passed === true).length;
    const skippedCount = topicMissions.filter((m: any) => m.skipped === true || m.passed === false).length;
    const attemptsSum = topicMissions.reduce((sum: number, m: any) => sum + (m.attempts || 1), 0);
    const avgAttempts = topicMissions.length > 0 ? attemptsSum / topicMissions.length : 1;

    let signal: 'Strong' | 'Moderate' | 'Needs Practice' = 'Moderate';
    if (skippedCount > 0 || avgAttempts >= 3 || (topicMissions.length > 0 && passedCount === 0)) {
      signal = 'Needs Practice';
    } else if (passedCount > 0 && avgAttempts < 2) {
      signal = 'Strong';
    }

    const minDay = Math.min(...days);
    const maxDay = Math.max(...days);

    return {
      topic,
      signal,
      status: signal,
      days,
      dayRange: `Days ${minDay}–${maxDay}`
    };
  });
}

/**
 * Builds candidate-specific Planned Focus Topics with dynamic ranges, priority, and reason strings.
 */
export function buildPlannedFocusTopics(candidate: any, focusList: CandidateFocusTopic[]): PlannedFocusTopic[] {
  if (!candidate || !focusList) return [];

  const planned = focusList.map((focus) => {
    let reason = '';
    let priority: 'high' | 'medium' | 'low' | 'normal' = 'normal';

    if (focus.signal === 'Needs Practice') {
      priority = 'high';
      reason = `Prioritized for diagnostic questions and reinforcement due to gaps or multiple attempts.`;
    } else if (focus.signal === 'Moderate') {
      priority = 'normal';
      reason = `Included to assess and reinforce baseline understanding of intermediate concepts.`;
    } else {
      priority = 'normal';
      reason = `Included for advanced challenge questions and scaling trade-off analysis.`;
    }

    return {
      topic: focus.topic,
      status: focus.signal,
      signal: focus.signal,
      days: focus.days,
      dayRange: focus.dayRange,
      reason,
      priority
    };
  });

  // Sort topics by priority: Needs Practice first, then Moderate, then Strong
  const priorityWeight = {
    'Needs Practice': 3,
    'Moderate': 2,
    'Strong': 1
  };

  return planned.sort((a, b) => priorityWeight[b.status] - priorityWeight[a.status]);
}
