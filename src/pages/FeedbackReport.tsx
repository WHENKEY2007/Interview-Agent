import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, RotateCcwIcon, TargetIcon } from 'lucide-react';
import { TopNav } from '../components/TopNav';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { OverallScore } from '../components/feedback/OverallScore';
import { MetricBreakdown } from '../components/feedback/MetricBreakdown';
import { TopicPerformance } from '../components/feedback/TopicPerformance';
import { FeedbackList } from '../components/feedback/FeedbackList';
import { QuestionReviewCard } from '../components/feedback/QuestionReviewCard';
import { NextStepCard } from '../components/feedback/NextStepCard';
import { growthAreas as fallbackGrowth, nextSteps as fallbackNext, questionReviews as fallbackReviews, strengths as fallbackStrengths } from '../data/feedback';
import { candidate as fallbackCandidate } from '../data/cohort';
import { useSession } from '../contexts/SessionContext';

export function FeedbackReport() {
  const navigate = useNavigate();
  const { durationSeconds, finalReport, activeCandidate, evaluations } = useSession();
  const minutes = Math.max(1, Math.round(durationSeconds / 60));

  const candidate = activeCandidate || fallbackCandidate;
  const name = candidate.member?.name || candidate.name;
  const strengthsList = finalReport && finalReport.strengths ? finalReport.strengths : fallbackStrengths;
  const growthList = finalReport && finalReport.gaps ? finalReport.gaps : fallbackGrowth;
  const nextStepsList = finalReport && finalReport.next ? finalReport.next : fallbackNext;
  const reviewsList = evaluations && evaluations.length > 0 ? evaluations : fallbackReviews;

  return (
    <div className="min-h-full w-full bg-base">
      <TopNav />

      <main className="mx-auto w-full max-w-[1240px] px-5 pb-24 pt-10 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-end justify-between gap-4">
          
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="accent">Adaptive interview</Badge>
              <Badge tone="outline" mono>
                {minutes} min · {reviewsList.length * 2} questions
              </Badge>
            </div>
            <h1 className="mt-3 text-[32px] font-semibold tracking-[-0.03em] text-fg">Interview Performance</h1>
            <p className="mt-1.5 text-[14px] text-dim">
              {name} · {candidate.cohort || 'ABTalks AI Cohort · Spring'} · generated moments ago
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} icon={<ArrowLeftIcon size={14} />}>
            Back to Dashboard
          </Button>
        </motion.div>

        <div className="mt-6">
          <OverallScore />
        </div>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2" aria-label="Score breakdown">
          <MetricBreakdown />
          <TopicPerformance />
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2" aria-label="Qualitative feedback">
          <FeedbackList title="Strengths" items={strengthsList} tone="positive" />
          <FeedbackList title="Growth Areas" items={growthList} tone="growth" />
        </section>

        <section className="mt-12" aria-labelledby="review-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="review-heading" className="text-lg font-semibold tracking-[-0.02em] text-fg">
                Question Review
              </h2>
              <p className="mt-1 text-[13.5px] text-dim">
                Every answer, what worked, and a stronger structure you could have used.
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-3">
            {reviewsList.map((item, i) =>
            <QuestionReviewCard key={item.id} item={item} index={i} />
            )}
          </ul>
        </section>

        <section className="mt-12" aria-labelledby="next-heading">
          <h2 id="next-heading" className="text-lg font-semibold tracking-[-0.02em] text-fg">
            Recommended Next Steps
          </h2>
          <p className="mt-1 text-[13.5px] text-dim">
            Mapped directly back to the 31-day cohort curriculum.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nextStepsList.map((step: any) =>
            <NextStepCard key={step.day} step={step} />
            )}
          </div>
        </section>

        <section className="mt-12 flex flex-col items-center gap-3 rounded-2xl border border-line bg-panel px-6 py-8 sm:flex-row sm:justify-between">
          <div>
            <p className="text-[16px] font-medium text-fg">Run it back while the feedback is fresh</p>
            <p className="mt-1 text-[13.5px] text-dim">
              Your next interview will weight Agentic AI and MCP more heavily.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="md" icon={<TargetIcon size={15} />}>
              Review Weak Topics
            </Button>
            <Button variant="secondary" size="md" onClick={() => navigate('/')}>
              Back to Dashboard
            </Button>
            <Button size="md" onClick={() => navigate('/brief')} icon={<RotateCcwIcon size={15} />}>
              Practice Again
            </Button>
          </div>
        </section>
      </main>
    </div>);

}