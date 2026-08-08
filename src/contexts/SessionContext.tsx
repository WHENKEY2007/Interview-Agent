import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import candidatesData from '../../data/candidates.json';

export interface CompletedSessionItem {
  id: string;
  date: string;
  candidateName: string;
  candidateRole: string;
  topics: string[];
  questions: number;
  minutes: number;
  score: number;
  summary: string;
  report: any;
  evaluations: any[];
}

export interface SessionState {
  durationSeconds: number;
  answered: number;
  followUps: number;
  activeCandidate: any | null;
  sessionId: string | null;
  finalReport: any | null;
  evaluations: any[];
  completedSessions: CompletedSessionItem[];
  setResult: (result: { durationSeconds: number; answered: number; followUps: number }) => void;
  setActiveCandidate: (candidate: any) => void;
  setSessionId: (id: string | null) => void;
  setFinalReport: (report: any) => void;
  setEvaluations: (evals: any[]) => void;
  addCompletedSession: (sessionItem: CompletedSessionItem) => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState({ durationSeconds: 24 * 60, answered: 10, followUps: 6 });
  
  // Initialize active candidate from sessionStorage or default candidate
  const [activeCandidate, setActiveCandidateState] = useState<any | null>(() => {
    try {
      const savedCandidateId = sessionStorage.getItem('activeCandidateId');
      if (savedCandidateId) {
        const found = candidatesData.candidates.find((c: any) => c.member.id === savedCandidateId);
        if (found) return found;
      }
    } catch (e) {
      console.warn('Could not load activeCandidate from sessionStorage');
    }
    return candidatesData.candidates[0];
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
  const [finalReport, setFinalReportState] = useState<any | null>(() => {
    try {
      const saved = sessionStorage.getItem('finalReport');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Initialize evaluations from sessionStorage
  const [evaluations, setEvaluationsState] = useState<any[]>(() => {
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

  const setActiveCandidate = (candidate: any) => {
    setActiveCandidateState(candidate);
    try {
      if (candidate?.member?.id) {
        sessionStorage.setItem('activeCandidateId', candidate.member.id);
      }
    } catch (e) {}
  };

  const setSessionId = (id: string | null) => {
    setSessionIdState(id);
    try {
      if (id) {
        sessionStorage.setItem('currentSessionId', id);
      } else {
        sessionStorage.removeItem('currentSessionId');
      }
    } catch (e) {}
  };

  const setFinalReport = (report: any) => {
    setFinalReportState(report);
    try {
      if (report) {
        sessionStorage.setItem('finalReport', JSON.stringify(report));
      } else {
        sessionStorage.removeItem('finalReport');
      }
    } catch (e) {}
  };

  const setEvaluations = (evals: any[]) => {
    setEvaluationsState(evals);
    try {
      if (evals && evals.length > 0) {
        sessionStorage.setItem('evaluations', JSON.stringify(evals));
      } else {
        sessionStorage.removeItem('evaluations');
      }
    } catch (e) {}
  };

  const addCompletedSession = (sessionItem: CompletedSessionItem) => {
    setCompletedSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionItem.id);
      const updated = [sessionItem, ...filtered];
      try {
        sessionStorage.setItem('completedSessions', JSON.stringify(updated));
      } catch (e) {}
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