import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-flash-latest';

if (!apiKey) {
  console.error('[LLM] Critical Error: GEMINI_API_KEY environment variable is not configured.');
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends a generation request to Google Gemini API with automatic retry for rate limits (429).
 */
export async function generateContent(
  prompt: string,
  systemInstruction?: string,
  jsonMode = false
): Promise<string> {
  if (process.env.MOCK_LLM === 'true') {
    const promptLower = prompt.toLowerCase();
    const systemLower = (systemInstruction || '').toLowerCase();

    // 1. Planning Request
    if (systemLower.includes('curriculum') && systemLower.includes('interview plan')) {
      let targetDifficulty = 'Intermediate';
      if (promptLower.includes('advanced') || promptLower.includes('cand-003') || promptLower.includes('emily')) {
        targetDifficulty = 'Advanced';
      } else if (promptLower.includes('cand-004') || promptLower.includes('ethan')) {
        targetDifficulty = 'Foundational';
      }

      return JSON.stringify({
        targetDifficulty,
        topics: [
          { day: 12, topic: 'Prompt Engineering', priority: 'high', reason: 'Assessing depth' },
          { day: 14, topic: 'RAG Architecture', priority: 'high', reason: 'Assessing depth' },
          { day: 8, topic: 'Vector Indexing', priority: 'medium', reason: 'Diagnostic coverage' },
          { day: 5, topic: 'Prompting Paradigms', priority: 'medium', reason: 'Diagnostic coverage' }
        ]
      });
    }

    // 2. Feedback Generation Request
    if (systemLower.includes('principal ai architect') || systemLower.includes('interviewer summary')) {
      let name = 'Candidate';
      const nameMatch = prompt.match(/Name:\s*([^\n\r]+)/i);
      if (nameMatch) {
        name = nameMatch[1].trim();
      }

      // Robust block-based parsing of the transcript evaluations in prompt
      const blocks = prompt.split(/\[Q\d+\s*-\s*/i).slice(1);
      const parsedEvals: Array<{
        day: string;
        topic: string;
        question: string;
        answer: string;
        status: string;
        notes: string;
        strengths: string[];
        gaps: string[];
      }> = [];

      for (const block of blocks) {
        const headerMatch = block.match(/^(Day\s*\d+)\s*-\s*([^\]\r\n]+)\]/i);
        if (!headerMatch) continue;
        const day = headerMatch[1].trim();
        const topic = headerMatch[2].trim();

        const qMatch = block.match(/Question:\s*([^\r\n]+)/i);
        const aMatch = block.match(/Candidate Answer:\s*([^\r\n]+)/i);
        const sMatch = block.match(/Status:\s*([^\r\n]+)/i);
        const nMatch = block.match(/(Evaluator Notes|Notes):\s*([^\r\n]+)/i);
        const strengthsMatch = block.match(/Observed Strengths:\s*([^\r\n]+)/i);
        const gapsMatch = block.match(/Observed Gaps:\s*([^\r\n]+)/i);

        if (qMatch && aMatch && sMatch) {
          const parsedStrengths = strengthsMatch && strengthsMatch[1].trim() !== 'None'
            ? strengthsMatch[1].split(',').map(s => s.trim()).filter(Boolean)
            : [];
          const parsedGaps = gapsMatch && gapsMatch[1].trim() !== 'None'
            ? gapsMatch[1].split(',').map(g => g.trim()).filter(Boolean)
            : [];

          parsedEvals.push({
            day,
            topic,
            question: qMatch[1].trim(),
            answer: aMatch[1].trim(),
            status: sMatch[1].trim(),
            notes: nMatch ? nMatch[2].trim() : '',
            strengths: parsedStrengths,
            gaps: parsedGaps
          });
        }
      }

      const strongTopics = parsedEvals.filter(e => e.status === 'Strong').map(e => e.topic);
      const gapTopics = parsedEvals.filter(e => e.status === 'Needs Improvement').map(e => e.topic);
      const uniqueDays = [...new Set(parsedEvals.map(e => e.day))];
      const isIncomplete = systemLower.includes('incomplete') || promptLower.includes('incomplete');

      let summary = '';
      if (parsedEvals.length === 0) {
        summary = `The technical assessment ended early and is incomplete. No answers were provided by ${name}.`;
      } else {
        const strongStr = strongTopics.length > 0 ? `strong proficiency in ${[...new Set(strongTopics)].join(', ')}` : 'foundational capabilities';
        const gapStr = gapTopics.length > 0 ? `gaps in ${[...new Set(gapTopics)].join(', ')} requiring study` : 'no major conceptual gaps';
        if (isIncomplete) {
          summary = `The technical interview with ${name} ended early and is incomplete. Assessment of ${parsedEvals.length} questions across ${uniqueDays.length} topics shows ${strongStr}, but remains incomplete due to insufficient coverage.`;
        } else {
          summary = `${name} completed the interview showing ${strongStr}, with ${gapStr}.`;
        }
      }

      let overallScore = 80;
      if (parsedEvals.length > 0) {
        const sum = parsedEvals.reduce((s, e) => s + (e.status === 'Strong' ? 91 : e.status === 'Good' ? 78 : 62), 0);
        overallScore = Math.round(sum / parsedEvals.length);
      }

      const strengths = [...new Set(parsedEvals.flatMap(e => e.strengths))];
      if (strengths.length === 0) strengths.push("Basic prompt engineering concepts.");

      const gaps = [...new Set(parsedEvals.flatMap(e => e.gaps))];
      if (gaps.length === 0) gaps.push("Explain implementation details of redis state store.");

      const topicPerformance = uniqueDays.map(dStr => {
        const dayEvals = parsedEvals.filter(e => e.day === dStr);
        const topic = dayEvals[0]?.topic || 'General AI';
        const sum = dayEvals.reduce((s, e) => s + (e.status === 'Strong' ? 91 : e.status === 'Good' ? 78 : 62), 0);
        const score = Math.round(sum / dayEvals.length);
        const level = score >= 85 ? 'strong' : score >= 70 ? 'good' : 'needs-improvement';
        return {
          day: dStr,
          topic,
          score,
          level,
          strengths: [`Strong concepts in ${topic}`],
          gaps: score < 80 ? [`Gaps in ${topic}`] : []
        };
      });

      const next = parsedEvals.filter(e => e.status === 'Needs Improvement').map(e => ({
        day: e.day,
        topic: e.topic,
        reason: 'Requires reinforcement and code practice.',
        items: ['Review curriculum objectives.']
      }));
      if (next.length === 0) {
        next.push({
          day: 'Day 18',
          topic: 'Agentic AI',
          reason: 'Explore multi-agent workflows and task delegation.',
          items: ['State persistence', 'Tool definition']
        });
      }

      return JSON.stringify({
        summary,
        overallScore: overallScore,
        technicalScore: Math.min(100, overallScore + 2),
        depthScore: Math.max(0, overallScore - 4),
        communicationScore: Math.min(100, overallScore + 4),
        strengths: strengths,
        gaps: gaps,
        topicPerformance,
        next,
        metrics: [
          { label: 'Technical Understanding', score: Math.min(100, overallScore + 2), note: 'Accurate concepts, correct terminology' },
          { label: 'Problem Solving', score: overallScore, note: 'Structured diagnosis, logical resolution' },
          { label: 'Communication', score: Math.min(100, overallScore + 4), note: 'Clear narrative structure, easy to follow' },
          { label: 'Depth of Explanation', score: Math.max(0, overallScore - 4), note: 'Explains trade-offs and implementation detail' },
          { label: 'Practical Application', score: Math.min(100, overallScore), note: 'Connects concepts back to concrete tools' }
        ],
        plannedFocusTopics: [
          { topic: 'RAG', signal: 'Strong' },
          { topic: 'Vector Databases', signal: 'Strong' },
          { topic: 'Prompt Engineering', signal: 'Moderate' },
          { topic: 'Agentic AI', signal: 'Needs Practice' },
          { topic: 'MCP', signal: 'Needs Practice' }
        ]
      });
    }
 
    // 3. Answer Evaluation Request
    if (jsonMode && (promptLower.includes('candidate answer') || systemLower.includes('evaluation substance rules'))) {
      let answer = 'Candidate answer';
      let topic = 'General topic';
 
      const aMatch = prompt.match(/Candidate Answer:\s*"([^"]+)"/i);
      if (aMatch) answer = aMatch[1].trim();
 
      const tMatch = prompt.match(/Curriculum Topic:\s*"([^"]+)"/i);
      if (tMatch) topic = tMatch[1].trim();
 
      let score = 85;
      let quality = 'strong';
      let evaluation = `Demonstrated strong conceptual mastery of ${topic}. Answered: "${answer.slice(0, 25)}..."`;
      let strengths = [`Knowledge of ${topic}`];
      let gaps: string[] = [];
      let misconceptions: string[] = [];
 
      const answerLower = answer.toLowerCase();
      if (answerLower.includes("don't know") || answerLower.includes("don't recall") || answerLower.includes("no idea") || answerLower.includes("uncertain") || answerLower.includes("skip")) {
        score = 0;
        quality = 'unknown';
        evaluation = `Candidate did not know the concept for ${topic}.`;
        strengths = [];
      } else if (answerLower.includes("python and react") || answerLower.includes("irrelevant")) {
        score = 10;
        quality = 'irrelevant';
        evaluation = `The response is off-topic and irrelevant to ${topic}.`;
        strengths = [];
      } else if (answerLower.includes("incorrect claims") || answerLower.includes("billing costs") || answerLower.includes("wrong answer") || answerLower.includes("incorrect")) {
        score = 40;
        quality = 'incorrect';
        evaluation = `Answer is technically incorrect regarding ${topic}.`;
        strengths = [];
        misconceptions = [`Misunderstanding of ${topic} mechanism`];
        gaps = [`Core ${topic} parameters`];
      } else if (answerLower.includes("mixed") || answerLower.includes("partial") || answerLower.includes("forgot similarity") || answerLower.includes("surface-level") || answerLower.includes("partial answer")) {
        score = 55;
        quality = 'partial';
        evaluation = `Touched on the concept of ${topic} but missed critical production details.`;
        strengths = [`Basic concept of ${topic}`];
        gaps = [`Advanced trade-offs for ${topic}`];
      }
 
      return JSON.stringify({
        score,
        quality,
        evaluation,
        strengths,
        gaps,
        misconceptions,
        betterAnswerStructure: [
          `Define the core mechanism of ${topic}`,
          `Explain the specific implementation steps`,
          `Discuss trade-offs of this approach`
        ],
        metrics: {
          technical: score,
          problemSolving: Math.max(0, Math.min(100, Math.round(score * 0.98))),
          communication: Math.max(0, Math.min(100, Math.round(score * 1.04))),
          depth: Math.max(0, Math.min(100, Math.round(score * 0.92))),
          practical: Math.max(0, Math.min(100, Math.round(score * 0.95)))
        }
      });
    }
 
    // 3.5. JSON Question / Primary generation fallback
    if (jsonMode) {
      if (promptLower.includes('day 12') || promptLower.includes('prompt engineering') || promptLower.includes('fundamentals')) {
        return JSON.stringify({
          question: "How do you ensure JSON format compliance in LLM outputs?",
          intent: "conceptual",
          objective: "Understand how to implement schema validation."
        });
      }
      if (promptLower.includes('day 14') || promptLower.includes('rag')) {
        return JSON.stringify({
          question: "How do you debug generation inaccuracies in a RAG pipeline?",
          intent: "debugging",
          objective: "Debug chunk queries and retrieval precision."
        });
      }
      if (promptLower.includes('day 8') || promptLower.includes('indexing') || promptLower.includes('vector')) {
        return JSON.stringify({
          question: "How do you choose between HNSW and IVF indexes for 40M vectors?",
          intent: "tradeoff",
          objective: "Understand similarity search indices and metrics."
        });
      }
      return JSON.stringify({
        question: "How would you set up a dual-encoder retrieval pipeline for RAG?",
        intent: "conceptual",
        objective: "Explain dual-encoder setup."
      });
    }

    // 4. Question / Follow-up Generation Request
    if (promptLower.includes('follow-up') || promptLower.includes('probe') || promptLower.includes('challenge')) {
      let topic = 'RAG';
      const topicMatch = systemLower.match(/topic:\s*(day\s*\d+\s*-\s*)?([^\n\r]+)/i);
      if (topicMatch) {
        topic = topicMatch[2].replace(/["']/g, '').trim();
      }

      let strategy = 'challenge';
      const strategyMatch = systemLower.match(/strategy:\s*([^\n\r]+)/i);
      if (strategyMatch) {
        strategy = strategyMatch[1].trim();
      }

      if (strategy.includes('redirect')) {
        return `Let's bring it back to ${topic}. How do graph vs partition indexes compare?`;
      }
      if (strategy.includes('probe')) {
        return `You missed some details about ${topic}. Can you explain how you would debug it?`;
      }
      if (strategy.includes('clarify')) {
        return `Could you clarify the specific tools you would use for ${topic} integration?`;
      }
      return `Could you explain the latency and memory trade-offs of your proposed ${topic} approach?`;
    }
    if (promptLower.includes('redirect') || promptLower.includes('off-topic')) {
      return "Let's bring it back to vector database storage models. How do graph vs partition indexes compare?";
    }

    return "Suppose your RAG application retrieves semantically relevant but incorrect chunks. How would you debug this pipeline?";
  }

  if (!apiKey || !ai) {
    throw new Error('GEMINI_API_KEY environment variable is not configured. Please add GEMINI_API_KEY to your .env file to enable the live interview agent.');
  }

  console.log(`[LLM] Calling model: "${modelName}" (JSON Mode: ${jsonMode})`);

  const maxAttempts = 3;
  let currentDelay = process.env.MOCK_LLM === 'true' ? 0 : (process.env.NODE_ENV === 'test' ? 10 : 2000);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Bounded timeout: 30 seconds explicit request timeout (200ms under test for fast unit execution)
      const timeoutMs = process.env.NODE_ENV === 'test' ? 200 : 30000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API request timed out after 30 seconds.')), timeoutMs)
      );

      const generatePromise = ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: jsonMode ? 'application/json' : undefined
        }
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const responseText = response.text;

      if (!responseText) {
        throw new Error('Received an empty response from the Gemini API.');
      }

      return responseText;
    } catch (error: any) {
      const errorMsg = error.message || '';
      const status = error.status || error.statusCode;

      // Fail fast: Do not retry permanent configuration/schema errors (400, 401, 403, 404)
      const isPermanent = status === 400 || status === 401 || status === 403 || status === 404;
      if (isPermanent) {
        console.error('[LLM] Permanent API error, not retrying:', errorMsg || error);
        throw error;
      }

      const is429 = error.status === 429 || 
                    errorMsg.includes('429') || 
                    errorMsg.toLowerCase().includes('quota') || 
                    errorMsg.toLowerCase().includes('rate') || 
                    errorMsg.toLowerCase().includes('resource_exhausted');

      // Retry transient/rate limit errors
      if (attempt < maxAttempts) {
        const retryDelay = process.env.MOCK_LLM === 'true' ? 0 : currentDelay;
        console.warn(`[LLM] Transient failure or rate limit exceeded. Retrying in ${retryDelay / 1000}s... (Attempt ${attempt}/${maxAttempts - 1})`);
        if (retryDelay > 0) {
          await delay(retryDelay);
        }
        currentDelay *= 2.0; // Exponential backoff
        continue;
      }

      console.error('[LLM] Gemini API call failed after retries:', errorMsg || error);
      throw error;
    }
  }

  throw new Error('Failed to generate content after retries.');
}
