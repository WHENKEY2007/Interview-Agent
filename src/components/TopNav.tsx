import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MenuIcon, XIcon } from 'lucide-react';
import { Logo } from './ui/Logo';
import { useSession } from '../contexts/SessionContext';
import { getInitials } from '../utils/candidateUtils';
import { candidate as fallbackCandidate } from '../data/cohort';
import { cn } from '../utils/cn';

const links = [
{ to: '/', label: 'Dashboard', end: true },
{ to: '/interviews', label: 'Interviews', end: false },
{ to: '/progress', label: 'Learning Progress', end: false }];


export function TopNav() {
  const [open, setOpen] = useState(false);
  const { activeCandidate } = useSession();
  const cand: any = activeCandidate || fallbackCandidate;
  const candName = cand.member ? cand.member.name : (cand.name || 'Candidate');
  const initials = getInitials(candName);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-base/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center justify-between gap-6 px-5 lg:px-8">
        <div className="flex items-center gap-9">
          <Logo />
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {links.map((link) =>
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
              cn(
                'relative rounded-lg px-3 py-2 text-sm transition-colors duration-150',
                isActive ? 'text-fg' : 'text-sub hover:text-fg'
              )
              }>
              
                {({ isActive }) =>
              <>
                    {link.label}
                    {isActive ?
                <motion.span
                  layoutId="nav-underline"
                  className="absolute inset-x-3 -bottom-[13px] h-px bg-accent"
                  transition={{ type: 'spring', stiffness: 480, damping: 38 }} /> :

                null}
                  </>
              }
              </NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-[13px] font-medium leading-tight text-fg">{candName}</p>
            <p className="text-2xs leading-tight text-dim">{cand.cohort || 'ABTalks AI Cohort · Spring'}</p>
          </div>
          <button
            type="button"
            aria-label="Open profile"
            className="grid h-9 w-9 place-items-center rounded-full border border-line-strong bg-raised text-[13px] font-semibold text-fg transition-colors hover:border-accent">
            
            {initials}
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line text-sub md:hidden">
            
            {open ? <XIcon size={16} /> : <MenuIcon size={16} />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open ?
        <motion.nav
          aria-label="Mobile"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden border-t border-line bg-panel md:hidden">
          
            <div className="flex flex-col p-3">
              {links.map((link) =>
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
              cn(
                'rounded-lg px-3 py-2.5 text-sm',
                isActive ? 'bg-raised text-fg' : 'text-sub hover:text-fg'
              )
              }>
              
                  {link.label}
                </NavLink>
            )}
            </div>
          </motion.nav> :
        null}
      </AnimatePresence>
    </header>);

}