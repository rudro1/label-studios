'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface FAQItemProps {
  question: string;
  answer: string;
  index: number;
}

function FAQItem({ question, answer, index }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.15,
        ease: 'easeOut',
      }}
      className={cn(
        'group border border-border/60 rounded-lg',
        'transition-all duration-200 ease-in-out',
        isOpen ? 'bg-card/30 shadow-sm' : 'hover:bg-card/50'
      )}
    >
      <button
        type='button'
        onClick={() => setIsOpen(!isOpen)}
        className='flex justify-between items-center gap-4 px-6 py-4 w-full'
      >
        <h3
          className={cn(
            'font-medium text-base text-left transition-colors duration-200',
            'text-foreground/80',
            isOpen && 'text-foreground'
          )}
        >
          {question}
        </h3>
        <motion.div
          animate={{
            rotate: isOpen ? 180 : 0,
            scale: isOpen ? 1.1 : 1,
          }}
          transition={{
            duration: 0.3,
            ease: 'easeInOut',
          }}
          className={cn(
            'p-0.5 rounded-full shrink-0',
            'transition-colors duration-200',
            isOpen ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <ChevronDown className='w-4 h-4' />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: 'auto',
              opacity: 1,
              transition: {
                height: {
                  duration: 0.4,
                  ease: [0.04, 0.62, 0.23, 0.98],
                },
                opacity: {
                  duration: 0.25,
                  delay: 0.1,
                },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: {
                  duration: 0.3,
                  ease: 'easeInOut',
                },
                opacity: {
                  duration: 0.25,
                },
              },
            }}
          >
            <div className='px-6 pt-2 pb-4 border-t border-border/40'>
              <motion.p
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{
                  duration: 0.3,
                  ease: 'easeOut',
                }}
                className='text-muted-foreground text-sm leading-relaxed'
              >
                {answer}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FaqSection() {
  const faqs: Omit<FAQItemProps, 'index'>[] = [
    {
      question: 'What makes us unique?',
      answer:
        "we stands out through its intuitive design, powerful component library, and seamless integration options. We've focused on creating a user experience that combines simplicity with advanced features, all while maintaining excellent performance and accessibility.",
    },
    {
      question: 'How can I customize the components?',
      answer:
        'All components are built with Tailwind CSS, making them highly customizable. You can modify colors, spacing, typography, and more by simply adjusting the class names or using our theme variables to match your brand identity.',
    },
    {
      question: 'Do the components work with dark mode?',
      answer:
        "Yes, all MVPBlocks components are designed to work seamlessly with both light and dark modes. They automatically adapt to your site's theme settings, providing a consistent user experience regardless of the user's preference.",
    },
    {
      question: 'How can I get started with MVPBlocks?',
      answer:
        'You can get started by browsing our component library and copying the code for the components you need. Our documentation provides clear instructions for installation and usage, and you can always reach out to our support team if you need assistance.',
    },
    {
      question: 'Can I use MVPBlocks for commercial projects?',
      answer:
        'Absolutely! MVPBlocks is free to use for both personal and commercial projects. There are no licensing fees or attribution requirements—just build and launch your MVP faster than ever before.',
    },
  ];

  return (
    <section className='relative bg-background py-16 w-full overflow-hidden'>
      {/* Decorative elements */}
      <div className='top-20 -left-20 absolute bg-primary/5 blur-3xl rounded-full w-64 h-64' />
      <div className='-right-20 bottom-20 absolute bg-primary/5 blur-3xl rounded-full w-64 h-64' />

      <div className='relative mx-auto px-4 max-w-6xl container'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className='mx-auto mb-12 max-w-2xl text-center'
        >
          <Badge
            variant='outline'
            className='mb-4 px-3 py-1 border-primary font-medium text-xs uppercase tracking-wider'
          >
            FAQs
          </Badge>

          <h2 className='bg-clip-text bg-gradient-to-r from-primary to-rose-400 mb-3 font-bold text-transparent text-3xl'>
            Frequently Asked Questions
          </h2>
          <p className='text-muted-foreground text-sm'>
            Everything you need to know about MVPBlocks
          </p>
        </motion.div>

        <div className='space-y-2 mx-auto max-w-2xl'>
          {faqs.map((faq, index) => (
            <FAQItem key={index} {...faq} index={index} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className={cn('mx-auto mt-12 p-6 rounded-lg max-w-md text-center')}
        >
          <div className='inline-flex justify-center items-center bg-primary/10 mb-4 p-2 rounded-full text-primary'>
            <Mail className='w-4 h-4' />
          </div>
          <p className='mb-1 font-medium text-foreground text-sm'>
            Still have questions?
          </p>
          <p className='mb-4 text-muted-foreground text-xs'>
            We&apos;re here to help you
          </p>
          <button
            type='button'
            className={cn(
              'px-4 py-2 rounded-md text-sm',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90',
              'transition-colors duration-200',
              'font-medium'
            )}
          >
            Contact Support
          </button>
        </motion.div>
      </div>
    </section>
  );
}
