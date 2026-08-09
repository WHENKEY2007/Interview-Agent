import { CandidateProfile } from '../data/dataLoader';
import { InterviewPlan } from '../agent/interviewPlanner';

export interface InterviewTurn {
  id: string;
  role: 'interviewer' | 'candidate';
  text: string;
  badge?: string;
  topic?: string;
  day?: string;
  difficulty?: string;
  isPrimary?: boolean;
}

export interface AnswerEvaluation {
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
  questionId: string;
  questionNumber: number;
  objective: string;
  difficulty: string;
  questionType: 'primary' | 'followup';
  score: number;
  metrics?: {
    technical: number;
    problemSolving: number;
    communication: number;
    depth: number;
    practical: number;
  };
}

export interface SessionState {
  sessionId: string;
  candidate: CandidateProfile;
  interviewPlan?: InterviewPlan;
  planDayIndex: number;
  turns: InterviewTurn[];
  questionsAsked: number;
  questionsAnswered: number;
  primaryQuestionsAsked: number;
  followUpsAsked: number;
  currentTopicDepth: number;
  candidateStrengths: string[];
  candidateGaps: string[];
  candidateMisconceptions: string[];
  lastAnswerEvaluation?: any;
  lastDecision?: string;
  currentQuestionType: 'primary' | 'followup';
  curriculumDaysCovered: number[];
  currentTopic: string;
  currentQuestion: string;
  currentQuestionDay: number;
  currentQuestionDifficulty: string;
  currentQuestionId: string;
  currentQuestionObjective: string;
  currentQuestionNumber: number;
  clarifyUsed: boolean;
  evaluations: AnswerEvaluation[];
  status: 'IN_PROGRESS' | 'COMPLETED';
  startTime: number;
  durationSeconds: number;
  completedAt?: number;
  finalFeedback?: {
    summary: string;
    strengths: string[];
    gaps: string[];
    next: Array<{
      day: string;
      topic: string;
      reason: string;
      items: string[];
    } | string>;
    overallScore?: number | null;
    technicalScore?: number | null;
    depthScore?: number | null;
    communicationScore?: number | null;
    metrics?: Array<{ label: string; score: number; note: string }>;
    topicPerformance?: Array<{
      day: string;
      topic: string;
      score: number;
      level: 'strong' | 'good' | 'needs-improvement';
      strengths: string[];
      gaps: string[];
    }>;
    questionReviews?: AnswerEvaluation[];
    recommendations?: string[];
    plannedFocusTopics?: Array<{ topic: string; signal: 'Strong' | 'Moderate' | 'Needs Practice' }>;
  };
}

const sessions: Map<string, SessionState> = new Map();

export function createSession(sessionId: string, candidate: CandidateProfile): SessionState {
  const newSession: SessionState = {
    sessionId,
    candidate,
    planDayIndex: 0,
    turns: [],
    questionsAsked: 0,
    questionsAnswered: 0,
    primaryQuestionsAsked: 0,
    followUpsAsked: 0,
    currentTopicDepth: 0,
    candidateStrengths: [],
    candidateGaps: [],
    candidateMisconceptions: [],
    currentQuestionType: 'primary',
    curriculumDaysCovered: [],
    currentTopic: '',
    currentQuestion: '',
    currentQuestionDay: 0,
    currentQuestionDifficulty: 'Intermediate',
    currentQuestionId: '',
    currentQuestionObjective: '',
    currentQuestionNumber: 1,
    clarifyUsed: false,
    evaluations: [],
    status: 'IN_PROGRESS',
    startTime: Date.now(),
    durationSeconds: 0
  };
  sessions.set(sessionId, newSession);
  return newSession;
}

export function getSession(sessionId: string): SessionState | undefined {
  const session = sessions.get(sessionId);
  if (session) {
    // update duration
    session.durationSeconds = Math.floor((Date.now() - session.startTime) / 1000);
  }
  return session;
}

export function saveSession(sessionId: string, session: SessionState): void {
  sessions.set(sessionId, session);
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}
