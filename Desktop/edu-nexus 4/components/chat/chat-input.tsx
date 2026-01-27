'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendHorizontal } from 'lucide-react';
import { KeyboardEvent, useState } from 'react';
import { motion } from 'framer-motion';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className='relative bg-gradient-to-t from-black/10 to-transparent backdrop-blur-lg p-5'
    >
      <div className='flex items-end gap-4 mx-auto max-w-5xl'>
        <div className='flex-1'>
          <div className='flex gap-2 mb-2'>
            <button
              onClick={() => {
                setInput('Summarize courses');
              }}
              className='bg-white/6 px-3 py-1 rounded-full text-sm'
            >
              Summarize
            </button>
            <button
              onClick={() => {
                setInput('Create a study plan for 2 weeks');
              }}
              className='bg-white/6 px-3 py-1 rounded-full text-sm'
            >
              Study Plan
            </button>
            <button
              onClick={() => {
                setInput('Give examples');
              }}
              className='bg-white/6 px-3 py-1 rounded-full text-sm'
            >
              Examples
            </button>
          </div>

          <div className='relative'>
            <Textarea
              placeholder="Ask anything about your course, e.g. 'Explain linear regression'"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className='bg-gradient-to-br from-white/3 to-black/20 p-4 border border-white/6 rounded-2xl min-h-[68px] max-h-40 placeholder:text-foreground/40 text-sm resize-none'
              disabled={isLoading}
            />
            <div className='right-3 bottom-3 absolute text-muted-foreground text-xs'>
              Shift+Enter for newline
            </div>
          </div>
        </div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size='icon'
            className='relative shadow-2xl rounded-2xl w-16 h-16 overflow-hidden'
          >
            <div className='absolute inset-0 bg-gradient-to-br from-primary to-secondary' />
            <div className='absolute inset-1 bg-black/40 rounded-2xl' />
            <SendHorizontal className='z-10 relative w-5 h-5 text-white transform' />
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className='absolute inset-0 bg-gradient-to-br from-primary to-secondary opacity-60 blur-xl'
            />
          </Button>
          {/* <div className='mt-2 text-muted-foreground text-xs text-center'>
            Send
          </div> */}
        </motion.div>
      </div>
    </motion.div>
  );
}
