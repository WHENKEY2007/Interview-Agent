import React from 'react';
import { cn } from '../../utils/cn';

interface PanelProps {
  className?: string;
  children: React.ReactNode;
  as?: 'div' | 'section' | 'article' | 'aside';
}

export function Panel({ className, children, as: Tag = 'div' }: PanelProps) {
  return (
    <Tag className={cn('rounded-2xl border border-line bg-panel shadow-soft', className)}>{children}</Tag>);

}

export function PanelHeader({
  title,
  action,
  description,
  className





}: {title: React.ReactNode;description?: React.ReactNode;action?: React.ReactNode;className?: string;}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5', className)}>
      <div>
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-sub">{title}</h3>
        {description ? <p className="mt-1 text-sm text-dim">{description}</p> : null}
      </div>
      {action}
    </div>);

}