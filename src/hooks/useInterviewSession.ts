import { useCallback, useEffect, useRef, useState } from 'react';
import { InterviewTurn } from '../types';
import { topicTransitionCopy } from '../data/interviewScript';
import { useSession } from '../contexts/SessionContext';

interface TransitionState {
  from: string;
  to: string;
  line: string;
}

export function useInterviewSession(onComplete: (result: { durationSeconds: number; followUps: number }) => void) {
  const { 
    sessionId, 
    setSessionId, 
    activeCandidate, 
    setActiveCandidate,
    setFinalReport,
    setResult,
    setEvaluations,
    addCompletedSession
  } = useSession();

  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [currentTopic, setCurrentTopic] = useState('RAG');
  const [currentQuestionDay, setCurrentQuestionDay] = useState(12);
  const [currentDifficulty, setCurrentDifficulty] = useState<'Foundational' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(8);
  const [evaluating, setEvaluating] = useState(false);
  const [clarifyUsed, setClarifyUsed] = useState(false);
  const [transition, setTransition] = useState<TransitionState | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [errorState, setErrorState] = useState<string | null>(null);

  const timers = useRef<number[]>([]);
  const initialized = useRef<boolean>(false);

  // Timer effect
  useEffect(() => {
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const schedule = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // Start or Restore Session on Mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const startOrRestoreSession = async () => {
      const activeId = sessionId;
      const candidateToUse = activeCandidate || {
        member: {
          id: 'CAND-001',
          name: 'Sarah Johnson',
          jobRole: 'Senior Data Engineer',
          yearsExperience: 9,
          education: 'MS Computer Science',
          status: 'COMPLETED'
        },
        missions: [
          { day: 7, title: "Embeddings Explained", passed: true, attempts: 1 },
          { day: 8, title: "Vector Databases Overview", passed: true, attempts: 1 },
          { day: 10, title: "Retrieval & Matching Engine", passed: true, attempts: 2 },
          { day: 12, title: "Prompt Engineering Fundamentals", passed: true, attempts: 4 },
          { day: 16, title: "Chatbot Backend & API Integration", passed: true, attempts: 1 },
          { day: 22, title: "Multi-Agent Orchestration", passed: true, attempts: 2 },
          { day: 23, title: "Model Context Protocol (MCP)", passed: true, attempts: 2 },
          { day: 28, title: "Docker & Kubernetes Deployment", passed: true, attempts: 3 },
          { day: 29, title: "Monitoring, Logging & Observability", skipped: true },
          { day: 31, title: "Capstone Project & Final Demo", passed: true, attempts: 1 }
        ],
        signals: { commitDays: 28, missionsCompleted: 30, missionsFirstTry: 20 }
      };

      if (!activeCandidate) {
        setActiveCandidate(candidateToUse);
      }

      setEvaluating(true);
      setErrorState(null);

      try {
        // Try restoring session if activeId exists
        if (activeId) {
          const checkRes = await fetch(`/api/interview/session/${activeId}`);
          if (checkRes.ok) {
            const sessionData = await checkRes.json();
            if (sessionData && sessionData.turns && sessionData.turns.length > 0 && sessionData.status === 'IN_PROGRESS') {
              console.log(`[Session] Restored existing session ${activeId}`);
              setTurns(sessionData.turns);
              setCurrentTopic(sessionData.currentTopic || 'RAG');
              setCurrentQuestionDay(sessionData.currentQuestionDay || 12);
              setCurrentDifficulty(sessionData.currentQuestionDifficulty || 'Intermediate');
              setQuestionNumber(sessionData.questionsAsked || 1);
              setClarifyUsed(sessionData.clarifyUsed || false);
              setEvaluations(sessionData.evaluations || []);
              setEvaluating(false);
              return;
            }
          }
        }

        // Initialize fresh session
        const newSessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        setSessionId(newSessionId);

        const res = await fetch('/api/interview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: newSessionId,
            candidate: candidateToUse
          })
        });

        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }

        const data = await res.json();
        setTurns(data.turns || []);
        setCurrentTopic(data.currentTopic || 'RAG');
        setCurrentQuestionDay(data.currentQuestionDay || 12);
        setCurrentDifficulty(data.currentQuestionDifficulty || 'Intermediate');
        setQuestionNumber(data.questionsAsked || 1);
        setClarifyUsed(data.clarifyUsed || false);
        setEvaluations(data.evaluations || []);
      } catch (err: any) {
        console.error('Error initializing backend session:', err);
        setErrorState('Failed to connect to AI Interviewer server. Please refresh or retry.');
      } finally {
        setEvaluating(false);
      }
    };

    startOrRestoreSession();
  }, [sessionId, activeCandidate, setSessionId, setActiveCandidate, setEvaluations]);

  const submitAnswer = useCallback(
    async (text: string) => {
      if (evaluating) return; // Prevent duplicate submissions
      setEvaluating(true);
      setErrorState(null);

      // Instantly append user message to UI for smooth responsiveness
      const candidateTurnId = `local-${Date.now()}`;
      setTurns((prev) => [...prev, { id: candidateTurnId, role: 'candidate', text }]);

      try {
        const res = await fetch('/api/interview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            message: text
          })
        });

        if (!res.ok) {
          throw new Error(`Server error (${res.status}). Failed to process response.`);
        }

        const data = await res.json();

        // Check if backend session is done
        if (data.done) {
          setFinalReport(data.feedback);
          setEvaluations(data.evaluations || []);
          
          const followUpsNum = (data.turns || []).filter((t: any) => t.badge && t.badge !== 'Clarifying the question').length;
          const duration = seconds;
          const questionsCount = (data.evaluations || []).length || 8;
          
          setResult({ durationSeconds: duration, answered: questionsCount, followUps: followUpsNum });

          // Save completed session to history
          const candName = activeCandidate?.member?.name || activeCandidate?.name || 'Candidate';
          const candRole = activeCandidate?.member?.jobRole || 'Software Engineer';
          const sessionItem = {
            id: sessionId || `session-${Date.now()}`,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            candidateName: candName,
            candidateRole: candRole,
            topics: Array.from(new Set((data.evaluations || []).map((e: any) => e.topic))) as string[],
            questions: questionsCount,
            minutes: Math.max(1, Math.round(duration / 60)),
            score: data.feedback?.overallScore ?? null,
            summary: data.feedback?.summary || 'Interview completed.',
            report: data.feedback,
            evaluations: data.evaluations || []
          };
          addCompletedSession(sessionItem);

          onComplete({ durationSeconds: duration, followUps: followUpsNum });
          return;
        }

        // Check if there is a topic/day shift to run the TopicTransition overlay
        if (data.currentTopic && data.currentTopic !== currentTopic) {
          setTransition({
            from: currentTopic,
            to: data.currentTopic,
            line: topicTransitionCopy[data.currentTopic] ?? 'Let’s move on to the next area.'
          });

          schedule(() => {
            setTransition(null);
            setTurns(data.turns || []);
            setCurrentTopic(data.currentTopic);
            setCurrentQuestionDay(data.currentQuestionDay);
            setCurrentDifficulty(data.currentQuestionDifficulty);
            setQuestionNumber(data.questionsAsked);
            setClarifyUsed(data.clarifyUsed);
            setEvaluations(data.evaluations || []);
          }, 2600);
        } else {
          // Normal turn sync
          setTurns(data.turns || []);
          setCurrentTopic(data.currentTopic);
          setCurrentQuestionDay(data.currentQuestionDay);
          setCurrentDifficulty(data.currentQuestionDifficulty);
          setQuestionNumber(data.questionsAsked);
          setClarifyUsed(data.clarifyUsed);
          setEvaluations(data.evaluations || []);
        }
      } catch (err: any) {
        console.error('Error submitting answer to backend:', err);
        setErrorState('Network error communicating with interviewer. Please try submitting again.');
        // Revert temporary turn on hard failure
        setTurns((prev) => prev.filter((t) => t.id !== candidateTurnId));
      } finally {
        setEvaluating(false);
      }
    },
    [sessionId, currentTopic, evaluating, onComplete, seconds, setFinalReport, setResult, setEvaluations, addCompletedSession, activeCandidate]
  );

  const askClarification = useCallback(async () => {
    if (clarifyUsed || evaluating) return;
    setEvaluating(true);
    setErrorState(null);

    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: '[CLARIFY]'
        })
      });

      if (!res.ok) throw new Error('Clarification request failed.');

      const data = await res.json();
      setTurns(data.turns || []);
      setClarifyUsed(data.clarifyUsed);
      setEvaluations(data.evaluations || []);
    } catch (err) {
      console.error('Error asking for clarification:', err);
      setErrorState('Could not fetch question clarification. Please try again.');
    } finally {
      setEvaluating(false);
    }
  }, [clarifyUsed, evaluating, sessionId, setEvaluations]);

  const endEarly = useCallback(async () => {
    if (evaluating) return;
    setEvaluating(true);
    setErrorState(null);

    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: '[END_EARLY]'
        })
      });

      if (!res.ok) throw new Error('End early request failed.');

      const data = await res.json();
      if (data.done) {
        setFinalReport(data.feedback);
        setEvaluations(data.evaluations || []);
        
        const followUpsNum = (data.turns || []).filter((t: any) => t.badge && t.badge !== 'Clarifying the question').length;
        const duration = seconds;
        const questionsCount = (data.evaluations || []).length || 4;

        setResult({ durationSeconds: duration, answered: questionsCount, followUps: followUpsNum });

        // Save completed session
        const candName = activeCandidate?.member?.name || activeCandidate?.name || 'Candidate';
        const candRole = activeCandidate?.member?.jobRole || 'Software Engineer';
        const sessionItem = {
          id: sessionId || `session-${Date.now()}`,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          candidateName: candName,
          candidateRole: candRole,
          topics: Array.from(new Set((data.evaluations || []).map((e: any) => e.topic))) as string[],
          questions: questionsCount,
          minutes: Math.max(1, Math.round(duration / 60)),
          score: data.feedback?.overallScore ?? null,
          summary: data.feedback?.summary || 'Interview completed early.',
          report: data.feedback,
          evaluations: data.evaluations || []
        };
        addCompletedSession(sessionItem);

        onComplete({ durationSeconds: duration, followUps: followUpsNum });
      }
    } catch (err) {
      console.error('Error ending session early:', err);
      setErrorState('Could not complete interview session. Please try again.');
    } finally {
      setEvaluating(false);
    }
  }, [evaluating, sessionId, onComplete, seconds, setFinalReport, setResult, setEvaluations, addCompletedSession, activeCandidate]);

  const question = {
    topic: currentTopic,
    day: `Day ${currentQuestionDay}`,
    difficulty: currentDifficulty
  };

  return {
    question,
    questionNumber,
    totalQuestions,
    turns,
    evaluating,
    clarifyUsed,
    transition,
    seconds,
    errorState,
    submitAnswer,
    askClarification,
    endEarly
  };
}