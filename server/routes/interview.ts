import { Router, Request, Response } from 'express';
import { startInterview, handleCandidateMessage } from '../agent/interviewAgent';
import { getSession } from '../session/sessionStore';
import { InterviewResponse } from '../types/api';

const router = Router();

/**
 * POST /api/interview
 * Exposes the main interview conversational loop endpoint.
 */
router.post('/interview', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { sessionId, candidate, message } = req.body;

    // Strict boundary validation
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid required field: sessionId (must be string).' });
    }

    // Case 1: Start Interview (has candidate data)
    if (candidate !== undefined) {
      if (!candidate.member || typeof candidate.member.id !== 'string' || typeof candidate.member.name !== 'string') {
        return res.status(400).json({ error: 'Invalid candidate profile: candidate.member.id and candidate.member.name are required.' });
      }

      console.log(`[Router] Initializing new session ${sessionId} for candidate:`, candidate.member.name);
      const reply = await startInterview(sessionId, candidate);
      const sessionState = getSession(sessionId)!;
      
      const responsePayload: InterviewResponse = {
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
      };
      return res.json(responsePayload);
    }

    // Case 2: Conversation turn (has message)
    if (message !== undefined) {
      if (typeof message !== 'string') {
        return res.status(400).json({ error: 'Invalid message body: message must be a string.' });
      }

      console.log(`[Router] Received message from session ${sessionId}: "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}"`);
      const result = await handleCandidateMessage(sessionId, message);
      const sessionState = getSession(sessionId)!;

      const responsePayload: InterviewResponse = {
        ...result,
        turns: sessionState.turns,
        currentTopic: sessionState.currentTopic,
        currentQuestionDay: sessionState.currentQuestionDay,
        currentQuestionDifficulty: sessionState.currentQuestionDifficulty,
        questionsAsked: sessionState.questionsAsked,
        questionsAnswered: sessionState.questionsAnswered,
        clarifyUsed: sessionState.clarifyUsed,
        evaluations: sessionState.evaluations
      };
      return res.json(responsePayload);
    }

    // Invalid request structure
    return res.status(400).json({
      error: 'Invalid request body. Provide either "candidate" (to start) or "message" (to converse).'
    });

  } catch (error: any) {
    console.error(`[Error] Router request failed in session:`, error);
    return res.status(500).json({
      error: 'Interview service temporarily unavailable.'
    });
  }
});

/**
 * GET /api/interview/session/:sessionId
 * RESTORATION ENDPOINT: Used by the client to restore state on refresh.
 */
router.get('/interview/session/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Invalid sessionId parameter.' });
    }

    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: `Session ${sessionId} not found` });
    }

    return res.json(session);
  } catch (error: any) {
    console.error('[Error] Session fetch failed:', error);
    return res.status(500).json({ error: 'Interview service temporarily unavailable.' });
  }
});

export default router;
