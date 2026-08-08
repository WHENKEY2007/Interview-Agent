import { InterviewQuestion } from '../types';

export const interviewQuestions: InterviewQuestion[] = [
{
  id: 'q1',
  index: 1,
  topic: 'RAG',
  day: 'Day 12',
  difficulty: 'Intermediate',
  prompt:
  'Suppose your RAG application retrieves documents that appear semantically relevant, but the generated answers are still inaccurate. How would you debug the system?',
  keywords: ['retriev', 'chunk', 'context', 'prompt', 'ground', 'rerank', 'embed', 'eval', 'generat', 'window'],
  clarification:
  'Let me put it differently: retrieval looks fine on the surface, yet the final answer is wrong. Walk me through how you would isolate whether the problem lives in retrieval, in the context you assemble, or in generation.',
  followUps: {
    strong: {
      label: 'Going deeper',
      difficultyShift: 'up',
      text: 'You mentioned reranking. Suppose latency is a major production constraint. How would you decide whether adding a reranker is worth the trade-off?'
    },
    partial: {
      label: 'Follow-up',
      text: 'You touched on embeddings. Can you explain how the embedding model itself could affect retrieval quality here?'
    },
    irrelevant: {
      label: 'Clarifying the question',
      text: "That doesn't quite address the scenario. I'm specifically asking how you would diagnose retrieval quality before changing the generation model. How would you approach that?"
    },
    unknown: {
      label: 'Guided prompt',
      difficultyShift: 'down',
      text: "That's okay. Think about the retrieval stage first — what signals could you inspect to determine whether the correct documents are being returned?"
    }
  }
},
{
  id: 'q2',
  index: 2,
  topic: 'RAG',
  day: 'Day 13',
  difficulty: 'Intermediate',
  prompt:
  'Your corpus is a mix of long policy PDFs and short support tickets. How would you design the chunking strategy, and how would you know it was working?',
  keywords: ['chunk', 'overlap', 'token', 'semantic', 'metadata', 'recall', 'eval', 'header', 'split', 'size'],
  clarification:
  'To rephrase: two very different document shapes are going into one index. How do you decide chunk boundaries for each, and what measurement tells you the choice was right?',
  followUps: {
    strong: {
      label: 'Going deeper',
      difficultyShift: 'up',
      text: 'Good. Now say recall improves but answer quality drops because context windows fill with near-duplicate chunks. What would you change?'
    },
    partial: {
      label: 'Follow-up',
      text: 'You described the chunk sizes. What metadata would you attach to each chunk, and how would that change retrieval at query time?'
    },
    irrelevant: {
      label: 'Clarifying the question',
      text: "Let's stay on chunking specifically — not the model choice. How would you split a 90-page policy PDF differently from a five-line support ticket?"
    },
    unknown: {
      label: 'Guided prompt',
      difficultyShift: 'down',
      text: "No problem. Start simple: what happens to retrieval if a chunk is far too large, and what happens if it's far too small?"
    }
  }
},
{
  id: 'q3',
  index: 3,
  topic: 'RAG',
  day: 'Day 14',
  difficulty: 'Advanced',
  prompt:
  'Before shipping, your team needs to prove the RAG system is grounded. What would you actually measure, and how would you build that evaluation harness?',
  keywords: ['ground', 'faithful', 'citation', 'golden', 'dataset', 'eval', 'recall', 'precision', 'judge', 'regress'],
  clarification:
  'Put another way: your lead asks for evidence, not vibes. Which metrics would you report, where does the labelled data come from, and how does it run continuously?',
  followUps: {
    strong: {
      label: 'Going deeper',
      difficultyShift: 'up',
      text: 'You proposed an LLM-as-judge component. How would you keep that judge itself trustworthy over time?'
    },
    partial: {
      label: 'Follow-up',
      text: 'You named the metrics. Where does the ground-truth set come from, and how do you stop it from going stale as the corpus changes?'
    },
    irrelevant: {
      label: 'Clarifying the question',
      text: "I'm after the evaluation design rather than the product pitch. What specific numbers would you put in front of your team before launch?"
    },
    unknown: {
      label: 'Guided prompt',
      difficultyShift: 'down',
      text: "That's fine. Consider one answer with a citation that does not support it — what would you call that failure, and how would you count it across a test set?"
    }
  }
},
{
  id: 'q4',
  index: 4,
  topic: 'Vector Databases',
  day: 'Day 8',
  difficulty: 'Intermediate',
  prompt:
  'You are choosing an index for 40 million embeddings with a 120 ms p95 budget. How would you reason about HNSW versus IVF-style indexes?',
  keywords: ['hnsw', 'ivf', 'recall', 'latency', 'memory', 'ef', 'nprobe', 'quantiz', 'shard', 'index'],
  clarification:
  'Restating it: same corpus, same latency budget, two index families. What properties of each drive your decision, and which knobs would you tune?',
  followUps: {
    strong: {
      label: 'Going deeper',
      difficultyShift: 'up',
      text: 'Suppose memory cost becomes the binding constraint instead of latency. How does product quantization change your answer, and what do you give up?'
    },
    partial: {
      label: 'Follow-up',
      text: 'You mentioned recall. Which parameter would you tune first to trade recall against latency, and how would you measure the effect?'
    },
    irrelevant: {
      label: 'Clarifying the question',
      text: "Let's stay with index selection rather than the database vendor. What makes a graph-based index behave differently from a clustering-based one at this scale?"
    },
    unknown: {
      label: 'Guided prompt',
      difficultyShift: 'down',
      text: 'No problem — think about it physically. One index walks a graph of neighbours, the other scans a few clusters. Which one tends to cost more memory, and why?'
    }
  }
},
{
  id: 'q5',
  index: 5,
  topic: 'Vector Databases',
  day: 'Day 9',
  difficulty: 'Intermediate',
  prompt:
  'The product becomes multi-tenant and every query must be scoped to one customer. How would you handle filtering without destroying recall or latency?',
  keywords: ['filter', 'metadata', 'namespace', 'partition', 'tenant', 'pre-filter', 'post-filter', 'index', 'shard', 'hybrid'],
  clarification:
  'To rephrase: strict tenant isolation on every query. Would you filter before or after the vector search, and what does that choice cost you?',
  followUps: {
    strong: {
      label: 'Going deeper',
      difficultyShift: 'up',
      text: 'Now imagine a long tail of tenants with only a few hundred documents each. Does per-tenant partitioning still hold up, and what would you do instead?'
    },
    partial: {
      label: 'Follow-up',
      text: 'You mentioned metadata filters. What actually goes wrong with post-filtering when the tenant is a small slice of the index?'
    },
    irrelevant: {
      label: 'Clarifying the question',
      text: "I'm asking about isolation inside the vector store itself, not the application auth layer. How does the scoping reach the search?"
    },
    unknown: {
      label: 'Guided prompt',
      difficultyShift: 'down',
      text: "That's okay. If you retrieve the top 10 globally and then drop everything not belonging to the tenant, what could you end up with?"
    }
  }
},
{
  id: 'q6',
  index: 6,
  topic: 'Prompt Engineering',
  day: 'Day 5',
  difficulty: 'Intermediate',
  prompt:
  'A downstream service needs strictly valid JSON from the model, and roughly 3% of responses break the schema. How would you make that reliable?',
  keywords: ['schema', 'json', 'valid', 'retry', 'structured', 'constrain', 'function', 'tool', 'parse', 'temperature'],
  clarification:
  'Said differently: the contract is a schema, and the model occasionally violates it. What layers would you add so the downstream service never sees malformed output?',
  followUps: {
    strong: {
      label: 'Going deeper',
      difficultyShift: 'up',
      text: 'You mentioned validation and retries. How would you stop a retry loop from quietly tripling your latency and cost in production?'
    },
    partial: {
      label: 'Follow-up',
      text: 'You changed the prompt. What would you add outside the prompt so a malformed response can never reach the consumer?'
    },
    irrelevant: {
      label: 'Clarifying the question',
      text: "Let's stay on output reliability. What in your pipeline guarantees the schema holds, rather than merely encouraging it?"
    },
    unknown: {
      label: 'Guided prompt',
      difficultyShift: 'down',
      text: 'Fine — start at the boundary. Before the response is used, what single step would you always run on it?'
    }
  }
},
{
  id: 'q7',
  index: 7,
  topic: 'Prompt Engineering',
  day: 'Day 6',
  difficulty: 'Advanced',
  prompt:
  'Someone edits a production prompt and quality quietly regresses for a subset of users. How would you have caught that before release?',
  keywords: ['version', 'eval', 'regress', 'test', 'golden', 'canary', 'ab', 'ci', 'log', 'metric'],
  clarification:
  'Rephrasing: prompts are code that ships. What process and tooling would you put around a prompt change so a regression is caught automatically?',
  followUps: {
    strong: {
      label: 'Going deeper',
      difficultyShift: 'up',
      text: 'Your eval suite passes but real users complain. What signal in production would you trust more than the offline suite, and why?'
    },
    partial: {
      label: 'Follow-up',
      text: 'You mentioned testing. What exactly goes into the test set so it represents the subset of users who regressed?'
    },
    irrelevant: {
      label: 'Clarifying the question',
      text: "I'm asking about the release process for prompts, not the wording of the prompt itself. What gate sits between an edit and production?"
    },
    unknown: {
      label: 'Guided prompt',
      difficultyShift: 'down',
      text: "That's okay. If a prompt were an ordinary code change, what would normally protect you before merge?"
    }
  }
},
{
  id: 'q8',
  index: 8,
  topic: 'Agentic AI',
  day: 'Day 18',
  difficulty: 'Intermediate',
  prompt:
  'Your agent calls four external tools. One of them starts timing out intermittently. How would you design the agent so it degrades gracefully instead of derailing?',
  keywords: ['retry', 'timeout', 'fallback', 'state', 'error', 'circuit', 'idempot', 'backoff', 'observ', 'tool'],
  clarification:
  'Put another way: tool calls fail in the real world. What does your agent do on failure, and how does it avoid looping or losing its place?',
  followUps: {
    strong: {
      label: 'Going deeper',
      difficultyShift: 'up',
      text: 'You described retries with backoff. How would you keep the agent from repeating a side-effecting action it already completed?'
    },
    partial: {
      label: 'Follow-up',
      text: 'You mentioned handling the error. Where does the agent state live between steps, and what does it record about the failed call?'
    },
    irrelevant: {
      label: 'Clarifying the question',
      text: "Let's focus on failure handling inside the agent loop rather than the tool's own uptime. What does the agent do on the very next step after a timeout?"
    },
    unknown: {
      label: 'Guided prompt',
      difficultyShift: 'down',
      text: "That's fine. Simplest version: the tool returns nothing. What are the two or three options available to the agent at that moment?"
    }
  }
},
{
  id: 'q9',
  index: 9,
  topic: 'Agentic AI',
  day: 'Day 19',
  difficulty: 'Advanced',
  prompt:
  'How would you decide when an agent should stop? Walk me through termination and cost control for a long-running planning loop.',
  keywords: ['terminat', 'budget', 'step', 'cost', 'halt', 'confidence', 'human', 'loop', 'guard', 'token'],
  clarification:
  'Rephrasing: the loop could run forever. What conditions end it, and what stops it from burning through budget on the way?',
  followUps: {
    strong: {
      label: 'Going deeper',
      difficultyShift: 'up',
      text: 'Suppose the agent hits the step budget mid-task. What do you hand back to the user so the run is still useful?'
    },
    partial: {
      label: 'Follow-up',
      text: 'You mentioned a step limit. Beyond a hard cap, what signal would tell you the agent is making no further progress?'
    },
    irrelevant: {
      label: 'Clarifying the question',
      text: "I'm asking specifically about stopping conditions for the loop. What ends the run, and who decides?"
    },
    unknown: {
      label: 'Guided prompt',
      difficultyShift: 'down',
      text: "That's okay. Think about the crudest safety net first — what would you cap, and what happens when that cap is reached?"
    }
  }
},
{
  id: 'q10',
  index: 10,
  topic: 'MCP',
  day: 'Day 21',
  difficulty: 'Intermediate',
  prompt:
  'Your team already has bespoke tool integrations. What would you gain by exposing them through a Model Context Protocol server, and how would you design that interface?',
  keywords: ['mcp', 'server', 'client', 'tool', 'schema', 'context', 'resource', 'transport', 'interface', 'standard'],
  clarification:
  'To rephrase: same capabilities, different packaging. What does the protocol standardise, and how would you shape the tools and resources you expose?',
  followUps: {
    strong: {
      label: 'Going deeper',
      difficultyShift: 'up',
      text: 'How would you handle authorization and scoping for an MCP server that several different clients connect to?'
    },
    partial: {
      label: 'Follow-up',
      text: 'You described the benefit. Concretely, what would a single tool definition contain so a client can use it without reading your code?'
    },
    irrelevant: {
      label: 'Clarifying the question',
      text: "Let's stay with MCP specifically. What does the protocol give you that a hand-rolled integration per client does not?"
    },
    unknown: {
      label: 'Guided prompt',
      difficultyShift: 'down',
      text: "That's fine. Think about three clients and five tools built ad hoc — how many integrations is that, and what would a shared protocol change?"
    }
  }
}];


export const topicTransitionCopy: Record<string, string> = {
  'Vector Databases': "Good — that covers retrieval design. Let's move to the storage layer underneath it.",
  'Prompt Engineering': "Let's shift from infrastructure to the model interface itself.",
  'Agentic AI': "Let's switch gears and talk about agent design.",
  MCP: 'Last stretch — I want to talk about how tools are exposed to models.'
};