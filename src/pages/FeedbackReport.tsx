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
import { candidate as fallbackCandidate } from '../data/cohort';
import { useSession } from '../contexts/SessionContext';
import { getModuleIdForDay } from '../utils/curriculumCoverage';
import { cn } from '../utils/cn';

const signalStyle = {
  Strong: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/5 dark:border-emerald-500/10',
  Moderate: 'bg-amber-500/10 text-amber-500 border-amber-500/20 dark:bg-amber-500/5 dark:border-amber-500/10',
  'Needs Practice': 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/5 dark:border-rose-500/10'
};

export function FeedbackReport() {
  const navigate = useNavigate();
  const { durationSeconds, finalReport, activeCandidate, evaluations, setSessionId } = useSession();
  const minutes = Math.max(1, Math.round(durationSeconds / 60));

  const candidate: any = activeCandidate || fallbackCandidate;
  const name = candidate.member?.name || candidate.name;

  // Calculate weak topic
  let weakModuleId: string | null = null;

  if (finalReport && Array.isArray(finalReport.topicPerformance)) {
    const weakItems = finalReport.topicPerformance.filter((tp: any) => 
      tp.level === 'needs-improvement' || (typeof tp.score === 'number' && tp.score < 70)
    );
    if (weakItems.length > 0) {
      const sorted = [...weakItems].sort((a: any, b: any) => (a.score || 0) - (b.score || 0));
      const match = sorted[0];
      const dayNum = parseInt(match.day.replace(/\D/g, ''), 10);
      if (!isNaN(dayNum)) {
        weakModuleId = getModuleIdForDay(dayNum);
      }
    }
  }

  if (!weakModuleId && Array.isArray(evaluations)) {
    const weakEvals = evaluations.filter((e: any) => e.status === 'Needs Improvement');
    if (weakEvals.length > 0) {
      const match = weakEvals[0];
      const dayNum = parseInt(match.day.replace(/\D/g, ''), 10);
      if (!isNaN(dayNum)) {
        weakModuleId = getModuleIdForDay(dayNum);
      }
    }
  }
  
  const isNotAssessable = !finalReport || finalReport.overallScore === null || finalReport.overallScore === undefined || evaluations.length === 0;

  const strengthsList = isNotAssessable ? [] : (finalReport?.strengths || []);
  const growthList = isNotAssessable ? [] : (finalReport?.gaps || []);
  const nextStepsList = isNotAssessable ? [] : (finalReport?.next || []);
  const reviewsList = evaluations || [];

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
                {minutes} min · {reviewsList.length} questions
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

        {finalReport?.plannedFocusTopics && finalReport.plannedFocusTopics.length > 0 && (
          <section className="mt-12" aria-labelledby="focus-heading">
            <h2 id="focus-heading" className="text-lg font-semibold tracking-[-0.02em] text-fg">
              Planned Focus Topics
            </h2>
            <p className="mt-1 text-[13.5px] text-dim">
              Calculated dynamically based on your curriculum completion and interview performance.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {finalReport.plannedFocusTopics.map((chip: any) => {
                const style = signalStyle[chip.signal as keyof typeof signalStyle] || signalStyle.Moderate;
                return (
                  <li
                    key={chip.topic}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium',
                      style
                    )}>
                    <span className="text-fg">{chip.topic}</span>
                    <span aria-hidden className="h-3 w-px bg-current opacity-30" />
                    <span>{chip.signal}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

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

          {reviewsList.length === 0 ? (
            <div className="rounded-xl border border-line bg-panel p-8 text-center mt-5">
              <p className="text-[14.5px] font-medium text-fg">No answered questions to review</p>
              <p className="mt-1 text-[13px] text-dim">Complete an interview to receive question-level feedback.</p>
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {reviewsList.map((item, i) => (
                <QuestionReviewCard key={item.id} item={item} index={i} />
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12" aria-labelledby="next-heading">
          <h2 id="next-heading" className="text-lg font-semibold tracking-[-0.02em] text-fg">
            Recommended Next Steps
          </h2>
          <p className="mt-1 text-[13.5px] text-dim">
            Mapped directly back to the 31-day cohort curriculum.
          </p>

          {nextStepsList.length === 0 ? (
            <div className="mt-5 rounded-xl border border-line bg-panel p-8 text-center">
              <p className="text-[13.5px] text-dim">No recommended next steps available.</p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {nextStepsList.map((step: any) => (
                <NextStepCard key={step.day} step={step} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-12 flex flex-col items-center gap-3 rounded-2xl border border-line bg-panel px-6 py-8 sm:flex-row sm:justify-between">
          <div>
            <p className="text-[16px] font-medium text-fg">Run it back while the feedback is fresh</p>
            <p className="mt-1 text-[13.5px] text-dim">
              Your next interview will weight Agentic AI and MCP more heavily.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {weakModuleId ? (
              <Button 
                variant="ghost" 
                size="md" 
                onClick={() => navigate(`/progress?topic=${weakModuleId}`)}
                icon={<TargetIcon size={15} />}
              >
                Review Weak Topic
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="md" 
                disabled 
                title="Not enough interview data to identify weak topics."
                icon={<TargetIcon size={15} />}
              >
                No weak topics identified
              </Button>
            )}
            <Button variant="secondary" size="md" onClick={() => navigate('/')}>
              Back to Dashboard
            </Button>
            <Button size="md" onClick={() => { setSessionId(null); navigate('/brief'); }} icon={<RotateCcwIcon size={15} />}>
              Practice Again
            </Button>
          </div>
        </section>
      </main>
    </div>);

}