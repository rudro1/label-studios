'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatMessage, ChatMessageProps } from './chat-message';
import { ChatInput } from './chat-input';
import { motion } from 'framer-motion';
import { CallAiAction } from '@/app/dashboard/ask-ai/_actions';

// Simulated AI response function (replace with actual API call later)
const simulateAIResponse = async (message: string): Promise<string> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const responses = [
    "That's an interesting question! Let me help you with that.",
    "I understand what you're asking. Here's what I think...",
    'Based on my knowledge, I can provide some insights on this.',
    'Great question! Let me break this down for you.',
    "I'd be happy to help you understand this better.",
  ];

  return `${responses[Math.floor(Math.random() * responses.length)]} 
  
${
  message.length > 50 ? 'Your question was quite detailed! ' : ''
}Here's a simulated response to: "${message}"`;
};

export function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessageProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [titleGlow, setTitleGlow] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content }]);
    setIsLoading(true);

    try {
      // Get AI response
      //   const response = await simulateAIResponse(content);
      const response = await CallAiAction({
        prompt: content,
        includeCourseInfo: true,
      });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response },
      ]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'I apologize, but I encountered an error processing your request. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  // tiny flourish for title glow when messages arrive
  useEffect(() => {
    if (messages.length === 0) return;
    setTitleGlow(true);
    const t = setTimeout(() => setTitleGlow(false), 1000);
    return () => clearTimeout(t);
  }, [messages.length]);

  return (
    <div className='relative flex flex-col h-full min-h-0'>
      {/* Luxurious header */}
      <div className='flex justify-between items-center gap-4 px-6 pt-6 pb-4'>
        <div className='flex items-center gap-4'>
          <div className='flex justify-center items-center bg-gradient-to-br from-primary to-primary-foreground shadow-2xl rounded-full w-12 h-12'>
            <span className='text-2xl'>🤖</span>
          </div>
          <div>
            <h2
              className={
                'text-lg font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary ' +
                (titleGlow ? 'animate-pulse' : '')
              }
            >
              Nexus AI Assistant
            </h2>
            <p className='text-muted-foreground text-xs'>
              AI-powered tutor — private & secure
            </p>
          </div>
        </div>

        <div className='flex items-center gap-3'>
          <button
            onClick={clearChat}
            className='bg-white/5 hover:bg-white/7 px-3 py-2 rounded-lg text-sm transition'
            title='Clear conversation'
          >
            Clear
          </button>
          <div className='bg-gradient-to-r from-primary to-secondary shadow-lg px-3 py-2 rounded-lg text-white text-sm'>
            Premium
          </div>
        </div>
      </div>

      {/* Main panel (airy, glassy, no heavy box) */}
      <div className='relative flex-1 mx-4 mb-4 rounded-3xl overflow-hidden'>
        {/* soft ambient background */}
        <div className='absolute inset-0 to-transparent opacity-60 backdrop-blur-sm pointer-events-none' />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className='relative flex flex-col h-full'
        >
          <div className='flex-1 space-y-4 px-5 py-6 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent hover:scrollbar-thumb-primary/30'>
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className='flex flex-col justify-center items-center gap-4 py-12 h-full'
              >
                <div className='flex justify-center items-center bg-gradient-to-br from-primary/80 to-secondary/60 shadow-[0_20px_40px_rgba(123,97,255,0.08)] rounded-full w-28 h-28'>
                  <span className='text-5xl'>✨</span>
                </div>
                <div className='text-center'>
                  <h3 className='bg-clip-text bg-gradient-to-r from-primary to-primary-foreground font-bold text-transparent text-2xl'>
                    Welcome to Nexus AI
                  </h3>
                  <p className='mt-2 max-w-md text-muted-foreground'>
                    Ask questions about your courses, get explanations,
                    examples, or study plans. Try: "Explain the chain rule with
                    examples."
                  </p>
                </div>
              </motion.div>
            )}

            {messages.map((message, index) => (
              <ChatMessage key={index} {...message} />
            ))}

            {isLoading && (
              <div className='flex justify-center items-center py-4'>
                <div className='flex gap-2'>
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 0.9 }}
                    className='bg-gradient-to-br from-primary/90 to-primary-foreground shadow-md rounded-full w-3 h-3'
                  />
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.9,
                      delay: 0.15,
                    }}
                    className='bg-gradient-to-br from-secondary/80 to-secondary-foreground shadow-md rounded-full w-3 h-3'
                  />
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 0.9, delay: 0.3 }}
                    className='bg-gradient-to-br from-primary/70 to-secondary/60 shadow-md rounded-full w-3 h-3'
                  />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className='border-white/5 border-t'>
            <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
