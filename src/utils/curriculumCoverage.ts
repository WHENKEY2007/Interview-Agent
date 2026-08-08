import curriculumData from '../../data/curriculum.json';
import { CandidateProfile, CohortTopic } from '../types';

const moduleBlurbs: Record<number, string> = {
  1: "Python environment setup, VS Code, local LLMs, and Git",
  2: "Reading & processing structured & unstructured data formats",
  3: "Vector retrieval pipelines, chunking, and similarity search",
  4: "Prompt engineering, structured output, and fine-tuning with LoRA",
  5: "FastAPI backends, streaming responses, and React interfaces",
  6: "Multi-agent planning loops, tool use, and MCP servers",
  7: "Docker, Kubernetes, guardrails, and security audits",
  8: "Observability, logging, incident response, and final project"
};

/**
 * Calculates candidate curriculum coverage dynamically based on candidate mission progress.
 */
export function getCurriculumCoverage(candidate: CandidateProfile): CohortTopic[] {
  if (!candidate || !candidate.missions) {
    return [];
  }

  const modules = curriculumData.modules;
  return modules.map((mod) => {
    const startDay = mod.days[0];
    const endDay = mod.days[1];
    
    // Generate all day numbers for this module inclusive
    const daysInModule: number[] = [];
    for (let d = startDay; d <= endDay; d++) {
      daysInModule.push(d);
    }
    const totalDaysCount = daysInModule.length;

    // Filter candidate missions matching this module's days
    const missions = candidate.missions.filter(m => daysInModule.includes(m.day));

    const passedDaysCount = missions.filter(m => m.passed === true).length;
    const failedDaysCount = missions.filter(m => m.passed === false).length;

    // Calculate progress percentage
    const progress = Math.round((passedDaysCount / totalDaysCount) * 100);

    // Derive status
    let status: 'completed' | 'in-progress' | 'needs-review' | 'not-completed';
    if (passedDaysCount === totalDaysCount) {
      status = 'completed';
    } else if (failedDaysCount > 0) {
      status = 'needs-review';
    } else if (passedDaysCount > 0) {
      status = 'in-progress';
    } else {
      status = 'not-completed';
    }

    // Derive signal
    let signal: 'strong' | 'moderate' | 'needs-practice' = 'moderate';
    if (status === 'completed') {
      const totalAttempts = missions.reduce((sum, m) => sum + (m.attempts || 1), 0);
      const avgAttempts = missions.length > 0 ? totalAttempts / missions.length : 1;
      if (avgAttempts > 2) {
        signal = 'moderate';
      } else {
        signal = 'strong';
      }
    } else if (status === 'needs-review') {
      signal = 'needs-practice';
    } else if (status === 'in-progress') {
      const hasFailures = missions.some(m => m.passed === false);
      const totalAttempts = missions.reduce((sum, m) => sum + (m.attempts || 1), 0);
      const avgAttempts = missions.length > 0 ? totalAttempts / missions.length : 1;
      if (hasFailures || avgAttempts > 2.5) {
        signal = 'needs-practice';
      } else {
        signal = 'moderate';
      }
    } else {
      signal = 'moderate';
    }

    return {
      id: `module-${mod.n}`,
      name: mod.title,
      blurb: moduleBlurbs[mod.n] || "AI Cohort Curriculum module training objectives",
      days: `Days ${startDay}–${endDay}`,
      status,
      signal,
      progress
    };
  });
}
