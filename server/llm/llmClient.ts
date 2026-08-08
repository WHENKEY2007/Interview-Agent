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
