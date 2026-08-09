import { generateContent } from '../llm/llmClient';
import { CandidateProfile, CurriculumDay, getCurriculum } from '../data/dataLoader';
import { SessionState } from '../session/sessionStore';
import { validateQuestion, repairQuestion, safeParseJSON, validateAndNormalizePrimaryQuestion } from './validation';

/**
 * Dynamically selects a curriculum day to test next.
 * Ensures we pick a day that hasn't been covered in this session yet.
 */
export function selectNextDay(session: SessionState): number {
  const candidate = session.candidate;
  const covered = session.curriculumDaysCovered;
  const curriculum = getCurriculum();

  const candidateMissions = candidate.missions || [];
  
  const highAttemptDays = candidateMissions
    .filter(m => !covered.includes(m.day) && m.attempts && m.attempts >= 3)
    .map(m => m.day);

  const skippedDays = candidateMissions
    .filter(m => !covered.includes(m.day) && (m.skipped || m.passed === false))
    .map(m => m.day);

  const passedDays = candidateMissions
    .filter(m => !covered.includes(m.day) && m.passed && (!m.attempts || m.attempts < 3))
    .map(m => m.day);

  const allCurriculumDays = curriculum.days.map(d => d.day);
  const remainingDays = allCurriculumDays.filter(d => !covered.includes(d));

  if (highAttemptDays.length > 0) return highAttemptDays[0];
  if (skippedDays.length > 0) return skippedDays[0];
  if (passedDays.length > 0) return passedDays[0];
  if (remainingDays.length > 0) return remainingDays[0];
  
  return 12;
}

/**
 * Generates a deterministic fallback question when LLM calls or validations fail.
 * Inspects previously asked questions to avoid returning a duplicate.
 */
export function getDefaultFallbackQuestion(day: CurriculumDay, difficulty: string, previousQuestions: string[] = []): string {
  const candidatesList = [];
  
  // Specific questions database per day
  const dayDb: Record<number, Record<'Foundational' | 'Intermediate' | 'Advanced', string[]>> = {
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

  const diffKey = (difficulty === 'Advanced' || difficulty === 'Foundational') ? difficulty : 'Intermediate';
  const dayQuestions = dayDb[day.day]?.[diffKey] || dayDb[day.day]?.['Intermediate'];

  if (dayQuestions && dayQuestions.length > 0) {
    candidatesList.push(...dayQuestions);
  }

  // General fallbacks based on objectives
  for (const obj of day.objectives) {
    candidatesList.push(`Regarding ${day.title}, how would you approach "${obj}" in a production environment?`);
    candidatesList.push(`What is a key technical challenge when implementing "${obj}"?`);
  }
  candidatesList.push(`Could you explain how to design a production pipeline for ${day.title}?`);

  // Find the first one that is not duplicate (similarity < 0.8)
  for (const q of candidatesList) {
    const isDup = previousQuestions.some(prev => {
      const stopwords = new Set(['what', 'how', 'why', 'is', 'are', 'the', 'a', 'to', 'for', 'in', 'on', 'with', 'and', 'or', 'you', 'your']);
      const w1 = new Set(q.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopwords.has(w)));
      const w2 = new Set(prev.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopwords.has(w)));
      if (w1.size === 0 || w2.size === 0) return false;
      const intersection = [...w1].filter(x => w2.has(x));
      return intersection.length / new Set([...w1, ...w2]).size > 0.8;
    });
    if (!isDup) {
      return q;
    }
  }

  const idx = previousQuestions.length;
  return `Regarding ${day.title}, what is the main production challenge you would anticipate in phase ${idx}?`;
}

/**
 * Generates a primary interview question for a specific curriculum day.
 * Returns the question text, its classified intent, and targeted objective.
 */
export async function generatePrimaryQuestion(
  candidate: CandidateProfile,
  day: CurriculumDay,
  difficulty: 'Foundational' | 'Intermediate' | 'Advanced' = 'Intermediate',
  previousQuestions: string[] = []
): Promise<{ question: string; intent: string; objective: string }> {
  
  const systemInstruction = `You are an expert AI Technical Interviewer conducting a realistic, conversational, and focused interview.
Your goal is to evaluate the candidate's understanding of Day ${day.day} (${day.title}).

Candidate Info:
- Name: ${candidate.member.name}
- Job Role: ${candidate.member.jobRole} (${candidate.member.yearsExperience} yrs exp)

Curriculum Context:
- Day: ${day.day} - ${day.title}
- Main Objectives: ${day.objectives.slice(0, 3).join('; ')}
- Associated Tools: ${day.tools.join(', ')}

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

    let cleanedQuestion = validated.question
      .replace(/^["']|["']$/g, '')
      .replace(/^(Interviewer|Question|AI):\s*/i, '')
      .trim();

    // Run the validation loop
    const validation = validateQuestion(cleanedQuestion, 'primary', previousQuestions);
    if (!validation.valid) {
      console.warn(`[Generator] Validation failed: ${validation.reason}. Running repair loop.`);
      
      const repaired = await repairQuestion(
        cleanedQuestion,
        'primary',
        validation.reason || 'Formatting failure',
        systemInstruction
      );

      // Re-validate repaired question
      const reValidation = validateQuestion(repaired, 'primary', previousQuestions);
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
    console.error('[Generator] Error generating primary question. Returning fallback.', error);
    return {
      question: getDefaultFallbackQuestion(day, difficulty, previousQuestions),
      intent: 'conceptual',
      objective: day.objectives[0] || 'Understand curriculum topics.'
    };
  }
}
