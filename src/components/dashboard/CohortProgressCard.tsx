import React from 'react';
import { motion } from 'framer-motion';
import { Panel } from '../ui/Panel';
import { useSession } from '../../contexts/SessionContext';
import { candidate as fallbackCandidate } from '../../data/cohort';

export function CohortProgressCard() {
  const { activeCandidate } = useSession();
  const cand = activeCandidate || fallbackCandidate;
  
  const daysCompleted = cand.signals ? cand.signals.missionsCompleted : (cand.daysCompleted || 23);
  const totalDays = 31;
  const pct = daysCompleted / totalDays * 100;

  return (
    <Panel className="p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-sub">AI Cohort Progress</h3>
        <span className="font-mono text-2xs text-dim">{Math.round(pct)}%</span>
      </div>

      <p className="mt-3 text-[26px] font-semibold tracking-[-0.03em] text-fg">
        {daysCompleted}
        <span className="text-dim"> / {totalDays}</span>
        <span className="ml-2 text-sm font-normal text-sub">days completed</span>
      </p>

      <div className="mt-4 flex items-end gap-[3px]" aria-hidden>
        {Array.from({ length: totalDays }).map((_, i) => {
          const done = i < daysCompleted;
          const current = i === daysCompleted;
          return (
            <motion.span
              key={i}
              initial={{ scaleY: 0.3, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.014, ease: [0.16, 1, 0.3, 1] }}
              className={[
              'block flex-1 origin-bottom rounded-[2px]',
              done ? 'h-7 bg-accent' : current ? 'h-7 bg-[#3A3E8C]' : 'h-4 bg-[#1A1E29]'].
              join(' ')} />);


        })}
      </div>

      <div className="mt-2.5 flex items-center justify-between font-mono text-2xs text-dim">
        <span>Day 1</span>
        <span className="text-[#A5A7FB]">{daysCompleted >= totalDays ? 'Program Completed' : `Currently Day ${daysCompleted + 1}`}</span>
        <span>Day {totalDays}</span>
      </div>
    </Panel>);

}