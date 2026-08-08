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
      return JSON.stringify({
        summary: "The candidate demonstrated solid overall technical skills, particularly in vector databases and prompt engineering.",
        overallScore: 85,
        technicalScore: 87,
        depthScore: 80,
        communicationScore: 90,
        strengths: [
          "Demonstrates strong knowledge of Pydantic validation schemas",
          "Explains retrieval vs generation failures cleanly"
        ],
        gaps: [
          "Could improve implementation details regarding Redis state stores"
        ],
        topicPerformance: [
          { day: "Day 12", topic: "Prompt Engineering", score: 88, level: "strong", strengths: ["Validation"], gaps: [] },
          { day: "Day 14", topic: "RAG Architecture", score: 85, level: "strong", strengths: ["Debugging"], gaps: [] },
          { day: "Day 8", topic: "Vector Indexing", score: 82, level: "good", strengths: ["Memory trade-offs"], gaps: [] }
        ],
        next: [
          { day: "Day 18", topic: "Agentic AI", reason: "Further study of Redis state stores.", items: ["Redis state persistence"] }
        ]
      });
    }

    // 3. Answer Evaluation Request
    if (jsonMode && (promptLower.includes('candidate answer') || systemLower.includes('evaluation substance rules'))) {
      let score = 85;
      let quality = 'strong';
      let evaluation = 'Good understanding of the core concept and its trade-offs.';
      let strengths = ['Understands trade-offs'];
      let gaps: string[] = [];
      let misconceptions: string[] = [];

      if (promptLower.includes("don't know") || promptLower.includes("don't recall") || promptLower.includes("no idea") || promptLower.includes("uncertain")) {
        score = 0;
        quality = 'unknown';
        evaluation = 'Candidate did not know the concept.';
        strengths = [];
      } else if (promptLower.includes("python and react") || promptLower.includes("irrelevant response")) {
        score = 10;
        quality = 'irrelevant';
        evaluation = 'Unrelated to the technical topic asked.';
        strengths = [];
      } else if (promptLower.includes("incorrect claims") || promptLower.includes("billing costs") || promptLower.includes("wrong answer")) {
        score = 40;
        quality = 'incorrect';
        evaluation = 'Answer is technically incorrect and contains misconceptions.';
        strengths = [];
        misconceptions = ['Thinking vector size directly drives API billing'];
        gaps = ['Vector dimensions mapping'];
      } else if (promptLower.includes("mixed") || promptLower.includes("partial") || promptLower.includes("forgot similarity") || promptLower.includes("main idea")) {
        score = 55;
        quality = 'partial';
        evaluation = 'Touched on the concept but missed critical details.';
        strengths = ['Basic concept'];
        gaps = ['Similarity metrics'];
      }

      return JSON.stringify({
        score,
        quality,
        evaluation,
        strengths,
        gaps,
        misconceptions,
        betterAnswerStructure: ['Elaborate on details', 'Mention trade-offs']
      });
    }

    // 3.5. JSON Question / Primary generation fallback
    if (jsonMode) {
      if (promptLower.includes('day 12') || promptLower.includes('prompt engineering') || promptLower.includes('fundamentals')) {
        return JSON.stringify({
          question: "How do you ensure JSON format compliance in LLM outputs?",
          intent: "conceptual"
        });
      }
      if (promptLower.includes('day 14') || promptLower.includes('rag')) {
        return JSON.stringify({
          question: "How do you debug generation inaccuracies in a RAG pipeline?",
          intent: "debugging"
        });
      }
      if (promptLower.includes('day 8') || promptLower.includes('indexing') || promptLower.includes('vector')) {
        return JSON.stringify({
          question: "How do you choose between HNSW and IVF indexes for 40M vectors?",
          intent: "tradeoff"
        });
      }
      return JSON.stringify({
        question: "How would you set up a dual-encoder retrieval pipeline for RAG?",
        intent: "conceptual"
      });
    }

    // 4. Question / Follow-up Generation Request
    if (promptLower.includes('follow-up') || promptLower.includes('probe') || promptLower.includes('challenge')) {
      return "How does HNSW index partition sizing impact recall and latency constraints?";
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

  const maxRetries = 3;
  let currentDelay = 12000; // 12 seconds (free tier allows 5 requests per minute, so 1 request every 12s)

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: jsonMode ? 'application/json' : undefined
        }
      });

      const responseText = response.text;

      if (!responseText) {
        throw new Error('Received an empty response from the Gemini API.');
      }

      return responseText;
    } catch (error: any) {
      const errorMsg = error.message || '';
      const is429 = error.status === 429 || 
                    errorMsg.includes('429') || 
                    errorMsg.toLowerCase().includes('quota') || 
                    errorMsg.toLowerCase().includes('rate') || 
                    errorMsg.toLowerCase().includes('resource_exhausted');

      if (is429 && attempt < maxRetries) {
        console.warn(`[LLM] Rate limit/quota exceeded (429). Retrying in ${currentDelay / 1000}s... (Attempt ${attempt}/${maxRetries})`);
        await delay(currentDelay);
        currentDelay *= 1.5; // Exponential backoff
        continue;
      }

      console.error('[LLM] Gemini API call failed:', error.message || error);
      throw error;
    }
  }

  throw new Error('Failed to generate content after retries.');
}
