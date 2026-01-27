'use client';
// changes on line 109
import { cn } from '@/lib/utils';
import { GithubIcon, LinkedinIcon, TwitterIcon } from 'lucide-react';
import Link from 'next/link';
import authorOne from '@/public/images/author_one.jpg';
import authorTwo from '@/public/images/author_two.jpg';
import authorThree from '@/public/images/author_three.jpg';
import Image, { StaticImageData } from 'next/image';

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  imageUrl: StaticImageData;
  location?: string;
  socialLinks?: { platform: 'github' | 'twitter' | 'linkedin'; url: string }[];
}

interface TeamProps {
  title?: string;
  subtitle?: string;
  members?: TeamMember[];
  className?: string;
}

// Default data
const defaultMembers: TeamMember[] = [
  {
    name: 'Naim Akhand',
    role: 'Founder & CEO',
    bio: '10+ years of experience in product development and team leadership. Passionate about building products that make a difference.',
    imageUrl: authorOne,
    location: 'Rajshahi, Bangladesh',
    socialLinks: [
      { platform: 'twitter', url: 'https://twitter.com' },
      { platform: 'github', url: 'https://github.com' },
      { platform: 'linkedin', url: 'https://linkedin.com' },
    ],
  },
  {
    name: 'Bisal Saha',
    role: 'Lead Designer',
    bio: 'Award-winning designer with a passion for creating beautiful, functional interfaces that delight users.',
    imageUrl: authorTwo,

    location: 'Rajshahi, Bangladesh',
    socialLinks: [
      { platform: 'twitter', url: 'https://twitter.com' },
      { platform: 'linkedin', url: 'https://linkedin.com' },
    ],
  },
  {
    name: 'Takbir Hossain',
    role: 'Senior Developer',
    bio: 'Full-stack developer with expertise in React, Node.js, and cloud architecture. Building scalable solutions for complex problems.',
    imageUrl: authorThree,

    location: 'Rajshahi, Bangladesh',
    socialLinks: [
      { platform: 'github', url: 'https://github.com' },
      { platform: 'linkedin', url: 'https://linkedin.com' },
    ],
  },
];

export default function TeamSection({
  title = 'Meet Our Team',
  subtitle = "We're a diverse group of passionate individuals working together to build amazing learning resources.",
  members = defaultMembers,
  className,
}: TeamProps) {
  return (
    <section className={cn('mx-auto py-16 md:py-24 max-w-7xl', className)}>
      <div className='top-0 left-0 absolute bg-primary/15 blur-3xl rounded-full w-96 h-96' />
      <div className='top-0 right-0 absolute bg-primary/15 blur-3xl rounded-full w-96 h-96' />
      <div className='px-4 md:px-6 container'>
        <div className='mx-auto mb-16 max-w-3xl text-center'>
          <h2 className='mb-4 font-bold text-3xl sm:text-4xl md:text-5xl tracking-tight'>
            {title}
          </h2>
          <p className='mx-auto max-w-2xl text-muted-foreground md:text-lg'>
            {subtitle}
          </p>
        </div>

        <div className='flex flex-wrap justify-center items-center gap-8'>
          {members.map((member) => (
            <TeamMemberCard key={member.name} member={member} />
          ))}
        </div>
      </div>
    </section>
  );
}

// Team member card component
function TeamMemberCard({ member }: { member: TeamMember }) {
  return (
    <div className='group bg-card opacity-100 hover:opacity-75 shadow-sm rounded-xl w-96 h-[520px] overflow-hidden transition-opacity'>
      <div className='relative w-full h-[300px] overflow-hidden'>
        <Image
          src={member.imageUrl}
          alt={member.name}
          //   sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw'
          className='mx-auto h-full object-center object-cover group-hover:scale-105 transition-transform duration-500'
        />
      </div>

      <div className='flex flex-col p-5 h-[220px]'>
        {member.location && (
          <div className='flex items-center mb-1 text-muted-foreground text-xs'>
            <div className='bg-primary mr-1.5 rounded-full w-1.5 h-1.5' />
            {member.location}
          </div>
        )}

        <h3 className='mb-1 font-bold text-xl'>{member.name}</h3>
        <p className='mb-2 font-medium text-primary text-sm'>{member.role}</p>
        <div className='mb-4'>
          <p className='text-muted-foreground text-sm'>{member.bio}</p>
        </div>
        <div className='mt-auto'>
          {member.socialLinks && (
            <div className='flex space-x-3'>
              {member.socialLinks.map((link) => (
                <Link
                  key={link.platform}
                  href={link.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex justify-center items-center bg-muted hover:bg-primary rounded-full w-8 h-8 text-muted-foreground hover:text-primary-foreground transition-all'
                >
                  {link.platform === 'github' && (
                    <GithubIcon className='w-4 h-4' />
                  )}
                  {link.platform === 'twitter' && (
                    <TwitterIcon className='w-4 h-4' />
                  )}
                  {link.platform === 'linkedin' && (
                    <LinkedinIcon className='w-4 h-4' />
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
