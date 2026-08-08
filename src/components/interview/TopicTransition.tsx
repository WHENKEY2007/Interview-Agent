import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRightIcon, CheckIcon } from 'lucide-react';

interface TopicTransitionProps {
  from: string;
  to: string;
  line: string;
}

export function TopicTransition({ from, to, line }: TopicTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 grid place-items-center bg-base/92 px-6 backdrop-blur-md"
      role="status"
      aria-live="polite">
      
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md rounded-2xl border border-line bg-panel p-7 text-center shadow-lift">
        
        <div className="inline-flex items-center gap-2 rounded-lg border border-[#1F4430] bg-[#12251A] px-2.5 py-1.5 text-2xs font-medium text-[#7EE2A8]">
          <CheckIcon size={12} />
          {from} complete
        </div>

        <div className="mt-6 flex items-center justify-center gap-3 text-dim">
          <span className="font-mono text-2xs uppercase tracking-[0.14em]">Next topic</span>
          <ArrowRightIcon size={13} />
        </div>

        <p className="mt-2 text-[26px] font-semibold tracking-[-0.02em] text-fg">{to}</p>
        <p className="mt-3 text-[14px] leading-relaxed text-sub">“{line}”</p>

        <div className="mt-6 h-[3px] w-full overflow-hidden rounded-full bg-[#191D28]">
          <motion.div
            className="h-full bg-accent"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.4, ease: 'linear' }} />
          
        </div>
      </motion.div>
    </motion.div>);

}