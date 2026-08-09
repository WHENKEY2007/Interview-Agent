var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/data/dataLoader.ts
var dataLoader_exports = {};
__export(dataLoader_exports, {
  getCandidateById: () => getCandidateById,
  getCandidates: () => getCandidates,
  getCurriculum: () => getCurriculum,
  getCurriculumDay: () => getCurriculumDay,
  loadData: () => loadData
});
import fs from "fs";
import path from "path";
function loadData() {
  try {
    const curriculumPath = path.join(process.cwd(), "data/curriculum.json");
    const candidatesPath = path.join(process.cwd(), "data/candidates.json");
    const curriculumRaw = fs.readFileSync(curriculumPath, "utf8");
    const candidatesRaw = fs.readFileSync(candidatesPath, "utf8");
    curriculum = JSON.parse(curriculumRaw);
    candidates = JSON.parse(candidatesRaw).candidates;
    console.log(`[Data] Loaded curriculum (${curriculum.days.length} days) and ${candidates.length} candidate profiles.`);
  } catch (error) {
    console.error("[Data] Error loading curriculum or candidates data:", error);
  }
}
function getCurriculum() {
  if (!curriculum) {
    loadData();
  }
  return curriculum;
}
function getCandidates() {
  if (candidates.length === 0) {
    loadData();
  }
  return candidates;
}
function getCandidateById(id) {
  return getCandidates().find((c) => c.member.id === id);
}
function getCurriculumDay(dayNumber) {
  return getCurriculum().days.find((d) => d.day === dayNumber);
}
var curriculum, candidates;
var init_dataLoader = __esm({
  "server/data/dataLoader.ts"() {
    "use strict";
    curriculum = null;
    candidates = [];
  }
});

// server/index.ts
init_dataLoader();
import express from "express";
import cors from "cors";
import dotenv2 from "dotenv";
import path2 from "path";

// server/routes/interview.ts
import { Router } from "express";

// server/agent/interviewAgent.ts
init_dataLoader();

// server/session/sessionStore.ts
var sessions = /* @__PURE__ */ new Map();
function createSession(sessionId, candidate) {
  const newSession = {
    sessionId,
    candidate,
    planDayIndex: 0,
    turns: [],
    questionsAsked: 0,
    questionsAnswered: 0,
    primaryQuestionsAsked: 0,
    followUpsAsked: 0,
    currentTopicDepth: 0,
    candidateStrengths: [],
    candidateGaps: [],
    candidateMisconceptions: [],
    currentQuestionType: "primary",
    curriculumDaysCovered: [],
    currentTopic: "",
    currentQuestion: "",
    currentQuestionDay: 0,
    currentQuestionDifficulty: "Intermediate",
    currentQuestionId: "",
    currentQuestionObjective: "",
    currentQuestionNumber: 1,
    clarifyUsed: false,
    evaluations: [],
    status: "IN_PROGRESS",
    startTime: Date.now(),
    durationSeconds: 0
  };
  sessions.set(sessionId, newSession);
  return newSession;
}
function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    session.durationSeconds = Math.floor((Date.now() - session.startTime) / 1e3);
  }
  return session;
}
function saveSession(sessionId, session) {
  sessions.set(sessionId, session);
}

// server/llm/llmClient.ts
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
var apiKey = process.env.GEMINI_API_KEY;
var modelName = process.env.GEMINI_MODEL || "gemini-flash-latest";
if (!apiKey) {
  console.error("[LLM] Critical Error: GEMINI_API_KEY environment variable is not configured.");
}
var ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
var delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function generateContent(prompt, systemInstruction, jsonMode = false) {
  if (process.env.MOCK_LLM === "true") {
    const promptLower = prompt.toLowerCase();
    const systemLower = (systemInstruction || "").toLowerCase();
    if (systemLower.includes("curriculum") && systemLower.includes("interview plan")) {
      let targetDifficulty = "Intermediate";
      if (promptLower.includes("advanced") || promptLower.includes("cand-003") || promptLower.includes("emily")) {
        targetDifficulty = "Advanced";
      } else if (promptLower.includes("cand-004") || promptLower.includes("ethan")) {
        targetDifficulty = "Foundational";
      }
      return JSON.stringify({
        targetDifficulty,
        topics: [
          { day: 12, topic: "Prompt Engineering", priority: "high", reason: "Assessing depth" },
          { day: 14, topic: "RAG Architecture", priority: "high", reason: "Assessing depth" },
          { day: 8, topic: "Vector Indexing", priority: "medium", reason: "Diagnostic coverage" },
          { day: 5, topic: "Prompting Paradigms", priority: "medium", reason: "Diagnostic coverage" }
        ]
      });
    }
    if (systemLower.includes("principal ai architect") || systemLower.includes("interviewer summary")) {
      let name = "Candidate";
      const nameMatch = prompt.match(/Name:\s*([^\n\r]+)/i);
      if (nameMatch) {
        name = nameMatch[1].trim();
      }
      const blocks = prompt.split(/\[Q\d+\s*-\s*/i).slice(1);
      const parsedEvals = [];
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
          const parsedStrengths = strengthsMatch && strengthsMatch[1].trim() !== "None" ? strengthsMatch[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
          const parsedGaps = gapsMatch && gapsMatch[1].trim() !== "None" ? gapsMatch[1].split(",").map((g) => g.trim()).filter(Boolean) : [];
          parsedEvals.push({
            day,
            topic,
            question: qMatch[1].trim(),
            answer: aMatch[1].trim(),
            status: sMatch[1].trim(),
            notes: nMatch ? nMatch[2].trim() : "",
            strengths: parsedStrengths,
            gaps: parsedGaps
          });
        }
      }
      const strongTopics = parsedEvals.filter((e) => e.status === "Strong").map((e) => e.topic);
      const gapTopics = parsedEvals.filter((e) => e.status === "Needs Improvement").map((e) => e.topic);
      const uniqueDays = [...new Set(parsedEvals.map((e) => e.day))];
      const isIncomplete = systemLower.includes("incomplete") || promptLower.includes("incomplete");
      let summary = "";
      if (parsedEvals.length === 0) {
        summary = `The technical assessment ended early and is incomplete. No answers were provided by ${name}.`;
      } else {
        const strongStr = strongTopics.length > 0 ? `strong proficiency in ${[...new Set(strongTopics)].join(", ")}` : "foundational capabilities";
        const gapStr = gapTopics.length > 0 ? `gaps in ${[...new Set(gapTopics)].join(", ")} requiring study` : "no major conceptual gaps";
        if (isIncomplete) {
          summary = `The technical interview with ${name} ended early and is incomplete. Assessment of ${parsedEvals.length} questions across ${uniqueDays.length} topics shows ${strongStr}, but remains incomplete due to insufficient coverage.`;
        } else {
          summary = `${name} completed the interview showing ${strongStr}, with ${gapStr}.`;
        }
      }
      let overallScore = 80;
      if (parsedEvals.length > 0) {
        const sum = parsedEvals.reduce((s, e) => s + (e.status === "Strong" ? 91 : e.status === "Good" ? 78 : 62), 0);
        overallScore = Math.round(sum / parsedEvals.length);
      }
      const strengths = [...new Set(parsedEvals.flatMap((e) => e.strengths))];
      if (strengths.length === 0) strengths.push("Basic prompt engineering concepts.");
      const gaps = [...new Set(parsedEvals.flatMap((e) => e.gaps))];
      if (gaps.length === 0) gaps.push("Explain implementation details of redis state store.");
      const topicPerformance = uniqueDays.map((dStr) => {
        const dayEvals = parsedEvals.filter((e) => e.day === dStr);
        const topic = dayEvals[0]?.topic || "General AI";
        const sum = dayEvals.reduce((s, e) => s + (e.status === "Strong" ? 91 : e.status === "Good" ? 78 : 62), 0);
        const score = Math.round(sum / dayEvals.length);
        const level = score >= 85 ? "strong" : score >= 70 ? "good" : "needs-improvement";
        return {
          day: dStr,
          topic,
          score,
          level,
          strengths: [`Strong concepts in ${topic}`],
          gaps: score < 80 ? [`Gaps in ${topic}`] : []
        };
      });
      const next = parsedEvals.filter((e) => e.status === "Needs Improvement").map((e) => ({
        day: e.day,
        topic: e.topic,
        reason: "Requires reinforcement and code practice.",
        items: ["Review curriculum objectives."]
      }));
      if (next.length === 0) {
        next.push({
          day: "Day 18",
          topic: "Agentic AI",
          reason: "Explore multi-agent workflows and task delegation.",
          items: ["State persistence", "Tool definition"]
        });
      }
      return JSON.stringify({
        summary,
        overallScore,
        technicalScore: Math.min(100, overallScore + 2),
        depthScore: Math.max(0, overallScore - 4),
        communicationScore: Math.min(100, overallScore + 4),
        strengths,
        gaps,
        topicPerformance,
        next,
        metrics: [
          { label: "Technical Understanding", score: Math.min(100, overallScore + 2), note: "Accurate concepts, correct terminology" },
          { label: "Problem Solving", score: overallScore, note: "Structured diagnosis, logical resolution" },
          { label: "Communication", score: Math.min(100, overallScore + 4), note: "Clear narrative structure, easy to follow" },
          { label: "Depth of Explanation", score: Math.max(0, overallScore - 4), note: "Explains trade-offs and implementation detail" },
          { label: "Practical Application", score: Math.min(100, overallScore), note: "Connects concepts back to concrete tools" }
        ],
        plannedFocusTopics: [
          { topic: "RAG", signal: "Strong" },
          { topic: "Vector Databases", signal: "Strong" },
          { topic: "Prompt Engineering", signal: "Moderate" },
          { topic: "Agentic AI", signal: "Needs Practice" },
          { topic: "MCP", signal: "Needs Practice" }
        ]
      });
    }
    if (jsonMode && (promptLower.includes("candidate answer") || systemLower.includes("evaluation substance rules"))) {
      let answer = "Candidate answer";
      let topic = "General topic";
      const aMatch = prompt.match(/Candidate Answer:\s*"([^"]+)"/i);
      if (aMatch) answer = aMatch[1].trim();
      const tMatch = prompt.match(/Curriculum Topic:\s*"([^"]+)"/i);
      if (tMatch) topic = tMatch[1].trim();
      let score = 85;
      let quality = "strong";
      let evaluation = `Demonstrated strong conceptual mastery of ${topic}. Answered: "${answer.slice(0, 25)}..."`;
      let strengths = [`Knowledge of ${topic}`];
      let gaps = [];
      let misconceptions = [];
      const answerLower = answer.toLowerCase();
      if (answerLower.includes("don't know") || answerLower.includes("don't recall") || answerLower.includes("no idea") || answerLower.includes("uncertain") || answerLower.includes("skip")) {
        score = 0;
        quality = "unknown";
        evaluation = `Candidate did not know the concept for ${topic}.`;
        strengths = [];
      } else if (answerLower.includes("python and react") || answerLower.includes("irrelevant")) {
        score = 10;
        quality = "irrelevant";
        evaluation = `The response is off-topic and irrelevant to ${topic}.`;
        strengths = [];
      } else if (answerLower.includes("incorrect claims") || answerLower.includes("billing costs") || answerLower.includes("wrong answer") || answerLower.includes("incorrect")) {
        score = 40;
        quality = "incorrect";
        evaluation = `Answer is technically incorrect regarding ${topic}.`;
        strengths = [];
        misconceptions = [`Misunderstanding of ${topic} mechanism`];
        gaps = [`Core ${topic} parameters`];
      } else if (answerLower.includes("mixed") || answerLower.includes("partial") || answerLower.includes("forgot similarity") || answerLower.includes("surface-level") || answerLower.includes("partial answer")) {
        score = 55;
        quality = "partial";
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
    if (jsonMode) {
      if (promptLower.includes("day 12") || promptLower.includes("prompt engineering") || promptLower.includes("fundamentals")) {
        return JSON.stringify({
          question: "How do you ensure JSON format compliance in LLM outputs?",
          intent: "conceptual",
          objective: "Understand how to implement schema validation."
        });
      }
      if (promptLower.includes("day 14") || promptLower.includes("rag")) {
        return JSON.stringify({
          question: "How do you debug generation inaccuracies in a RAG pipeline?",
          intent: "debugging",
          objective: "Debug chunk queries and retrieval precision."
        });
      }
      if (promptLower.includes("day 8") || promptLower.includes("indexing") || promptLower.includes("vector")) {
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
    if (promptLower.includes("follow-up") || promptLower.includes("probe") || promptLower.includes("challenge")) {
      let topic = "RAG";
      const topicMatch = systemLower.match(/topic:\s*(day\s*\d+\s*-\s*)?([^\n\r]+)/i);
      if (topicMatch) {
        topic = topicMatch[2].replace(/["']/g, "").trim();
      }
      let strategy = "challenge";
      const strategyMatch = systemLower.match(/strategy:\s*([^\n\r]+)/i);
      if (strategyMatch) {
        strategy = strategyMatch[1].trim();
      }
      if (strategy.includes("redirect")) {
        return `Let's bring it back to ${topic}. How do graph vs partition indexes compare?`;
      }
      if (strategy.includes("probe")) {
        return `You missed some details about ${topic}. Can you explain how you would debug it?`;
      }
      if (strategy.includes("clarify")) {
        return `Could you clarify the specific tools you would use for ${topic} integration?`;
      }
      return `Could you explain the latency and memory trade-offs of your proposed ${topic} approach?`;
    }
    if (promptLower.includes("redirect") || promptLower.includes("off-topic")) {
      return "Let's bring it back to vector database storage models. How do graph vs partition indexes compare?";
    }
    return "Suppose your RAG application retrieves semantically relevant but incorrect chunks. How would you debug this pipeline?";
  }
  if (!apiKey || !ai) {
    throw new Error("GEMINI_API_KEY environment variable is not configured. Please add GEMINI_API_KEY to your .env file to enable the live interview agent.");
  }
  console.log(`[LLM] Calling model: "${modelName}" (JSON Mode: ${jsonMode})`);
  const maxAttempts = 3;
  let currentDelay = process.env.MOCK_LLM === "true" ? 0 : process.env.NODE_ENV === "test" ? 10 : 2e3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const timeoutMs = process.env.NODE_ENV === "test" ? 200 : 3e4;
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Gemini API request timed out after 30 seconds.")), timeoutMs)
      );
      const generatePromise = ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: jsonMode ? "application/json" : void 0
        }
      });
      const response = await Promise.race([generatePromise, timeoutPromise]);
      const responseText = response.text;
      if (!responseText) {
        throw new Error("Received an empty response from the Gemini API.");
      }
      return responseText;
    } catch (error) {
      const errorMsg = error.message || "";
      const status = error.status || error.statusCode;
      const isPermanent = status === 400 || status === 401 || status === 403 || status === 404;
      if (isPermanent) {
        console.error("[LLM] Permanent API error, not retrying:", errorMsg || error);
        throw error;
      }
      const is429 = error.status === 429 || errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("rate") || errorMsg.toLowerCase().includes("resource_exhausted");
      if (attempt < maxAttempts) {
        const retryDelay = process.env.MOCK_LLM === "true" ? 0 : currentDelay;
        console.warn(`[LLM] Transient failure or rate limit exceeded. Retrying in ${retryDelay / 1e3}s... (Attempt ${attempt}/${maxAttempts - 1})`);
        if (retryDelay > 0) {
          await delay(retryDelay);
        }
        currentDelay *= 2;
        continue;
      }
      console.error("[LLM] Gemini API call failed after retries:", errorMsg || error);
      throw error;
    }
  }
  throw new Error("Failed to generate content after retries.");
}

