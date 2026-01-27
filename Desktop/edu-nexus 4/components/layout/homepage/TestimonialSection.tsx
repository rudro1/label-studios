'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Marquee } from '@/components/ui/marquee';

export function Highlight({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'bg-blue-500/10 p-1 py-0.5 font-bold text-blue-500',
        className
      )}
    >
      {children}
    </span>
  );
}

export interface TestimonialCardProps {
  name: string;
  role: string;
  img?: string;
  description: React.ReactNode;
  className?: string;
  [key: string]: any;
}

export function TestimonialCard({
  description,
  name,
  img,
  role,
  className,
  ...props // Capture the rest of the props
}: TestimonialCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between items-center gap-6 mb-4 p-4 rounded-xl w-full break-inside-avoid cursor-pointer',
        // theme styles
        'border-border bg-card/50 border shadow-sm',
        // hover effect
        'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md',
        className
      )}
      {...props}
    >
      <div className='font-normal text-muted-foreground text-sm select-none'>
        {description}
        <div className='flex flex-row py-1'>
          <Star className='fill-blue-500 size-4 text-blue-500' />
          <Star className='fill-blue-500 size-4 text-blue-500' />
          <Star className='fill-blue-500 size-4 text-blue-500' />
          <Star className='fill-blue-500 size-4 text-blue-500' />
          <Star className='fill-blue-500 size-4 text-blue-500' />
        </div>
      </div>

      <div className='flex justify-start items-center gap-5 w-full select-none'>
        <img
          width={40}
          height={40}
          src={img || ''}
          alt={name}
          className='rounded-full ring-1 ring-blue-500/20 ring-offset-2 size-10'
        />

        <div>
          <p className='font-medium text-foreground'>{name}</p>
          <p className='font-normal text-muted-foreground text-xs'>{role}</p>
        </div>
      </div>
    </div>
  );
}
const testimonials = [
  {
    name: 'Jordan Hayes',
    role: 'CTO at Quantum Innovations',
    img: 'https://randomuser.me/api/portraits/men/22.jpg',
    description: (
      <p>
        NexaUI has completely transformed our development workflow.
        <Highlight>
          The component system saved us weeks of custom coding and design work.
        </Highlight>{' '}
        Our team can now focus on business logic instead of UI details.
      </p>
    ),
  },
  {
    name: 'Maya Rodriguez',
    role: 'Lead Developer at Skyline Digital',
    img: 'https://randomuser.me/api/portraits/women/33.jpg',
    description: (
      <p>
        I was skeptical at first, but NexaUI proved me wrong.
        <Highlight>
          The accessibility features and responsive design are top-notch.
        </Highlight>{' '}
        It&apos;s rare to find a framework that prioritizes both aesthetics and
        functionality.
      </p>
    ),
  },
  {
    name: 'Ethan Park',
    role: 'Startup Founder at Elevate Labs',
    img: 'https://randomuser.me/api/portraits/men/32.jpg',
    description: (
      <p>
        As a non-technical founder, NexaUI has been a game-changer for our MVP.
        <Highlight>We launched three months ahead of schedule.</Highlight> The
        modular components allowed us to iterate quickly based on user feedback.
      </p>
    ),
  },
  {
    name: 'Zoe Bennett',
    role: 'UX Architect at Fusion Systems',
    img: 'https://randomuser.me/api/portraits/women/44.jpg',
    description: (
      <p>
        NexaUI&apos;s attention to detail is impressive.
        <Highlight>
          The micro-interactions and animations create a polished experience.
        </Highlight>{' '}
        It&apos;s become our go-to solution for client projects with tight
        deadlines.
      </p>
    ),
  },
  {
    name: 'Victor Nguyen',
    role: 'Product Lead at FinEdge',
    img: 'https://randomuser.me/api/portraits/men/55.jpg',
    description: (
      <p>
        Our financial dashboard needed a complete overhaul, and NexaUI
        delivered.
        <Highlight>
          The data visualization components are both beautiful and functional.
        </Highlight>{' '}
        User engagement has increased by 47% since the redesign.
      </p>
    ),
  },
  {
    name: 'Amara Johnson',
    role: 'Frontend Specialist at Nimbus Tech',
    img: 'https://randomuser.me/api/portraits/women/67.jpg',
    description: (
      <p>
        The documentation for NexaUI is exceptional.
        <Highlight>
          I was able to implement complex UI patterns in just a few hours.
        </Highlight>{' '}
        The TypeScript support is also a major productivity booster.
      </p>
    ),
  },
  {
    name: 'Leo Tanaka',
    role: 'Creative Technologist at Prism Agency',
    img: 'https://randomuser.me/api/portraits/men/78.jpg',
    description: (
      <p>
        NexaUI has the perfect balance of flexibility and structure.
        <Highlight>
          We can maintain brand consistency while still creating unique
          experiences.
        </Highlight>{' '}
        Our clients are consistently impressed with the results.
      </p>
    ),
  },
  {
    name: 'Sophia Martinez',
    role: 'E-commerce Director at StyleHub',
    img: 'https://randomuser.me/api/portraits/women/89.jpg',
    description: (
      <p>
        Our conversion rates have increased by 28% since implementing NexaUI.
        <Highlight>
          The checkout flow components are optimized for both desktop and
          mobile.
        </Highlight>{' '}
        The dark mode support was also a huge hit with our customers.
      </p>
    ),
  },
  {
    name: 'Aiden Wilson',
    role: 'Healthcare Solutions Architect',
    img: 'https://randomuser.me/api/portraits/men/92.jpg',
    description: (
      <p>
        NexaUI&apos;s accessibility features were crucial for our healthcare
        platform.
        <Highlight>
          We passed compliance requirements with minimal additional work.
        </Highlight>{' '}
        The form components are especially well-designed for complex data entry.
      </p>
    ),
  },
  {
    name: 'Olivia Chen',
    role: 'EdTech Product Manager at LearnSphere',
    img: 'https://randomuser.me/api/portraits/women/29.jpg',
    description: (
      <p>
        Our educational platform needed to work for students of all ages and
        abilities.
        <Highlight>
          NexaUI&apos;s inclusive design principles made this possible without
          compromise.
        </Highlight>{' '}
        The interactive components have significantly improved student
        engagement.
      </p>
    ),
  },
];

