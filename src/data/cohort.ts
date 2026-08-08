import { CohortTopic } from '../types';

export const candidate = {
  name: 'Aarav Mehta',
  initials: 'AM',
  cohort: 'ABTalks AI Cohort · Spring',
  daysCompleted: 23,
  totalDays: 31,
  readiness: 82,
  readinessLabel: 'Ready for intermediate technical interviews'
};

export const cohortTopics: CohortTopic[] = [
{
  id: 'rag',
  name: 'RAG',
  blurb: 'Retrieval pipelines, chunking, grounding',
  days: 'Days 10–14',
  status: 'completed',
  signal: 'strong',
  progress: 100
},
{
  id: 'vector-db',
  name: 'Vector Databases',
  blurb: 'Indexing, ANN search, hybrid filters',
  days: 'Days 7–9',
  status: 'completed',
  signal: 'strong',
  progress: 100
},
{
  id: 'prompt',
  name: 'Prompt Engineering',
  blurb: 'Structured output, evals, versioning',
  days: 'Days 4–6',
  status: 'completed',
  signal: 'moderate',
  progress: 100
},
{
  id: 'agentic',
  name: 'Agentic AI',
  blurb: 'Planning loops, tools, state machines',
  days: 'Days 17–20',
  status: 'needs-review',
  signal: 'needs-practice',
  progress: 74
},
{
  id: 'mcp',
  name: 'MCP',
  blurb: 'Model Context Protocol servers & clients',
  days: 'Days 21–23',
  status: 'in-progress',
  signal: 'needs-practice',
  progress: 48
},
{
  id: 'deployment',
  name: 'AI Deployment',
  blurb: 'Serving, scaling, cost controls',
  days: 'Days 24–27',
  status: 'not-completed',
  signal: 'moderate',
  progress: 0
},
{
  id: 'production',
  name: 'Production AI Systems',
  blurb: 'Observability, guardrails, incident response',
  days: 'Days 28–31',
  status: 'not-completed',
  signal: 'moderate',
  progress: 0
}];


export const focusChips: {topic: string;signal: 'Strong' | 'Needs Practice' | 'Moderate';}[] = [
{ topic: 'RAG', signal: 'Strong' },
{ topic: 'Vector Databases', signal: 'Strong' },
{ topic: 'Prompt Engineering', signal: 'Moderate' },
{ topic: 'Agentic AI', signal: 'Needs Practice' },
{ topic: 'MCP', signal: 'Needs Practice' }];


export const recentSessions = [
{ date: 'Aug 2', label: 'Adaptive · 8 questions', score: 76 },
{ date: 'Jul 26', label: 'RAG deep dive · 6 questions', score: 71 }];