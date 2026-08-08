import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUpIcon } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { useSession } from '../../contexts/SessionContext';
import { getCandidateReadiness } from '../../utils/candidateUtils';
import { candidate as fallbackCandidate } from '../../data/cohort';

const SIZE = 148;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export function ReadinessCard() {
  const { activeCandidate } = useSession();
  const candidateToUse = activeCandidate || fallbackCandidate;
  const { readiness: pct, readinessLabel } = getCandidateReadiness(candidateToUse);

  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-sub">Interview Readiness</h3>
        <span className="inline-flex items-center gap-1 text-2xs font-medium text-[#7EE2A8]">
          <TrendingUpIcon size={12} />
          +6 this week
        </span>
      </div>

      <div className="mt-4 flex items-center gap-5">
        <div className="relative shrink-0" style={{ width: SIZE / 1.25, height: SIZE / 1.25 }}>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full -rotate-90" aria-hidden>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#191D28" strokeWidth={STROKE} />
            <motion.circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="#6366F1"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C - C * pct / 100 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 }} />
            
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-[30px] font-semibold tracking-[-0.03em] text-fg">{pct}%</span>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-[15px] font-medium leading-snug text-fg">{readinessLabel}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-dim">
            Derived from cohort completion, exercise quality signals and your last two practice interviews.
          </p>
        </div>
      </div>
    </Panel>);

}