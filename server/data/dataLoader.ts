import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CandidateProfile {
  member: {
    id: string;
    name: string;
    jobRole: string;
    yearsExperience: number;
    education: string;
    status: string;
  };
  missions: Array<{
    day: number;
    title: string;
    passed?: boolean;
    attempts?: number;
    skipped?: boolean;
  }>;
  signals: {
    commitDays: number;
    missionsCompleted: number;
    missionsFirstTry: number;
  };
}

export interface CurriculumDay {
  day: number;
  title: string;
  type: string;
  tools: string[];
  objectives: string[];
}

export interface Curriculum {
  cohort: string;
  modules: Array<{
    n: number;
    title: string;
    days: [number, number];
  }>;
  days: CurriculumDay[];
}

let curriculum: Curriculum | null = null;
let candidates: CandidateProfile[] = [];

export function loadData() {
  try {
    const curriculumPath = path.join(__dirname, '../../data/curriculum.json');
    const candidatesPath = path.join(__dirname, '../../data/candidates.json');

    const curriculumRaw = fs.readFileSync(curriculumPath, 'utf8');
    const candidatesRaw = fs.readFileSync(candidatesPath, 'utf8');

    curriculum = JSON.parse(curriculumRaw) as Curriculum;
    candidates = (JSON.parse(candidatesRaw) as { candidates: CandidateProfile[] }).candidates;

    console.log(`[Data] Loaded curriculum (${curriculum.days.length} days) and ${candidates.length} candidate profiles.`);
  } catch (error) {
    console.error('[Data] Error loading curriculum or candidates data:', error);
  }
}

export function getCurriculum(): Curriculum {
  if (!curriculum) {
    loadData();
  }
  return curriculum!;
}

export function getCandidates(): CandidateProfile[] {
  if (candidates.length === 0) {
    loadData();
  }
  return candidates;
}

export function getCandidateById(id: string): CandidateProfile | undefined {
  return getCandidates().find(c => c.member.id === id);
}

export function getCurriculumDay(dayNumber: number): CurriculumDay | undefined {
  return getCurriculum().days.find(d => d.day === dayNumber);
}
