export type TopicStatus = 'completed' | 'in-progress' | 'needs-review' | 'not-completed';

export type LearningSignal = 'strong' | 'moderate' | 'needs-practice';

export interface CohortTopic {
  id: string;
  name: string;
  blurb: string;
  days: string;
  status: TopicStatus;
  signal: LearningSignal;
  progress: number;
}

export type Difficulty = 'Foundational' | 'Intermediate' | 'Advanced';

export type AnswerQuality = 'strong' | 'partial' | 'irrelevant' | 'unknown';

export interface FollowUp {
  label: string;
  text: string;
  difficultyShift?: 'up' | 'down' | 'same';
}

export interface InterviewQuestion {
  id: string;
  index: number;
  topic: string;
  day: string;
  difficulty: Difficulty;
  prompt: string;
  keywords: string[];
  clarification: string;
  followUps: Record<AnswerQuality, FollowUp>;
}

export interface InterviewTurn {
  id: string;
  role: 'interviewer' | 'candidate';
  text: string;
  badge?: string;
  topic?: string;
  day?: string;
  difficulty?: Difficulty;
  isPrimary?: boolean;
}

export interface MetricScore {
  label: string;
  score: number;
  note: string;
}

export interface TopicScore {
  topic: string;
  score: number;
  day: string;
}

export interface QuestionReviewItem {
  id: string;
  topic: string;
  day: string;
  status: 'Strong' | 'Good' | 'Needs Improvement';
  question: string;
  answer: string;
  evaluation: string;
  strengths: string[];
  improvements: string[];
  betterAnswer: string[];
}

export interface NextStep {
  day: string;
  topic: string;
  reason: string;
  items: string[];
}