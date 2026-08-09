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

    // Case 1: Start Interview (has candidate data or candidateId)
    if (candidate !== undefined || req.body.candidateId !== undefined) {
      let resolvedCandidate = candidate;
      const candidateId = req.body.candidateId || (candidate && (candidate.member?.id || candidate.id));

      if (candidateId) {
        const { getCandidateById } = await import('../data/dataLoader');
        const loadedCandidate = getCandidateById(candidateId);
        if (loadedCandidate) {
          resolvedCandidate = loadedCandidate;
        }
      }

      if (!resolvedCandidate || !resolvedCandidate.member || typeof resolvedCandidate.member.id !== 'string' || typeof resolvedCandidate.member.name !== 'string') {
        return res.status(400).json({ error: 'Invalid candidate profile or candidateId.' });
      }

      console.log(`[Router] Initializing new session ${sessionId} for candidate:`, resolvedCandidate.member.name);
      const reply = await startInterview(sessionId, resolvedCandidate);
      const sessionState = getSession(sessionId)!;
      
      const uniqueDays = new Set(sessionState.curriculumDaysCovered || []);
      const responsePayload: any = {
        reply,
        done: false,
        turns: sessionState.turns,
        currentTopic: sessionState.currentTopic,
        currentQuestionDay: sessionState.currentQuestionDay,
        currentQuestionDifficulty: sessionState.currentQuestionDifficulty,
        questionsAsked: sessionState.questionsAsked,
        questionsAnswered: sessionState.questionsAnswered,
        primaryQuestionsAsked: sessionState.primaryQuestionsAsked,
        followUpsAsked: sessionState.followUpsAsked,
        clarifyUsed: sessionState.clarifyUsed,
        evaluations: sessionState.evaluations,
        plannedFocusTopics: sessionState.plannedFocusTopics,
        progress: {
          questionNumber: sessionState.questionsAsked,
          totalQuestions: 10,
          questionsAsked: sessionState.questionsAsked,
          daysCovered: uniqueDays.size,
          requiredDays: 4,
          currentDay: sessionState.currentQuestionDay,
          currentTopic: sessionState.currentTopic,
          difficulty: sessionState.currentQuestionDifficulty,
          plannedFocusTopics: sessionState.plannedFocusTopics
        }
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

      const uniqueDays = new Set(sessionState.curriculumDaysCovered || []);
      const responsePayload: any = {
        ...result,
        turns: sessionState.turns,
        currentTopic: sessionState.currentTopic,
        currentQuestionDay: sessionState.currentQuestionDay,
        currentQuestionDifficulty: sessionState.currentQuestionDifficulty,
        questionsAsked: sessionState.questionsAsked,
        questionsAnswered: sessionState.questionsAnswered,
        primaryQuestionsAsked: sessionState.primaryQuestionsAsked,
        followUpsAsked: sessionState.followUpsAsked,
        clarifyUsed: sessionState.clarifyUsed,
        evaluations: sessionState.evaluations,
        plannedFocusTopics: sessionState.plannedFocusTopics,
        progress: {
          questionNumber: sessionState.questionsAsked,
          totalQuestions: 10,
          questionsAsked: sessionState.questionsAsked,
          daysCovered: uniqueDays.size,
          requiredDays: 4,
          currentDay: sessionState.currentQuestionDay,
          currentTopic: sessionState.currentTopic,
          difficulty: sessionState.currentQuestionDifficulty,
          plannedFocusTopics: sessionState.plannedFocusTopics
        }
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

/**
 * GET /api/diagnostics
 * DIAGNOSTICS ENDPOINT: Used to inspect the runtime environment (API keys, bundled data files).
 */
router.get('/diagnostics', async (req: Request, res: Response) => {
  try {
    const fs = await import('fs');
    const path = await import('path');

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'not set';

    const curriculumPath = path.join(process.cwd(), 'data/curriculum.json');
    const candidatesPath = path.join(process.cwd(), 'data/candidates.json');

    const curriculumExists = fs.existsSync(curriculumPath);
    const candidatesExists = fs.existsSync(candidatesPath);

    let curriculumLength = 0;
    let candidatesCount = 0;
    let fileError = null;

    try {
      if (curriculumExists) {
        const raw = fs.readFileSync(curriculumPath, 'utf8');
        curriculumLength = JSON.parse(raw).days?.length || 0;
      }
      if (candidatesExists) {
        const raw = fs.readFileSync(candidatesPath, 'utf8');
        candidatesCount = (JSON.parse(raw).candidates || []).length;
      }
    } catch (err: any) {
      fileError = err.message;
    }

    // List files in current directory to help diagnose Vercel bundling
    let rootFiles: string[] = [];
    try {
      rootFiles = fs.readdirSync(process.cwd());
    } catch (err: any) {
      rootFiles = [err.message];
    }

    let dataFiles: string[] = [];
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (fs.existsSync(dataDir)) {
        dataFiles = fs.readdirSync(dataDir);
      }
    } catch (err: any) {
      dataFiles = [err.message];
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      cwd: process.cwd(),
      rootFiles,
      dataFiles,
      env: {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey ? apiKey.length : 0,
        apiKeyPreview: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : 'none',
        model
      },
      files: {
        curriculumPath,
        curriculumExists,
        curriculumLength,
        candidatesPath,
        candidatesExists,
        candidatesCount,
        fileError
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
