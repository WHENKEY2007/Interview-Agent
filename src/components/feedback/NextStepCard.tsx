import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import { NextStep } from '../../types';
import { Button } from '../ui/Button';
import { getModuleIdForDay } from '../../utils/curriculumCoverage';

export function NextStepCard({ step }: { step: NextStep | string | any }) {
  const navigate = useNavigate();
  const isString = typeof step === 'string';
  const day = isString ? (step.match(/Day \d+/i)?.[0] || 'Next Step') : (step.day || 'Next Step');
  const topic = isString ? step.replace(/Review Day \d+ \([^)]+\):\s*/i, '').replace(/Day \d+[:\s]*/i, '') : (step.topic || 'Cohort Topic');
  const reason = isString ? '' : (step.reason || '');
  const items: string[] = isString ? [] : (Array.isArray(step.items) ? step.items : []);

  const dayStr = isString ? day : String(step.day || '');
  const dayNumMatch = dayStr.match(/\d+/);
  const dayNum = dayNumMatch ? parseInt(dayNumMatch[0], 10) : 0;
  const moduleId = dayNum ? getModuleIdForDay(dayNum) : '';

  const handleReview = () => {
    if (moduleId) {
      navigate(`/progress?topic=${moduleId}`);
    } else {
      navigate('/progress');
    }
  };

  return (
    <article className="flex flex-col rounded-xl border border-line bg-panel p-5 transition-colors hover:border-line-strong">
      <p className="font-mono text-2xs uppercase tracking-[0.12em] text-[#A5A7FB]">{day}</p>
      <h4 className="mt-1.5 text-[16px] font-medium tracking-[-0.01em] text-fg">{topic}</h4>
      {reason && <p className="mt-2 text-[13px] leading-relaxed text-dim">{reason}</p>}

      {items.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2 text-[13px] text-sub">
              <span aria-hidden className="h-1 w-1 rounded-full bg-[#3A4054]" />
              {item}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-5">
        <Button 
          variant="secondary" 
          size="sm" 
          iconRight={<ArrowRightIcon size={13} />}
          onClick={handleReview}
        >
          Review Topic
        </Button>
      </div>
    </article>
  );
}