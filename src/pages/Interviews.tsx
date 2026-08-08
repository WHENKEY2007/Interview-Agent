import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, PlusIcon } from 'lucide-react';
import { TopNav } from '../components/TopNav';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Panel } from '../components/ui/Panel';
import { scoreTone } from '../utils/interviewEngine';
import { cn } from '../utils/cn';

const sessions = [
{
  id: 's3',
  date: 'Aug 7, 2026',
  label: 'Adaptive technical interview',
  topics: ['RAG', 'Vector Databases', 'Prompt Engineering', 'Agentic AI', 'MCP'],
  questions: 10,
  minutes: 24,
  score: 82,
  latest: true
},
{
  id: 's2',
  date: 'Aug 2, 2026',
  label: 'Adaptive technical interview',
  topics: ['RAG', 'Vector Databases', 'Prompt Engineering'],
  questions: 8,
  minutes: 19,
  score: 76,
  latest: false
},
{
  id: 's1',
  date: 'Jul 26, 2026',
  label: 'RAG deep dive',
  topics: ['RAG'],
  questions: 6,
  minutes: 14,
  score: 71,
  latest: false
}];


const toneText: Record<string, string> = {
  ok: 'text-[#7EE2A8]',
  warn: 'text-[#F2C55C]',
  bad: 'text-[#F49A9A]'
};

export function Interviews() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full w-full bg-base">
      <TopNav />

      <main className="mx-auto w-full max-w-[1000px] px-5 pb-24 pt-10 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-fg">Interviews</h1>
            <p className="mt-1.5 text-[14px] text-dim">Every practice session, scored and reviewable.</p>
          </div>
          <Button onClick={() => navigate('/brief')} icon={<PlusIcon size={15} />}>
            New Interview
          </Button>
        </div>

        <ul className="mt-7 space-y-3">
          {sessions.map((s) =>
          <li key={s.id}>
              <Panel className="flex flex-wrap items-center justify-between gap-5 p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-medium text-fg">{s.label}</p>
                    {s.latest ? <Badge tone="accent">Latest</Badge> : null}
                  </div>
                  <p className="mt-1 font-mono text-2xs text-dim">
                    {s.date} · {s.questions} questions · {s.minutes} min
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {s.topics.map((t) =>
                  <li key={t}>
                        <Badge tone="outline" mono>
                          {t}
                        </Badge>
                      </li>
                  )}
                  </ul>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className={cn('font-mono text-[24px] font-medium leading-none', toneText[scoreTone(s.score)])}>
                      {s.score}
                    </p>
                    <p className="mt-1 text-2xs uppercase tracking-[0.1em] text-dim">Score</p>
                  </div>
                  <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/report')}
                  iconRight={<ArrowRightIcon size={13} />}>
                  
                    View report
                  </Button>
                </div>
              </Panel>
            </li>
          )}
        </ul>
      </main>
    </div>);

}