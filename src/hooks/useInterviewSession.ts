import { useCallback, useEffect, useRef, useState } from 'react';
import { InterviewTurn } from '../types';
import { topicTransitionCopy } from '../data/interviewScript';
import { useSession } from '../contexts/SessionContext';

interface TransitionState {
  from: string;
  to: string;
  line: string;
}

export function useInterviewSession(onComplete: (result: {durationSeconds: number;followUps: number;}) => void) {
  const { 
    sessionId, 
    setSessionId, 
    activeCandidate, 
    setActiveCandidate,
    setFinalReport,
    setResult,
    setEvaluations
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

  const timers = useRef<number[]>([]);

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

  // Start Session on Mount
  useEffect(() => {
    const startSession = async () => {
      let activeId = sessionId;
      if (!activeId) {
        activeId = 'session-' + Math.random().toString(36).substring(2, 9);
        setSessionId(activeId);
      }

      // Fallback candidate if none is selected
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
      try {
        const res = await fetch('/api/interview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: activeId,
            candidate: candidateToUse
          })
        });
        const data = await res.json();
        
        setTurns(data.turns || []);
        setCurrentTopic(data.currentTopic || 'RAG');
        setCurrentQuestionDay(data.currentQuestionDay || 12);
        setCurrentDifficulty(data.currentQuestionDifficulty || 'Intermediate');
        setQuestionNumber(data.questionsAsked || 1);
        setClarifyUsed(data.clarifyUsed || false);
        setEvaluations(data.evaluations || []);
      } catch (err) {
        console.error('Error contacting backend to start session:', err);
      } finally {
        setEvaluating(false);
      }
    };

    startSession();
  }, [sessionId, activeCandidate, setSessionId, setActiveCandidate, setEvaluations]);

  const submitAnswer = useCallback(
    async (text: string) => {
      setEvaluating(true);

      // Instantly append user message to frontend UI for smooth responsiveness
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
        const data = await res.json();

        // Check if backend session is done
        if (data.done) {
          setFinalReport(data.feedback);
          setEvaluations(data.evaluations || []);
          
          // Calculate follow-ups based on turns
          const followUpsNum = data.turns.filter((t: any) => t.badge && t.badge !== 'Clarifying the question').length;
          setResult({ durationSeconds: seconds, answered: data.questionsAnswered || 8, followUps: followUpsNum });
          onComplete({ durationSeconds: seconds, followUps: followUpsNum });
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
            // Sync all states from backend response
            setTurns(data.turns);
            setCurrentTopic(data.currentTopic);
            setCurrentQuestionDay(data.currentQuestionDay);
            setCurrentDifficulty(data.currentQuestionDifficulty);
            setQuestionNumber(data.questionsAsked);
            setClarifyUsed(data.clarifyUsed);
            setEvaluations(data.evaluations || []);
          }, 2600);
        } else {
          // Normal turn sync
          setTurns(data.turns);
          setCurrentTopic(data.currentTopic);
          setCurrentQuestionDay(data.currentQuestionDay);
          setCurrentDifficulty(data.currentQuestionDifficulty);
          setQuestionNumber(data.questionsAsked);
          setClarifyUsed(data.clarifyUsed);
          setEvaluations(data.evaluations || []);
        }
      } catch (err) {
        console.error('Error submitting answer to backend:', err);
      } finally {
        setEvaluating(false);
      }
    },
    [sessionId, currentTopic, onComplete, seconds, setFinalReport, setResult, setEvaluations]
  );

  const askClarification = useCallback(async () => {
    if (clarifyUsed) return;
    setEvaluating(true);

    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: '[CLARIFY]'
        })
      });
      const data = await res.json();

      setTurns(data.turns);
      setClarifyUsed(data.clarifyUsed);
      setEvaluations(data.evaluations || []);
    } catch (err) {
      console.error('Error asking for clarification:', err);
    } finally {
      setEvaluating(false);
    }
  }, [clarifyUsed, sessionId, setEvaluations]);

  const endEarly = useCallback(async () => {
    setEvaluating(true);
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: '[END_EARLY]'
        })
      });
      const data = await res.json();

      if (data.done) {
        setFinalReport(data.feedback);
        setEvaluations(data.evaluations || []);
        const followUpsNum = data.turns.filter((t: any) => t.badge && t.badge !== 'Clarifying the question').length;
        setResult({ durationSeconds: seconds, answered: data.questionsAnswered || 4, followUps: followUpsNum });
        onComplete({ durationSeconds: seconds, followUps: followUpsNum });
      }
    } catch (err) {
      console.error('Error ending session early:', err);
    } finally {
      setEvaluating(false);
    }
  }, [sessionId, onComplete, seconds, setFinalReport, setResult, setEvaluations]);

  // Map state to the dynamic question object needed by the LiveInterview UI
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
    submitAnswer,
    askClarification,
    endEarly
  };
}