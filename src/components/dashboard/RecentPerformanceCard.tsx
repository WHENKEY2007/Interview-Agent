import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRightIcon } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { useSession } from '../../contexts/SessionContext';
import { scoreTone } from '../../utils/interviewEngine';
import { cn } from '../../utils/cn';

const toneText: Record<string, string> = {
  ok: 'text-[#7EE2A8]',
  warn: 'text-[#F2C55C]',
  bad: 'text-[#F49A9A]'
};

export function RecentPerformanceCard() {
  const { activeCandidate, completedSessions } = useSession();

  const candidateName = activeCandidate?.member?.name || activeCandidate?.name || 'Sarah Johnson';
  const realSessions = completedSessions.filter(
    (s) => s.candidateName === candidateName
  );

  const getMockHistory = () => {
    const years = activeCandidate?.member?.yearsExperience ?? 5;
    const firstTry = activeCandidate?.signals?.missionsFirstTry ?? 15;
    
    const score1 = Math.min(95, 70 + (years % 5) * 3 + (firstTry % 5) * 2);
    const score2 = Math.min(90, 65 + (years % 4) * 3 + (firstTry % 4) * 2);

    const date1 = new Date();
    date1.setDate(date1.getDate() - 4);
    const date2 = new Date();
    date2.setDate(date2.getDate() - 11);

    const formatShortDate = (d: Date) => {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return [
      {
        date: formatShortDate(date1),
        label: 'Adaptive · 8 questions',
        score: score1
      },
      {
        date: formatShortDate(date2),
        label: 'RAG deep dive · 6 questions',
        score: score2
      }
    ];
  };

  const displaySessions = [
    ...realSessions.map((s) => ({
      date: s.date.split(',')[0],
      label: `Adaptive · ${s.questions} questions`,
      score: s.score ?? 0
    })),
    ...getMockHistory()
  ].slice(0, 2);

  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-sub">Recent Performance</h3>
        <Link
          to="/interviews"
          className="inline-flex items-center gap-1 text-2xs font-medium text-sub transition-colors hover:text-fg">
          All results
          <ArrowUpRightIcon size={12} />
        </Link>
      </div>

      <ul className="mt-3 divide-y divide-line">
        {displaySessions.map((s, idx) =>
          <li key={`${s.date}-${idx}`} className="flex items-center justify-between py-3">
            <div>
              <p className="text-[13.5px] text-fg">{s.label}</p>
              <p className="font-mono text-2xs text-dim">{s.date}</p>
            </div>
            <span className={cn('font-mono text-[15px] font-medium', toneText[scoreTone(s.score)])}>{s.score}</span>
          </li>
        )}
      </ul>
    </Panel>
  );
}