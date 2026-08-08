import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRightIcon, HistoryIcon } from 'lucide-react';
import { TopNav } from '../components/TopNav';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ReadinessCard } from '../components/dashboard/ReadinessCard';
import { CohortProgressCard } from '../components/dashboard/CohortProgressCard';
import { TopicCard } from '../components/dashboard/TopicCard';
import { InterviewFocusCard } from '../components/dashboard/InterviewFocusCard';
import { RecentPerformanceCard } from '../components/dashboard/RecentPerformanceCard';
import { useSession } from '../contexts/SessionContext';
import candidatesData from '../../data/candidates.json';
import { candidate as fallbackCandidate, cohortTopics } from '../data/cohort';

export function Dashboard() {
  const navigate = useNavigate();
  const { activeCandidate, setActiveCandidate, setSessionId } = useSession();

  useEffect(() => {
    if (!activeCandidate) {
      setActiveCandidate(candidatesData.candidates[0]);
    }
  }, [activeCandidate, setActiveCandidate]);

  const candidate: any = activeCandidate || fallbackCandidate;
  const firstName = candidate.member ? candidate.member.name.split(' ')[0] : candidate.name.split(' ')[0];

  const handleStartInterview = () => {
    setSessionId(null); // Clear previous session for new start
    navigate('/brief');
  };

  return (
    <div className="min-h-full w-full bg-base">
      <TopNav />

      <main className="mx-auto w-full max-w-[1240px] px-5 pb-24 pt-10 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-stretch">
          
          <div className="relative overflow-hidden rounded-2xl border border-line bg-panel p-7 lg:p-9">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
            
            <div className="relative">
              <Badge tone="accent">Personalised for {firstName}</Badge>
              <h1 className="mt-4 max-w-xl text-[34px] font-semibold leading-[1.12] tracking-[-0.03em] text-fg lg:text-[40px]">
                Ready for your technical interview?
              </h1>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-sub">
                Your interview is personalised based on your ABTalks AI Cohort learning journey.
              </p>

              <div className="mt-4 flex flex-col gap-1.5">
                <label className="font-mono text-2xs uppercase tracking-[0.1em] text-dim">Select Candidate Profile</label>
                <select 
                  className="rounded-lg border border-line bg-raised px-3 py-2 text-[14px] text-fg focus:border-accent focus:outline-none max-w-xs cursor-pointer transition-colors hover:border-line-strong"
                  value={candidate.member?.id || 'CAND-001'}
                  onChange={(e) => {
                    const selected = candidatesData.candidates.find(c => c.member.id === e.target.value);
                    if (selected) {
                      setActiveCandidate(selected);
                      setSessionId(null);
                    }
                  }}
                >
                  {candidatesData.candidates.map((c: any) => (
                    <option key={c.member.id} value={c.member.id}>
                      {c.member.name} ({c.member.jobRole})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button size="lg" onClick={handleStartInterview} iconRight={<ArrowRightIcon size={16} />}>
                  Start Interview
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => navigate('/interviews')}
                  icon={<HistoryIcon size={16} />}>
                  
                  View Previous Results
                </Button>
              </div>

              <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-5 font-mono text-2xs text-dim">
                <div className="flex items-center gap-2">
                  <dt>Format</dt>
                  <dd className="text-sub">10 questions · adaptive</dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt>Estimated</dt>
                  <dd className="text-sub">~20 minutes</dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt>Last session</dt>
                  <dd className="text-sub">Aug 2 · scored 76</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <ReadinessCard />
            <CohortProgressCard />
          </div>
        </motion.section>

        <section className="mt-12" aria-labelledby="curriculum-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="curriculum-heading" className="text-lg font-semibold tracking-[-0.02em] text-fg">
                Curriculum coverage
              </h2>
              <p className="mt-1 text-[13.5px] text-dim">
                Seven modules across the 31-day enterprise AI engineering program.
              </p>
            </div>
          </div>

          <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cohortTopics.map((topic, i) =>
            <TopicCard key={topic.id} topic={topic} index={i} />
            )}
          </ul>
        </section>

        <section className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
          <InterviewFocusCard />
          <RecentPerformanceCard />
        </section>
      </main>
    </div>);

}