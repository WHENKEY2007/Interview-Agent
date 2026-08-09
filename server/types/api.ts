import { CandidateProfile } from '../data/dataLoader';
import { FinalFeedback } from '../agent/feedbackGenerator';
import { InterviewTurn, AnswerEvaluation } from '../session/sessionStore';

export interface InterviewStartRequest {
  sessionId: string;
  candidate: CandidateProfile;
}

export interface InterviewTurnRequest {
  sessionId: string;
  message: string;
}

export interface InterviewResponse {
  reply: string;
  done: boolean;
  feedback?: FinalFeedback | null;
  turns?: InterviewTurn[];
  currentTopic?: string;
  currentQuestionDay?: number;
  currentQuestionDifficulty?: string;
  questionsAsked?: number;
  questionsAnswered?: number;
  primaryQuestionsAsked?: number;
  followUpsAsked?: number;
  clarifyUsed?: boolean;
  evaluations?: AnswerEvaluation[];
  progress?: {
    questionNumber: number;
    totalQuestions: number;
    questionsAsked: number;
    daysCovered: number;
    requiredDays: number;
    currentDay: number;
    currentTopic: string;
    difficulty: string;
  };
}
