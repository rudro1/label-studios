import {
  Building2,
  Lightbulb,
  ScreenShare,
  Trophy,
  User,
  User2,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Define the feature item type
type FeatureItem = {
  icon: LucideIcon;
  title: string;
  description: string;
  position?: 'left' | 'right';
  cornerStyle?: string;
};

// Create feature data arrays for left and right columns
const leftFeatures: FeatureItem[] = [
  {
    icon: Building2,
    title: 'Taught by Professionals',
    description:
      'Learn directly from top engineers and founders with real-world experience.',
    position: 'left',
    cornerStyle: 'sm:translate-x-4 sm:rounded-br-[2px]',
  },
  {
    icon: User2,
    title: 'Coding Hostels',
    description:
      'Join virtual hostels to study, collaborate, and vibe with fellow learners.',
    position: 'left',
    cornerStyle: 'sm:-translate-x-4 sm:rounded-br-[2px]',
  },
  {
    icon: Trophy,
    title: 'Bounties',
    description:
      'Win rewards for solving challenges, contributing to projects, and helping peers.',
    position: 'left',
    cornerStyle: 'sm:translate-x-4 sm:rounded-tr-[2px]',
  },
];

const rightFeatures: FeatureItem[] = [
  {
    icon: ScreenShare,
    title: 'Revision Classes',
    description:
      'Stay sharp with weekly revision sessions and topic refreshers.',
    position: 'right',
    cornerStyle: 'sm:-translate-x-4 sm:rounded-bl-[2px]',
  },
  {
    icon: User,
    title: 'Peer Code Reviews',
    description:
      'Improve faster with feedback from mentors and batchmates on your actual code.',
    position: 'right',
    cornerStyle: 'sm:translate-x-4 sm:rounded-bl-[2px]',
  },
  {
    icon: Lightbulb,
    title: 'Leet Lab',
    description:
      'Ace coding interviews with daily DSA problems, contests, and tracking.',
    position: 'right',
    cornerStyle: 'sm:-translate-x-4 sm:rounded-tl-[2px]',
  },
];

// Feature card component
const FeatureCard = ({ feature }: { feature: FeatureItem }) => {
  const Icon = feature.icon;

  return (
    <div>
      <div
        className={cn(
          'relative px-4 pt-4 pb-4 rounded-2xl text-sm',
          'bg-secondary/50 ring-border ring',
          feature.cornerStyle
        )}
      >
        <div className='mb-3 text-[2rem] text-primary'>
          <Icon />
        </div>
        <h2 className='mb-2.5 text-foreground text-2xl'>{feature.title}</h2>
        <p className='text-muted-foreground text-base text-pretty'>
          {feature.description}
        </p>
        {/* Decorative elements */}
        <span className='-bottom-px left-1/2 absolute bg-gradient-to-r from-primary/0 via-primary to-primary/0 opacity-60 w-1/2 h-px -translate-x-1/2'></span>
        <span className='absolute inset-0 bg-[radial-gradient(30%_5%_at_50%_100%,hsl(var(--primary)/0.15)_0%,transparent_100%)] opacity-60'></span>
      </div>
    </div>
  );
};

export default function FeatureSection() {
  return (
    <section className='pt-20 pb-8' id='features'>
      <h1 className='my-8 text-5xl text-center'>Features</h1>
      <div className='mx-6 max-[300px]:mx-4 min-[1150px]:mx-auto pt-2 pb-16 max-w-[1120px]'>
        <div className='flex flex-col-reverse gap-6 md:grid md:grid-cols-3'>
          {/* Left column */}
          <div className='flex flex-col gap-6'>
            {leftFeatures.map((feature, index) => (
              <FeatureCard key={`left-feature-${index}`} feature={feature} />
            ))}
          </div>

          {/* Center column */}
          <div className='self-center order-[1] sm:order-[0] mb-6 md:mb-0'>
            <div className='relative bg-secondary mx-auto mb-4.5 px-4 py-2 ring-border rounded-full rounded-bl-[2px] ring w-fit text-foreground text-sm'>
              <span className='z-1 relative flex items-center gap-2'>
                Features
              </span>
              <span className='-bottom-px left-1/2 absolute bg-gradient-to-r from-primary/0 via-primary to-primary/0 w-2/5 h-px -translate-x-1/2'></span>
              <span className='absolute inset-0 bg-[radial-gradient(30%_40%_at_50%_100%,hsl(var(--primary)/0.25)_0%,transparent_100%)]'></span>
            </div>
            <h2 className='mb-2 sm:mb-2.5 text-foreground md:text-[2rem] text-2xl text-center'>
              Key Benefits of Edu Nexus
            </h2>
            <p className='mx-auto max-w-[18rem] text-muted-foreground text-center text-pretty'>
              We are best way to learn because you finish the course in a timely
              manner
            </p>
          </div>

          {/* Right column */}
          <div className='flex flex-col gap-6'>
            {rightFeatures.map((feature, index) => (
              <FeatureCard key={`right-feature-${index}`} feature={feature} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
