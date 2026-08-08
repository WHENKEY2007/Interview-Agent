import React from 'react';
import { TopNav } from '../components/TopNav';
import { Panel } from '../components/ui/Panel';
import { ProgressBar } from '../components/ui/ProgressBar';
import { CohortProgressCard } from '../components/dashboard/CohortProgressCard';
import { cn } from '../utils/cn';
import { useSession } from '../contexts/SessionContext';
import candidatesData from '../../data/candidates.json';
import { getCurriculumCoverage } from '../utils/curriculumCoverage';

const signalLabel: Record<string, { text: string; className: string }> = {
  strong: { text: 'Strong signal', className: 'text-[#7EE2A8]' },
  moderate: { text: 'Moderate signal', className: 'text-[#A5A7FB]' },
  'needs-practice': { text: 'Needs practice', className: 'text-[#F2C55C]' }
};

export function LearningProgress() {
  const { activeCandidate } = useSession();
  const candidate = activeCandidate || candidatesData.candidates[0];
  const curriculumTopics = getCurriculumCoverage(candidate);
  const candName = candidate.member?.name || candidate.name || 'Candidate';

  return (
    <div className="min-h-full w-full bg-base">
      <TopNav />

      <main className="mx-auto w-full max-w-[1000px] px-5 pb-24 pt-10 lg:px-8">
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-fg">Learning Progress</h1>
        <p className="mt-1.5 text-[14px] text-dim">
          How Interview Agent reads <strong>{candName}’s</strong> journey through the 31-day cohort.
        </p>

        <div className="mt-7">
          <CohortProgressCard />
        </div>

        <Panel className="mt-6 p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-sub">Module signals</h2>
          <ul className="mt-4 divide-y divide-line">
            {curriculumTopics.map((t, i) => (
              <li key={t.id} className="flex flex-wrap items-center gap-4 py-4">
                <div className="min-w-[200px] flex-1">
                  <p className="text-[14.5px] font-medium text-fg">{t.name}</p>
                  <p className="mt-0.5 font-mono text-2xs text-dim">{t.days}</p>
                </div>
                <div className="min-w-[180px] flex-1">
                  <ProgressBar
                    value={t.progress}
                    tone={t.progress === 100 ? 'ok' : t.progress > 0 ? 'accent' : 'neutral'}
                    size="sm"
                    delay={i * 0.06}
                    label={`${t.name} completion`}
                  />
                </div>
                <p className={cn('w-[130px] text-right text-[13px]', signalLabel[t.signal].className)}>
                  {signalLabel[t.signal].text}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </main>
    </div>
  );
}