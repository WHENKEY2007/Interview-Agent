import React from 'react';
import { cn } from '../../utils/cn';

export function Logo({ className, subtitle }: {className?: string;subtitle?: string;}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        aria-hidden
        className="relative grid h-8 w-8 place-items-center rounded-[9px] border border-[#2E3168] bg-[#151834]">
        
        <span className="absolute h-3.5 w-3.5 rounded-[4px] border border-accent" />
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Interview Agent</span>
        {subtitle ?
        <span className="mt-1 text-2xs font-medium uppercase tracking-[0.14em] text-dim">{subtitle}</span> :
        null}
      </span>
    </div>);

}