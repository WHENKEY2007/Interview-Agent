import React from 'react';
import { motion } from 'framer-motion';
import { CornerDownRightIcon, LayersIcon, TrendingUpIcon } from 'lucide-react';
import { InterviewTurn } from '../../types';
import { Badge } from '../ui/Badge';
import { BrandIcon } from '../ui/Logo';

function InterviewerMark() {
  return (
    <span
      aria-hidden
      className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-[#2E3168] bg-[#151834]">
      <BrandIcon />
    </span>);
}

const badgeIcon: Record<string, React.ReactNode> = {
  'Going deeper': <TrendingUpIcon size={11} />,
  'Follow-up': <CornerDownRightIcon size={11} />,
  'Adaptive Follow-up': <CornerDownRightIcon size={11} />
};

export function TurnView({ turn }: {turn: InterviewTurn;}) {
  if (turn.role === 'candidate') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="flex justify-end">
        
        <div className="max-w-[85%] rounded-2xl rounded-tr-md border border-line bg-raised px-4 py-3">
          <p className="mb-1.5 text-2xs font-medium uppercase tracking-[0.1em] text-dim">Your answer</p>
          <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-fg/90">{turn.text}</p>
        </div>
      </motion.div>);

  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="flex gap-3.5">
      
      <InterviewerMark />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-fg">AI Interviewer</span>
          {turn.topic ?
          <Badge tone="outline" mono icon={<LayersIcon size={10} />}>
              {turn.topic}
            </Badge> :
          null}
          {turn.day ?
          <Badge tone="outline" mono>
              {turn.day}
            </Badge> :
          null}
          {turn.difficulty ?
          <Badge tone="outline" mono>
              {turn.difficulty}
            </Badge> :
          null}
          {turn.badge ?
          <Badge tone="accent" icon={badgeIcon[turn.badge]}>
              {turn.badge}
            </Badge> :
          null}
        </div>

        <p
          className={
          turn.isPrimary ?
          'mt-3 max-w-3xl text-[19px] font-medium leading-[1.55] tracking-[-0.01em] text-fg lg:text-[21px]' :
          'mt-3 max-w-3xl text-[16px] leading-[1.6] text-fg/90 lg:text-[17px]'
          }>
          
          {turn.text}
        </p>
      </div>
    </motion.div>);

}