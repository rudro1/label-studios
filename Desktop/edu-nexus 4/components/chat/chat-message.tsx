'use client';

import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Bot, User } from 'lucide-react';
import { motion } from 'framer-motion';

export interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'group flex gap-4 p-4 w-full',
        role === 'user' ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div className='relative'>
        <motion.div
          animate={{
            scale: [1, 1.06, 1],
            opacity: [0.35, 1, 0.35],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={cn(
            'top-1/2 left-1/2 absolute -inset-1 blur-xl',
            role === 'assistant'
              ? 'bg-gradient-to-br from-primary/30 to-primary-foreground/10'
              : 'bg-gradient-to-br from-secondary/30 to-secondary-foreground/10'
          )}
        />

        <Avatar
          className={cn(
            'relative shadow-sm ring-1 ring-white/6 w-11 h-11',
            role === 'assistant'
              ? 'bg-gradient-to-br from-primary to-primary-foreground/90'
              : 'bg-gradient-to-br from-secondary to-secondary-foreground/80'
          )}
        >
          {role === 'assistant' ? (
            <Bot className='top-1/2 left-1/2 relative w-5 h-5 text-primary-foreground -translate-1/2' />
          ) : (
            <User className='top-1/2 left-1/2 relative w-5 h-5 text-secondary-foreground -translate-1/2' />
          )}
        </Avatar>
      </div>

      <Card
        className={cn(
          'relative flex-1 backdrop-blur-sm p-4 ring-1 ring-white/6',
          role === 'user'
            ? 'bg-gradient-to-br from-secondary/12 to-transparent text-white'
            : 'bg-gradient-to-br from-white/6 to-white/3 text-white/95',
          'transition-transform duration-200 hover:scale-[1.01]'
        )}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08 }}
        >
          <p className='text-black leading-relaxed whitespace-pre-wrap'>
            {content}
          </p>
        </motion.div>

        {/* subtle bubble tail */}
        <div
          className={cn(
            'top-3 absolute',
            role === 'user' ? 'right-[-6px]' : 'left-[-6px]'
          )}
        >
          <div
            className={cn(
              'w-4 h-4 rotate-45',
              role === 'user' ? 'bg-secondary/14' : 'bg-white/6'
            )}
          ></div>
        </div>
      </Card>
    </motion.div>
  );
}
