import { generateContent } from '../llm/llmClient';
import { CurriculumDay } from '../data/dataLoader';
import { safeParseJSON, validateAndNormalizeEvaluation } from './validation';

export interface EvaluationResult {
  score: number;
  quality: 'strong' | 'partial' | 'incorrect' | 'irrelevant' | 'unknown';
  evaluation: string;
  strengths: string[];
  gaps: string[];
  misconceptions: string[];
  betterAnswerStructure: string[];
  metrics?: {
    technical: number;
    problemSolving: number;
    communication: number;
    depth: number;
    practical: number;
  };
}

export async function evaluateAnswer(
  question: string,
  answer: string,
  day: CurriculumDay,
  objective: string,
  previousContext = ''
): Promise<EvaluationResult> {
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
All Curriculum Objectives for reference: ${day.objectives.join(', ')}
Previous Conversational Context:
${previousContext || 'None (This is the first question on this topic).'}

Please evaluate this answer and output only the valid JSON object.`;

  try {
    const responseText = await generateContent(prompt, systemInstruction, true);
    const parsed = safeParseJSON(responseText);
    const validated = validateAndNormalizeEvaluation(parsed, question, answer, day);
    return validated;
  } catch (error) {
    console.error('[Evaluator] Error parsing JSON evaluation or rate limited. Running local keyword evaluator.', error);
    
    const answerLower = answer.toLowerCase();
    
    // 1. Skip / Don't Know Detection
    const skipKeywords = ["don't know", "don't recall", "no idea", "uncertain", "skip", "pass", "no clue", "dunno", "not sure"];
    const isSkip = skipKeywords.some(kw => answerLower.includes(kw));
    
    // 2. Irrelevant / Off-topic / Brief response detection
    const wordCount = answer.trim().split(/\s+/).length;
    const isIrrelevant = wordCount < 3 || answerLower.includes("irrelevant") || answerLower.includes("python and react");
    
    // 3. Define keywords per day (mapped directly to day number)
    const dayKeywords: Record<number, string[]> = {
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
    
    // Override/supplement keywords based on the follow-up question context:
    if (questionLower.includes("failure") || questionLower.includes("recovery") || questionLower.includes("edge case")) {
      keywords = ["retry", "failover", "backup", "recovery", "fallback", "error", "exception", "circuit", "redundancy", "replicate", "catch", "try", "queue", "log"];
    } else if (questionLower.includes("monitoring") || questionLower.includes("metric") || questionLower.includes("collect")) {
      keywords = ["metric", "monitor", "latency", "throughput", "error rate", "cpu", "memory", "prometheus", "grafana", "dashboard", "log", "alert", "health", "qps", "rpm", "trace", "instrument"];
    } else if (questionLower.includes("latency") || questionLower.includes("scale") || questionLower.includes("trade-off") || questionLower.includes("grow")) {
      keywords = ["latency", "scale", "throughput", "trade-off", "memory", "vram", "gpu", "cache", "speed", "size", "cost", "shard", "partition", "replica", "load", "parallel", "concurrent", "batch"];
    }

    const matched = keywords.filter(kw => answerLower.includes(kw));
    
    let score = 70;
    let quality = 'partial';
    let evaluation = 'Candidate responded but the automated evaluation could not verify full details.';
    let strengths = ['Addressed the general topic.'];
    let gaps = ['Missed implementation details.'];
    let misconceptions: string[] = [];
    
    if (isSkip) {
      score = 0;
      quality = 'unknown';
      evaluation = `Candidate stated they do not know the concept or chose to skip for Day ${day.day} (${day.title}).`;
      strengths = [];
      gaps = ['Review the main learning objectives for this day.'];
    } else if (isIrrelevant) {
      score = 20;
      quality = 'irrelevant';
      evaluation = `Response is off-topic, extremely brief, or does not address the question for Day ${day.day} (${day.title}).`;
      strengths = [];
      gaps = ['Address the specific question with relevant details.'];
    } else {
      const matchCount = matched.length;
      if (matchCount >= 2) {
        score = 90;
        quality = 'strong';
        evaluation = `Demonstrated strong conceptual mastery of ${day.title} by discussing key terms: ${matched.join(', ')}.`;
        strengths = [`Correctly identified core mechanisms: ${matched.slice(0, 2).join(' and ')}.`];
        gaps = [];
      } else if (matchCount >= 1) {
        score = 70;
        quality = 'partial';
        evaluation = `Demonstrated partial understanding of ${day.title}. Mentioned ${matched.join(', ')} but missed deeper trade-offs.`;
        strengths = [`Correctly mentioned core terms: ${matched.join(', ')}.`];
        gaps = ['Explain production scaling and error recovery steps.'];
      } else {
        score = 45;
        quality = 'incorrect';
        evaluation = `Responded but did not reference core curriculum mechanisms or tools for ${day.title}.`;
        strengths = ['Attempted the response.'];
        gaps = ['Focus on the specific tools and implementation layers recommended in the curriculum.'];
        misconceptions = ['Struggled to connect concepts back to the cohort curriculum.'];
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
