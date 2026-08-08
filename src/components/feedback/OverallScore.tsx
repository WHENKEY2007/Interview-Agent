import React from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useSession } from '../../contexts/SessionContext';
import { overallInsight as fallbackInsight, overallLabel as fallbackLabel, overallScore as fallbackScore } from '../../data/feedback';

const SIZE = 200;
const STROKE = 10;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

function AnimatedNumber({ value }: {value: number;}) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    const controls = animate(mv, value, { duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 });
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [mv, rounded, value]);

  return <>{display}</>;
}

export function OverallScore() {
  const { finalReport, evaluations } = useSession();

  let overallScore = fallbackScore;
  let overallLabel = fallbackLabel;
  let overallInsight = fallbackInsight;

  if (evaluations && evaluations.length > 0) {
    const scoreSum = evaluations.reduce((sum, e) => {
      const sc = e.status === 'Strong' ? 91 : e.status === 'Good' ? 78 : 62;
      return sum + sc;
    }, 0);
    overallScore = Math.round(scoreSum / evaluations.length);

    if (overallScore >= 90) {
      overallLabel = 'Outstanding Performance';
    } else if (overallScore >= 80) {
      overallLabel = 'Strong Performance';
    } else if (overallScore >= 70) {
      overallLabel = 'Good Performance';
    } else {
      overallLabel = 'Needs Review';
    }
  }

  if (finalReport && finalReport.summary) {
    overallInsight = finalReport.summary;
  }

  return (
    <section className="grid grid-cols-1 gap-8 rounded-2xl border border-line bg-panel p-7 lg:grid-cols-[auto_1fr] lg:items-center lg:p-9">
      <div className="relative mx-auto" style={{ width: SIZE * 0.86, height: SIZE * 0.86 }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full -rotate-90" aria-hidden>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#191D28" strokeWidth={STROKE} />
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="#6366F1"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: C - C * overallScore / 100 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }} />
          
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <p className="text-[44px] font-semibold leading-none tracking-[-0.04em] text-fg">
            <AnimatedNumber value={overallScore} />
            <span className="text-[18px] text-dim"> / 100</span>
          </p>
          <p className="mt-2 text-2xs font-medium uppercase tracking-[0.14em] text-[#A5A7FB]">{overallLabel}</p>
        </div>
      </div>

      <div>
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-sub">Interviewer summary</h2>
        <p className="mt-3 max-w-2xl text-[17px] leading-[1.65] text-fg/90">{overallInsight}</p>
        <p className="mt-5 font-mono text-2xs text-dim">
          Adaptive interview · {evaluations && evaluations.length > 0 ? evaluations.length * 2 : 10} questions · {evaluations && evaluations.length > 0 ? evaluations.length : 5} topics · evaluated on 5 dimensions
        </p>
      </div>
    </section>);
}