export default function TestimonialSection() {
  return (
    <section className='relative mx-auto py-10 max-w-6xl'>
      {/* Decorative elements */}
      <div className='top-20 -left-20 z-10 absolute bg-blue-500/5 blur-3xl rounded-full w-64 h-64' />
      <div className='-right-20 bottom-20 z-10 absolute bg-blue-500/5 blur-3xl rounded-full w-64 h-64' />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className='mb-4 font-bold text-foreground text-4xl md:text-5xl text-center leading-[1.2] tracking-tighter'>
          What Our Users Are Saying
        </h2>
        <h3 className='mx-auto mb-8 max-w-lg font-medium text-muted-foreground text-lg text-center text-balance tracking-tight'>
          Don&apos;t just take our word for it. Here&apos;s what{' '}
          <span className='bg-clip-text bg-gradient-to-r from-blue-500 to-sky-500 text-transparent'>
            real developers
          </span>{' '}
          are saying about{' '}
          <span className='font-semibold text-blue-500'>NexaUI</span>
        </h3>
      </motion.div>

      <div className='relative mt-6 max-h-screen overflow-hidden'>
        <div className='gap-4 md:columns-2 2xl:columns-4 xl:columns-3'>
          {Array(Math.ceil(testimonials.length / 3))
            .fill(0)
            .map((_, i) => (
              <Marquee
                vertical
                key={i}
                className={cn({
                  '[--duration:60s]': i === 1,
                  '[--duration:30s]': i === 2,
                  '[--duration:70s]': i === 3,
                })}
              >
                {testimonials.slice(i * 3, (i + 1) * 3).map((card, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      delay: Math.random() * 0.8,
                      duration: 1.2,
                    }}
                  >
                    <TestimonialCard {...card} />
                  </motion.div>
                ))}
              </Marquee>
            ))}
        </div>
        <div className='bottom-0 absolute inset-x-0 bg-gradient-to-t from-20% from-background w-full h-1/4 pointer-events-none'></div>
        <div className='top-0 absolute inset-x-0 bg-gradient-to-b from-20% from-background w-full h-1/4 pointer-events-none'></div>
      </div>
    </section>
  );
}
