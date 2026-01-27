'use client';

import { Instagram, Linkedin, Twitter, Youtube } from 'lucide-react';

const footerColumns = [
  {
    title: 'Solutions',
    links: [
      'Business Automation',
      'Cloud Services',
      'Analytics',
      'Integrations',
      'Support',
    ],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'Case Studies', 'Blog', 'Webinars', 'Community'],
  },
  {
    title: 'Company',
    links: ['About Us', 'Careers', 'Contact', 'Partners', 'Press'],
  },
];

const legalLinks = [
  'Terms of Service',
  'Privacy Policy',
  'Cookie Settings',
  'Accessibility',
];

const socialIcons = [
  { icon: <Instagram className='w-5 h-5' />, href: '#' },
  { icon: <Twitter className='w-5 h-5' />, href: '#' },
  { icon: <Linkedin className='w-5 h-5' />, href: '#' },
  { icon: <Youtube className='w-5 h-5' />, href: '#' },
];

export default function FooterSection() {
  return (
    <footer className='relative bg-background pt-20 pb-10 w-full text-foreground'>
      <div className='top-0 left-0 z-0 absolute w-full h-full overflow-hidden pointer-events-none'>
        <div className='top-1/3 left-1/4 absolute bg-primary opacity-10 blur-3xl rounded-full w-64 h-64' />
        <div className='right-1/4 bottom-1/4 absolute bg-primary opacity-10 blur-3xl rounded-full w-80 h-80' />
      </div>
      <div className='z-10 relative mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl'>
        <div className='mb-16 p-8 md:p-12 rounded-2xl glass-effect'>
          <div className='items-center gap-8 grid md:grid-cols-2'>
            <div>
              <h3 className='mb-4 font-bold text-2xl md:text-3xl'>
                Stay ahead with Acme Inc.
              </h3>
              <p className='mb-6 text-foreground/70'>
                Join thousands of professionals who trust Acme Inc. for
                innovative business solutions.
              </p>
              <div className='flex sm:flex-row flex-col gap-4'>
                <input
                  type='email'
                  placeholder='Enter your email'
                  className='bg-background px-4 py-3 border border-foreground/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
                />
                <button className='bg-primary shadow-lg shadow-primary/20 hover:shadow-primary/30 px-6 py-3 rounded-lg font-medium text-primary-foreground transition'>
                  Subscribe Now
                </button>
              </div>
            </div>
            <div className='hidden md:flex justify-end'>
              <div className='relative'>
                <div className='absolute inset-0 bg-primary/20 rounded-xl rotate-6' />
                <img
                  src='https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&auto=format&fit=crop&w=320&h=240&q=80'
                  alt='Acme Inc. team'
                  className='relative rounded-xl w-80 object-cover'
                />
              </div>
            </div>
          </div>
        </div>
        <div className='gap-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 mb-16'>
          <div className='col-span-2 lg:col-span-1'>
            <div className='flex items-center space-x-2 mb-6'>
              <div className='flex justify-center items-center bg-primary rounded-full w-10 h-10'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='w-6 h-6 text-primary-foreground'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M13 10V3L4 14h7v7l9-11h-7z'
                  />
                </svg>
              </div>
              <span className='font-bold text-xl'>Acme Inc.</span>
            </div>
            <p className='mb-6 text-foreground/60'>
              Empowering businesses with reliable, scalable, and innovative
              solutions.
            </p>
            <div className='flex space-x-4'>
              {socialIcons.map((item, i) => (
                <a
                  key={i}
                  href={item.href}
                  className='flex justify-center items-center hover:bg-primary/10 rounded-full w-10 h-10 transition glass-effect'
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4 className='mb-4 font-semibold text-lg'>{col.title}</h4>
              <ul className='space-y-3'>
                {col.links.map((text) => (
                  <li key={text}>
                    <a
                      href='#'
                      className='text-foreground/60 hover:text-foreground transition'
                    >
                      {text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className='flex md:flex-row flex-col justify-between items-center pt-8 border-foreground/10 border-t'>
          <p className='mb-4 md:mb-0 text-foreground/60 text-sm'>
            © 2023 Acme Inc. All rights reserved.
          </p>
          <div className='flex flex-wrap justify-center gap-6'>
            {legalLinks.map((text) => (
              <a
                key={text}
                href='#'
                className='text-foreground/60 hover:text-foreground text-sm'
              >
                {text}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
