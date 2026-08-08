import { Router, Request, Response } from 'express';
import { startInterview, handleCandidateMessage } from '../agent/interviewAgent';
import { getSession } from '../session/sessionStore';

const router = Router();

/**
 * POST /api/interview
 * Exposes the main interview conversational loop endpoint.
 */
router.post('/interview', async (req: Request, res: Response) => {
  try {
    const { sessionId, candidate, message } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing required field: sessionId' });
    }

    // Case 1: Start Interview (has candidate data)
    if (candidate) {
      console.log(`[Router] Initializing new session ${sessionId} for candidate:`, candidate.member?.name || candidate.name);
      const reply = await startInterview(sessionId, candidate);
      const sessionState = getSession(sessionId)!;
      return res.json({
        reply,
        done: false,
        turns: sessionState.turns,
        currentTopic: sessionState.currentTopic,
        currentQuestionDay: sessionState.currentQuestionDay,
        currentQuestionDifficulty: sessionState.currentQuestionDifficulty,
        questionsAsked: sessionState.questionsAsked,
        questionsAnswered: sessionState.questionsAnswered,
        clarifyUsed: sessionState.clarifyUsed,
        evaluations: sessionState.evaluations
      });
    }

    // Case 2: Conversation turn (has message)
    if (message !== undefined) {
      console.log(`[Router] Received message from session ${sessionId}: "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}"`);
      const result = await handleCandidateMessage(sessionId, message);
      const sessionState = getSession(sessionId)!;
      return res.json({
        ...result,
        turns: sessionState.turns,
        currentTopic: sessionState.currentTopic,
        currentQuestionDay: sessionState.currentQuestionDay,
        currentQuestionDifficulty: sessionState.currentQuestionDifficulty,
        questionsAsked: sessionState.questionsAsked,
        questionsAnswered: sessionState.questionsAnswered,
        clarifyUsed: sessionState.clarifyUsed,
        evaluations: sessionState.evaluations
      });
    }

    // Invalid request structure
    return res.status(400).json({
      error: 'Invalid request body. Provide either "candidate" (to start) or "message" (to converse).'
    });

  } catch (error: any) {
    console.error(`[Router] Error handling request in session:`, error);
    return res.status(500).json({
      error: error.message || 'Internal Server Error'
    });
  }
});

/**
 * GET /api/interview/session/:sessionId
 * Helper endpoint to inspect session details (used for debugging/loading state)
 */
router.get('/interview/session/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: `Session ${sessionId} not found` });
  }

  return res.json(session);
});

export default router;
