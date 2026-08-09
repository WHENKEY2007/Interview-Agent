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
  questionId?: string;
  questionNumber?: number;
  objective?: string;
  difficulty?: string;
  questionType?: 'primary' | 'followup';
  score?: number;
  metrics?: {
    technical: number;
    problemSolving: number;
    communication: number;
    depth: number;
    practical: number;
  };
}

export interface NextStep {
  day: string;
  topic: string;
  reason: string;
  items: string[];
}

export interface CandidateMember {
  id: string;
  name: string;
  jobRole: string;
  yearsExperience: number;
  education: string;
  status: string;
}

export interface CandidateMission {
  day: number;
  title: string;
  passed?: boolean;
  attempts?: number;
  skipped?: boolean;
}

export interface CandidateSignals {
  commitDays: number;
  missionsCompleted: number;
  missionsFirstTry: number;
}

export interface CandidateProfile {
  cohort?: string;
  name?: string; // fallback helper
  member: CandidateMember;
  missions: CandidateMission[];
  signals: CandidateSignals;
}

export interface TopicPerformanceItem {
  day: string;
  topic: string;
  score: number;
  level: 'strong' | 'good' | 'needs-improvement';
  strengths: string[];
  gaps: string[];
}

export interface FinalFeedbackReport {
  summary: string;
  overallScore: number | null;
  technicalScore: number | null;
  depthScore: number | null;
  communicationScore: number | null;
  strengths: string[];
  gaps: string[];
  next: NextStep[];
  topicPerformance: TopicPerformanceItem[];
  questionReviews: QuestionReviewItem[];
  recommendations: string[];
  metrics?: Array<{ label: string; score: number; note: string }>;
  plannedFocusTopics?: Array<{ topic: string; signal: 'Strong' | 'Moderate' | 'Needs Practice' }>;
}