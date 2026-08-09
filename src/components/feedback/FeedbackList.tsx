import React from 'react';
import { motion } from 'framer-motion';
import { CheckIcon, ArrowUpRightIcon } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { cn } from '../../utils/cn';

interface FeedbackListProps {
  title: string;
  items: string[];
  tone: 'positive' | 'growth';
}

export function FeedbackList({ title, items, tone }: FeedbackListProps) {
  const positive = tone === 'positive';
  return (
    <Panel className="p-5">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            'grid h-5 w-5 place-items-center rounded-md border',
            positive ? 'border-[#1F4430] bg-[#12251A] text-[#7EE2A8]' : 'border-[#4A3A17] bg-[#241D0F] text-[#F2C55C]'
          )}>
          
          {positive ? <CheckIcon size={11} /> : <ArrowUpRightIcon size={11} />}
        </span>
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-sub">{title}</h3>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-[13.5px] leading-relaxed text-dim">
          {tone === 'positive' 
            ? "No strengths identified because there were no candidate responses." 
            : "No technical growth areas can be assessed without candidate responses."}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item, i) => (
            <motion.li
              key={item}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 * i }}
              className="flex gap-2.5 text-[13.5px] leading-relaxed text-sub"
            >
              <span
                aria-hidden
                className={cn('mt-[7px] h-1 w-1 shrink-0 rounded-full', positive ? 'bg-[#4ADE80]' : 'bg-[#FBBF24]')}
              />
              {item}
            </motion.li>
          ))}
        </ul>
      )}
    </Panel>);

}