import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeftIcon, ArrowRightIcon, ClockIcon, GaugeIcon, LayersIcon, ListChecksIcon, RefreshCwIcon, SlidersHorizontalIcon, SparklesIcon, FileTextIcon, BoxIcon } from "lucide-react";
import { TopNav } from "../components/TopNav";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Panel } from "../components/ui/Panel";
import { useSession } from "../contexts/SessionContext";
import { candidate as fallbackCandidate } from "../data/cohort";
import { getCandidateInterviewFocus, buildPlannedFocusTopics } from "../utils/candidateFocus";

const stats = [{
  icon: ListChecksIcon,
  value: '8+',
  label: 'Questions'
}, {
  icon: ClockIcon,
  value: '~20',
  label: 'Minutes'
}, {
  icon: LayersIcon,
  value: '4+',
  label: 'Topics'
}, {
  icon: GaugeIcon,
  value: 'Adaptive',
  label: 'Difficulty'
}];

const how = [{
  icon: ListChecksIcon,
  text: 'Questions are personalized to your cohort progress and missions.'
}, {
  icon: SparklesIcon,
  text: 'Follow-up questions adapt to your answers in real time.'
}, {
  icon: SlidersHorizontalIcon,
  text: 'Difficulty adjusts dynamically based on your response quality.'
}, {
  icon: BoxIcon,
  text: 'You can ask the interviewer to clarify a question if needed.'
}, {
  icon: FileTextIcon,
  text: 'Structured interviewer feedback report is generated at completion.'
}];

const signalTone: Record<string, string> = {
  Strong: 'text-[#7EE2A8]',
  Moderate: 'text-[#A5A7FB]',
  'Needs Practice': 'text-[#F2C55C]'
};

export function InterviewBrief() {
  const navigate = useNavigate();
  const { activeCandidate, setSessionId } = useSession();

  const candidate: any = activeCandidate || fallbackCandidate;
  const name = candidate.member ? candidate.member.name : candidate.name;
  const role = candidate.member ? candidate.member.jobRole : candidate.jobRole;

  const focus = getCandidateInterviewFocus(candidate);
  const plannedTopics = buildPlannedFocusTopics(candidate, focus);

  const handleBeginInterview = () => {
    setSessionId(null); // Clear previous session for clean start
    navigate('/interview');
  };

  return (
    <div className="min-h-full w-full bg-base">
      <TopNav />

      <main className="mx-auto w-full max-w-[900px] px-5 pb-24 pt-14 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <Badge tone="accent" icon={<SparklesIcon size={11} />}>
            Personalized for {name}
          </Badge>
          <h1 className="mt-4 text-[36px] font-semibold leading-[1.1] tracking-[-0.03em] text-fg">
            Your interview is ready
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-sub">
            We’ve prepared an adaptive technical interview for <strong>{name}</strong> ({role}) based on your 31-day AI Cohort learning journey.
          </p>
        </motion.div>

        <motion.ul 
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {stats.map((s) => (
            <li key={s.label} className="rounded-xl border border-line bg-panel p-4 text-center">
              <s.icon size={15} className="mx-auto text-accent" aria-hidden />
              <p className="mt-2.5 text-[20px] font-semibold tracking-[-0.02em] text-fg">{s.value}</p>
              <p className="mt-0.5 text-2xs uppercase tracking-[0.1em] text-dim">{s.label}</p>
            </li>
          ))}
        </motion.ul>

        <motion.div 
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2"
        >
          <Panel className="p-5">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-sub">Planned focus topics</h2>
            <ul className="mt-4 space-y-2">
              {plannedTopics.map((t) => (
                <li key={t.topic} className="flex items-center justify-between rounded-lg border border-line bg-raised px-3 py-2.5">
                  <div>
                    <p className="text-[13.5px] font-medium text-fg">{t.topic}</p>
                    <p className="font-mono text-2xs text-dim">{t.dayRange}</p>
                  </div>
                  <span className={`text-2xs font-medium ${signalTone[t.status]}`}>{t.status}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="p-5">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-sub">How this interview works</h2>
            <ul className="mt-4 space-y-3.5">
              {how.map((item) => (
                <li key={item.text} className="flex items-start gap-3">
                  <span className="mt-[2px] grid h-6 w-6 shrink-0 place-items-center rounded-md border border-line bg-raised text-accent">
                    <item.icon size={12} />
                  </span>
                  <p className="text-[13.5px] leading-relaxed text-sub">{item.text}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row"
        >
          <Button size="lg" variant="secondary" onClick={() => navigate('/')} icon={<ArrowLeftIcon size={16} />} className="w-full sm:w-auto">
            Back to Dashboard
          </Button>
          <Button size="lg" onClick={handleBeginInterview} iconRight={<ArrowRightIcon size={16} />} className="w-full sm:w-auto">
            Begin Interview
          </Button>
        </motion.div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-2xs text-dim">
          <RefreshCwIcon size={11} />
          You can pause by ending the interview early; partial feedback is still generated.
        </p>
      </main>
    </div>
  );
}