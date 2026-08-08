import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRightIcon, CheckIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import { useSession } from '../contexts/SessionContext';

const PARTICLES = Array.from({ length: 14 }).map((_, i) => ({
  id: i,
  x: (i - 6.5) * 26,
  delay: 0.25 + i * 0.02,
  color: i % 3 === 0 ? '#6366F1' : i % 3 === 1 ? '#38BDF8' : '#2C3140'
}));

export function InterviewComplete() {
  const navigate = useNavigate();
  const { durationSeconds, evaluations, finalReport, answered } = useSession();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  const questionCount = evaluations && evaluations.length > 0 ? evaluations.length : (answered || 8);
  const topicCount = finalReport && Array.isArray(finalReport.topicPerformance) && finalReport.topicPerformance.length > 0
    ? finalReport.topicPerformance.length
    : (evaluations && evaluations.length > 0 ? new Set(evaluations.map((e: any) => e.topic)).size : 4);

  const summary = [
    { value: `${questionCount}`, label: 'Questions' },
    { value: `${topicCount}`, label: 'Topics' },
    { value: `${minutes}`, label: 'Minutes' }
  ];

  const isReady = !!finalReport;


  return (
    <div className="grid min-h-full w-full place-items-center bg-base px-5 py-16">
      <div className="w-full max-w-lg text-center">
        <Logo className="justify-center" />

        <div className="relative mt-12 grid place-items-center">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
            {PARTICLES.map((p) =>
            <motion.span
              key={p.id}
              className="absolute h-1.5 w-1.5 rounded-[2px]"
              style={{ backgroundColor: p.color }}
              initial={{ opacity: 0, y: 0, x: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], y: [-4, -70], x: [0, p.x], scale: [0, 1, 0.6] }}
              transition={{ duration: 1.5, delay: p.delay, ease: [0.16, 1, 0.3, 1] }} />

            )}
          </div>

          <motion.span
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="grid h-16 w-16 place-items-center rounded-2xl border border-[#2E3168] bg-[#151834]">
            
            <CheckIcon size={26} className="text-accent" />
          </motion.span>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-7 text-[32px] font-semibold tracking-[-0.03em] text-fg">
          
          Interview complete
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22 }}
          className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-sub">
          
          Your responses have been evaluated across technical understanding, reasoning, communication, and practical
          application.
        </motion.p>

        <motion.ul
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-9 grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-panel py-5">
          
          {summary.map((s) =>
          <li key={s.label}>
              <p className="text-[22px] font-semibold tracking-[-0.02em] text-fg">{s.value}</p>
              <p className="mt-0.5 text-2xs uppercase tracking-[0.1em] text-dim">{s.label}</p>
            </li>
          )}
        </motion.ul>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.38 }}
          className="mt-8 flex flex-col items-center gap-3">
          
          <Button
            size="lg"
            disabled={!isReady}
            onClick={() => navigate('/report')}
            iconRight={<ArrowRightIcon size={16} />}
            className="w-full sm:w-auto">
            
            {isReady ? 'View Interview Feedback' : 'Compiling your report…'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </motion.div>
      </div>
    </div>);

}