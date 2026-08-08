import React from 'react';
import { motion } from 'framer-motion';
import { TimerIcon } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { Button } from '../ui/Button';
import { formatClock } from '../../utils/interviewEngine';

interface InterviewHeaderProps {
  current: number;
  total: number;
  seconds: number;
  onEnd: () => void;
}

export function InterviewHeader({ current, total, seconds, onEnd }: InterviewHeaderProps) {
  const pct = (current - 1) / total * 100;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-base/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1100px] items-center justify-between gap-4 px-5 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Logo />
          <span aria-hidden className="hidden h-5 w-px bg-line sm:block" />
          <span className="hidden truncate text-[13px] text-sub sm:block">Technical Interview</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <p className="whitespace-nowrap font-mono text-2xs text-sub">
            Question <span className="text-fg">{current}</span> of {total}
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-raised px-2 py-1 font-mono text-2xs text-sub">
            <TimerIcon size={11} className="text-dim" />
            {formatClock(seconds)}
          </span>
          <Button variant="danger" size="sm" onClick={onEnd} className="hidden sm:inline-flex">
            End Interview
          </Button>
        </div>
      </div>

      <div className="h-[2px] w-full bg-[#151822]">
        <motion.div
          className="h-full bg-accent"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} />
        
      </div>
    </header>);

}