'use client';

import { ChatContainer } from '@/components/chat/chat-container';
import { motion } from 'framer-motion';

export default function AskAIPage() {
  return (
    <div className='relative bg-gradient-to-br from-background via-background/95 to-primary/5 h-[calc(100vh-4rem)] overflow-hidden'>
      {/* Animated background elements */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
          className='-top-1/2 -right-1/2 absolute bg-primary/5 blur-3xl rounded-full w-full h-full'
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'linear',
          }}
          className='-bottom-1/2 -left-1/2 absolute bg-secondary/5 blur-3xl rounded-full w-full h-full'
        />
      </div>

      {/* Main content */}
      <div className='relative mx-auto px-4 py-6 max-w-4xl h-full'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className='mb-6 text-center'
        >
          <h1 className='bg-clip-text bg-gradient-to-r from-primary to-secondary font-bold text-transparent text-4xl'>
            Ask AI Assistant
          </h1>
          <p className='mt-2 text-muted-foreground'>
            Your personal learning companion. Ask any question about your
            courses or studies.
          </p>
        </motion.div>

        {/* Chat interface — open, airy, glass panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className='px-2 h-[calc(100%-6rem)] overflow-visible'
        >
          <div className='bg-gradient-to-b from-white/3 to-transparent backdrop-blur-sm p-1 rounded-3xl w-full h-full'>
            <ChatContainer />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
