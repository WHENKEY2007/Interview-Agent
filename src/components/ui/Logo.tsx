import React from 'react';
import { cn } from '../../utils/cn';

export function BrandIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5 text-accent", className)}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="AI Interviewer Logo"
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      <path d="M9 10l3-3 3 3" strokeWidth="1.5" />
      <path d="M12 7v7" strokeWidth="1.5" />
      <circle cx="12" cy="7" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Logo({ className, subtitle }: {className?: string;subtitle?: string;}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        aria-hidden
        className="relative grid h-8 w-8 place-items-center rounded-[9px] border border-[#2E3168] bg-[#151834]">
        <BrandIcon />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Interview Agent</span>
        {subtitle ?
        <span className="mt-1 text-2xs font-medium uppercase tracking-[0.14em] text-dim">{subtitle}</span> :
        null}
      </span>
    </div>);
}