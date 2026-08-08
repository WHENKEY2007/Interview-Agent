import { getCandidateById, getCurriculumDay, getCurriculum, CandidateProfile } from '../data/dataLoader';
import { createSession, getSession, saveSession, SessionState, InterviewTurn, AnswerEvaluation } from '../session/sessionStore';
import { selectNextDay, generatePrimaryQuestion } from './questionGenerator';
import { evaluateAnswer } from './answerEvaluator';
import { generateFollowUp } from './followUpGenerator';
import { generateFinalFeedback } from './feedbackGenerator';
import { generateContent } from '../llm/llmClient';
import { generateInterviewPlan } from './interviewPlanner';

/**
 * Starts a new interview session.
 */
export async function startInterview(sessionId: string, candidateData: any): Promise<string> {
  // Try to find full candidate profile from candidates.json
  const candidateId = candidateData.member?.id || candidateData.id;
  let candidate: CandidateProfile | undefined;
  
  if (candidateId) {
    candidate = getCandidateById(candidateId);
  }

  // Fallback to parsed candidate structure if not found in JSON database
  if (!candidate) {
    candidate = {
      member: {
        id: candidateData.member?.id || 'CAND-TEMP',
        name: candidateData.member?.name || candidateData.name || 'Candidate',
        jobRole: candidateData.member?.jobRole || candidateData.jobRole || 'Software Engineer',
        yearsExperience: candidateData.member?.yearsExperience || candidateData.yearsExperience || 2,
        education: candidateData.member?.education || candidateData.education || 'N/A',
        status: candidateData.member?.status || candidateData.status || 'COMPLETED'
      },
      missions: candidateData.missions || [],
      signals: candidateData.signals || { commitDays: 10, missionsCompleted: 10, missionsFirstTry: 5 }
    };
  }

  const session = createSession(sessionId, candidate);

  // Generate Candidate-Aware Interview Plan
  const curriculum = getCurriculum();
  const plan = generateInterviewPlan(candidate, curriculum);
  session.interviewPlan = plan;
  session.planDayIndex = 0;

  // Pick first day/topic
  const firstDayNum = plan.selectedDays[0] || 12;
  const day = getCurriculumDay(firstDayNum);

  if (!day) {
    throw new Error(`Curriculum day ${firstDayNum} not found`);
  }

  // Generate question
  const questionText = await generatePrimaryQuestion(candidate, day, plan.targetDifficulty);

  // Update session state
  session.currentTopic = day.title;
  session.currentQuestion = questionText;
  session.currentQuestionDay = day.day;
  session.curriculumDaysCovered.push(day.day);
  session.questionsAsked = 1;
  session.currentQuestionDifficulty = plan.targetDifficulty;

  // Record turn
  const turn: InterviewTurn = {
    id: `turn-${Date.now()}-q`,
    role: 'interviewer',
    text: questionText,
    topic: day.title,
    day: `Day ${day.day}`,
    difficulty: plan.targetDifficulty,
    isPrimary: true
  };
  session.turns.push(turn);

  saveSession(sessionId, session);

  return questionText;
}

/**
 * Processes a candidate message turn.
 */
