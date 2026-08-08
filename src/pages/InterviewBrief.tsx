import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeftIcon, ArrowRightIcon, ClockIcon, GaugeIcon, LayersIcon, ListChecksIcon, RefreshCwIcon, SlidersHorizontalIcon, SparklesIcon, FileTextIcon, BoxIcon } from "lucide-react";
import { TopNav } from "../components/TopNav";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Panel } from "../components/ui/Panel";
const stats = [{
  icon: ListChecksIcon,
  value: '10',
  label: 'Questions'
}, {
  icon: ClockIcon,
  value: '~20',
  label: 'Minutes'
}, {
  icon: LayersIcon,
  value: '5',
  label: 'Topics'
}, {
  icon: GaugeIcon,
  value: 'Adaptive',
  label: 'Difficulty'
}];
const topics = [{
  name: 'RAG',
  days: 'Days 10–14',
  signal: 'Strong'
}, {
  name: 'Vector Databases',
  days: 'Days 7–9',
  signal: 'Strong'
}, {
  name: 'Prompt Engineering',
  days: 'Days 4–6',
  signal: 'Moderate'
}, {
  name: 'Agentic AI',
  days: 'Days 17–20',
  signal: 'Needs Practice'
}, {
  name: 'MCP',
  days: 'Days 21–23',
  signal: 'Needs Practice'
}];
const how = [{
  icon: ListChecksIcon,
  text: 'Questions are based on topics you’ve completed.'
}, {
  icon: SparklesIcon,
  text: 'Follow-up questions adapt to your answers.'
}, {
  icon: SlidersHorizontalIcon,
  text: 'Difficulty may increase or decrease based on your responses.'
}, {
  icon: BoxIcon,
  text: 'You can ask the interviewer to clarify a question.'
}, {
  icon: FileTextIcon,
  text: 'Detailed feedback is provided after completion.'
}];
const signalTone: Record<string, string> = {
  Strong: 'text-[#7EE2A8]',
  Moderate: 'text-[#A5A7FB]',
  'Needs Practice': 'text-[#F2C55C]'
};
export function InterviewBrief() {
  const navigate = useNavigate();
  return <div className="min-h-full w-full bg-base">
      <TopNav />

      <main className="mx-auto w-full max-w-[900px] px-5 pb-24 pt-14 lg:px-8">
        <motion.div initial={{
        opacity: 0,
        y: 14
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1]
      }} className="text-center">
          <Badge tone="accent" icon={<SparklesIcon size={11} />}>
            Interview prepared
          </Badge>
          <h1 className="mt-4 text-[36px] font-semibold leading-[1.1] tracking-[-0.03em] text-fg">
            Your interview is ready
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-sub">
            We’ve created a personalised technical interview based on your completed cohort topics and learning
            progress. Take your time — thoughtful answers score better than fast ones.
          </p>
        </motion.div>

        <motion.ul initial={{
        opacity: 0,
        y: 14
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.5,
        delay: 0.08,
        ease: [0.16, 1, 0.3, 1]
      }} className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => <li key={s.label} className="rounded-xl border border-line bg-panel p-4 text-center">
              <s.icon size={15} className="mx-auto text-accent" aria-hidden />
              <p className="mt-2.5 text-[20px] font-semibold tracking-[-0.02em] text-fg">{s.value}</p>
              <p className="mt-0.5 text-2xs uppercase tracking-[0.1em] text-dim">{s.label}</p>
            </li>)}
        </motion.ul>

        <motion.div initial={{
        opacity: 0,
        y: 14
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.5,
        delay: 0.14,
        ease: [0.16, 1, 0.3, 1]
      }} className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel className="p-5">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-sub">Selected topics</h2>
            <ul className="mt-4 space-y-2">
              {topics.map((t) => <li key={t.name} className="flex items-center justify-between rounded-lg border border-line bg-raised px-3 py-2.5">
                  <div>
                    <p className="text-[13.5px] font-medium text-fg">{t.name}</p>
                    <p className="font-mono text-2xs text-dim">{t.days}</p>
                  </div>
                  <span className={`text-2xs font-medium ${signalTone[t.signal]}`}>{t.signal}</span>
                </li>)}
            </ul>
          </Panel>

          <Panel className="p-5">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-sub">How this interview works</h2>
            <ul className="mt-4 space-y-3.5">
              {how.map((item) => <li key={item.text} className="flex items-start gap-3">
                  <span className="mt-[2px] grid h-6 w-6 shrink-0 place-items-center rounded-md border border-line bg-raised text-accent">
                    <item.icon size={12} />
                  </span>
                  <p className="text-[13.5px] leading-relaxed text-sub">{item.text}</p>
                </li>)}
            </ul>
          </Panel>
        </motion.div>

        <motion.div initial={{
        opacity: 0,
        y: 14
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.5,
        delay: 0.2,
        ease: [0.16, 1, 0.3, 1]
      }} className="mt-8 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" variant="secondary" onClick={() => navigate('/')} icon={<ArrowLeftIcon size={16} />} className="w-full sm:w-auto">
            Back to Dashboard
          </Button>
          <Button size="lg" onClick={() => navigate('/interview')} iconRight={<ArrowRightIcon size={16} />} className="w-full sm:w-auto">
            Begin Interview
          </Button>
        </motion.div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-2xs text-dim">
          <RefreshCwIcon size={11} />
          You can pause by ending the interview early; partial feedback is still generated.
        </p>
      </main>
    </div>;
}