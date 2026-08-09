import React from 'react';
import { motion } from 'framer-motion';
import { BrandIcon } from '../ui/Logo';

export function EvaluatingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-3.5"
      role="status"
      aria-live="polite">
      
      <span
        aria-hidden
        className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-[#2E3168] bg-[#151834]">
        
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center justify-center"
        >
          <BrandIcon />
        </motion.div>
      </span>
      <div className="flex items-center gap-2">
        <span className="text-[13.5px] text-sub">AI Interviewer is evaluating your response</span>
        <span className="flex gap-1" aria-hidden>
          {[0, 1, 2].map((i) =>
          <motion.span
            key={i}
            className="h-1 w-1 rounded-full bg-dim"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }} />

          )}
        </span>
      </div>
    </motion.div>);

}