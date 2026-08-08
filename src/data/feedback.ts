import { MetricScore, NextStep, QuestionReviewItem, TopicScore } from '../types';

export const overallScore = 82;

export const overallLabel = 'Strong Performance';

export const overallInsight =
'You demonstrated solid conceptual understanding and communicated most engineering decisions clearly. Your biggest opportunity is developing deeper production-level reasoning around agent systems.';

export const metricScores: MetricScore[] = [
{ label: 'Technical Understanding', score: 86, note: 'Accurate concepts, correct terminology' },
{ label: 'Problem Solving', score: 81, note: 'Structured diagnosis, occasional gaps' },
{ label: 'Communication', score: 88, note: 'Clear narrative, easy to follow' },
{ label: 'Depth of Explanation', score: 74, note: 'Stops short of implementation detail' },
{ label: 'Practical Application', score: 79, note: 'Trade-offs named but rarely quantified' }];


export const topicScores: TopicScore[] = [
{ topic: 'RAG', score: 91, day: 'Days 10–14' },
{ topic: 'Vector Databases', score: 84, day: 'Days 7–9' },
{ topic: 'Prompt Engineering', score: 87, day: 'Days 4–6' },
{ topic: 'Agentic AI', score: 68, day: 'Days 17–20' },
{ topic: 'MCP', score: 72, day: 'Days 21–23' }];


export const strengths: string[] = [
'You clearly explained the separation between retrieval and generation failures in a RAG pipeline.',
'You demonstrated strong understanding of embedding-based retrieval and similarity search, including where recall degrades.',
'You reasoned about schema validation as a boundary concern rather than a prompt-wording problem.',
'Your answers were structured and generally easy to follow, usually starting from the failure and working outward.'];


export const growthAreas: string[] = [
'Your explanation of agent state management lacked implementation-level detail — where state lives and what is persisted between steps.',
'You identified tool selection as important but did not explain how you would handle tool failures or retries.',
'Some answers described what a system does without explaining why you would choose that architecture over the alternative.',
'Trade-offs were named qualitatively; interviewers expect approximate numbers for latency, cost, or recall.'];


