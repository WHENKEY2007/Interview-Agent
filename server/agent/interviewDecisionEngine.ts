import { SessionState } from '../session/sessionStore';
import { EvaluationResult } from './answerEvaluator';

export type FollowUpStrategy = 'probe' | 'clarify' | 'challenge' | 'deepen' | 'redirect' | 'move_on';

export interface DecisionResult {
  shouldFollowUp: boolean;
  strategy: FollowUpStrategy;
  difficultyShift: 'up' | 'down' | 'same';
}

/**
 * Deterministically decides the interviewer's next strategy based on the answer evaluation,
 * current question depth, and coverage requirements.
 */
export function determineNextAction(session: SessionState, evaluation: EvaluationResult): DecisionResult {
  const depth = session.currentTopicDepth;
  const quality = evaluation.quality;

  console.log(`[DecisionEngine] Evaluating Action - Session: ${session.sessionId}, Topic: ${session.currentTopic}, Depth: ${depth}, Quality: ${quality}, Score: ${evaluation.score}`);

  // Safeguard: Hard limit of max 2 follow-ups per topic/day.
  if (depth >= 2) {
    console.log('[DecisionEngine] Safeguard: Max topic depth reached. Transitioning to next planned topic.');
    return {
      shouldFollowUp: false,
      strategy: 'move_on',
      difficultyShift: 'same'
    };
  }

  // Case E: Candidate states they don't know or skip ("unknown")
  if (quality === 'unknown') {
    if (depth === 0) {
      console.log('[DecisionEngine] Candidate unsure. Asking a simpler diagnostic probing question.');
      return {
        shouldFollowUp: true,
        strategy: 'probe',
        difficultyShift: 'down'
      };
    } else {
      console.log('[DecisionEngine] Candidate still unsure. Moving to next planned topic.');
      return {
        shouldFollowUp: false,
        strategy: 'move_on',
        difficultyShift: 'same'
      };
    }
  }

  // Case D: Irrelevant / Off-topic answer
  if (quality === 'irrelevant') {
    console.log('[DecisionEngine] Off-topic response. Generating a polite redirection prompt.');
    return {
      shouldFollowUp: true,
      strategy: 'redirect',
      difficultyShift: 'same'
    };
  }

  // Case C: Incorrect answer
  if (quality === 'incorrect') {
    console.log('[DecisionEngine] Incorrect response. Challenging misconception.');
    return {
      shouldFollowUp: true,
      strategy: 'challenge',
      difficultyShift: 'down'
    };
  }

  // Case B: Partially correct answer
  if (quality === 'partial') {
    // If they have completed some but not all objectives, probe the gaps.
    console.log('[DecisionEngine] Partially correct. Probing missing concepts.');
    return {
      shouldFollowUp: true,
      strategy: 'probe',
      difficultyShift: 'same'
    };
  }

  // Case A: Strong answer
  if (quality === 'strong') {
    // If they nailed the first question, challenge them once at a higher difficulty.
    if (depth === 0) {
      console.log('[DecisionEngine] Strong response. Deepening/challenging the candidate.');
      return {
        shouldFollowUp: true,
        strategy: 'challenge',
        difficultyShift: 'up'
      };
    } else {
      console.log('[DecisionEngine] Strong response with sufficient depth. Moving to next topic.');
      return {
        shouldFollowUp: false,
        strategy: 'move_on',
        difficultyShift: 'same'
      };
    }
  }

  // Fallback
  return {
    shouldFollowUp: false,
    strategy: 'move_on',
    difficultyShift: 'same'
  };
}
