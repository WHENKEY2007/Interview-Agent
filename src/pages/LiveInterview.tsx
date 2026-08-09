import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { InterviewHeader } from '../components/interview/InterviewHeader';
import { TurnView } from '../components/interview/TurnView';
import { EvaluatingIndicator } from '../components/interview/EvaluatingIndicator';
import { TopicTransition } from '../components/interview/TopicTransition';
import { ResponseComposer } from '../components/interview/ResponseComposer';
import { useInterviewSession } from '../hooks/useInterviewSession';
import { useSession } from '../contexts/SessionContext';
import { cn } from '../utils/cn';
import { AlertCircleIcon } from 'lucide-react';

const defaultTopics = ['RAG', 'Vector Databases', 'Prompt Engineering', 'Agentic AI', 'MCP'];

export function LiveInterview() {
  const navigate = useNavigate();
  const { setResult } = useSession();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleComplete = useCallback(
    (result: { durationSeconds: number; answered: number; followUps: number }) => {
      setResult({ durationSeconds: result.durationSeconds, answered: result.answered, followUps: result.followUps });
      navigate('/complete');
    },
    [navigate, setResult]
  );

  const session = useInterviewSession(handleComplete);
  const { turns, evaluating, errorState } = session;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, evaluating]);

  // Derive dynamic topic list from turns if available, fallback to default topics
  const topicsInTurns = Array.from(new Set(turns.map(t => t.topic).filter(Boolean))) as string[];
  const topicOrder = topicsInTurns.length > 0 ? topicsInTurns : defaultTopics;
  const activeTopicIndex = Math.max(0, topicOrder.indexOf(session.question.topic));

  return (
    <div className="flex h-screen w-full flex-col bg-base">
      <InterviewHeader
        current={session.questionNumber}
        total={session.totalQuestions}
        seconds={session.seconds}
        onEnd={session.endEarly}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1100px] px-5 py-8 lg:px-8">
            <ol className="mb-8 flex flex-wrap items-center gap-2" aria-label="Interview topic coverage">
              {topicOrder.map((topic, i) => (
                <li
                  key={topic}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-2xs transition-colors',
                    i < activeTopicIndex && 'border-[#1F4430] bg-[#12251A] text-[#7EE2A8]',
                    i === activeTopicIndex && 'border-[#2E3168] bg-[#171A35] text-[#A5A7FB]',
                    i > activeTopicIndex && 'border-line text-dim'
                  )}
                  aria-current={i === activeTopicIndex ? 'step' : undefined}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      i < activeTopicIndex ? 'bg-[#4ADE80]' : i === activeTopicIndex ? 'bg-accent' : 'bg-[#2C3140]'
                    )}
                  />
                  {topic}
                </li>
              ))}
            </ol>

            {errorState && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#4A1D1D] bg-[#221010] p-4 text-[13.5px] text-[#F87171]">
                <AlertCircleIcon size={18} className="shrink-0 text-[#F87171]" />
                <p className="flex-1">{errorState}</p>
              </div>
            )}

            <div className="space-y-8 pb-4">
              {turns.map((turn) => (
                <TurnView key={turn.id} turn={turn} />
              ))}
              <AnimatePresence>{evaluating ? <EvaluatingIndicator /> : null}</AnimatePresence>
            </div>
          </div>
        </div>

        <ResponseComposer
          disabled={evaluating || session.transition !== null}
          onSubmit={session.submitAnswer}
          onClarify={session.askClarification}
          clarifyUsed={session.clarifyUsed}
        />
      </div>

      <AnimatePresence>
        {session.transition ? (
          <TopicTransition
            from={session.transition.from}
            to={session.transition.to}
            line={session.transition.line}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}