export async function handleCandidateMessage(
  sessionId: string,
  message: string
): Promise<{ reply: string; done: boolean; feedback?: any }> {
  const session = getSession(sessionId);

  if (!session) {
    throw new Error(`Session with ID ${sessionId} not found`);
  }

  if (session.status === 'COMPLETED') {
    return {
      reply: 'This interview has already been completed.',
      done: true,
      feedback: session.finalFeedback
    };
  }

  // Record candidate turn
  const candidateTurn: InterviewTurn = {
    id: `turn-${Date.now()}-a`,
    role: 'candidate',
    text: message
  };
  session.turns.push(candidateTurn);

  // Check if message is an end early request
  if (message === '[END_EARLY]') {
    session.status = 'COMPLETED';
    const finalReport = await generateFinalFeedback(session.candidate, session.evaluations);
    session.finalFeedback = finalReport;
    saveSession(sessionId, session);
    return {
      reply: 'Interview completed early.',
      done: true,
      feedback: finalReport
    };
  }

  // Check if message is a clarification request
  const isClarifyRequest = 
    message === '[CLARIFY]' || 
    /^(can you|could you|please)?\s*(clarify|explain|rephrase|help me understand)\s*(the question|this)?/i.test(message);

  if (isClarifyRequest) {
    if (session.clarifyUsed) {
      return {
        reply: "I've already clarified this question. Please try your best to answer based on the prompt above.",
        done: false
      };
    }

    session.clarifyUsed = true;
    
    // Generate clarification via LLM
    const systemInstruction = `You are a helpful, professional technical interviewer.
The candidate asked you to clarify the following question: "${session.currentQuestion}".
Rephrase the question in simpler terms. Outline what key concept they should explain (e.g. system design choice, debugging steps, trade-offs).
Keep your clarification friendly, concise, and direct (1-2 sentences). Do NOT change the core question.`;

    const prompt = 'Rephrase and clarify the question.';
    const clarificationText = await generateContent(prompt, systemInstruction);

    // Record turn
    session.turns.push({
      id: `turn-${Date.now()}-c`,
      role: 'interviewer',
      text: clarificationText,
      badge: 'Clarifying the question',
      topic: session.currentTopic,
      day: `Day ${session.currentQuestionDay}`
    });

    saveSession(sessionId, session);

    return {
      reply: clarificationText,
      done: false
    };
  }

  // Normal turn - evaluate answer & advance
  const day = getCurriculumDay(session.currentQuestionDay)!;

  if (!session.isFollowUpStage) {
    // 1. Evaluate primary answer
    const evalResult = await evaluateAnswer(session.currentQuestion, message, day);

    // Record evaluation item
    const evalItem: AnswerEvaluation = {
      id: `eval-${Date.now()}`,
      topic: session.currentTopic,
      day: `Day ${session.currentQuestionDay}`,
      status: evalResult.quality === 'strong' ? 'Strong' : evalResult.quality === 'partial' ? 'Good' : 'Needs Improvement',
      question: session.currentQuestion,
      answer: message,
      evaluation: evalResult.evaluation,
      strengths: evalResult.strengths,
      improvements: evalResult.gaps,
      betterAnswer: evalResult.betterAnswerStructure
    };
    session.evaluations.push(evalItem);
    session.questionsAnswered += 1;

    // 2. Generate dynamic follow-up
    const followUp = await generateFollowUp(session.candidate, day, session.currentQuestion, message, evalResult);

    session.isFollowUpStage = true;
    session.followUpCount += 1;
    session.questionsAsked += 1;
    session.currentQuestion = followUp.text;
    session.currentQuestionDifficulty = followUp.difficultyShift === 'up' ? 'Advanced' : followUp.difficultyShift === 'down' ? 'Foundational' : 'Intermediate';

    // Record interviewer turn
    session.turns.push({
      id: `turn-${Date.now()}-f`,
      role: 'interviewer',
      text: followUp.text,
      badge: followUp.badge,
      topic: session.currentTopic,
      day: `Day ${session.currentQuestionDay}`,
      difficulty: session.currentQuestionDifficulty
    });

    saveSession(sessionId, session);

    return {
      reply: followUp.text,
      done: false
    };
  } else {
    // Follow-up answer received. Increment answers.
    session.questionsAnswered += 1;

    // Check if we met completion conditions (min 8 questions and 4 days covered)
    // Here session.questionsAsked tracks how many interviewer turns we made. 
    // Minimum 8 questions implies at least 8 turns of questions/follow-ups.
    // If we covered 4 topics, and asked 2 questions each (1 primary + 1 follow-up), that is 8 questions!
    const coveredDaysCount = session.curriculumDaysCovered.length;
    const meetsQuestionsConstraint = session.questionsAsked >= 8;
    const meetsDaysConstraint = coveredDaysCount >= 4;

    if (meetsQuestionsConstraint && meetsDaysConstraint) {
      // Complete interview
      session.status = 'COMPLETED';
      
      const finalReport = await generateFinalFeedback(session.candidate, session.evaluations);
      session.finalFeedback = finalReport;

      saveSession(sessionId, session);

      return {
        reply: 'Interview completed. Compiling feedback.',
        done: true,
        feedback: finalReport
      };
    } else {
      // Move to next day/topic in the plan
      session.planDayIndex += 1;
      const plan = session.interviewPlan;
      
      let nextDayNum: number;
      let targetDiff: 'Foundational' | 'Intermediate' | 'Advanced' = 'Intermediate';

      if (plan && session.planDayIndex < plan.selectedDays.length) {
        nextDayNum = plan.selectedDays[session.planDayIndex];
        targetDiff = plan.targetDifficulty;
      } else {
        // Fallback to dynamic choice
        nextDayNum = selectNextDay(session);
        if (plan) targetDiff = plan.targetDifficulty;
      }

      const nextDay = getCurriculumDay(nextDayNum)!;

      // Generate next primary question
      const questionText = await generatePrimaryQuestion(session.candidate, nextDay, targetDiff);

      session.currentTopic = nextDay.title;
      session.currentQuestion = questionText;
      session.currentQuestionDay = nextDay.day;
      session.curriculumDaysCovered.push(nextDay.day);
      session.questionsAsked += 1;
      session.isFollowUpStage = false;
      session.clarifyUsed = false;
      session.currentQuestionDifficulty = targetDiff;

      // Record interviewer turn
      session.turns.push({
        id: `turn-${Date.now()}-q`,
        role: 'interviewer',
        text: questionText,
        topic: nextDay.title,
        day: `Day ${nextDay.day}`,
        difficulty: targetDiff,
        isPrimary: true
      });

      saveSession(sessionId, session);

      return {
        reply: questionText,
        done: false
      };
    }
  }
}
