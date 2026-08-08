import { getCandidateById, getCurriculumDay, getCurriculum, CandidateProfile } from '../data/dataLoader';
import { createSession, getSession, saveSession, SessionState, InterviewTurn, AnswerEvaluation } from '../session/sessionStore';
import { selectNextDay, generatePrimaryQuestion } from './questionGenerator';
import { evaluateAnswer } from './answerEvaluator';
import { generateFollowUp } from './followUpGenerator';
import { generateFinalFeedback } from './feedbackGenerator';
import { generateContent } from '../llm/llmClient';
import { generateInterviewPlan } from './interviewPlanner';
import { determineNextAction } from './interviewDecisionEngine';

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
  session.planDayIndex = 0;

  // Pick first day/topic from the plan
  const firstDayNum = plan.selectedDays[0] || 12;
  const day = getCurriculumDay(firstDayNum);

  if (!day) {
    throw new Error(`Curriculum day ${firstDayNum} not found`);
  }

  // Generate primary question
  const questionObj = await generatePrimaryQuestion(candidate, day, plan.targetDifficulty, []);

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

  // Record turn
  const turn: InterviewTurn = {
    id: `turn-${Date.now()}-q`,
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
  const day = getCurriculumDay(session.currentQuestionDay)!;
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
  console.log(`Days covered: ${session.curriculumDaysCovered.length}/4+\n`);

  if (decision.shouldFollowUp && session.questionsAsked < 10) {
    // 1. Gather all previously asked questions to prevent repetitions in follow-ups
    const prevQuestions = session.turns
      .filter(t => t.role === 'interviewer')
      .map(t => t.text);

    // 2. Generate follow-up response
    const followUp = await generateFollowUp(
      session.candidate,
      day,
      session.currentQuestion,
      message,
      evalResult,
      decision.strategy,
      prevQuestions
    );

    // Update state parameters
    session.followUpsAsked += 1;
    session.questionsAsked += 1;
    session.currentTopicDepth += 1;
    session.currentQuestion = followUp.text;
    session.currentQuestionDifficulty = followUp.difficultyShift === 'up' ? 'Advanced' : followUp.difficultyShift === 'down' ? 'Foundational' : 'Intermediate';
    session.currentQuestionType = 'followup';

    // Record turn
    session.turns.push({
      id: `turn-${Date.now()}-f`,
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
    // Determine whether completion criteria are met
    const coveredDaysCount = session.curriculumDaysCovered.length;
    const meetsQuestionsConstraint = session.questionsAsked >= 8;
    const meetsDaysConstraint = coveredDaysCount >= 4;
    const reachedMaxQuestions = session.questionsAsked >= 10;

    if ((meetsQuestionsConstraint && meetsDaysConstraint) || reachedMaxQuestions) {
      session.status = 'COMPLETED';
      
      const finalReport = await generateFinalFeedback(session);
      session.finalFeedback = finalReport;

      saveSession(sessionId, session);

      return {
        reply: 'Interview completed. Compiling feedback.',
        done: true,
        feedback: finalReport
      };
    } else {
      // Dynamic Difficulty Adaptation: Evaluate average score of completed topic
      const topicEvals = session.evaluations.filter(e => e.topic === session.currentTopic);
      const lastEval = topicEvals[topicEvals.length - 1];
      
      let targetDiff: 'Foundational' | 'Intermediate' | 'Advanced' = 'Intermediate';
      if (lastEval) {
        if (lastEval.status === 'Strong') {
          targetDiff = 'Advanced';
        } else if (lastEval.status === 'Needs Improvement') {
          targetDiff = 'Foundational';
        } else {
          targetDiff = 'Intermediate';
        }
      } else {
        targetDiff = (session.interviewPlan?.targetDifficulty as any) || 'Intermediate';
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
      const questionObj = await generatePrimaryQuestion(session.candidate, nextDay, targetDiff, prevQuestions);

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

      // Record interviewer turn
      session.turns.push({
        id: `turn-${Date.now()}-q`,
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
