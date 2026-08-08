import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRightIcon } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { recentSessions } from '../../data/cohort';
import { scoreTone } from '../../utils/interviewEngine';
import { cn } from '../../utils/cn';

const toneText: Record<string, string> = {
  ok: 'text-[#7EE2A8]',
  warn: 'text-[#F2C55C]',
  bad: 'text-[#F49A9A]'
};

export function RecentPerformanceCard() {
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
        {recentSessions.map((s) =>
        <li key={s.date} className="flex items-center justify-between py-3">
            <div>
              <p className="text-[13.5px] text-fg">{s.label}</p>
              <p className="font-mono text-2xs text-dim">{s.date}</p>
            </div>
            <span className={cn('font-mono text-[15px] font-medium', toneText[scoreTone(s.score)])}>{s.score}</span>
          </li>
        )}
      </ul>
    </Panel>);

}