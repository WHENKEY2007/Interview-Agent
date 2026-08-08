import React from 'react';
import { motion } from 'framer-motion';
import { Panel } from '../ui/Panel';
import { useSession } from '../../contexts/SessionContext';
import { topicScores as fallbackTopicScores } from '../../data/feedback';
import { scoreTone } from '../../utils/interviewEngine';
import { cn } from '../../utils/cn';

const barColor: Record<string, string> = {
  ok: 'bg-[#4ADE80]',
  warn: 'bg-[#FBBF24]',
  bad: 'bg-[#F87171]'
};

const textColor: Record<string, string> = {
  ok: 'text-[#7EE2A8]',
  warn: 'text-[#F2C55C]',
  bad: 'text-[#F49A9A]'
};

export function TopicPerformance() {
  const { evaluations } = useSession();

  // Compute topic scores dynamically if evaluations exist
  let topicScores = fallbackTopicScores;

  if (evaluations && evaluations.length > 0) {
    const topicMap: Record<string, { totalScore: number; count: number; day: string }> = {};
    evaluations.forEach((e: any) => {
      const sc = e.status === 'Strong' ? 91 : e.status === 'Good' ? 78 : 62;
      if (!topicMap[e.topic]) {
        topicMap[e.topic] = { totalScore: 0, count: 0, day: e.day };
      }
      topicMap[e.topic].totalScore += sc;
      topicMap[e.topic].count += 1;
    });

    topicScores = Object.entries(topicMap).map(([topic, data]) => ({
      topic,
      score: Math.round(data.totalScore / data.count),
      day: data.day
    }));
  }

  return (
    <Panel className="p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-sub">Topic performance</h3>
        <span className="font-mono text-2xs text-dim">{topicScores.length} topics</span>
      </div>

      <ul className="mt-5 flex h-[220px] items-end gap-3 border-b border-line pb-0">
        {topicScores.map((t, i) => {
          const tone = scoreTone(t.score);
          return (
            <li key={t.topic} className="flex h-full flex-1 flex-col justify-end">
              <p className={cn('mb-2 text-center font-mono text-[13px]', textColor[tone])}>{t.score}%</p>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${t.score}%` }}
                transition={{ duration: 1, delay: 0.15 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className={cn('w-full rounded-t-md', barColor[tone])}
                style={{ opacity: 0.85 }} />
              
            </li>);

        })}
      </ul>

      <ul className="mt-3 flex gap-3">
        {topicScores.map((t) =>
        <li key={t.topic} className="flex-1 text-center">
            <p className="text-[12px] font-medium leading-tight text-sub">{t.topic}</p>
            <p className="mt-0.5 font-mono text-2xs text-dim">{t.day}</p>
          </li>
        )}
      </ul>
    </Panel>);
}