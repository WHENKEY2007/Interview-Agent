import React from 'react';
import { Panel } from '../ui/Panel';
import { ProgressBar } from '../ui/ProgressBar';
import { useSession } from '../../contexts/SessionContext';
import { metricScores as fallbackMetricScores } from '../../data/feedback';
import { scoreTone } from '../../utils/interviewEngine';

export function MetricBreakdown() {
  const { finalReport, evaluations } = useSession();
  
  let metricScores = fallbackMetricScores;
  let isNotAssessable = false;

  if (finalReport && (finalReport.overallScore === null || finalReport.overallScore === undefined)) {
    isNotAssessable = true;
  } else if (!finalReport && (!evaluations || evaluations.length === 0)) {
    isNotAssessable = true;
  }

  if (isNotAssessable) {
    metricScores = [
      { label: 'Technical Understanding', score: 0, note: 'Accurate concepts, correct terminology' },
      { label: 'Problem Solving', score: 0, note: 'Structured diagnosis, logical resolution' },
      { label: 'Communication', score: 0, note: 'Clear narrative structure, easy to follow' },
      { label: 'Depth of Explanation', score: 0, note: 'Explains trade-offs and implementation detail' },
      { label: 'Practical Application', score: 0, note: 'Connects concepts back to concrete tools' }
    ];
  } else if (finalReport && typeof finalReport.technicalScore === 'number') {
    const tech = finalReport.technicalScore;
    const depth = finalReport.depthScore ?? Math.max(0, Math.round(tech * 0.90));
    const comm = finalReport.communicationScore ?? Math.min(100, Math.round(tech * 1.04));
    const overall = finalReport.overallScore ?? tech;
    const practical = Math.min(100, Math.round((tech + depth) / 2));

    metricScores = [
      { label: 'Technical Understanding', score: tech, note: 'Accurate concepts, correct terminology' },
      { label: 'Problem Solving', score: overall, note: 'Structured diagnosis, logical resolution' },
      { label: 'Communication', score: comm, note: 'Clear narrative structure, easy to follow' },
      { label: 'Depth of Explanation', score: depth, note: 'Explains trade-offs and implementation detail' },
      { label: 'Practical Application', score: practical, note: 'Connects concepts back to concrete tools' }
    ];
  } else if (evaluations && evaluations.length > 0) {
    // Average score of the individual evaluations
    const baseScore = Math.round(evaluations.reduce((sum, e) => {
      const sc = e.status === 'Strong' ? 91 : e.status === 'Good' ? 78 : 62;
      return sum + sc;
    }, 0) / evaluations.length);

    metricScores = [
      { label: 'Technical Understanding', score: baseScore, note: 'Accurate concepts, correct terminology' },
      { label: 'Problem Solving', score: Math.min(100, Math.round(baseScore * 0.98)), note: 'Structured diagnosis, logical resolution' },
      { label: 'Communication', score: Math.min(100, Math.round(baseScore * 1.05)), note: 'Clear narrative structure, easy to follow' },
      { label: 'Depth of Explanation', score: Math.max(0, Math.round(baseScore * 0.90)), note: 'Explains trade-offs and implementation detail' },
      { label: 'Practical Application', score: Math.min(100, Math.round(baseScore * 0.95)), note: 'Connects concepts back to concrete tools' }
    ];
  }

  return (
    <Panel className="p-5">
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-sub">Performance breakdown</h3>

      <ul className="mt-5 space-y-4">
        {metricScores.map((m, i) =>
        <li key={m.label}>
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-[13.5px] font-medium text-fg">{m.label}</p>
              <p className="font-mono text-[13px] text-sub">{isNotAssessable ? 'N/A' : m.score}</p>
            </div>
            <ProgressBar value={isNotAssessable ? 0 : m.score} tone={isNotAssessable ? 'neutral' as any : scoreTone(m.score)} delay={0.1 + i * 0.08} className="mt-2" label={m.label} />
            <p className="mt-1.5 text-2xs text-dim">{m.note}</p>
          </li>
        )}
      </ul>
    </Panel>);
}