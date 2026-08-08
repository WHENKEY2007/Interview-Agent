import { AnswerQuality, InterviewQuestion } from '../types';

const UNSURE = /(i (really )?(don'?t|do not) know|no idea|not sure|never (used|learned|covered)|can'?t answer|skip this|pass)/i;

/**
 * Classifies a candidate's typed answer against the current question so the
 * interviewer can adapt. Deliberately heuristic: keyword coverage, length and
 * hedging language stand in for a model-side evaluation.
 */
export function classifyAnswer(answer: string, question: InterviewQuestion): AnswerQuality {
  const text = answer.trim();
  const normalized = text.toLowerCase();

  if (text.length < 140 && UNSURE.test(normalized)) return 'unknown';

  const hits = question.keywords.filter((k) => normalized.includes(k)).length;
  const words = text.split(/\s+/).filter(Boolean).length;

  if (hits === 0) return words < 25 ? 'irrelevant' : 'partial';
  if (hits >= 3 && words >= 55) return 'strong';
  if (hits >= 2 && words >= 90) return 'strong';
  return 'partial';
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function scoreTone(score: number): 'ok' | 'warn' | 'bad' {
  if (score >= 82) return 'ok';
  if (score >= 70) return 'warn';
  return 'bad';
}