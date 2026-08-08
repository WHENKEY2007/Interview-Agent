export function getCandidateReadiness(candidate: any) {
  if (!candidate || !candidate.signals) {
    return { readiness: 82, readinessLabel: 'Ready for intermediate technical interviews' };
  }

  const { commitDays = 15, missionsCompleted = 15, missionsFirstTry = 5 } = candidate.signals;
  
  const completionScore = (missionsCompleted / 31) * 60;
  const successScore = missionsCompleted > 0 ? (missionsFirstTry / missionsCompleted) * 20 : 0;
  const commitScore = (commitDays / 31) * 20;
  
  const readiness = Math.min(100, Math.max(0, Math.round(completionScore + successScore + commitScore)));
  
  let readinessLabel = 'Ready for intermediate technical interviews';
  if (readiness >= 90) {
    readinessLabel = 'Ready for advanced production AI roles';
  } else if (readiness >= 80) {
    readinessLabel = 'Ready for intermediate technical interviews';
  } else if (readiness >= 70) {
    readinessLabel = 'Ready for basic full-stack AI roles';
  } else {
    readinessLabel = 'Needs review on core concepts before interviewing';
  }
  
  return { readiness, readinessLabel };
}

export function getInitials(name: string): string {
  if (!name) return 'AM';
  const parts = name.split(' ');
  return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
}
