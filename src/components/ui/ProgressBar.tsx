import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface ProgressBarProps {
  value: number;
  tone?: 'accent' | 'ok' | 'warn' | 'bad' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
  delay?: number;
  label?: string;
}

const toneClass: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  accent: 'bg-accent',
  ok: 'bg-[#4ADE80]',
  warn: 'bg-[#FBBF24]',
  bad: 'bg-[#F87171]',
  neutral: 'bg-[#3A4054]'
};

export function ProgressBar({ value, tone = 'accent', size = 'md', className, delay = 0, label }: ProgressBarProps) {
  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-[#191D28]', size === 'sm' ? 'h-1' : 'h-1.5', className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}>
      
      <motion.div
        className={cn('h-full rounded-full', toneClass[tone])}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay }} />
      
    </div>);

}