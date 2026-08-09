import React from 'react';
import { SparklesIcon } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { useSession } from '../../contexts/SessionContext';
import { candidate as fallbackCandidate } from '../../data/cohort';
import { cn } from '../../utils/cn';

const signalStyle: Record<string, string> = {
  Strong: 'text-[#7EE2A8] border-[#1F4430] bg-[#12251A]',
  Moderate: 'text-[#A5A7FB] border-[#2E3168] bg-[#171A35]',
  'Needs Practice': 'text-[#F2C55C] border-[#4A3A17] bg-[#241D0F]'
};

export function InterviewFocusCard() {
  const { activeCandidate } = useSession();
  const candidate = activeCandidate || fallbackCandidate;
  const candidateMissions = candidate.missions || [];

  const topicsMap: Record<string, number[]> = {
    'Vector Databases': [7, 8, 9],
    'RAG': [10, 11, 14],
    'Prompt Engineering': [4, 5, 6, 12, 13],
    'Agentic AI': [17, 18, 19, 20, 22, 24],
    'MCP': [21, 23]
  };

  const focusChips = Object.entries(topicsMap).map(([topic, days]) => {
    const topicMissions = candidateMissions.filter(m => days.includes(m.day));
    const passedCount = topicMissions.filter(m => m.passed === true).length;
    const skippedCount = topicMissions.filter(m => m.skipped === true || m.passed === false).length;
    const attemptsSum = topicMissions.reduce((sum, m) => sum + (m.attempts || 1), 0);
    const avgAttempts = topicMissions.length > 0 ? attemptsSum / topicMissions.length : 1;

    let signal: 'Strong' | 'Moderate' | 'Needs Practice' = 'Moderate';
    if (skippedCount > 0 || avgAttempts >= 3 || (topicMissions.length > 0 && passedCount === 0)) {
      signal = 'Needs Practice';
    } else if (passedCount > 0 && avgAttempts < 2) {
      signal = 'Strong';
    }

    return { topic, signal };
  });

  return (
    <Panel className="p-5">
      <div className="flex items-center gap-2">
        <SparklesIcon size={14} className="text-accent" />
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-sub">Your Interview Focus</h3>
      </div>

      <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-sub">
        Interview Agent prioritises the topics you have already completed, then deliberately revisits the areas where
        your exercise and practice signals were weaker — so the interview probes what you actually need to rehearse.
      </p>

      <ul className="mt-4 flex flex-wrap gap-2">
        {focusChips.map((chip) => (
          <li
            key={chip.topic}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium',
              signalStyle[chip.signal]
            )}>
            <span className="text-fg">{chip.topic}</span>
            <span aria-hidden className="h-3 w-px bg-current opacity-30" />
            <span>{chip.signal}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}