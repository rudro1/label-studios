'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, ExternalLink, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function HeroSection() {
  return (
    <div className='relative bg-background w-full overflow-hidden'>
      {/* Background gradient */}
      <div className='z-0 absolute inset-0'>
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background to-background'></div>
        <div className='top-0 left-1/2 -z-10 absolute bg-primary/5 blur-3xl rounded-full w-[1000px] h-[1000px] -translate-x-1/2'></div>
      </div>
      <div className='absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:16px_16px] opacity-15'></div>

      <div className='z-10 relative mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 container'>
        <div className='mx-auto max-w-5xl'>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className='flex justify-center mx-auto mb-6'
          >
            <div className='inline-flex items-center bg-background/80 backdrop-blur-sm px-3 py-1 border border-border rounded-full text-sm'>
              <span className='bg-primary mr-2 px-2 py-0.5 rounded-full font-semibold text-white text-xs'>
                New
              </span>
              <span className='text-muted-foreground'>
                A new course is available at discount!
              </span>
              <ChevronRight className='ml-1 w-4 h-4 text-muted-foreground' />
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className='bg-clip-text bg-gradient-to-tl from-primary/10 via-foreground/85 to-foreground/50 text-transparent text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-center text-balance tracking-tighter'
          >
            Boost Your Learning Spirit
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className='mx-auto mt-6 max-w-2xl text-muted-foreground text-lg text-center'
          >
            A modern UI Learning platform where you can gain new skills and put
            them to use immediately through through our exquisit guiding and
            management system.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className='flex sm:flex-row flex-col justify-center items-center gap-4 mt-10'
          >
            <Button
              size='lg'
              className='group relative bg-primary shadow-lg hover:shadow-primary/30 px-6 rounded-full overflow-hidden text-primary-foreground transition-all duration-300'
            >
              <span className='z-10 relative flex items-center'>
                Get Started
                <ArrowRight className='ml-2 w-4 h-4 transition-transform group-hover:translate-x-1 duration-300' />
              </span>
              <span className='z-0 absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300'></span>
            </Button>

            <Button
              variant='outline'
              size='lg'
              className='flex items-center gap-2 bg-background/50 backdrop-blur-sm border-border rounded-full'
            >
              {/* <Github className='w-4 h-4' /> */}
              View our Courses
            </Button>
          </motion.div>

          {/* Feature Image */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.5,
              type: 'spring',
              stiffness: 50,
            }}
            className='relative mx-auto mt-16 max-w-4xl'
          >
            <div className='h-20'></div>
            {/* <div className='bg-background/50 shadow-xl backdrop-blur-sm border border-border/40 rounded-xl overflow-hidden'>
              <div className='flex items-center bg-muted/50 px-4 border-b border-border/40 h-10'>
                <div className='flex space-x-2'>
                  <div className='bg-red-500 rounded-full w-3 h-3'></div>
                  <div className='bg-yellow-500 rounded-full w-3 h-3'></div>
                  <div className='bg-green-500 rounded-full w-3 h-3'></div>
                </div>
                <div className='flex items-center bg-background/50 mx-auto px-3 py-1 rounded-md text-muted-foreground text-xs'>
                  https://your-awesome-app.com
                </div>
              </div>
              <div className='relative'>
                <img
                  src='https://i.postimg.cc/0yk8Vz7t/dashboard.webp'
                  alt='Dashboard Preview'
                  className='w-full'
                />
                <div className='absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-0'></div>
              </div>
            </div> */}

            {/* Floating elements for visual interest */}
            <div className='-top-6 -right-6 absolute bg-background/80 shadow-lg backdrop-blur-md p-3 border border-border/40 rounded-lg w-12 h-12'>
              <div className='bg-primary/20 rounded-md w-full h-full'></div>
            </div>
            <div className='-bottom-4 -left-4 absolute bg-background/80 shadow-lg backdrop-blur-md border border-border/40 rounded-full w-8 h-8'></div>
            <div className='right-12 -bottom-6 absolute bg-background/80 shadow-lg backdrop-blur-md p-2 border border-border/40 rounded-lg w-10 h-10'>
              <div className='bg-green-500/20 rounded-md w-full h-full'></div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
