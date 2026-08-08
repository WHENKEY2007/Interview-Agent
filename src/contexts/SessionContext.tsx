import React, { createContext, useContext, useMemo, useState } from 'react';

export interface SessionState {
  durationSeconds: number;
  answered: number;
  followUps: number;
  activeCandidate: any | null;
  sessionId: string | null;
  finalReport: any | null;
  evaluations: any[];
  setResult: (result: {durationSeconds: number;answered: number;followUps: number;}) => void;
  setActiveCandidate: (candidate: any) => void;
  setSessionId: (id: string | null) => void;
  setFinalReport: (report: any) => void;
  setEvaluations: (evals: any[]) => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: {children: React.ReactNode;}) {
  const [state, setState] = useState({ durationSeconds: 24 * 60, answered: 10, followUps: 6 });
  const [activeCandidate, setActiveCandidate] = useState<any | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [finalReport, setFinalReport] = useState<any | null>(null);
  const [evaluations, setEvaluations] = useState<any[]>([]);

  const value = useMemo<SessionState>(
    () => ({
      ...state,
      activeCandidate,
      sessionId,
      finalReport,
      evaluations,
      setResult: (result) => setState((prev) => ({ ...prev, ...result })),
      setActiveCandidate,
      setSessionId,
      setFinalReport,
      setEvaluations
    }),
    [state, activeCandidate, sessionId, finalReport, evaluations]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}