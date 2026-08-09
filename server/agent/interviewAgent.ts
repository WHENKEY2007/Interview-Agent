import { getCandidateById, getCurriculumDay, getCurriculum, CandidateProfile } from '../data/dataLoader';
import { createSession, getSession, saveSession, SessionState, InterviewTurn, AnswerEvaluation } from '../session/sessionStore';
import { selectNextDay, generatePrimaryQuestion } from './questionGenerator';
import { evaluateAnswer } from './answerEvaluator';
import { generateFollowUp } from './followUpGenerator';
import { generateFinalFeedback } from './feedbackGenerator';
import { generateContent } from '../llm/llmClient';
import { generateInterviewPlan } from './interviewPlanner';
import { determineNextAction } from './interviewDecisionEngine';

const MIN_INTERVIEW_QUESTIONS = 8;
const MIN_CURRICULUM_DAYS = 4;
const MAX_INTERVIEW_QUESTIONS = 10;

/**
 * Starts a new interview session.
 */
export async function startInterview(sessionId: string, candidateData: any): Promise<string> {
  const candidateId = candidateData.member?.id || candidateData.id;
  let candidate: CandidateProfile | undefined;
  
  if (candidateId) {
    candidate = getCandidateById(candidateId);
  }

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
  session.plannedFocusTopics = plan.plannedFocusTopics;
  session.planDayIndex = 0;

  console.log(`[Interview Start]\ncandidateId: ${candidate.member.id}\nselectedTopics:`, plan.topics.map(t => t.title), `\nplannedDays:`, plan.selectedDays);

  // Pick first day/topic from the plan
  const firstDayNum = plan.selectedDays[0] || 12;
  const day = getCurriculumDay(firstDayNum);

  if (!day) {
    throw new Error(`Curriculum day ${firstDayNum} not found`);
  }

  // Generate primary question
  const questionObj = await generatePrimaryQuestion(candidate, day, plan.targetDifficulty, []);

  const qId = `turn-${Date.now()}-q`;

  // Update session state
  session.currentTopic = day.title;
  session.currentQuestion = questionObj.question;
  session.currentQuestionDay = day.day;
  session.curriculumDaysCovered.push(day.day);
  session.questionsAsked = 1;
  session.primaryQuestionsAsked = 1;
  session.followUpsAsked = 0;
  session.currentTopicDepth = 0;
  session.currentQuestionType = 'primary';
  session.currentQuestionDifficulty = plan.targetDifficulty;
  session.currentQuestionId = qId;
  session.currentQuestionObjective = questionObj.objective;
  session.currentQuestionNumber = 1;

  // Record turn
  const turn: InterviewTurn = {
    id: qId,
    role: 'interviewer',
    text: questionObj.question,
    topic: day.title,
    day: `Day ${day.day}`,
    difficulty: plan.targetDifficulty,
    isPrimary: true,
    intent: questionObj.intent
  };
  session.turns.push(turn);

  saveSession(sessionId, session);

  return questionObj.question;
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

  // Check if message is an end early request
  if (message === '[END_EARLY]') {
    session.status = 'COMPLETED';
    const finalReport = await generateFinalFeedback(session);
    session.finalFeedback = finalReport;
    saveSession(sessionId, session);
    return {
      reply: 'Interview completed early.',
      done: true,
      feedback: finalReport
    };
  }

  // Check for duplicate submission / retry on the backend
  if (session.turns.length >= 2) {
    const lastTurn = session.turns[session.turns.length - 1];
    const prevTurn = session.turns[session.turns.length - 2];
    if (prevTurn.role === 'candidate' && prevTurn.text === message && lastTurn.role === 'interviewer') {
      console.log(`[Router] Duplicate/Retry detected. Returning already-generated question: "${lastTurn.text}"`);
      return {
        reply: lastTurn.text,
        done: session.status === 'COMPLETED'
      };
    }
  }

  // Clean up any partial state from a previously interrupted turn with the same message
  const lastTurnItem = session.turns[session.turns.length - 1];
  if (lastTurnItem && lastTurnItem.role === 'candidate' && lastTurnItem.text === message) {
    session.turns.pop();
  }
  const duplicateEvalIndex = session.evaluations.findIndex(
    e => e.question === session.currentQuestion && e.answer === message
  );
  if (duplicateEvalIndex !== -1) {
    session.evaluations.splice(duplicateEvalIndex, 1);
    session.questionsAnswered = Math.max(0, session.questionsAnswered - 1);
  }

  // Check for empty or whitespace-only messages independently on the backend
  if (!message || message.trim().length === 0) {
    return {
      reply: "Please provide a response before submitting.",
      done: false
    };
  }

  // Record candidate turn
  const candidateTurn: InterviewTurn = {
    id: `turn-${Date.now()}-a`,
    role: 'candidate',
    text: message
  };
  session.turns.push(candidateTurn);

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
      day: `Day ${session.currentQuestionDay}`,
      intent: 'clarification'
    });

    saveSession(sessionId, session);

    return {
      reply: clarificationText,
      done: false
    };
  }

  // Normal turn - evaluate answer
  const startTotal = Date.now();
  const startEval = Date.now();
  const day = getCurriculumDay(session.currentQuestionDay)!;

  // Build conversational context relevant to the question
  const topicTurns = session.turns.filter(t => t.topic === session.currentTopic);
  const previousContext = topicTurns.map(t => `${t.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${t.text}`).join('\n');

  const evalResult = await evaluateAnswer(
    session.currentQuestion,
    message,
    day,
    session.currentQuestionObjective || day.objectives[0] || '',
    previousContext
  );
  const evalDuration = Date.now() - startEval;

  // Record evaluation item
  const evalItem: AnswerEvaluation = {
    id: session.currentQuestionId || `eval-${Date.now()}`,
    topic: session.currentTopic,
    day: `Day ${session.currentQuestionDay}`,
    status: evalResult.quality === 'strong' ? 'Strong' : evalResult.quality === 'partial' ? 'Good' : 'Needs Improvement',
    question: session.currentQuestion,
    answer: message,
    evaluation: evalResult.evaluation,
    strengths: evalResult.strengths,
    improvements: evalResult.gaps,
    betterAnswer: evalResult.betterAnswerStructure,
    questionId: session.currentQuestionId || `q-${Date.now()}`,
    questionNumber: session.currentQuestionNumber || session.questionsAsked,
    objective: session.currentQuestionObjective || day.objectives[0] || '',
    difficulty: session.currentQuestionDifficulty,
    questionType: session.currentQuestionType,
    score: evalResult.score,
    metrics: evalResult.metrics
  };
  session.evaluations.push(evalItem);
  session.questionsAnswered += 1;

  // Update session qualitative list states
  if (evalResult.strengths) {
    session.candidateStrengths = [...new Set([...session.candidateStrengths, ...evalResult.strengths])];
  }
  if (evalResult.gaps) {
    session.candidateGaps = [...new Set([...session.candidateGaps, ...evalResult.gaps])];
  }
  if (evalResult.misconceptions) {
    session.candidateMisconceptions = [...new Set([...session.candidateMisconceptions, ...evalResult.misconceptions])];
  }
  session.lastAnswerEvaluation = evalResult;

  // Call the Decision Engine to determine what interviewer action to take next
  const decision = determineNextAction(session, evalResult);
  session.lastDecision = decision.strategy;

  // Logging diagnostics
  const lastTurn = session.turns[session.turns.length - 2];
  console.log('\n[Interview]');
  console.log(`Session: ${session.sessionId}`);
  console.log(`Day: ${session.currentQuestionDay}`);
  console.log(`Topic: ${session.currentTopic}`);
  console.log('\n[Question]');
  console.log(`Intent: ${lastTurn?.intent || 'conceptual'}`);
  console.log(`Length: ${session.currentQuestion.split(/\s+/).length} words`);
  console.log('\n[Evaluation]');
  console.log(`Correctness: ${evalResult.quality}`);
  console.log(`Depth: ${evalResult.quality === 'strong' ? 'high' : evalResult.quality === 'partial' ? 'moderate' : 'low'}`);
  console.log(`Missing: ${evalResult.gaps.join(', ') || 'None'}`);
  console.log('\n[Decision]');
  console.log(`Strategy: ${decision.strategy}`);
  console.log('\n[Progress]');
  console.log(`Questions: ${session.questionsAsked}/8+ (max 10)`);
  console.log(`Days covered: ${new Set(session.curriculumDaysCovered).size}/4+\n`);

  if (decision.shouldFollowUp && session.questionsAsked < 10) {
    // 1. Gather all previously asked questions to prevent repetitions in follow-ups
    const prevQuestions = session.turns
      .filter(t => t.role === 'interviewer')
      .map(t => t.text);

    const startGen = Date.now();
    const followUp = await generateFollowUp(
      session.candidate,
      day,
      session.currentQuestion,
      message,
      evalResult,
      decision.strategy,
      prevQuestions
    );
    const genDuration = Date.now() - startGen;
    const totalDuration = Date.now() - startTotal;
    console.log(`\n[Interview] session=${session.sessionId}`);
    console.log(`[Evaluation] ${evalDuration}ms`);
    console.log(`[QuestionGeneration] ${genDuration}ms`);
    console.log(`[Total] ${totalDuration}ms\n`);

    // Update state parameters
    session.followUpsAsked += 1;
    session.questionsAsked += 1;
    session.currentTopicDepth += 1;
    session.currentQuestion = followUp.text;
    
    let nextDifficulty = session.currentQuestionDifficulty as 'Foundational' | 'Intermediate' | 'Advanced';
    if (followUp.difficultyShift === 'up') {
      nextDifficulty = nextDifficulty === 'Foundational' ? 'Intermediate' : 'Advanced';
    } else if (followUp.difficultyShift === 'down') {
      nextDifficulty = nextDifficulty === 'Advanced' ? 'Intermediate' : 'Foundational';
    }
    session.currentQuestionDifficulty = nextDifficulty;
    session.currentQuestionType = 'followup';

    const nextQId = `turn-${Date.now()}-f`;
    session.currentQuestionId = nextQId;
    session.currentQuestionNumber = session.questionsAsked;

    // Record turn
    session.turns.push({
      id: nextQId,
      role: 'interviewer',
      text: followUp.text,
      badge: followUp.badge,
      topic: session.currentTopic,
      day: `Day ${session.currentQuestionDay}`,
      difficulty: session.currentQuestionDifficulty,
      intent: decision.strategy === 'challenge' ? 'challenge' : 'debugging'
    });

    saveSession(sessionId, session);

    return {
      reply: followUp.text,
      done: false
    };
  } else {
    // Determine whether completion criteria are met (unique days count check)
    const uniqueDaysCovered = new Set(session.curriculumDaysCovered);
    const coveredDaysCount = uniqueDaysCovered.size;
    const meetsQuestionsConstraint = session.questionsAsked >= MIN_INTERVIEW_QUESTIONS;
    const meetsDaysConstraint = coveredDaysCount >= MIN_CURRICULUM_DAYS;
    const reachedMaxQuestions = session.questionsAsked >= MAX_INTERVIEW_QUESTIONS;

    if ((meetsQuestionsConstraint && meetsDaysConstraint) || reachedMaxQuestions) {
      session.status = 'COMPLETED';
      session.completedAt = Date.now();
      
      const startGen = Date.now();
      const finalReport = await generateFinalFeedback(session);
      const genDuration = Date.now() - startGen;
      const totalDuration = Date.now() - startTotal;
      console.log(`\n[Interview] session=${session.sessionId}`);
      console.log(`[Evaluation] ${evalDuration}ms`);
      console.log(`[QuestionGeneration] ${genDuration}ms`);
      console.log(`[Total] ${totalDuration}ms\n`);
      session.finalFeedback = finalReport;

      saveSession(sessionId, session);

      return {
        reply: 'Interview completed. Compiling feedback.',
        done: true,
        feedback: finalReport
      };
    } else {
      // Dynamic Difficulty Adaptation: Adapt based on previous difficulty and quality of responses
      const topicEvals = session.evaluations.filter(e => e.topic === session.currentTopic);
      const lastEval = topicEvals[topicEvals.length - 1];
      
      let targetDiff = (session.currentQuestionDifficulty || session.interviewPlan?.targetDifficulty || 'Intermediate') as 'Foundational' | 'Intermediate' | 'Advanced';
      if (lastEval) {
        if (lastEval.status === 'Strong') {
          targetDiff = targetDiff === 'Foundational' ? 'Intermediate' : 'Advanced';
        } else if (lastEval.status === 'Needs Improvement') {
          targetDiff = targetDiff === 'Advanced' ? 'Intermediate' : 'Foundational';
        }
      }

      console.log(`[Difficulty] Adapting target difficulty for next topic to: "${targetDiff}" based on performance.`);

      // Transition to the next planned topic/day
      session.planDayIndex += 1;
      session.currentTopicDepth = 0;
      const plan = session.interviewPlan;

      let nextDayNum: number;
      if (plan && session.planDayIndex < plan.selectedDays.length) {
        nextDayNum = plan.selectedDays[session.planDayIndex];
      } else {
        nextDayNum = selectNextDay(session);
      }

      const nextDay = getCurriculumDay(nextDayNum)!;

      // Compile previous questions to prevent semantic duplicates
      const prevQuestions = session.turns
        .filter(t => t.role === 'interviewer')
        .map(t => t.text);

      // Generate next primary question
      const startGen = Date.now();
      const questionObj = await generatePrimaryQuestion(session.candidate, nextDay, targetDiff, prevQuestions);
      const genDuration = Date.now() - startGen;
      const totalDuration = Date.now() - startTotal;
      console.log(`\n[Interview] session=${session.sessionId}`);
      console.log(`[Evaluation] ${evalDuration}ms`);
      console.log(`[QuestionGeneration] ${genDuration}ms`);
      console.log(`[Total] ${totalDuration}ms\n`);

      // Prepend a very brief, natural transition context
      const transitionText = `Moving to ${nextDay.title}. `;
      const finalQuestion = transitionText + questionObj.question;

      session.currentTopic = nextDay.title;
      session.currentQuestion = finalQuestion;
      session.currentQuestionDay = nextDay.day;
      session.curriculumDaysCovered.push(nextDay.day);
      session.questionsAsked += 1;
      session.primaryQuestionsAsked += 1;
      session.currentQuestionType = 'primary';
      session.clarifyUsed = false;
      session.currentQuestionDifficulty = targetDiff;

      const nextQId = `turn-${Date.now()}-q`;
      session.currentQuestionId = nextQId;
      session.currentQuestionObjective = questionObj.objective;
      session.currentQuestionNumber = session.questionsAsked;

      // Record interviewer turn
      session.turns.push({
        id: nextQId,
        role: 'interviewer',
        text: finalQuestion,
        topic: nextDay.title,
        day: `Day ${nextDay.day}`,
        difficulty: targetDiff,
        isPrimary: true,
        intent: questionObj.intent
      });

      saveSession(sessionId, session);

      return {
        reply: finalQuestion,
        done: false
      };
    }
  }
}