export const questionReviews: QuestionReviewItem[] = [
{
  id: 'r1',
  topic: 'RAG',
  day: 'Day 12',
  status: 'Strong',
  question:
  'Suppose your RAG application retrieves documents that appear semantically relevant, but the generated answers are still inaccurate. How would you debug the system?',
  answer:
  "I'd first confirm whether it's a retrieval or generation problem by inspecting the retrieved chunks for a set of failing queries. If the right passage is present in context, retrieval is fine and the issue is in prompt assembly or generation. If it isn't, I'd look at chunking and the embedding model, then consider a reranker.",
  evaluation:
  'A well-sequenced diagnosis. You isolated the failing stage before proposing fixes, which is exactly the reasoning interviewers look for.',
  strengths: [
  'Separated retrieval failure from generation failure before acting.',
  'Named a concrete inspection step rather than a generic "check the logs".'],

  improvements: [
  'You did not mention how you would validate that the fix worked across a test set.',
  'Context assembly — ordering, deduplication, truncation — was skipped.'],

  betterAnswer: [
  'State the failure you are diagnosing in one sentence.',
  'Separate retrieval problems from generation problems, and say how you tell them apart.',
  'Identify the metrics and logs you would inspect (recall@k, citation support, context length).',
  'Explain the engineering trade-off behind your chosen fix.',
  'Finish with how you would validate the fix on a labelled set before shipping.']

},
{
  id: 'r2',
  topic: 'RAG',
  day: 'Day 14',
  status: 'Good',
  question:
  'Before shipping, your team needs to prove the RAG system is grounded. What would you actually measure, and how would you build that evaluation harness?',
  answer:
  "I'd build a golden set of questions with expected answers and measure retrieval recall plus faithfulness of the final answer. Probably use an LLM judge for faithfulness and run it in CI.",
  evaluation:
  'The right metrics, but the harness stayed abstract. You named the components without describing how they stay trustworthy.',
  strengths: [
  'Correctly separated retrieval metrics from answer-level faithfulness.',
  'Recognised that evaluation belongs in CI, not in a one-off notebook.'],

  improvements: [
  'No description of where the golden set comes from or how it is maintained.',
  'The LLM judge was proposed without any calibration against human labels.'],

  betterAnswer: [
  'Define grounded concretely: every claim supported by a retrieved span.',
  'Describe the labelled set — size, source, and refresh cadence.',
  'Give two layers of metrics: retrieval (recall@k) and answer (faithfulness, citation precision).',
  'Explain how the judge is calibrated against a human-labelled sample.',
  'Close with the release gate: which number blocks a deploy.']

},
{
  id: 'r3',
  topic: 'Vector Databases',
  day: 'Day 8',
  status: 'Good',
  question:
  'You are choosing an index for 40 million embeddings with a 120 ms p95 budget. How would you reason about HNSW versus IVF-style indexes?',
  answer:
  'HNSW gives better recall at low latency but uses much more memory. IVF with quantization is cheaper to host. At 40M vectors I would probably start with HNSW and tune ef_search against the latency budget.',
  evaluation:
  'Correct instincts and a real tuning knob named. The reasoning would land harder with approximate numbers attached.',
  strengths: [
  'Named the actual trade-off axis: recall versus memory versus latency.',
  'Referenced a specific parameter (ef_search) rather than staying generic.'],

  improvements: [
  'No estimate of index memory footprint at 40M vectors.',
  'Sharding and replica strategy for the p95 target was not addressed.'],

  betterAnswer: [
  'Restate the constraints: corpus size, latency budget, memory budget.',
  'Compare the two index families on recall, memory, and build time.',
  'Give a rough footprint estimate to justify the choice.',
  'Name the tuning knob and how you would sweep it against a recall curve.',
  'Say how you would verify p95 under realistic concurrency.']

},
{
  id: 'r4',
  topic: 'Prompt Engineering',
  day: 'Day 5',
  status: 'Strong',
  question:
  'A downstream service needs strictly valid JSON from the model, and roughly 3% of responses break the schema. How would you make that reliable?',
  answer:
  "I'd treat the schema as a contract enforced outside the model: validate every response, and on failure retry once with the validation error fed back. Where the provider supports constrained decoding or tool schemas, I'd use that instead of relying on instructions, and cap retries so latency stays bounded.",
  evaluation:
  'Excellent framing. You put the guarantee in the system rather than in the prompt, and you bounded the retry cost unprompted.',
  strengths: [
  'Made validation a hard boundary rather than a prompt improvement.',
  'Anticipated the cost and latency impact of retries without being asked.'],

  improvements: [
  'Observability was missing — you would want the schema-failure rate as a tracked metric.'],

  betterAnswer: [
  'Frame the schema as a contract owned by the system, not the model.',
  'Layer the defences: constrained decoding, then validation, then bounded retry.',
  'Describe the fallback when retries are exhausted.',
  'Add the metric you would alert on.']

},
{
  id: 'r5',
  topic: 'Agentic AI',
  day: 'Day 18',
  status: 'Needs Improvement',
  question:
  'Your agent calls four external tools. One of them starts timing out intermittently. How would you design the agent so it degrades gracefully instead of derailing?',
  answer:
  'I would catch the error and let the agent decide what to do next. The model can usually recover and try a different tool.',
  evaluation:
  'This delegates the hard problem to the model. Interviewers want the deterministic scaffolding you build around the loop.',
  strengths: ['You recognised that the failure must not terminate the run.'],
  improvements: [
  'No retry policy, backoff, or timeout budget was described.',
  'Agent state between steps was not addressed, so recovery has nothing to resume from.',
  'No mention of idempotency for side-effecting tools.'],

  betterAnswer: [
  'Classify the failure: transient timeout versus hard error versus bad arguments.',
  'Describe the deterministic policy — timeout, bounded retries with backoff, circuit breaker.',
  'Explain where step state is persisted so the loop can resume rather than restart.',
  'Cover idempotency keys for tools with side effects.',
  'End with the fallback path and what the user sees when the tool stays down.']

},
{
  id: 'r6',
  topic: 'Agentic AI',
  day: 'Day 19',
  status: 'Needs Improvement',
  question:
  'How would you decide when an agent should stop? Walk me through termination and cost control for a long-running planning loop.',
  answer:
  'I would set a maximum number of steps so it cannot run forever, and stop when the model says the task is done.',
  evaluation:
  'A hard cap is the right floor, but the answer stopped there. Termination design is about progress signals and budgets, not just a counter.',
  strengths: ['Identified a hard step cap as a baseline safety net.'],
  improvements: [
  'No token or cost budget alongside the step count.',
  'No no-progress detection, such as repeated identical tool calls.',
  'No description of what is returned to the user on a truncated run.'],

  betterAnswer: [
  'List the termination conditions: goal satisfied, budget exhausted, no progress, human handoff.',
  'Attach concrete budgets — steps, tokens, wall-clock, currency.',
  'Explain how you detect stagnation rather than only counting steps.',
  'Describe the partial result handed back on truncation.',
  'Note what you log so a truncated run can be diagnosed later.']

},
{
  id: 'r7',
  topic: 'MCP',
  day: 'Day 21',
  status: 'Needs Improvement',
  question:
  'Your team already has bespoke tool integrations. What would you gain by exposing them through a Model Context Protocol server, and how would you design that interface?',
  answer:
  'MCP standardises how models talk to tools, so any client can use our tools without custom code for each one.',
  evaluation:
  'The headline benefit is correct, but the design half of the question went unanswered.',
  strengths: ['Correctly identified standardisation across clients as the core value.'],
  improvements: [
  'No description of what a tool definition actually contains.',
  'Resources versus tools versus prompts were not distinguished.',
  'Authorization and scoping across multiple clients was not addressed.'],

  betterAnswer: [
  'Name the N×M integration problem the protocol removes.',
  'Describe the surface: tools, resources, and prompts, and what each is for.',
  'Specify a tool definition — name, description, typed input schema, error shape.',
  'Cover auth, scoping, and rate limits per connecting client.',
  'Finish with how you would version the server without breaking clients.']

}];


export const nextSteps: NextStep[] = [
{
  day: 'Day 18',
  topic: 'Agentic AI',
  reason: 'Weakest topic in this interview — 68%.',
  items: ['Tool selection', 'State management', 'Error handling & retries']
},
{
  day: 'Day 19',
  topic: 'Agent Control Loops',
  reason: 'Termination and budget reasoning stayed surface-level.',
  items: ['Termination conditions', 'Cost & step budgets', 'Progress detection']
},
{
  day: 'Day 21',
  topic: 'MCP',
  reason: 'Interface design half of the answer was missing.',
  items: ['Tool interfaces', 'Context exchange', 'MCP architecture']
}];


export const sessionSummary = {
  questions: 10,
  topics: 5,
  minutes: 24
};