import React from 'react';
import { motion } from 'framer-motion';
import { CheckIcon, CircleDashedIcon, LoaderIcon, RotateCcwIcon } from 'lucide-react';
import { CohortTopic, TopicStatus } from '../../types';
import { ProgressBar } from '../ui/ProgressBar';
import { cn } from '../../utils/cn';

const statusMeta: Record<
  TopicStatus,
  {label: string;icon: React.ReactNode;chip: string;tone: 'accent' | 'ok' | 'warn' | 'neutral';}> =
{
  completed: {
    label: 'Completed',
    icon: <CheckIcon size={11} />,
    chip: 'text-[#7EE2A8] bg-[#12251A] border-[#1F4430]',
    tone: 'ok'
  },
  'in-progress': {
    label: 'In Progress',
    icon: <LoaderIcon size={11} />,
    chip: 'text-[#A5A7FB] bg-[#171A35] border-[#2E3168]',
    tone: 'accent'
  },
  'needs-review': {
    label: 'Needs Review',
    icon: <RotateCcwIcon size={11} />,
    chip: 'text-[#F2C55C] bg-[#241D0F] border-[#4A3A17]',
    tone: 'warn'
  },
  'not-completed': {
    label: 'Not Completed',
    icon: <CircleDashedIcon size={11} />,
    chip: 'text-dim bg-[#15181F] border-line',
    tone: 'neutral'
  }
};

export function TopicCard({ topic, index }: {topic: CohortTopic;index: number;}) {
  const meta = statusMeta[topic.status];

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 * index, ease: [0.16, 1, 0.3, 1] }}
      className="group rounded-xl border border-line bg-panel p-4 transition-colors duration-200 hover:border-line-strong">
      
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-[14px] font-medium leading-tight text-fg">{topic.name}</h4>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-[3px] text-2xs font-medium leading-none',
            meta.chip
          )}>
          
          {meta.icon}
          {meta.label}
        </span>
      </div>

      <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-dim">{topic.blurb}</p>

      <div className="mt-4">
        <ProgressBar
          value={topic.progress}
          tone={meta.tone === 'neutral' ? 'neutral' : meta.tone}
          size="sm"
          delay={0.1 * index}
          label={`${topic.name} progress`} />
        
        <div className="mt-2 flex items-center justify-between font-mono text-2xs text-dim">
          <span>{topic.days}</span>
          <span>{topic.progress}%</span>
        </div>
      </div>
    </motion.li>);

}