import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SessionProvider } from './contexts/SessionContext';
import { Dashboard } from './pages/Dashboard';
import { InterviewBrief } from './pages/InterviewBrief';
import { LiveInterview } from './pages/LiveInterview';
import { InterviewComplete } from './pages/InterviewComplete';
import { FeedbackReport } from './pages/FeedbackReport';
import { Interviews } from './pages/Interviews';
import { LearningProgress } from './pages/LearningProgress';

export function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <div className="min-h-full w-full bg-base font-sans text-fg antialiased">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/brief" element={<InterviewBrief />} />
            <Route path="/interview" element={<LiveInterview />} />
            <Route path="/complete" element={<InterviewComplete />} />
            <Route path="/report" element={<FeedbackReport />} />
            <Route path="/interviews" element={<Interviews />} />
            <Route path="/progress" element={<LearningProgress />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </div>
      </BrowserRouter>
    </SessionProvider>);

}