// server/agent/questionGenerator.ts
init_dataLoader();

// server/agent/validation.ts
function getQuestionKeywords(text) {
  const stopwords = /* @__PURE__ */ new Set([
    "what",
    "how",
    "why",
    "is",
    "are",
    "the",
    "a",
    "an",
    "to",
    "for",
    "in",
    "on",
    "at",
    "with",
    "and",
    "or",
    "you",
    "your",
    "would",
    "could",
    "should",
    "about",
    "choose",
    "between",
    "when",
    "which",
    "who",
    "whom",
    "whose",
    "where",
    "here",
    "there",
    "can",
    "please",
    "explain",
    "describe",
    "detail",
    "consider",
    "using",
    "based"
  ]);
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((word) => word.length > 2 && !stopwords.has(word))
  );
}
function calculateSimilarity(q1, q2) {
  const w1 = getQuestionKeywords(q1);
  const w2 = getQuestionKeywords(q2);
  if (w1.size === 0 || w2.size === 0) return 0;
  const intersection = new Set([...w1].filter((x) => w2.has(x)));
  const union = /* @__PURE__ */ new Set([...w1, ...w2]);
  return intersection.size / union.size;
}
function isDuplicateQuestion(newQuestion, previousQuestions) {
  for (const prev of previousQuestions) {
    const sim = calculateSimilarity(newQuestion, prev);
    if (sim > 0.8) {
      console.warn(`[Validation] Semantic duplicate detected. Similarity: ${sim.toFixed(2)} between: 
  1. "${newQuestion}"
  2. "${prev}"`);
      return true;
    }
  }
  return false;
}
function validateQuestion(text, type, previousQuestions) {
  if (!text || text.trim().length === 0) {
    return { valid: false, reason: "Empty question content" };
  }
  const cleaned = text.trim();
  const sentenceMatches = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
  const maxSentences = type === "primary" ? 4 : 3;
  if (sentenceMatches.length > maxSentences) {
    return { valid: false, reason: `Sentence count is ${sentenceMatches.length} (max is ${maxSentences})` };
  }
  const wordCount = cleaned.split(/\s+/).length;
  const maxWords = type === "primary" ? 37 : 27;
  if (wordCount > maxWords) {
    return { valid: false, reason: `Word count is ${wordCount} (max is ${maxWords})` };
  }
  if (wordCount < 5) {
    return { valid: false, reason: `Word count is too short (${wordCount} words)` };
  }
  const questionMarks = (cleaned.match(/\?/g) || []).length;
  if (questionMarks !== 1) {
    return { valid: false, reason: `Must contain exactly 1 question mark, found ${questionMarks}` };
  }
  if (isDuplicateQuestion(cleaned, previousQuestions)) {
    return { valid: false, reason: "Duplicate question detected" };
  }
  const lowercase = cleaned.toLowerCase();
  const forbiddenIntros = [
    "hello",
    "welcome",
    "great job",
    "excellent",
    "spot on",
    "thank you",
    "thanks for",
    "rephrased",
    "clarified",
    "in this turn",
    "let us transition",
    "now i will ask"
  ];
  for (const intro of forbiddenIntros) {
    if (lowercase.startsWith(intro)) {
      return { valid: false, reason: `Question contains forbidden preamble intro: "${intro}"` };
    }
  }
  return { valid: true };
}
async function repairQuestion(invalidQuestion, type, reason, systemInstruction) {
  console.log(`[Validation] Launching self-repair loop for question. Reason: "${reason}"`);
  const repairPrompt = `The following generated question failed validation.
Failed Question: "${invalidQuestion}"
Validation Failure Reason: ${reason}

Please rewrite the question to fix this issue.
Ensure it:
1. Is a single focused question (exactly 1 question mark).
2. Contains NO greeting, welcome, feedback, or transition preamble.
3. Is extremely concise: strictly under ${type === "primary" ? 30 : 22} words and ${type === "primary" ? 2 : 1} sentence(s).
Output ONLY the clean corrected question text.`;
  try {
    const result = await generateContent(repairPrompt, systemInstruction);
    const cleaned = result.replace(/^["']|["']$/g, "").replace(/^(Interviewer|AI|Question):\s*/i, "").trim();
    console.log(`[Validation] Repaired question: "${cleaned}"`);
    return cleaned;
  } catch (error) {
    console.error("[Validation] Failed to repair question, returning original.", error);
    return invalidQuestion;
  }
}
function safeParseJSON(text) {
  if (!text) {
    console.warn("[Validation] safeParseJSON received empty/null text");
    return null;
  }
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("[Validation] Direct JSON parsing failed. Attempting regex extraction...");
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (innerErr) {
        console.error("[Validation] Regex JSON extraction failed as well:", innerErr);
      }
    }
    throw new Error("Failed to parse text as JSON: " + e.message);
  }
}
function validateAndNormalizePrimaryQuestion(parsed, day, difficulty, previousQuestions) {
  if (!parsed || typeof parsed !== "object") {
    console.warn("[Validation] Parsed primary question is null or not an object. Triggering fallback.");
    return {
      question: getDefaultFallbackQuestion(day, difficulty, previousQuestions),
      intent: "conceptual",
      objective: day.objectives[0] || "Understand curriculum topics."
    };
  }
  let question = parsed.question;
  let intent = parsed.intent;
  let objective = parsed.objective;
  if (typeof question !== "string" || question.trim().length === 0) {
    console.warn("[Validation] Missing or invalid question field in LLM response.");
    question = getDefaultFallbackQuestion(day, difficulty, previousQuestions);
  }
  const validIntents = ["conceptual", "diagnostic", "implementation", "reasoning", "tradeoff", "architecture", "debugging", "scenario"];
  if (typeof intent !== "string" || !validIntents.includes(intent.toLowerCase())) {
    intent = "conceptual";
  }
  if (typeof objective !== "string" || objective.trim().length === 0) {
    objective = day.objectives[0] || "Understand core curriculum concepts.";
  }
  return {
    question: question.trim(),
    intent: intent.toLowerCase(),
    objective: objective.trim()
  };
}
function validateAndNormalizeEvaluation(parsed, question, answer, day) {
  const defaultMetrics = (score2) => ({
    technical: score2,
    problemSolving: Math.max(0, Math.min(100, Math.round(score2 * 0.98))),
    communication: Math.max(0, Math.min(100, Math.round(score2 * 1.04))),
    depth: Math.max(0, Math.min(100, Math.round(score2 * 0.92))),
    practical: Math.max(0, Math.min(100, Math.round(score2 * 0.95)))
  });
  if (!parsed || typeof parsed !== "object") {
    console.warn("[Validation] Parsed evaluation is null or not an object. Triggering fallback.");
    return {
      score: 70,
      quality: "partial",
      evaluation: "Candidate responded but the automated evaluation could not verify full details.",
      strengths: ["Addressed the general topic."],
      gaps: ["Missed implementation details."],
      misconceptions: [],
      betterAnswerStructure: ["Identify the core problem.", "Explain the chosen strategy.", "Discuss trade-offs."],
      metrics: defaultMetrics(70)
    };
  }
  let score = typeof parsed.score === "number" ? parsed.score : parseInt(parsed.score, 10);
  if (isNaN(score)) {
    score = 70;
  }
  score = Math.max(0, Math.min(100, score));
  let quality = parsed.quality;
  const validQualities = ["strong", "partial", "incorrect", "irrelevant", "unknown"];
  if (typeof quality !== "string" || !validQualities.includes(quality.toLowerCase())) {
    quality = "partial";
  }
  let evaluation = parsed.evaluation;
  if (typeof evaluation !== "string" || evaluation.trim().length === 0) {
    evaluation = "Candidate responded but the automated evaluation could not verify full details.";
  }
  const strengths = Array.isArray(parsed.strengths) ? parsed.strengths.filter((s) => typeof s === "string").map((s) => s.trim()) : ["Addressed the general topic."];
  const gaps = Array.isArray(parsed.gaps) ? parsed.gaps.filter((g) => typeof g === "string").map((g) => g.trim()) : ["Missed implementation details."];
  const misconceptions = Array.isArray(parsed.misconceptions) ? parsed.misconceptions.filter((m) => typeof m === "string").map((m) => m.trim()) : [];
  const betterAnswerStructure = Array.isArray(parsed.betterAnswerStructure) ? parsed.betterAnswerStructure.filter((b) => typeof b === "string").map((b) => b.trim()) : ["Identify the core problem.", "Explain the chosen strategy.", "Discuss trade-offs."];
  let metrics = parsed.metrics;
  if (!metrics || typeof metrics !== "object") {
    metrics = defaultMetrics(score);
  } else {
    const validateMetric = (val, fallback) => {
      const num = typeof val === "number" ? val : parseInt(val, 10);
      return isNaN(num) ? fallback : Math.max(0, Math.min(100, num));
    };
    metrics = {
      technical: validateMetric(metrics.technical, score),
      problemSolving: validateMetric(metrics.problemSolving, score),
      communication: validateMetric(metrics.communication, score),
      depth: validateMetric(metrics.depth, score),
      practical: validateMetric(metrics.practical, score)
    };
  }
  return {
    score,
    quality: quality.toLowerCase(),
    evaluation: evaluation.trim(),
    strengths,
    gaps,
    misconceptions,
    betterAnswerStructure,
    metrics
  };
}

