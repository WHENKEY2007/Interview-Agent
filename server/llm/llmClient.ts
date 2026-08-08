import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('[LLM] Warning: GEMINI_API_KEY environment variable is not defined. The LLM client will run in SIMULATION mode with mock responses.');
}

const genAI = new GoogleGenerativeAI(apiKey || 'SIMULATED_KEY');

export async function generateContent(
  prompt: string,
  systemInstruction?: string,
  jsonMode = false
): Promise<string> {
  // If in simulation mode, return mocked responses based on prompt keywords
  if (!apiKey || apiKey === 'SIMULATED_KEY') {
    return getMockResponse(prompt, jsonMode);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: systemInstruction,
      generationConfig: jsonMode ? { responseMimeType: 'application/json' } : undefined,
    });

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('[LLM] Gemini API call failed. Falling back to simulation.', error);
    return getMockResponse(prompt, jsonMode);
  }
}

/**
 * Provides static, rich simulations for testing the interview flow without active API keys.
 */
function getMockResponse(prompt: string, jsonMode: boolean): string {
  if (jsonMode) {
    // If the prompt is requesting answer evaluation
    if (prompt.toLowerCase().includes('evaluate') || prompt.toLowerCase().includes('score')) {
      return JSON.stringify({
        score: 85,
        quality: 'strong',
        evaluation: 'The candidate demonstrated a clear understanding of the architectural boundaries and trade-offs.',
        strengths: ['Identified separating layers and data validation in RAG.'],
        gaps: ['Missed production scale memory calculation.'],
        betterAnswerStructure: ['State the boundary constraint.', 'Explain the memory footprint.', 'Provide a fallback.']
      });
    }

    // If the prompt is requesting final feedback report
    if (prompt.toLowerCase().includes('final report') || prompt.toLowerCase().includes('feedback')) {
      return JSON.stringify({
        summary: 'Sarah is a strong candidate showing excellent practical knowledge of RAG pipelines and vector databases. Her communication is clear, and she handles conceptual trade-offs well. She should focus on deepening her production engineering experience in Agentic systems and MCP tool management.',
        strengths: [
          'Excellent understanding of semantic search failure modes and isolation logic.',
          'Solid grasp of schema validation as a system-boundary concern rather than a prompt instruction.',
          'Strong explanation of HNSW graph indices memory vs recall trade-offs.'
        ],
        gaps: [
          'Lacked implementation-level detail on agent state persistence between planning loop steps.',
          'Did not address recovery and back-off strategies for intermittent tool timeouts.',
          'Trade-offs were qualitative rather than quantitative (omitted concrete Latency/p95 calculations).'
        ],
        next: [
          'Review Day 18: Agentic AI state persistence mechanics.',
          'Review Day 19: Termination budget and cost control loops.',
          'Review Day 21: Model Context Protocol (MCP) server configuration and schema definition.'
        ]
      });
    }

    // Default JSON fallback
    return JSON.stringify({ reply: 'Simulation JSON response.' });
  }

  // Text response generation
  if (prompt.toLowerCase().includes('first question') || prompt.toLowerCase().includes('introduce')) {
    return "Welcome Aarav. Let's begin the interview. I see you completed the RAG and Vector Databases modules. Let's start with RAG. Suppose your application retrieves documents that look semantically relevant, but the generated answer is still incorrect. How would you diagnose and debug this system?";
  }

  if (prompt.toLowerCase().includes('clarif')) {
    return 'Specifically, I want to know how you isolate the failure: is it a retrieval problem (documents are wrong) or a generation problem (context is correct but answer is wrong)? How would you test this distinction?';
  }

  return "Thank you for that answer. Moving on, let's talk about Vector Databases. You need to index 40 million embeddings with a 120 ms p95 latency budget. How would you choose between HNSW and IVF-style indexes, and which tuning parameters would you tweak first?";
}
