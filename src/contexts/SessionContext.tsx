import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import candidatesData from '../../data/candidates.json';
import { CandidateProfile, FinalFeedbackReport, QuestionReviewItem } from '../types';

export interface CompletedSessionItem {
  id: string;
  date: string;
  candidateName: string;
  candidateRole: string;
  topics: string[];
  questions: number;
  minutes: number;
  score: number | null;
  summary: string;
  report: FinalFeedbackReport | null;
  evaluations: QuestionReviewItem[];
}

export interface SessionState {
  durationSeconds: number;
  answered: number;
  followUps: number;
  activeCandidate: CandidateProfile | null;
  sessionId: string | null;
  finalReport: FinalFeedbackReport | null;
  evaluations: QuestionReviewItem[];
  completedSessions: CompletedSessionItem[];
  setResult: (result: { durationSeconds: number; answered: number; followUps: number }) => void;
  setActiveCandidate: (candidate: CandidateProfile) => void;
  setSessionId: (id: string | null) => void;
  setFinalReport: (report: FinalFeedbackReport | null) => void;
  setEvaluations: (evals: QuestionReviewItem[]) => void;
  addCompletedSession: (sessionItem: CompletedSessionItem) => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState({ durationSeconds: 0, answered: 0, followUps: 0 });
  
  // Initialize active candidate from sessionStorage or default candidate
  const [activeCandidate, setActiveCandidateState] = useState<CandidateProfile | null>(() => {
    try {
      const savedCandidateId = sessionStorage.getItem('activeCandidateId');
      if (savedCandidateId) {
        const found = candidatesData.candidates.find((c: any) => c.member.id === savedCandidateId);
        if (found) return found as any as CandidateProfile;
      }
    } catch (e) {
      console.warn('Could not load activeCandidate from sessionStorage');
    }
    return candidatesData.candidates[0] as any as CandidateProfile;
  });

  // Initialize sessionId from sessionStorage
  const [sessionId, setSessionIdState] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('currentSessionId') || null;
    } catch (e) {
      return null;
    }
  });

  // Initialize finalReport from sessionStorage
  const [finalReport, setFinalReportState] = useState<FinalFeedbackReport | null>(() => {
    try {
      const saved = sessionStorage.getItem('finalReport');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Initialize evaluations from sessionStorage
  const [evaluations, setEvaluationsState] = useState<QuestionReviewItem[]>(() => {
    try {
      const saved = sessionStorage.getItem('evaluations');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Initialize completedSessions from sessionStorage
  const [completedSessions, setCompletedSessions] = useState<CompletedSessionItem[]>(() => {
    try {
      const saved = sessionStorage.getItem('completedSessions');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return [];
  });

  const setActiveCandidate = (candidate: CandidateProfile) => {
    setActiveCandidateState(candidate);
    try {
      if (candidate?.member?.id) {
        sessionStorage.setItem('activeCandidateId', candidate.member.id);
      }
    } catch (e) {
      // Ignore sessionStorage error
    }
  };

  const setSessionId = (id: string | null) => {
    setSessionIdState(id);
    try {
      if (id) {
        sessionStorage.setItem('currentSessionId', id);
      } else {
        sessionStorage.removeItem('currentSessionId');
        // Clear previous report and evaluations when resetting sessionId!
        setFinalReportState(null);
        setEvaluationsState([]);
        sessionStorage.removeItem('finalReport');
        sessionStorage.removeItem('evaluations');
      }
    } catch (e) {
      // Ignore sessionStorage error
    }
  };

  const setFinalReport = (report: FinalFeedbackReport | null) => {
    setFinalReportState(report);
    try {
      if (report) {
        sessionStorage.setItem('finalReport', JSON.stringify(report));
      } else {
        sessionStorage.removeItem('finalReport');
      }
    } catch (e) {
      // Ignore sessionStorage error
    }
  };

  const setEvaluations = (evals: QuestionReviewItem[]) => {
    setEvaluationsState(evals);
    try {
      if (evals && evals.length > 0) {
        sessionStorage.setItem('evaluations', JSON.stringify(evals));
      } else {
        sessionStorage.removeItem('evaluations');
      }
    } catch (e) {
      // Ignore sessionStorage error
    }
  };

  const addCompletedSession = (sessionItem: CompletedSessionItem) => {
    setCompletedSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionItem.id);
      const updated = [sessionItem, ...filtered];
      try {
        sessionStorage.setItem('completedSessions', JSON.stringify(updated));
      } catch (e) {
        // Ignore sessionStorage error
      }
      return updated;
    });
  };

  const value = useMemo<SessionState>(
    () => ({
      ...state,
      activeCandidate,
      sessionId,
      finalReport,
      evaluations,
      completedSessions,
      setResult: (result) => setState((prev) => ({ ...prev, ...result })),
      setActiveCandidate,
      setSessionId,
      setFinalReport,
      setEvaluations,
      addCompletedSession
    }),
    [state, activeCandidate, sessionId, finalReport, evaluations, completedSessions]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}