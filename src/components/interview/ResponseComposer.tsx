import React, { useEffect, useRef, useState } from 'react';
import { HelpCircleIcon, SendIcon } from 'lucide-react';
import { Button } from '../ui/Button';

interface ResponseComposerProps {
  disabled: boolean;
  onSubmit: (text: string) => void;
  onClarify: () => void;
  clarifyUsed: boolean;
}

export function ResponseComposer({ disabled, onSubmit, onClarify, clarifyUsed }: ResponseComposerProps) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
  }, [value]);

  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSubmit(text);
    setValue('');
  };

  return (
    <div className="border-t border-line bg-base/95 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-[1100px] px-5 py-4 lg:px-8">
        <div className="rounded-2xl border border-line bg-panel transition-colors focus-within:border-line-strong">
          <label htmlFor="answer" className="sr-only">
            Your answer
          </label>
          <textarea
            id="answer"
            ref={ref}
            rows={3}
            value={value}
            disabled={disabled}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Explain your approach..."
            className="w-full resize-none bg-transparent px-4 pt-4 text-[15px] leading-relaxed text-fg placeholder:text-dim focus:outline-none disabled:opacity-50" />
          

          <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-3 pt-1">
            <div className="flex items-center gap-2 pl-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClarify}
                disabled={disabled || clarifyUsed}
                icon={<HelpCircleIcon size={13} />}>
                
                {clarifyUsed ? 'Clarification given' : 'Ask for Clarification'}
              </Button>
              <span className="hidden font-mono text-2xs text-dim sm:inline">{words} words</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden font-mono text-2xs text-dim md:inline">⌘ + ↵ to submit</span>
              <Button size="md" onClick={submit} disabled={disabled || words === 0} iconRight={<SendIcon size={14} />}>
                Submit Answer
              </Button>
            </div>
          </div>
        </div>

        <p className="mt-2.5 px-1 text-2xs text-dim">
          Answer as you would in a real interview — multi-paragraph reasoning is expected and scored higher than short
          replies.
        </p>
      </div>
    </div>);

}