import React from 'react';
import { cn } from '../../utils/cn';

type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'bad' | 'outline';

interface BadgeProps {
  tone?: Tone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  mono?: boolean;
}

const tones: Record<Tone, string> = {
  neutral: 'bg-[#171b25] text-sub border-line',
  accent: 'bg-[#171a35] text-[#A5A7FB] border-[#2E3168]',
  ok: 'bg-[#12251A] text-[#7EE2A8] border-[#1F4430]',
  warn: 'bg-[#241D0F] text-[#F2C55C] border-[#4A3A17]',
  bad: 'bg-[#241417] text-[#F49A9A] border-[#4A2429]',
  outline: 'bg-transparent text-dim border-line'
};

export function Badge({ tone = 'neutral', icon, children, className, mono }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-[3px] text-2xs font-medium leading-none',
        mono && 'font-mono tracking-tight',
        tones[tone],
        className
      )}>
      
      {icon}
      {children}
    </span>);

}