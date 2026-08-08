import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon, LightbulbIcon } from 'lucide-react';
import { QuestionReviewItem } from '../../types';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';

const statusTone: Record<QuestionReviewItem['status'], 'ok' | 'accent' | 'warn'> = {
  Strong: 'ok',
  Good: 'accent',
  'Needs Improvement': 'warn'
};

export function QuestionReviewCard({ item, index }: {item: QuestionReviewItem;index: number;}) {
  const [open, setOpen] = useState(index === 0);
  const contentId = `review-${item.id}`;

  return (
    <li className="overflow-hidden rounded-xl border border-line bg-panel">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-raised/60">
        
        <span className="mt-0.5 font-mono text-2xs text-dim">{String(index + 1).padStart(2, '0')}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone="outline" mono>
              {item.topic}
            </Badge>
            <Badge tone="outline" mono>
              {item.day}
            </Badge>
            <Badge tone={statusTone[item.status]}>{item.status}</Badge>
          </span>
          <span className="mt-2 block text-[14.5px] leading-snug text-fg">{item.question}</span>
        </span>
        <ChevronDownIcon
          size={16}
          className={cn('mt-1 shrink-0 text-dim transition-transform duration-300', open && 'rotate-180')} />
        
      </button>

      <AnimatePresence initial={false}>
        {open ?
        <motion.div
          id={contentId}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden">
          
            <div className="space-y-5 border-t border-line px-5 py-5">
              <div>
                <p className="text-2xs font-medium uppercase tracking-[0.1em] text-dim">Your answer</p>
                <p className="mt-2 rounded-lg border border-line bg-raised px-3.5 py-3 text-[13.5px] leading-relaxed text-fg/85">
                  {item.answer}
                </p>
              </div>

              <div>
                <p className="text-2xs font-medium uppercase tracking-[0.1em] text-dim">Evaluation</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-sub">{item.evaluation}</p>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-2xs font-medium uppercase tracking-[0.1em] text-[#7EE2A8]">What was strong</p>
                  <ul className="mt-2 space-y-2">
                    {item.strengths.map((s) =>
                  <li key={s} className="flex gap-2 text-[13px] leading-relaxed text-sub">
                        <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#4ADE80]" />
                        {s}
                      </li>
                  )}
                  </ul>
                </div>
                <div>
                  <p className="text-2xs font-medium uppercase tracking-[0.1em] text-[#F2C55C]">What could improve</p>
                  <ul className="mt-2 space-y-2">
                    {item.improvements.map((s) =>
                  <li key={s} className="flex gap-2 text-[13px] leading-relaxed text-sub">
                        <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#FBBF24]" />
                        {s}
                      </li>
                  )}
                  </ul>
                </div>
              </div>

              <div className="rounded-xl border border-[#2E3168] bg-[#12142B] p-4">
                <p className="flex items-center gap-2 text-[13px] font-medium text-[#A5A7FB]">
                  <LightbulbIcon size={13} />
                  How you could answer this better
                </p>
                <ol className="mt-3 space-y-2">
                  {item.betterAnswer.map((step, i) =>
                <li key={step} className="flex gap-3 text-[13.5px] leading-relaxed text-fg/85">
                      <span className="mt-[1px] font-mono text-2xs text-[#7A7CE0]">{i + 1}</span>
                      {step}
                    </li>
                )}
                </ol>
              </div>
            </div>
          </motion.div> :
        null}
      </AnimatePresence>
    </li>);

}