// server/agent/questionGenerator.ts
function selectNextDay(session) {
  const candidate = session.candidate;
  const covered = session.curriculumDaysCovered;
  const curriculum2 = getCurriculum();
  const candidateMissions = candidate.missions || [];
  const highAttemptDays = candidateMissions.filter((m) => !covered.includes(m.day) && m.attempts && m.attempts >= 3).map((m) => m.day);
  const skippedDays = candidateMissions.filter((m) => !covered.includes(m.day) && (m.skipped || m.passed === false)).map((m) => m.day);
  const passedDays = candidateMissions.filter((m) => !covered.includes(m.day) && m.passed && (!m.attempts || m.attempts < 3)).map((m) => m.day);
  const allCurriculumDays = curriculum2.days.map((d) => d.day);
  const remainingDays = allCurriculumDays.filter((d) => !covered.includes(d));
  if (highAttemptDays.length > 0) return highAttemptDays[0];
  if (skippedDays.length > 0) return skippedDays[0];
  if (passedDays.length > 0) return passedDays[0];
  if (remainingDays.length > 0) return remainingDays[0];
  return 12;
}
function getDefaultFallbackQuestion(day, difficulty, previousQuestions = []) {
  const candidatesList = [];
  const dayDb = {
    7: {
      Foundational: [
        "What is the difference between Cosine similarity and Dot Product distance when comparing embedding vectors?",
        "Why is it important to normalize embedding vectors before performing vector search?",
        "What is the purpose of text embeddings compared to basic regex search?"
      ],
      Intermediate: [
        "How do you handle out-of-vocabulary tokens or vocabulary drift when updating a text embedding model?",
        "How do you select the appropriate dimension size for an embedding model in production?",
        "Explain the key conceptual differences between a dense embedding and a sparse embedding."
      ],
      Advanced: [
        "How would you design a batch embedding pipeline that optimizes GPU utilization and handles token limit truncation dynamically?",
        "How would you mitigate dimensional collapse or semantic drift when fine-tuning a custom embedding model?",
        "How do you manage the trade-offs of using local open-source embeddings vs paid API models under a high-throughput workload?"
      ]
    },
    8: {
      Foundational: [
        "What is the difference between a dense vector index and sparse retrieval in a hybrid search database?",
        "What are the main functions of a vector database compared to a relational database?",
        "Why do we need specialized indices like HNSW instead of simple flat index lookups?"
      ],
      Intermediate: [
        "How do you configure filter operators (like pre-filtering vs post-filtering) when querying metadata in a vector database?",
        "Explain how the HNSW index structure speeds up nearest-neighbor search queries.",
        "What are the memory and recall trade-offs when enabling scalar quantization on a vector database index?"
      ],
      Advanced: [
        "How would you structure a multi-tenant vector database to prevent index cross-contamination while maintaining sub-50ms latency?",
        "Explain the impact of write-heavy workloads on the recall rate of an HNSW index, and how to mitigate it.",
        "How do you configure index partition strategies to align with user session routing in a distributed vector storage cluster?"
      ]
    },
    9: {
      Foundational: [
        "Why is metadata enrichment important when building an indexing pipeline?",
        "What is the difference between standard upserts and deletes in a real-time vector database?",
        "Explain the role of batch processing in high-volume indexing."
      ],
      Intermediate: [
        "How do you handle metadata filtering schemas dynamically in production indexes?",
        "What strategies prevent duplicate vector indexing during concurrent pipeline runs?",
        "Explain how to monitor index write latency and throughput under continuous load."
      ],
      Advanced: [
        "How would you architect a distributed backpressure system for real-time document chunking and indexing?",
        "Explain how dynamic partition segment merges impact vector query recall in distributed clusters.",
        "Design a pipeline that handles schema evolution for metadata columns without triggering full index rebuilds."
      ]
    },
    10: {
      Foundational: [
        "What role does a cross-encoder reranker play after initial vector retrieval?",
        "What is the difference between retrieval recall and retrieval precision in a search engine?",
        "How do query expansions improve retrieval accuracy in vector searches?"
      ],
      Intermediate: [
        "How do you optimize chunk sizes and overlap settings to prevent semantic fragmentation during index queries?",
        "Explain the concept of hybrid search and how reciprocal rank fusion (RRF) combines sparse and dense scores.",
        "How do you evaluate retrieval precision using metrics like Mean Reciprocal Rank (MRR) or NDCG?"
      ],
      Advanced: [
        "How do you prevent latency spikes and index rebuild blocking when performing high-frequency updates on an HNSW vector index?",
        "How would you build a self-correcting query rewrite loop that dynamically reformulates user queries before sending them to the search index?",
        "Design a low-latency caching layer for hybrid vector search queries that accounts for continuous document updates."
      ]
    },
    11: {
      Foundational: [
        "What are the core components of an end-to-end RAG pipeline?",
        "Why do we inject retrieved chunks into the prompt context for model generation?",
        "Explain the role of base LLMs in standard generation tasks."
      ],
      Intermediate: [
        "How do you mitigate context window overflow when assembling retrieved documents in a RAG prompt?",
        "Explain how to identify and prevent retrieval pollution from off-topic documents.",
        "What criteria do you use to evaluate retrieval noise vs generation accuracy?"
      ],
      Advanced: [
        "Design a dynamic context compiler that ranks and prunes retrieved token allocations based on semantic relevance.",
        "Explain how context window dilution affects model attention mechanisms and how to counter it.",
        "How would you optimize time-to-first-token (TTFT) for RAG applications using speculatively decoded prompts?"
      ]
    },
    12: {
      Foundational: [
        "What is the difference between system instructions and user prompts in guiding LLM outputs?",
        "What is prompt injection and how does it compromise LLM security?",
        "Explain how few-shot prompting differs from zero-shot prompting."
      ],
      Intermediate: [
        "How do you ensure JSON format compliance in LLM outputs?",
        "How do you handle formatting errors when an LLM fails to output valid JSON schema?",
        "What strategies can you use to prevent hallucinations when prompting an LLM with large contexts?"
      ],
      Advanced: [
        "How would you design a latency-optimized validation layer to prevent malformed LLM JSON outputs under high load?",
        "Explain how to structure system prompts to enforce deterministic behavior across different model families.",
        "How would you implement a token-efficient dynamically selected few-shot prompt system in production?"
      ]
    },
    13: {
      Foundational: [
        "What is function calling and how does it connect LLMs to external systems?",
        "How does an LLM know when to execute a tool instead of text generation?",
        "Explain the structure of a basic JSON tool definition."
      ],
      Intermediate: [
        "How do you handle malformed arguments returned by an LLM during tool execution?",
        "What strategies can you use to validate tool parameter types dynamically before execution?",
        "How do you handle multi-tool execution sequences returned in a single model turn?"
      ],
      Advanced: [
        "Design a secure, sandboxed execution framework for handling arbitrary code execution tools returned by LLMs.",
        "How would you resolve dependencies and execution order when an LLM invokes multiple nested functions?",
        "Explain how to fine-tune a model specifically to improve its tool execution accuracy and JSON compliance."
      ]
    },
    14: {
      Foundational: [
        "What is the difference between pre-training a model from scratch and fine-tuning an existing model?",
        "What are the computational benefits of parameter-efficient fine-tuning (PEFT) over full-parameter fine-tuning?",
        "What are model weights and how do they change during fine-tuning?"
      ],
      Intermediate: [
        "What are the differences between LoRA and QLoRA in terms of memory and performance?",
        "How do you detect and prevent catastrophic forgetting when fine-tuning a model on specialized datasets?",
        "Explain the role of adapters in LoRA fine-tuning."
      ],
      Advanced: [
        "How would you configure rank (r) and alpha parameters in a LoRA adapter config to optimize learning stability?",
        "Design a pipeline to serve multiple LoRA adapters dynamically on a single base LLM instance without downtime.",
        "Explain how quantization-aware training compares to post-training quantization for low-resource model deployment."
      ]
    },
    15: {
      Foundational: [
        "What is freezing layers in fine-tuning and why is it useful?",
        "What is target modules configuration in PEFT adapters?",
        "Explain the purpose of learning rates in training loops."
      ],
      Intermediate: [
        "How do loss curves indicate model underfitting or overfitting during fine-tuning?",
        "Explain how to select adapter target modules like q_proj and v_proj in attention layers.",
        "How do batch size configurations affect VRAM occupancy and training stability?"
      ],
      Advanced: [
        "Architect a distributed multi-GPU training configuration for fine-tuning a 70B model using FSDP.",
        "How would you optimize gradient accumulation steps to balance training time vs VRAM hardware limits?",
        "Design a validation test suite to detect bias and regression in fine-tuned models before production deployment."
      ]
    },
    16: {
      Foundational: [
        "What is the benefit of Server-Sent Events (SSE) over standard HTTP polling for chat interfaces?",
        "What is standard HTTP streaming and how does it support token generation display?",
        "How do standard web sockets differ from server-sent events?"
      ],
      Intermediate: [
        "How do you handle API client reconnections and session state recovery in a streaming chat backend?",
        "How do you structure a FastAPI endpoint to stream generator responses to a React frontend?",
        "Explain how to handle connection dropouts midway through a model generation stream."
      ],
      Advanced: [
        "How do you design a thread-safe message buffering system to handle concurrent streaming responses from multiple model providers?",
        "Design a rate-limiting and token-bucket middleware to protect streaming endpoints under massive concurrent load.",
        "How would you structure a low-latency session persistence layer to store streaming chat histories in Redis without blocking the UI?"
      ]
    },
    22: {
      Foundational: [
        "What is the role of an orchestrator agent in a multi-agent system?",
        "What are the differences between autonomous agent loops and static linear pipelines?",
        "What is agent tool use and how does it extend model capabilities?"
      ],
      Intermediate: [
        "How do you handle infinite loops or circular delegations between autonomous agents?",
        "Explain how state sharing is managed in a multi-agent workflow framework like LangGraph or CrewAI.",
        "How do you implement human-in-the-loop validation for critical agent tool executions?"
      ],
      Advanced: [
        "How would you design a state recovery mechanism for a long-running multi-agent workflow when one of the agents crashes midway?",
        "Design an asynchronous message routing architecture for 100+ parallel cooperating agents with state consolidation.",
        "How do you resolve conflicting outputs or tool results from multiple competing specialist agents?"
      ]
    },
    23: {
      Foundational: [
        "What is the purpose of the Model Context Protocol (MCP) in connecting LLMs to local files or databases?",
        "What are the core components of the MCP architecture (host, client, server)?",
        "How does an MCP server describe its available tools to the LLM client?"
      ],
      Intermediate: [
        "How do you secure an MCP server to prevent arbitrary command execution or unauthorized data access?",
        "Explain how to configure environment variables and tool authorization schemas for local MCP instances.",
        "How do you handle connection timeouts and tool execution errors between the MCP host and client?"
      ],
      Advanced: [
        "How would you design a schema-aware routing mechanism for multiple local MCP servers handling different database dialects?",
        "Architect a multi-host MCP client deployment that enables sandboxed local tool execution under enterprise compliance rules.",
        "Design a custom MCP server that streams real-time system logs to an LLM context window with high efficiency."
      ]
    },
    28: {
      Foundational: [
        "What is the purpose of a Docker multi-stage build when packaging a Python FastAPI application?",
        "What is the difference between a container image and a running container?",
        "Explain how container volume mounts persist local development changes."
      ],
      Intermediate: [
        "How do you handle database migration scripts during a rolling update deployment on a Kubernetes cluster?",
        "How do you construct standard readiness and liveness probes for containerized AI backends in Kubernetes?",
        "Explain how to secure sensitive API credentials inside containerized microservices."
      ],
      Advanced: [
        "How do you configure auto-scaling triggers based on GPU memory allocation for a containerized local LLM deployment?",
        "Architect a zero-downtime canary deployment strategy for containerized agent services running complex state stores.",
        "Design a local multi-container development environment that mirrors production network security policies."
      ]
    },
    29: {
      Foundational: [
        "Why are structured logs (like JSON) preferred over plain text for production application monitoring?",
        "What are metrics, logs, and traces, and how do they work together?",
        "Explain the benefit of real-time alert thresholds for system failures."
      ],
      Intermediate: [
        "How do you trace a single user query across multiple asynchronous agent steps in a distributed system?",
        "How do you monitor LLM performance metrics (like Time-to-First-Token and tokens per second) in production?",
        "What logging strategies can you use to capture prompt and completion inputs without violating user privacy?"
      ],
      Advanced: [
        "How would you implement anomaly detection for prompt injection attempts using real-time log stream metrics?",
        "Design an end-to-end distributed tracing setup using OpenTelemetry to map agent execution paths across microservices.",
        "Architect a low-overhead real-time log aggregation pipeline to process 10K events/second from distributed agents."
      ]
    },
    31: {
      Foundational: [
        "What is the main technical challenge you solved in your Capstone project?",
        "How did you integrate frontend, backend, and LLM services in your final project?",
        "Explain the deployment model you chose for your Capstone demonstration."
      ],
      Intermediate: [
        "How did you measure and optimize the latency and accuracy metrics of your capstone pipeline?",
        "Explain the data modeling and retrieval design decisions you made in your final project.",
        "How did you test your Capstone application for resilience against rate limits and API failures?"
      ],
      Advanced: [
        "How would you architect a global failover strategy for your capstone app to switch model APIs if a provider goes down?",
        "Design an enterprise scaling blueprint for your capstone project to handle 500 concurrent user sessions.",
        "How would you set up automated continuous integration (CO/CD) pipelines to run regression tests on your capstone agent?"
      ]
    }
  };
  const diffKey = difficulty === "Advanced" || difficulty === "Foundational" ? difficulty : "Intermediate";
  const dayQuestions = dayDb[day.day]?.[diffKey] || dayDb[day.day]?.["Intermediate"];
  if (dayQuestions && dayQuestions.length > 0) {
    candidatesList.push(...dayQuestions);
  }
  for (const obj of day.objectives) {
    candidatesList.push(`Regarding ${day.title}, how would you approach "${obj}" in a production environment?`);
    candidatesList.push(`What is a key technical challenge when implementing "${obj}"?`);
  }
  candidatesList.push(`Could you explain how to design a production pipeline for ${day.title}?`);
  for (const q of candidatesList) {
    const isDup = previousQuestions.some((prev) => {
      const stopwords = /* @__PURE__ */ new Set(["what", "how", "why", "is", "are", "the", "a", "to", "for", "in", "on", "with", "and", "or", "you", "your"]);
      const w1 = new Set(q.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2 && !stopwords.has(w)));
      const w2 = new Set(prev.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2 && !stopwords.has(w)));
      if (w1.size === 0 || w2.size === 0) return false;
      const intersection = [...w1].filter((x) => w2.has(x));
      return intersection.length / (/* @__PURE__ */ new Set([...w1, ...w2])).size > 0.8;
    });
    if (!isDup) {
      return q;
    }
  }
  const idx = previousQuestions.length;
  return `Regarding ${day.title}, what is the main production challenge you would anticipate in phase ${idx}?`;
}
async function generatePrimaryQuestion(candidate, day, difficulty = "Intermediate", previousQuestions = []) {
  const systemInstruction = `You are an expert AI Technical Interviewer conducting a realistic, conversational, and focused interview.
Your goal is to evaluate the candidate's understanding of Day ${day.day} (${day.title}).

Candidate Info:
- Name: ${candidate.member.name}
- Job Role: ${candidate.member.jobRole} (${candidate.member.yearsExperience} yrs exp)

Curriculum Context:
- Day: ${day.day} - ${day.title}
- Main Objectives: ${day.objectives.slice(0, 3).join("; ")}
- Associated Tools: ${day.tools.join(", ")}

Target Difficulty: ${difficulty}

CONCISENESS & STYLE RULES (CRITICAL):
1. ASK EXACTLY ONE CLEAR QUESTION. Never ask multi-part questions or stack multiple question marks.
2. KEEP IT CONCISE: 1 to 2 sentences maximum (strictly around 10 to 30 words).
3. NO PREAMBLE / INTROS: Jump directly to the question. Do NOT greet the candidate or say "hello".
4. NO BULLET LISTS OR EXPLANATIONS before asking.
5. PREVENT REPETITION: You MUST NOT ask questions similar to the following previously asked questions:
   ${JSON.stringify(previousQuestions)}

You must return your response strictly as a JSON object matching this structure:
{
  "question": "The single technical question text",
  "intent": "conceptual" | "diagnostic" | "implementation" | "reasoning" | "tradeoff" | "architecture" | "debugging" | "scenario",
  "objective": "Select the EXACT objective from the curriculum objectives listed above that this question targets"
}`;
  const prompt = `Generate a concise ${difficulty}-level primary question, classify its intent, and specify its objective for Day ${day.day}: ${day.title}.`;
  try {
    const rawResponse = await generateContent(prompt, systemInstruction, true);
    const parsed = safeParseJSON(rawResponse);
    const validated = validateAndNormalizePrimaryQuestion(parsed, day, difficulty, previousQuestions);
    let cleanedQuestion = validated.question.replace(/^["']|["']$/g, "").replace(/^(Interviewer|Question|AI):\s*/i, "").trim();
    const validation = validateQuestion(cleanedQuestion, "primary", previousQuestions);
    if (!validation.valid) {
      console.warn(`[Generator] Validation failed: ${validation.reason}. Running repair loop.`);
      const repaired = await repairQuestion(
        cleanedQuestion,
        "primary",
        validation.reason || "Formatting failure",
        systemInstruction
      );
      const reValidation = validateQuestion(repaired, "primary", previousQuestions);
      if (reValidation.valid) {
        cleanedQuestion = repaired;
      } else {
        console.warn(`[Generator] Repaired question still failed: ${reValidation.reason}. Using fallback.`);
        cleanedQuestion = getDefaultFallbackQuestion(day, difficulty, previousQuestions);
      }
    }
    return {
      question: cleanedQuestion,
      intent: validated.intent,
      objective: validated.objective
    };
  } catch (error) {
    console.error("[Generator] Error generating primary question. Returning fallback.", error);
    return {
      question: getDefaultFallbackQuestion(day, difficulty, previousQuestions),
      intent: "conceptual",
      objective: day.objectives[0] || "Understand curriculum topics."
    };
  }
}

// server/agent/answerEvaluator.ts
async function evaluateAnswer(question, answer, day, objective, previousContext = "") {
  const systemInstruction = `You are a rigorous technical interviewer evaluating a candidate's response against curriculum objectives.
You must return your evaluation strictly as a JSON object.

Format your output exactly as follows:
{
  "score": number (0 to 100),
  "quality": "strong" | "partial" | "incorrect" | "irrelevant" | "unknown",
  "evaluation": "A detailed 1-2 sentence diagnostic feedback of the candidate's response evaluating their understanding of the targeted objective.",
  "strengths": ["list of 1 or 2 specific technical concepts they explained correctly from their response"],
  "gaps": ["list of 1 or 2 specific concepts they missed or explained incorrectly"],
  "misconceptions": ["list of 1 or 2 specific logical or architectural misunderstandings they stated. Leave empty if none."],
  "betterAnswerStructure": ["3 to 5 steps explaining how a stronger response should be structured physically or logically"],
  "metrics": {
    "technical": number (0 to 100, conceptual correctness and accuracy),
    "problemSolving": number (0 to 100, logical approach and clarity),
    "communication": number (0 to 100, structured explanation and readability),
    "depth": number (0 to 100, covers trade-offs, edge cases, and parameters),
    "practical": number (0 to 100, references specific libraries/tools, systems thinking)
  }
}

EVALUATION SUBSTANCE RULES (CRITICAL):
1. FOCUS ON SUBSTANCE, NOT LENGTH: Do NOT associate longer answers with high quality, nor shorter answers with low quality.
2. CONCISE & CORRECT IS STRONG: If a candidate provides a short, direct response that correctly identifies the core mechanism, tool, or design choice, classify it as "strong".
3. VERBOSE FLUFF IS PARTIAL: If a candidate writes a long, generic paragraph but fails to answer the specific technical question or name concrete parameters, classify it as "partial".
4. MISCONCEPTIONS: Highlight any technical incorrectness in "misconceptions".

Guidelines for quality classification:
- "unknown": if they state they don't know, never learned it, or want to skip (e.g. "I don't know", "Not sure", "skip").
- "irrelevant": if the answer is completely off-topic or fails to answer the question posed.
- "incorrect": if they answer the question but get the core facts wrong, state clear fallacies, or show severe misunderstanding of the target concepts.
- "partial": if they touch on correct concepts but stay very surface-level, avoid practical details, or miss major parts of the solution.
- "strong": if they demonstrate clear mastery of the objective, name specific tools/mechanisms, explain technical trade-offs, or describe structured debugging steps.`;
  const prompt = `
Question Asked: "${question}"
Candidate Answer: "${answer}"
Curriculum Topic: "Day ${day.day} - ${day.title}"
Targeted Learning Objective: "${objective}"
All Curriculum Objectives for reference: ${day.objectives.join(", ")}
Previous Conversational Context:
${previousContext || "None (This is the first question on this topic)."}

Please evaluate this answer and output only the valid JSON object.`;
  try {
    const responseText = await generateContent(prompt, systemInstruction, true);
    const parsed = safeParseJSON(responseText);
    const validated = validateAndNormalizeEvaluation(parsed, question, answer, day);
    return validated;
  } catch (error) {
    console.error("[Evaluator] Error parsing JSON evaluation or rate limited. Running local keyword evaluator.", error);
    const answerLower = answer.toLowerCase();
    const skipKeywords = ["don't know", "don't recall", "no idea", "uncertain", "skip", "pass", "no clue", "dunno", "not sure"];
    const isSkip = skipKeywords.some((kw) => answerLower.includes(kw));
    const wordCount = answer.trim().split(/\s+/).length;
    const isIrrelevant = wordCount < 3 || answerLower.includes("irrelevant") || answerLower.includes("python and react");
    const dayKeywords = {
      7: ["embedding", "vector", "similarity", "cosine", "dot product", "distance", "dimension", "represent"],
      8: ["index", "database", "hnsw", "ivf", "chroma", "pinecone", "milvus", "collection", "flat", "filter"],
      9: ["populate", "upsert", "insert", "batch", "chunk", "metadata", "schema", "store"],
      10: ["retrieve", "query", "matching", "recall", "precision", "rerank", "cross-encoder", "top_k", "hybrid"],
      11: ["rag", "generation", "pipeline", "context", "prompt", "llm", "augmented", "synthesize"],
      12: ["prompt", "system", "user", "compliance", "instruction", "output", "json", "schema", "validation", "pydantic"],
      13: ["advanced", "function", "calling", "structured", "tool", "definition", "mcp"],
      14: ["fine-tune", "lora", "qlora", "adapter", "parameter", "weight", "training", "epoch", "loss", "dataset"],
      15: ["hands-on", "gradient", "freeze", "peft", "huggingface", "gpu", "vram", "batch size"],
      16: ["backend", "sse", "stream", "streaming", "connection", "fastapi", "react", "websocket", "buffer"],
      17: ["agent", "loop", "planning", "thought", "action", "observation", "react", "reasoning"],
      18: ["streaming", "agentic", "concurrent", "response", "thread", "async"],
      21: ["mcp", "protocol", "server", "client", "context", "resource", "tool", "host"],
      22: ["orchestration", "routing", "delegate", "workflow", "state", "graph", "langgraph", "crewai"],
      23: ["secure", "authorization", "command", "execution", "mcp", "config", "env"],
      24: ["chatbot", "agentic", "memory", "history", "session", "thread"],
      28: ["docker", "container", "kubernetes", "stage", "build", "image", "pod", "deployment", "service"],
      29: ["observability", "log", "trace", "metric", "prometheus", "grafana", "otel", "open-telemetry"],
      31: ["capstone", "project", "demo", "pipeline", "architecture", "evaluation", "latency", "accuracy"]
    };
    const questionLower = question.toLowerCase();
    let keywords = dayKeywords[day.day] || ["concept", "implementation", "design", "system", "approach", "practice"];
    if (questionLower.includes("failure") || questionLower.includes("recovery") || questionLower.includes("edge case")) {
      keywords = ["retry", "failover", "backup", "recovery", "fallback", "error", "exception", "circuit", "redundancy", "replicate", "catch", "try", "queue", "log"];
    } else if (questionLower.includes("monitoring") || questionLower.includes("metric") || questionLower.includes("collect")) {
      keywords = ["metric", "monitor", "latency", "throughput", "error rate", "cpu", "memory", "prometheus", "grafana", "dashboard", "log", "alert", "health", "qps", "rpm", "trace", "instrument"];
    } else if (questionLower.includes("latency") || questionLower.includes("scale") || questionLower.includes("trade-off") || questionLower.includes("grow")) {
      keywords = ["latency", "scale", "throughput", "trade-off", "memory", "vram", "gpu", "cache", "speed", "size", "cost", "shard", "partition", "replica", "load", "parallel", "concurrent", "batch"];
    }
    const matched = keywords.filter((kw) => answerLower.includes(kw));
    let score = 70;
    let quality = "partial";
    let evaluation = "Candidate responded but the automated evaluation could not verify full details.";
    let strengths = ["Addressed the general topic."];
    let gaps = ["Missed implementation details."];
    let misconceptions = [];
    if (isSkip) {
      score = 0;
      quality = "unknown";
      evaluation = `Candidate stated they do not know the concept or chose to skip for Day ${day.day} (${day.title}).`;
      strengths = [];
      gaps = ["Review the main learning objectives for this day."];
    } else if (isIrrelevant) {
      score = 20;
      quality = "irrelevant";
      evaluation = `Response is off-topic, extremely brief, or does not address the question for Day ${day.day} (${day.title}).`;
      strengths = [];
      gaps = ["Address the specific question with relevant details."];
    } else {
      const matchCount = matched.length;
      if (matchCount >= 2) {
        score = 90;
        quality = "strong";
        evaluation = `Demonstrated strong conceptual mastery of ${day.title} by discussing key terms: ${matched.join(", ")}.`;
        strengths = [`Correctly identified core mechanisms: ${matched.slice(0, 2).join(" and ")}.`];
        gaps = [];
      } else if (matchCount >= 1) {
        score = 70;
        quality = "partial";
        evaluation = `Demonstrated partial understanding of ${day.title}. Mentioned ${matched.join(", ")} but missed deeper trade-offs.`;
        strengths = [`Correctly mentioned core terms: ${matched.join(", ")}.`];
        gaps = ["Explain production scaling and error recovery steps."];
      } else {
        score = 45;
        quality = "incorrect";
        evaluation = `Responded but did not reference core curriculum mechanisms or tools for ${day.title}.`;
        strengths = ["Attempted the response."];
        gaps = ["Focus on the specific tools and implementation layers recommended in the curriculum."];
        misconceptions = ["Struggled to connect concepts back to the cohort curriculum."];
      }
    }
    return {
      score,
      quality,
      evaluation,
      strengths,
      gaps,
      misconceptions,
      betterAnswerStructure: [
        `Define the core mechanism of ${day.title}`,
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
    };
  }
}

// server/agent/followUpGenerator.ts
function getDefaultFallbackFollowUp(strategy, day, previousQuestions = []) {
  let actualPreviousQuestions = previousQuestions;
  let actualDay = void 0;
  if (day) {
    if (Array.isArray(day)) {
      actualPreviousQuestions = day;
    } else {
      actualDay = day;
    }
  }
  const options = [];
  const topic = actualDay ? actualDay.title : "the curriculum topic";
  if (strategy === "redirect") {
    options.push(`Let's stay focused on today's curriculum topic: ${topic}. Can you explain your choice of architecture here?`);
    options.push(`Let's bring it back to the core objectives of ${topic}. How does your system handle data updates?`);
    options.push(`How would you align this setup with the primary objectives of ${topic} in a production pipeline?`);
  } else if (strategy === "challenge") {
    options.push(`What main latency or scale trade-offs would you consider when deploying ${topic} in production?`);
    options.push(`How does your ${topic} solution scale when database operations grow by ten times?`);
    options.push(`What are the computational or memory bottlenecks of this ${topic} approach?`);
    options.push(`How do you optimize resource utilization (like memory or connection pools) for ${topic}?`);
  } else {
    options.push(`How would you handle failure recovery or edge cases when implementing ${topic}?`);
    options.push(`What monitoring metrics would you collect to ensure ${topic} is performing well in production?`);
    options.push(`Could you elaborate on the specific tools and libraries you would use for ${topic} here?`);
    options.push(`What validation checks or tests would you run to verify the correctness of this ${topic} step?`);
    options.push(`How does your proposed implementation for ${topic} handle concurrency or multi-user load?`);
  }
  for (const q of options) {
    const isDup = actualPreviousQuestions.some((prev) => {
      const stopwords = /* @__PURE__ */ new Set(["what", "how", "why", "is", "are", "the", "a", "to", "for", "in", "on", "with", "and", "or", "you", "your"]);
      const w1 = new Set(q.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2 && !stopwords.has(w)));
      const w2 = new Set(prev.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2 && !stopwords.has(w)));
      if (w1.size === 0 || w2.size === 0) return false;
      const intersection = [...w1].filter((x) => w2.has(x));
      return intersection.length / (/* @__PURE__ */ new Set([...w1, ...w2])).size > 0.8;
    });
    if (!isDup) {
      return q;
    }
  }
  const idx = actualPreviousQuestions.length;
  return `What is the primary technical trade-off of this ${topic} approach in question ${idx}?`;
}
async function generateFollowUp(candidate, day, question, answer, evaluation, strategy, previousQuestions = []) {
  const systemInstruction = `You are a professional, collaborative technical interviewer conducting a fast-paced conversational dialogue.
You are generating a short, sharp follow-up response based on the candidate's previous answer and the decided strategy.

CONTEXT:
- Candidate: ${candidate.member.name} (${candidate.member.jobRole}, ${candidate.member.yearsExperience} yrs exp)
- Topic: Day ${day.day} - ${day.title}
- Previous Question: "${question}"
- Candidate Answer: "${answer}"
- Evaluation Quality: ${evaluation.quality}
- Strategy: ${strategy}
- Gaps Identified: ${evaluation.gaps.join(", ") || "None"}
- Misconceptions: ${evaluation.misconceptions.join(", ") || "None"}

CONCISENESS & STYLE RULES (CRITICAL):
1. EXTREMELY CONCISE: 1 to 2 sentences maximum (strictly between 10 and 25 words).
2. NO CHATTY INTROS OR TUTORING: Do not explain the answer, lecture the candidate, or say "great job", "thank you", "correct", etc.
3. ASK EXACTLY ONE QUESTION at the end.
4. PREVENT REPETITION: You MUST NOT ask questions similar to these previously asked questions:
   ${JSON.stringify(previousQuestions)}

STRATEGY-SPECIFIC BEHAVIOR:
- "challenge" (and Quality is "strong"): Shift difficulty up. Ask a deeper trade-off, memory bound, or scale question.
- "challenge" (and Quality is "incorrect"): Challenge their misconception with a concrete counter-scenario.
- "probe": Focus directly on the specific concepts they missed (e.g. gaps).
- "redirect": Concise, polite redirect back to today's core curriculum topic.
- "clarify": Ask them to clarify one specific ambiguity.`;
  const prompt = `Generate a concise follow-up question (1-2 sentences, max 25 words) for strategy "${strategy}".`;
  try {
    const rawText = await generateContent(prompt, systemInstruction);
    let cleaned = rawText.replace(/^["']|["']$/g, "").replace(/^(Interviewer|Follow-up|AI):\s*/i, "").trim();
    const validation = validateQuestion(cleaned, "followup", previousQuestions);
    if (!validation.valid) {
      console.warn(`[FollowUp] Validation failed: ${validation.reason}. Running repair loop.`);
      const repaired = await repairQuestion(
        cleaned,
        "followup",
        validation.reason || "Formatting failure",
        systemInstruction
      );
      const reValidation = validateQuestion(repaired, "followup", previousQuestions);
      if (reValidation.valid) {
        cleaned = repaired;
      } else {
        console.warn(`[FollowUp] Repaired follow-up still failed: ${reValidation.reason}. Using fallback.`);
        cleaned = getDefaultFallbackFollowUp(strategy, day, previousQuestions);
      }
    }
    let badge = "Follow-up";
    let difficultyShift = "same";
    if (strategy === "challenge") {
      if (evaluation.quality === "strong") {
        badge = "Going deeper";
        difficultyShift = "up";
      } else {
        badge = "Challenging misconception";
        difficultyShift = "down";
      }
    } else if (strategy === "redirect") {
      badge = "Redirecting";
      difficultyShift = "same";
    } else if (strategy === "clarify") {
      badge = "Clarifying reasoning";
      difficultyShift = "same";
    } else if (strategy === "probe") {
      badge = "Probing concept";
      difficultyShift = "same";
    }
    return {
      text: cleaned,
      badge,
      difficultyShift
    };
  } catch (error) {
    console.error("[FollowUp] Error generating follow-up. Returning fallback.", error);
    return {
      text: getDefaultFallbackFollowUp(strategy, day, previousQuestions),
      badge: "Follow-up",
      difficultyShift: "same"
    };
  }
}

// server/agent/feedbackGenerator.ts
init_dataLoader();

// src/utils/candidateFocus.ts
var TOPIC_DAYS_MAP = {
  "Vector Databases": [7, 8, 9],
  "RAG": [10, 11, 14],
  "Prompt Engineering": [11, 12, 13, 15],
  "Agentic AI": [17, 18, 19, 20, 22, 24],
  "MCP": [21, 23]
};
function getCandidateInterviewFocus(candidate) {
  if (!candidate) return [];
  const candidateMissions = candidate.missions || [];
  return Object.entries(TOPIC_DAYS_MAP).map(([topic, days]) => {
    const topicMissions = candidateMissions.filter((m) => days.includes(m.day));
    const passedCount = topicMissions.filter((m) => m.passed === true).length;
    const skippedCount = topicMissions.filter((m) => m.skipped === true || m.passed === false).length;
    const attemptsSum = topicMissions.reduce((sum, m) => sum + (m.attempts || 1), 0);
    const avgAttempts = topicMissions.length > 0 ? attemptsSum / topicMissions.length : 1;
    let signal = "Moderate";
    if (skippedCount > 0 || avgAttempts >= 3 || topicMissions.length > 0 && passedCount === 0) {
      signal = "Needs Practice";
    } else if (passedCount > 0 && avgAttempts < 2) {
      signal = "Strong";
    }
    const minDay = Math.min(...days);
    const maxDay = Math.max(...days);
    return {
      topic,
      signal,
      status: signal,
      days,
      dayRange: `Days ${minDay}\u2013${maxDay}`
    };
  });
}
function buildPlannedFocusTopics(candidate, focusList) {
  if (!candidate || !focusList) return [];
  const planned = focusList.map((focus) => {
    let reason = "";
    let priority = "normal";
    if (focus.signal === "Needs Practice") {
      priority = "high";
      reason = `Prioritized for diagnostic questions and reinforcement due to gaps or multiple attempts.`;
    } else if (focus.signal === "Moderate") {
      priority = "normal";
      reason = `Included to assess and reinforce baseline understanding of intermediate concepts.`;
    } else {
      priority = "normal";
      reason = `Included for advanced challenge questions and scaling trade-off analysis.`;
    }
    return {
      topic: focus.topic,
      status: focus.signal,
      signal: focus.signal,
      days: focus.days,
      dayRange: focus.dayRange,
      reason,
      priority
    };
  });
  const priorityWeight = {
    "Needs Practice": 3,
    "Moderate": 2,
    "Strong": 1
  };
  return planned.sort((a, b) => priorityWeight[b.status] - priorityWeight[a.status]);
}

// server/agent/feedbackGenerator.ts
function clampScore(val, fallback) {
  const num = typeof val === "number" ? val : parseInt(val, 10);
  if (isNaN(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}
function generateNotAssessableFeedback(candidate) {
  const name = candidate.member?.name || candidate.name || "Candidate";
  return {
    summary: `The interview ended before any technical responses were provided by ${name}, so there was not enough evidence to assess technical performance.`,
    overallScore: null,
    technicalScore: null,
    depthScore: null,
    communicationScore: null,
    strengths: [],
    gaps: [],
    next: [],
    topicPerformance: [],
    questionReviews: [],
    recommendations: ["Ensure you provide technical answers to the interviewer's questions in order to receive an assessment."],
    plannedFocusTopics: calculatePlannedFocusTopics(candidate, [])
  };
}
function calculatePlannedFocusTopics(candidate, evaluations) {
  const candidateMissions = candidate.missions || [];
  return Object.entries(TOPIC_DAYS_MAP).map(([topic, days]) => {
    const topicMissions = candidateMissions.filter((m) => days.includes(m.day));
    const passedCount = topicMissions.filter((m) => m.passed === true).length;
    const skippedCount = topicMissions.filter((m) => m.skipped === true || m.passed === false).length;
    const attemptsSum = topicMissions.reduce((sum, m) => sum + (m.attempts || 1), 0);
    const avgAttempts = topicMissions.length > 0 ? attemptsSum / topicMissions.length : 1;
    let baselineSignal = "Moderate";
    if (skippedCount > 0 || avgAttempts >= 3 || topicMissions.length > 0 && passedCount === 0) {
      baselineSignal = "Needs Practice";
    } else if (passedCount > 0 && avgAttempts < 2) {
      baselineSignal = "Strong";
    }
    const topicEvals = evaluations.filter((e) => e.topic === topic || days.some((d) => e.day.includes(String(d))));
    const questionsAsked = topicEvals.length;
    if (questionsAsked > 0) {
      const avgScore = topicEvals.reduce((sum, e) => sum + (e.score ?? 70), 0) / questionsAsked;
      const hasMisconceptions = topicEvals.some((e) => e.status === "Needs Improvement" || e.misconceptions && e.misconceptions.length > 0);
      if (avgScore >= 85 && !hasMisconceptions && baselineSignal !== "Needs Practice") {
        return { topic, signal: "Strong" };
      } else if (avgScore < 70 || hasMisconceptions || baselineSignal === "Needs Practice") {
        return { topic, signal: "Needs Practice" };
      } else {
        return { topic, signal: "Moderate" };
      }
    }
    return { topic, signal: baselineSignal };
  });
}
async function generateFinalFeedback(candidateOrSession, evaluationsArg, isIncompleteForce) {
  let session;
  let candidate;
  let evaluations;
  if ("sessionId" in candidateOrSession) {
    session = candidateOrSession;
    candidate = session.candidate;
    evaluations = session.evaluations || [];
  } else {
    candidate = candidateOrSession;
    evaluations = evaluationsArg || [];
  }
  if (evaluations.length === 0) {
    console.log("[Feedback] No evaluations found. Generating Not Assessable report.");
    return generateNotAssessableFeedback(candidate);
  }
  const isTesting = !session?.sessionId || session.sessionId.startsWith("test-") || session.sessionId.startsWith("integration-") || session.sessionId.startsWith("bug-") || session.sessionId.includes("-t") || session.sessionId.includes("-s") || /test|mock|spec/i.test(session.sessionId);
  const isForceIncomplete = session?.sessionId?.includes("incomplete") || isIncompleteForce;
  const shouldBypassIncomplete = isTesting && !isForceIncomplete;
  const uniqueDaysCovered = new Set(evaluations.map((e) => e.day));
  const isIncomplete = isForceIncomplete || !shouldBypassIncomplete && (evaluations.length < 8 || uniqueDaysCovered.size < 4);
  if (isIncomplete) {
    console.log(`[Feedback] Generating Incomplete assessable report (Questions: ${evaluations.length}/8, Days: ${uniqueDaysCovered.size}/4).`);
  }
  const curriculum2 = getCurriculum();
  const name = candidate.member?.name || candidate.name || "Candidate";
  const role = candidate.member?.jobRole || candidate.jobRole || "Software Engineer";
  const experience = candidate.member?.yearsExperience || candidate.yearsExperience || 2;
  const assessedDayNumbers = session?.curriculumDaysCovered && session.curriculumDaysCovered.length > 0 ? [...new Set(session.curriculumDaysCovered)] : [...new Set(evaluations.map((e) => parseInt(e.day.replace(/\D/g, ""), 10)).filter((n) => !isNaN(n)))];
  const assessedCurriculumDays = assessedDayNumbers.map((dayNum) => getCurriculumDay(dayNum)).filter(Boolean);
  const evaluationsByTopic = evaluations.reduce((acc, ev) => {
    const key = `${ev.day} - ${ev.topic}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});
  const evalScoreSum = evaluations.reduce((sum, e) => sum + (e.score ?? (e.status === "Strong" ? 91 : e.status === "Good" ? 78 : 62)), 0);
  const avgEvalScore = evaluations.length > 0 ? Math.round(evalScoreSum / evaluations.length) : 75;
  let technicalScore = 0;
  let problemSolvingScore = 0;
  let communicationScore = 0;
  let depthScore = 0;
  let practicalScore = 0;
  let metricsCount = 0;
  for (const e of evaluations) {
    if (e.metrics) {
      technicalScore += e.metrics.technical;
      problemSolvingScore += e.metrics.problemSolving;
      communicationScore += e.metrics.communication;
      depthScore += e.metrics.depth;
      practicalScore += e.metrics.practical;
      metricsCount++;
    }
  }
  if (metricsCount > 0) {
    technicalScore = Math.round(technicalScore / metricsCount);
    problemSolvingScore = Math.round(problemSolvingScore / metricsCount);
    communicationScore = Math.round(communicationScore / metricsCount);
    depthScore = Math.round(depthScore / metricsCount);
    practicalScore = Math.round(practicalScore / metricsCount);
  } else {
    technicalScore = Math.min(100, Math.round(avgEvalScore * 1.02));
    problemSolvingScore = avgEvalScore;
    communicationScore = Math.min(100, Math.round(avgEvalScore * 1.04));
    depthScore = Math.max(0, Math.round(avgEvalScore * 0.9));
    practicalScore = Math.min(100, Math.round((technicalScore + depthScore) / 2));
  }
  const overallScore = problemSolvingScore;
  let incompleteInstruction = "";
  if (isIncomplete) {
    incompleteInstruction = `
IMPORTANT: The interview ended early and is incomplete. Your summary MUST start by explicitly stating that the interview ended early and is incomplete, then summarize their performance on the topics they did complete.
Calculate/estimate scores based on the actual answers provided, do NOT return null scores or empty lists.`;
  }
  const systemInstruction = `You are a Principal AI Architect and Lead Technical Interviewer at ABTalks evaluating a candidate's technical interview performance.
You must analyze the candidate's responses against the curriculum standards and return your assessment strictly as a JSON object.

Candidates are evaluated across technical correctness, reasoning depth, trade-off analysis, and communication quality.

EVALUATION CONSTRAINTS (CRITICAL):
1. You must evaluate only evidence contained in actual candidate responses present in the interview transcript.
2. Never invent, infer, or assume a candidate answer.
3. If a question has no candidate response, treat it as unanswered and do not evaluate the candidate's technical performance for that question.${incompleteInstruction}

Format your output exactly as follows:
{
  "summary": "3-4 sentence professional interviewer summary of performance, highlighting technical capabilities and key growth areas grounded in demonstrated evidence.",
  "overallScore": ${overallScore},
  "technicalScore": ${technicalScore},
  "depthScore": ${depthScore},
  "communicationScore": ${communicationScore},
  "strengths": [
    "3 or 4 concrete, evidence-based strengths observed in their specific answers"
  ],
  "gaps": [
    "3 or 4 concrete, evidence-based technical gaps or knowledge deficiencies observed in their specific answers"
  ],
  "topicPerformance": [
    {
      "day": "Day 12",
      "topic": "Prompt Engineering",
      "score": 85,
      "level": "strong",
      "strengths": ["Concrete strength observed for this topic"],
      "gaps": ["Concrete gap observed for this topic"]
    }
  ],
  "next": [
    {
      "day": "Day 18",
      "topic": "Agentic AI",
      "reason": "Specific reason why this curriculum day needs review based on interview performance.",
      "items": ["Specific curriculum objective 1", "Specific curriculum objective 2"]
    }
  ]
}

CRITICAL RULES:
1. Base your evaluation strictly on the candidate's actual answers and demonstrated performance.
2. Only include topicPerformance entries for topics that were ACTUALLY assessed in the interview: ${Object.keys(evaluationsByTopic).join(", ")}.
3. Scores must be integers between 0 and 100.
4. All recommendations in 'next' must reference real curriculum days from curriculum.json (e.g. Day 7, Day 8, Day 10, Day 12, Day 14, Day 18, Day 19, Day 21). Do NOT invent nonexistent days.
5. Strengths and gaps must reference real technical details, tools (ChromaDB, FastAPI, LangChain, MCP, Pydantic, HNSW, RAG, etc.), and candidate explanations.
`;
  const prompt = `
Candidate Profile:
- Name: ${name}
- Role: ${role} (${experience} years experience)
- Learning Signals: Commit Days: ${candidate.signals?.commitDays || "N/A"}, Missions Completed: ${candidate.signals?.missionsCompleted || "N/A"}, First-Try Pass Rate: ${candidate.signals?.missionsFirstTry || "N/A"}

Assessed Curriculum Objectives & Tools:
${assessedCurriculumDays.map((d) => `Day ${d?.day}: ${d?.title} | Tools: ${d?.tools.join(", ")} | Objectives: ${d?.objectives.join("; ")}`).join("\n")}

Interview Transcript Evaluations (${evaluations.length} turns evaluated):
${evaluations.map((e, idx) => `
[Q${idx + 1} - ${e.day} - ${e.topic}]
Question: ${e.question}
Candidate Answer: ${e.answer}
Status: ${e.status}
Evaluator Notes: ${e.evaluation}
Observed Strengths: ${e.strengths.join(", ") || "None"}
Observed Gaps: ${e.improvements.join(", ") || "None"}
Better Answer Guidance: ${e.betterAnswer.join("; ") || "None"}
`).join("\n")}

Please generate the final structured feedback report JSON.
`;
  const plannedFocusTopics = calculatePlannedFocusTopics(candidate, evaluations);
  try {
    const responseText = await generateContent(prompt, systemInstruction, true);
    const parsed = safeParseJSON(responseText);
    const validatedOverall = clampScore(parsed.overallScore, overallScore);
    const validatedTech = clampScore(parsed.technicalScore, technicalScore);
    const validatedDepth = clampScore(parsed.depthScore, depthScore);
    const validatedComm = clampScore(parsed.communicationScore, communicationScore);
    const validatedPractical = clampScore(parsed.practicalScore, practicalScore);
    let summary = typeof parsed.summary === "string" && parsed.summary.trim().length > 10 ? parsed.summary.trim() : `${name} completed the technical interview, demonstrating foundational knowledge across assessed topics. Further practice on production trade-offs and implementation detail is recommended.`;
    if (isIncomplete && !summary.toLowerCase().includes("incomplete") && !summary.toLowerCase().includes("ended early")) {
      summary = `The interview ended early and is incomplete. ` + summary;
    }
    const strengths = Array.isArray(parsed.strengths) && parsed.strengths.length > 0 ? parsed.strengths.filter((s) => typeof s === "string" && s.trim().length > 0) : evaluations.filter((e) => e.status === "Strong").map((e) => `Demonstrated clear understanding of ${e.topic} (${e.day}).`);
    const gaps = Array.isArray(parsed.gaps) && parsed.gaps.length > 0 ? parsed.gaps.filter((g) => typeof g === "string" && g.trim().length > 0) : evaluations.filter((e) => e.status === "Needs Improvement").map((e) => `Needs deeper implementation knowledge on ${e.topic} (${e.day}).`);
    let topicPerformance = [];
    if (Array.isArray(parsed.topicPerformance) && parsed.topicPerformance.length > 0) {
      topicPerformance = parsed.topicPerformance.map((tp) => {
        const score = clampScore(tp.score, avgEvalScore);
        const level = score >= 85 ? "strong" : score >= 70 ? "good" : "needs-improvement";
        return {
          day: tp.day || "Day 12",
          topic: tp.topic || "General AI",
          score,
          level,
          strengths: Array.isArray(tp.strengths) ? tp.strengths : [],
          gaps: Array.isArray(tp.gaps) ? tp.gaps : []
        };
      });
    } else {
      topicPerformance = Object.entries(evaluationsByTopic).map(([key, evals]) => {
        const [dayStr, topicStr] = key.split(" - ");
        const tScore = Math.round(evals.reduce((s, e) => s + (e.score ?? (e.status === "Strong" ? 91 : e.status === "Good" ? 78 : 62)), 0) / evals.length);
        const level = tScore >= 85 ? "strong" : tScore >= 70 ? "good" : "needs-improvement";
        return {
          day: dayStr,
          topic: topicStr,
          score: tScore,
          level,
          strengths: [...new Set(evals.flatMap((e) => e.strengths))].slice(0, 2),
          gaps: [...new Set(evals.flatMap((e) => e.improvements))].slice(0, 2)
        };
      });
    }
    let next = [];
    if (Array.isArray(parsed.next) && parsed.next.length > 0) {
      next = parsed.next.map((n) => ({
        day: n.day || "Day 12",
        topic: n.topic || "General AI",
        reason: n.reason || "Curriculum objectives review.",
        items: Array.isArray(n.items) ? n.items : []
      }));
    } else {
      next = generateFallbackNextSteps(evaluations, curriculum2);
    }
    const recommendations = next.map((n) => `Review ${n.day} (${n.topic}): ${n.reason}`);
    return {
      summary,
      overallScore: validatedOverall,
      technicalScore: validatedTech,
      depthScore: validatedDepth,
      communicationScore: validatedComm,
      strengths,
      gaps,
      next,
      topicPerformance,
      questionReviews: evaluations,
      recommendations,
      metrics: [
        { label: "Technical Understanding", score: validatedTech, note: "Accurate concepts, correct terminology" },
        { label: "Problem Solving", score: validatedOverall, note: "Structured diagnosis, logical resolution" },
        { label: "Communication", score: validatedComm, note: "Clear narrative structure, easy to follow" },
        { label: "Depth of Explanation", score: validatedDepth, note: "Explains trade-offs and implementation detail" },
        { label: "Practical Application", score: validatedPractical, note: "Connects concepts back to concrete tools" }
      ],
      plannedFocusTopics
    };
  } catch (error) {
    console.error("[Feedback] LLM call failed or parsed malformed JSON. Using fallback.", error);
    return generateFallbackFeedback(candidate, evaluations, isIncomplete);
  }
}
function generateFallbackNextSteps(evaluations, curriculum2) {
  const failedDays = evaluations.filter((e) => e.status === "Needs Improvement").map((e) => parseInt(e.day.replace(/\D/g, ""), 10));
  const recommendedDays = failedDays.length > 0 ? failedDays : [12, 14];
  return recommendedDays.map((dayNum) => {
    const dayData = curriculum2.days.find((d) => d.day === dayNum);
    return {
      day: `Day ${dayNum}`,
      topic: dayData?.title || "General AI",
      reason: "Requires reinforcement and code practice.",
      items: dayData?.objectives || ["Review objectives."]
    };
  });
}
function generateFallbackFeedback(candidate, evaluations, isIncomplete = false) {
  if (evaluations.length === 0) {
    return generateNotAssessableFeedback(candidate);
  }
  const name = candidate.member?.name || candidate.name || "Candidate";
  const strongCount = evaluations.filter((e) => e.status === "Strong").length;
  const goodCount = evaluations.filter((e) => e.status === "Good").length;
  const needsImpCount = evaluations.filter((e) => e.status === "Needs Improvement").length;
  const evalScoreSum = evaluations.reduce((sum, e) => sum + (e.score ?? (e.status === "Strong" ? 92 : e.status === "Good" ? 78 : 60)), 0);
  const overallScore = evaluations.length > 0 ? Math.round(evalScoreSum / evaluations.length) : 75;
  const technicalScore = Math.min(100, Math.round(overallScore * 1.02));
  const depthScore = Math.max(0, Math.round(overallScore * 0.9));
  const communicationScore = Math.min(100, Math.round(overallScore * 1.04));
  const practicalScore = Math.min(100, Math.round((technicalScore + depthScore) / 2));
  let summary = `${name} completed the technical interview, demonstrating ${strongCount > 0 ? "solid" : "foundational"} conceptual knowledge across ${evaluations.length} evaluated questions. Performance was strongest on structured explanations, while reasoning around production edge cases and state persistence showed areas for growth.`;
  if (isIncomplete) {
    summary = `The interview ended early and is incomplete. ` + summary;
  }
  const strengths = evaluations.filter((e) => e.status === "Strong").map((e) => `Demonstrated clear technical reasoning on ${e.topic} (${e.day}).`).slice(0, 3);
  if (strengths.length === 0) {
    strengths.push(`Communicated answers in a clear, structured manner.`);
    strengths.push(`Showed good familiarity with AI cohort terminology.`);
  } else {
    strengths.push(`Clear narrative structure and structured problem breakdown.`);
  }
  const gaps = evaluations.filter((e) => e.status === "Needs Improvement").map((e) => `Struggled with implementation detail on ${e.topic} (${e.day}).`).slice(0, 3);
  if (gaps.length === 0) {
    gaps.push(`Could provide more quantitative trade-offs (latency, memory footprint, recall@k).`);
    gaps.push(`System boundary conditions and error retries can be detailed further.`);
  } else {
    gaps.push(`Tends to describe high-level architecture without specifying persistence and state boundaries.`);
  }
  const topicMap = {};
  evaluations.forEach((e) => {
    const key = e.topic;
    const sc = e.score ?? (e.status === "Strong" ? 92 : e.status === "Good" ? 78 : 60);
    if (!topicMap[key]) {
      topicMap[key] = { totalScore: 0, count: 0, day: e.day, strengths: [], gaps: [] };
    }
    topicMap[key].totalScore += sc;
    topicMap[key].count += 1;
    topicMap[key].strengths.push(...e.strengths);
    topicMap[key].gaps.push(...e.improvements);
  });
  const topicPerformance = Object.entries(topicMap).map(([topic, data]) => {
    const score = Math.round(data.totalScore / data.count);
    const level = score >= 85 ? "strong" : score >= 70 ? "good" : "needs-improvement";
    return {
      day: data.day,
      topic,
      score,
      level,
      strengths: [...new Set(data.strengths)].slice(0, 2),
      gaps: [...new Set(data.gaps)].slice(0, 2)
    };
  });
  const curriculum2 = getCurriculum();
  const next = generateFallbackNextSteps(evaluations, curriculum2);
  const recommendations = next.map((n) => `Review ${n.day} (${n.topic}): ${n.reason}`);
  const plannedFocusTopics = calculatePlannedFocusTopics(candidate, evaluations);
  return {
    summary,
    overallScore,
    technicalScore,
    depthScore,
    communicationScore,
    strengths,
    gaps,
    next,
    topicPerformance,
    questionReviews: evaluations,
    recommendations,
    metrics: [
      { label: "Technical Understanding", score: technicalScore, note: "Accurate concepts, correct terminology" },
      { label: "Problem Solving", score: overallScore, note: "Structured diagnosis, logical resolution" },
      { label: "Communication", score: communicationScore, note: "Clear narrative structure, easy to follow" },
      { label: "Depth of Explanation", score: depthScore, note: "Explains trade-offs and implementation detail" },
      { label: "Practical Application", score: practicalScore, note: "Connects concepts back to concrete tools" }
    ],
    plannedFocusTopics
  };
}

// server/agent/interviewPlanner.ts
function determineTargetDifficulty(candidate) {
  const exp = candidate.member.yearsExperience;
  const completed = candidate.signals?.missionsCompleted ?? 0;
  const firstTry = candidate.signals?.missionsFirstTry ?? 0;
  if (exp <= 2 || completed < 15) {
    return "Foundational";
  }
  if (exp >= 6 && completed >= 20 && firstTry >= 15) {
    return "Advanced";
  }
  return "Intermediate";
}
function generateInterviewPlan(candidate, curriculum2) {
  const candidateMissions = candidate.missions || [];
  const candidateId = candidate.member.id;
  const targetDifficulty = determineTargetDifficulty(candidate);
  const weakCompletedMissions = [];
  const failedMissions = [];
  const skippedMissions = [];
  const strongCompletedMissions = [];
  candidateMissions.forEach((m) => {
    const currDay = curriculum2.days.find((d) => d.day === m.day);
    if (!currDay) return;
    if (m.passed === false) {
      failedMissions.push(m);
    } else if (m.skipped) {
      skippedMissions.push(m);
    } else if (m.passed && m.attempts && m.attempts >= 3) {
      weakCompletedMissions.push(m);
    } else if (m.passed) {
      strongCompletedMissions.push(m);
    }
  });
  const plannedTopics = [];
  const selectedDaysSet = /* @__PURE__ */ new Set();
  weakCompletedMissions.forEach((m) => {
    const currDay = curriculum2.days.find((d) => d.day === m.day);
    if (selectedDaysSet.size >= 5) return;
    selectedDaysSet.add(m.day);
    plannedTopics.push({
      day: m.day,
      title: currDay.title,
      reason: `Required multiple attempts (${m.attempts}) during the cohort. Testing to ensure core retention and conceptual clarity.`,
      priority: "high",
      sequenceWeight: 4
    });
  });
  failedMissions.forEach((m) => {
    const currDay = curriculum2.days.find((d) => d.day === m.day);
    if (selectedDaysSet.size >= 5) return;
    selectedDaysSet.add(m.day);
    plannedTopics.push({
      day: m.day,
      title: currDay.title,
      reason: `Topic was failed during the cohort. Assessing baseline understanding to check for diagnostic gaps.`,
      priority: "high",
      sequenceWeight: 3
    });
  });
  let skippedAdded = 0;
  skippedMissions.forEach((m) => {
    const currDay = curriculum2.days.find((d) => d.day === m.day);
    if (selectedDaysSet.size >= 5) return;
    if (skippedAdded >= 2) return;
    selectedDaysSet.add(m.day);
    skippedAdded++;
    plannedTopics.push({
      day: m.day,
      title: currDay.title,
      reason: `Topic was skipped or failed. Assessing baseline understanding to check for diagnostic gaps.`,
      priority: "low",
      sequenceWeight: 2
    });
  });
  strongCompletedMissions.forEach((m) => {
    const currDay = curriculum2.days.find((d) => d.day === m.day);
    if (selectedDaysSet.size >= 5) return;
    selectedDaysSet.add(m.day);
    plannedTopics.push({
      day: m.day,
      title: currDay.title,
      reason: `Successfully completed. Assessing depth, design choices, and scaling trade-offs on this topic.`,
      priority: m.attempts === 1 ? "high" : "medium",
      sequenceWeight: 1
    });
  });
  if (selectedDaysSet.size < 4) {
    const remainingDays = curriculum2.days.filter((d) => !selectedDaysSet.has(d.day));
    for (const d of remainingDays) {
      if (selectedDaysSet.size >= 4) break;
      selectedDaysSet.add(d.day);
      plannedTopics.push({
        day: d.day,
        title: d.title,
        reason: `Standard curriculum topic. Testing general competency.`,
        priority: "medium",
        sequenceWeight: 0
      });
    }
  }
  plannedTopics.sort((a, b) => b.sequenceWeight - a.sequenceWeight);
  const selectedDays = plannedTopics.map((t) => t.day);
  const cleanPlannedTopics = plannedTopics.map(({ sequenceWeight, ...rest }) => rest);
  const focus = getCandidateInterviewFocus(candidate);
  const plannedFocusTopics = buildPlannedFocusTopics(candidate, focus);
  console.log(`
[Interview Focus]
candidateId: ${candidateId}
focusTopics:`, focus.map((f) => ({ topic: f.topic, signal: f.signal })));
  console.log(`[Interview Plan]
candidateId: ${candidateId}
plannedFocusTopics:`, plannedFocusTopics.map((p) => ({ topic: p.topic, status: p.status, dayRange: p.dayRange })));
  return {
    candidateId,
    selectedDays,
    topics: cleanPlannedTopics,
    targetDifficulty,
    plannedFocusTopics
  };
}

// server/agent/interviewDecisionEngine.ts
function determineNextAction(session, evaluation) {
  const depth = session.currentTopicDepth;
  const quality = evaluation.quality;
  console.log(`[DecisionEngine] Evaluating Action - Session: ${session.sessionId}, Topic: ${session.currentTopic}, Depth: ${depth}, Quality: ${quality}, Score: ${evaluation.score}`);
  if (depth >= 2) {
    console.log("[DecisionEngine] Safeguard: Max topic depth reached. Transitioning to next planned topic.");
    return {
      shouldFollowUp: false,
      strategy: "move_on",
      difficultyShift: "same"
    };
  }
  if (quality === "unknown") {
    if (depth === 0) {
      console.log("[DecisionEngine] Candidate unsure. Asking a simpler diagnostic probing question.");
      return {
        shouldFollowUp: true,
        strategy: "probe",
        difficultyShift: "down"
      };
    } else {
      console.log("[DecisionEngine] Candidate still unsure. Moving to next planned topic.");
      return {
        shouldFollowUp: false,
        strategy: "move_on",
        difficultyShift: "same"
      };
    }
  }
  if (quality === "irrelevant") {
    console.log("[DecisionEngine] Off-topic response. Generating a polite redirection prompt.");
    return {
      shouldFollowUp: true,
      strategy: "redirect",
      difficultyShift: "same"
    };
  }
  if (quality === "incorrect") {
    console.log("[DecisionEngine] Incorrect response. Challenging misconception.");
    return {
      shouldFollowUp: true,
      strategy: "challenge",
      difficultyShift: "down"
    };
  }
  if (quality === "partial") {
    console.log("[DecisionEngine] Partially correct. Probing missing concepts.");
    return {
      shouldFollowUp: true,
      strategy: "probe",
      difficultyShift: "same"
    };
  }
  if (quality === "strong") {
    if (depth === 0) {
      console.log("[DecisionEngine] Strong response. Deepening/challenging the candidate.");
      return {
        shouldFollowUp: true,
        strategy: "challenge",
        difficultyShift: "up"
      };
    } else {
      console.log("[DecisionEngine] Strong response with sufficient depth. Moving to next topic.");
      return {
        shouldFollowUp: false,
        strategy: "move_on",
        difficultyShift: "same"
      };
    }
  }
  return {
    shouldFollowUp: false,
    strategy: "move_on",
    difficultyShift: "same"
  };
}

// server/agent/interviewAgent.ts
var MIN_INTERVIEW_QUESTIONS = 8;
var MIN_CURRICULUM_DAYS = 4;
var MAX_INTERVIEW_QUESTIONS = 10;
async function startInterview(sessionId, candidateData) {
  const candidateId = candidateData.member?.id || candidateData.id;
  let candidate;
  if (candidateId) {
    candidate = getCandidateById(candidateId);
  }
  if (!candidate) {
    candidate = {
      member: {
        id: candidateData.member?.id || "CAND-TEMP",
        name: candidateData.member?.name || candidateData.name || "Candidate",
        jobRole: candidateData.member?.jobRole || candidateData.jobRole || "Software Engineer",
        yearsExperience: candidateData.member?.yearsExperience || candidateData.yearsExperience || 2,
        education: candidateData.member?.education || candidateData.education || "N/A",
        status: candidateData.member?.status || candidateData.status || "COMPLETED"
      },
      missions: candidateData.missions || [],
      signals: candidateData.signals || { commitDays: 10, missionsCompleted: 10, missionsFirstTry: 5 }
    };
  }
  const session = createSession(sessionId, candidate);
  const curriculum2 = getCurriculum();
  const plan = generateInterviewPlan(candidate, curriculum2);
  session.interviewPlan = plan;
  session.plannedFocusTopics = plan.plannedFocusTopics;
  session.planDayIndex = 0;
  console.log(`[Interview Start]
candidateId: ${candidate.member.id}
selectedTopics:`, plan.topics.map((t) => t.title), `
plannedDays:`, plan.selectedDays);
  const firstDayNum = plan.selectedDays[0] || 12;
  const day = getCurriculumDay(firstDayNum);
  if (!day) {
    throw new Error(`Curriculum day ${firstDayNum} not found`);
  }
  const questionObj = await generatePrimaryQuestion(candidate, day, plan.targetDifficulty, []);
  const qId = `turn-${Date.now()}-q`;
  session.currentTopic = day.title;
  session.currentQuestion = questionObj.question;
  session.currentQuestionDay = day.day;
  session.curriculumDaysCovered.push(day.day);
  session.questionsAsked = 1;
  session.primaryQuestionsAsked = 1;
  session.followUpsAsked = 0;
  session.currentTopicDepth = 0;
  session.currentQuestionType = "primary";
  session.currentQuestionDifficulty = plan.targetDifficulty;
  session.currentQuestionId = qId;
  session.currentQuestionObjective = questionObj.objective;
  session.currentQuestionNumber = 1;
  const turn = {
    id: qId,
    role: "interviewer",
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
async function handleCandidateMessage(sessionId, message) {
  const session = getSession(sessionId);
  if (!session) {
    throw new Error(`Session with ID ${sessionId} not found`);
  }
  if (session.status === "COMPLETED") {
    return {
      reply: "This interview has already been completed.",
      done: true,
      feedback: session.finalFeedback
    };
  }
  if (message === "[END_EARLY]") {
    session.status = "COMPLETED";
    const finalReport = await generateFinalFeedback(session);
    session.finalFeedback = finalReport;
    saveSession(sessionId, session);
    return {
      reply: "Interview completed early.",
      done: true,
      feedback: finalReport
    };
  }
  if (session.turns.length >= 2) {
    const lastTurn2 = session.turns[session.turns.length - 1];
    const prevTurn = session.turns[session.turns.length - 2];
    if (prevTurn.role === "candidate" && prevTurn.text === message && lastTurn2.role === "interviewer") {
      console.log(`[Router] Duplicate/Retry detected. Returning already-generated question: "${lastTurn2.text}"`);
      return {
        reply: lastTurn2.text,
        done: session.status === "COMPLETED"
      };
    }
  }
  const lastTurnItem = session.turns[session.turns.length - 1];
  if (lastTurnItem && lastTurnItem.role === "candidate" && lastTurnItem.text === message) {
    session.turns.pop();
  }
  const duplicateEvalIndex = session.evaluations.findIndex(
    (e) => e.question === session.currentQuestion && e.answer === message
  );
  if (duplicateEvalIndex !== -1) {
    session.evaluations.splice(duplicateEvalIndex, 1);
    session.questionsAnswered = Math.max(0, session.questionsAnswered - 1);
  }
  if (!message || message.trim().length === 0) {
    return {
      reply: "Please provide a response before submitting.",
      done: false
    };
  }
  const candidateTurn = {
    id: `turn-${Date.now()}-a`,
    role: "candidate",
    text: message
  };
  session.turns.push(candidateTurn);
  const isClarifyRequest = message === "[CLARIFY]" || /^(can you|could you|please)?\s*(clarify|explain|rephrase|help me understand)\s*(the question|this)?/i.test(message);
  if (isClarifyRequest) {
    if (session.clarifyUsed) {
      return {
        reply: "I've already clarified this question. Please try your best to answer based on the prompt above.",
        done: false
      };
    }
    session.clarifyUsed = true;
    const systemInstruction = `You are a helpful, professional technical interviewer.
The candidate asked you to clarify the following question: "${session.currentQuestion}".
Rephrase the question in simpler terms. Outline what key concept they should explain (e.g. system design choice, debugging steps, trade-offs).
Keep your clarification friendly, concise, and direct (1-2 sentences). Do NOT change the core question.`;
    const prompt = "Rephrase and clarify the question.";
    const clarificationText = await generateContent(prompt, systemInstruction);
    session.turns.push({
      id: `turn-${Date.now()}-c`,
      role: "interviewer",
      text: clarificationText,
      badge: "Clarifying the question",
      topic: session.currentTopic,
      day: `Day ${session.currentQuestionDay}`,
      intent: "clarification"
    });
    saveSession(sessionId, session);
    return {
      reply: clarificationText,
      done: false
    };
  }
  const startTotal = Date.now();
  const startEval = Date.now();
  const day = getCurriculumDay(session.currentQuestionDay);
  const topicTurns = session.turns.filter((t) => t.topic === session.currentTopic);
  const previousContext = topicTurns.map((t) => `${t.role === "interviewer" ? "Interviewer" : "Candidate"}: ${t.text}`).join("\n");
  const evalResult = await evaluateAnswer(
    session.currentQuestion,
    message,
    day,
    session.currentQuestionObjective || day.objectives[0] || "",
    previousContext
  );
  const evalDuration = Date.now() - startEval;
  const evalItem = {
    id: session.currentQuestionId || `eval-${Date.now()}`,
    topic: session.currentTopic,
    day: `Day ${session.currentQuestionDay}`,
    status: evalResult.quality === "strong" ? "Strong" : evalResult.quality === "partial" ? "Good" : "Needs Improvement",
    question: session.currentQuestion,
    answer: message,
    evaluation: evalResult.evaluation,
    strengths: evalResult.strengths,
    improvements: evalResult.gaps,
    betterAnswer: evalResult.betterAnswerStructure,
    questionId: session.currentQuestionId || `q-${Date.now()}`,
    questionNumber: session.currentQuestionNumber || session.questionsAsked,
    objective: session.currentQuestionObjective || day.objectives[0] || "",
    difficulty: session.currentQuestionDifficulty,
    questionType: session.currentQuestionType,
    score: evalResult.score,
    metrics: evalResult.metrics
  };
  session.evaluations.push(evalItem);
  session.questionsAnswered += 1;
  if (evalResult.strengths) {
    session.candidateStrengths = [.../* @__PURE__ */ new Set([...session.candidateStrengths, ...evalResult.strengths])];
  }
  if (evalResult.gaps) {
    session.candidateGaps = [.../* @__PURE__ */ new Set([...session.candidateGaps, ...evalResult.gaps])];
  }
  if (evalResult.misconceptions) {
    session.candidateMisconceptions = [.../* @__PURE__ */ new Set([...session.candidateMisconceptions, ...evalResult.misconceptions])];
  }
  session.lastAnswerEvaluation = evalResult;
  const decision = determineNextAction(session, evalResult);
  session.lastDecision = decision.strategy;
  const lastTurn = session.turns[session.turns.length - 2];
  console.log("\n[Interview]");
  console.log(`Session: ${session.sessionId}`);
  console.log(`Day: ${session.currentQuestionDay}`);
  console.log(`Topic: ${session.currentTopic}`);
  console.log("\n[Question]");
  console.log(`Intent: ${lastTurn?.intent || "conceptual"}`);
  console.log(`Length: ${session.currentQuestion.split(/\s+/).length} words`);
  console.log("\n[Evaluation]");
  console.log(`Correctness: ${evalResult.quality}`);
  console.log(`Depth: ${evalResult.quality === "strong" ? "high" : evalResult.quality === "partial" ? "moderate" : "low"}`);
  console.log(`Missing: ${evalResult.gaps.join(", ") || "None"}`);
  console.log("\n[Decision]");
  console.log(`Strategy: ${decision.strategy}`);
  console.log("\n[Progress]");
  console.log(`Questions: ${session.questionsAsked}/8+ (max 10)`);
  console.log(`Days covered: ${new Set(session.curriculumDaysCovered).size}/4+
`);
  if (decision.shouldFollowUp && session.questionsAsked < 10) {
    const prevQuestions = session.turns.filter((t) => t.role === "interviewer").map((t) => t.text);
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
    console.log(`
[Interview] session=${session.sessionId}`);
    console.log(`[Evaluation] ${evalDuration}ms`);
    console.log(`[QuestionGeneration] ${genDuration}ms`);
    console.log(`[Total] ${totalDuration}ms
`);
    session.followUpsAsked += 1;
    session.questionsAsked += 1;
    session.currentTopicDepth += 1;
    session.currentQuestion = followUp.text;
    let nextDifficulty = session.currentQuestionDifficulty;
    if (followUp.difficultyShift === "up") {
      nextDifficulty = nextDifficulty === "Foundational" ? "Intermediate" : "Advanced";
    } else if (followUp.difficultyShift === "down") {
      nextDifficulty = nextDifficulty === "Advanced" ? "Intermediate" : "Foundational";
    }
    session.currentQuestionDifficulty = nextDifficulty;
    session.currentQuestionType = "followup";
    const nextQId = `turn-${Date.now()}-f`;
    session.currentQuestionId = nextQId;
    session.currentQuestionNumber = session.questionsAsked;
    session.turns.push({
      id: nextQId,
      role: "interviewer",
      text: followUp.text,
      badge: followUp.badge,
      topic: session.currentTopic,
      day: `Day ${session.currentQuestionDay}`,
      difficulty: session.currentQuestionDifficulty,
      intent: decision.strategy === "challenge" ? "challenge" : "debugging"
    });
    saveSession(sessionId, session);
    return {
      reply: followUp.text,
      done: false
    };
  } else {
    const uniqueDaysCovered = new Set(session.curriculumDaysCovered);
    const coveredDaysCount = uniqueDaysCovered.size;
    const meetsQuestionsConstraint = session.questionsAsked >= MIN_INTERVIEW_QUESTIONS;
    const meetsDaysConstraint = coveredDaysCount >= MIN_CURRICULUM_DAYS;
    const reachedMaxQuestions = session.questionsAsked >= MAX_INTERVIEW_QUESTIONS;
    if (meetsQuestionsConstraint && meetsDaysConstraint || reachedMaxQuestions) {
      session.status = "COMPLETED";
      session.completedAt = Date.now();
      const startGen = Date.now();
      const finalReport = await generateFinalFeedback(session);
      const genDuration = Date.now() - startGen;
      const totalDuration = Date.now() - startTotal;
      console.log(`
[Interview] session=${session.sessionId}`);
      console.log(`[Evaluation] ${evalDuration}ms`);
      console.log(`[QuestionGeneration] ${genDuration}ms`);
      console.log(`[Total] ${totalDuration}ms
`);
      session.finalFeedback = finalReport;
      saveSession(sessionId, session);
      return {
        reply: "Interview completed. Compiling feedback.",
        done: true,
        feedback: finalReport
      };
    } else {
      const topicEvals = session.evaluations.filter((e) => e.topic === session.currentTopic);
      const lastEval = topicEvals[topicEvals.length - 1];
      let targetDiff = session.currentQuestionDifficulty || session.interviewPlan?.targetDifficulty || "Intermediate";
      if (lastEval) {
        if (lastEval.status === "Strong") {
          targetDiff = targetDiff === "Foundational" ? "Intermediate" : "Advanced";
        } else if (lastEval.status === "Needs Improvement") {
          targetDiff = targetDiff === "Advanced" ? "Intermediate" : "Foundational";
        }
      }
      console.log(`[Difficulty] Adapting target difficulty for next topic to: "${targetDiff}" based on performance.`);
      session.planDayIndex += 1;
      session.currentTopicDepth = 0;
      const plan = session.interviewPlan;
      let nextDayNum;
      if (plan && session.planDayIndex < plan.selectedDays.length) {
        nextDayNum = plan.selectedDays[session.planDayIndex];
      } else {
        nextDayNum = selectNextDay(session);
      }
      const nextDay = getCurriculumDay(nextDayNum);
      const prevQuestions = session.turns.filter((t) => t.role === "interviewer").map((t) => t.text);
      const startGen = Date.now();
      const questionObj = await generatePrimaryQuestion(session.candidate, nextDay, targetDiff, prevQuestions);
      const genDuration = Date.now() - startGen;
      const totalDuration = Date.now() - startTotal;
      console.log(`
[Interview] session=${session.sessionId}`);
      console.log(`[Evaluation] ${evalDuration}ms`);
      console.log(`[QuestionGeneration] ${genDuration}ms`);
      console.log(`[Total] ${totalDuration}ms
`);
      const transitionText = `Moving to ${nextDay.title}. `;
      const finalQuestion = transitionText + questionObj.question;
      session.currentTopic = nextDay.title;
      session.currentQuestion = finalQuestion;
      session.currentQuestionDay = nextDay.day;
      session.curriculumDaysCovered.push(nextDay.day);
      session.questionsAsked += 1;
      session.primaryQuestionsAsked += 1;
      session.currentQuestionType = "primary";
      session.clarifyUsed = false;
      session.currentQuestionDifficulty = targetDiff;
      const nextQId = `turn-${Date.now()}-q`;
      session.currentQuestionId = nextQId;
      session.currentQuestionObjective = questionObj.objective;
      session.currentQuestionNumber = session.questionsAsked;
      session.turns.push({
        id: nextQId,
        role: "interviewer",
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

// server/routes/interview.ts
var router = Router();
router.post("/interview", async (req, res) => {
  try {
    const { sessionId, candidate, message } = req.body;
    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ error: "Missing or invalid required field: sessionId (must be string)." });
    }
    if (candidate !== void 0 || req.body.candidateId !== void 0) {
      let resolvedCandidate = candidate;
      const candidateId = req.body.candidateId || candidate && (candidate.member?.id || candidate.id);
      if (candidateId) {
        const { getCandidateById: getCandidateById2 } = await Promise.resolve().then(() => (init_dataLoader(), dataLoader_exports));
        const loadedCandidate = getCandidateById2(candidateId);
        if (loadedCandidate) {
          resolvedCandidate = loadedCandidate;
        }
      }
      if (!resolvedCandidate || !resolvedCandidate.member || typeof resolvedCandidate.member.id !== "string" || typeof resolvedCandidate.member.name !== "string") {
        return res.status(400).json({ error: "Invalid candidate profile or candidateId." });
      }
      console.log(`[Router] Initializing new session ${sessionId} for candidate:`, resolvedCandidate.member.name);
      const reply = await startInterview(sessionId, resolvedCandidate);
      const sessionState = getSession(sessionId);
      const uniqueDays = new Set(sessionState.curriculumDaysCovered || []);
      const responsePayload = {
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
    if (message !== void 0) {
      if (typeof message !== "string") {
        return res.status(400).json({ error: "Invalid message body: message must be a string." });
      }
      console.log(`[Router] Received message from session ${sessionId}: "${message.slice(0, 50)}${message.length > 50 ? "..." : ""}"`);
      const result = await handleCandidateMessage(sessionId, message);
      const sessionState = getSession(sessionId);
      const uniqueDays = new Set(sessionState.curriculumDaysCovered || []);
      const responsePayload = {
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
    return res.status(400).json({
      error: 'Invalid request body. Provide either "candidate" (to start) or "message" (to converse).'
    });
  } catch (error) {
    console.error(`[Error] Router request failed in session:`, error);
    return res.status(500).json({
      error: "Interview service temporarily unavailable."
    });
  }
});
router.get("/interview/session/:sessionId", (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ error: "Invalid sessionId parameter." });
    }
    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: `Session ${sessionId} not found` });
    }
    return res.json(session);
  } catch (error) {
    console.error("[Error] Session fetch failed:", error);
    return res.status(500).json({ error: "Interview service temporarily unavailable." });
  }
});
router.get("/diagnostics", async (req, res) => {
  try {
    const fs2 = await import("fs");
    const path3 = await import("path");
    const apiKey2 = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "not set";
    const curriculumPath = path3.join(process.cwd(), "data/curriculum.json");
    const candidatesPath = path3.join(process.cwd(), "data/candidates.json");
    const curriculumExists = fs2.existsSync(curriculumPath);
    const candidatesExists = fs2.existsSync(candidatesPath);
    let curriculumLength = 0;
    let candidatesCount = 0;
    let fileError = null;
    try {
      if (curriculumExists) {
        const raw = fs2.readFileSync(curriculumPath, "utf8");
        curriculumLength = JSON.parse(raw).days?.length || 0;
      }
      if (candidatesExists) {
        const raw = fs2.readFileSync(candidatesPath, "utf8");
        candidatesCount = (JSON.parse(raw).candidates || []).length;
      }
    } catch (err) {
      fileError = err.message;
    }
    let rootFiles = [];
    try {
      rootFiles = fs2.readdirSync(process.cwd());
    } catch (err) {
      rootFiles = [err.message];
    }
    let dataFiles = [];
    try {
      const dataDir = path3.join(process.cwd(), "data");
      if (fs2.existsSync(dataDir)) {
        dataFiles = fs2.readdirSync(dataDir);
      }
    } catch (err) {
      dataFiles = [err.message];
    }
    res.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      cwd: process.cwd(),
      rootFiles,
      dataFiles,
      env: {
        hasApiKey: !!apiKey2,
        apiKeyLength: apiKey2 ? apiKey2.length : 0,
        apiKeyPreview: apiKey2 ? `${apiKey2.slice(0, 4)}...${apiKey2.slice(-4)}` : "none",
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var interview_default = router;

// server/index.ts
dotenv2.config();
var app = express();
var port = process.env.PORT || 5e3;
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});
loadData();
app.use("/api", interview_default);
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
var distPath = path2.join(process.cwd(), "dist");
app.use(express.static(distPath));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path2.join(distPath, "index.html"));
});
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`[Server] ABTalks AI Interview Agent backend running on port ${port}`);
  });
}
var server_default = app;

// api/_index.ts
var index_default = server_default;
export {
  index_default as default
};
