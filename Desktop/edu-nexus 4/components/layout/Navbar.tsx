'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, easeInOut } from 'framer-motion';
import { Menu, X, ArrowRight, Zap, Search } from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';

interface NavItem {
  name: string;
  href: string;
}

const navItems: NavItem[] = [
  { name: 'Home', href: '/' },
  { name: 'Courses', href: '/all-courses' },
  { name: 'Solutions', href: '/solutions' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Resources', href: '/resources' },
  { name: 'Contact', href: '/contact' },
];

export default function NavBar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
  };

  const mobileMenuVariants = {
    closed: {
      opacity: 0,
      x: '100%',
      transition: {
        duration: 0.3,
        ease: easeInOut,
      },
    },
    open: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        ease: easeInOut,
        staggerChildren: 0.1,
      },
    },
  };

  const mobileItemVariants = {
    closed: { opacity: 0, x: 20 },
    open: { opacity: 1, x: 0 },
  };

  return (
    <>
      <motion.header
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'border-border/50 bg-background/80 border-b shadow-sm backdrop-blur-md'
            : 'bg-transparent'
        }`}
        variants={containerVariants}
        initial='hidden'
        animate='visible'
      >
        <div className='mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl'>
          <div className='flex justify-between items-center h-16'>
            <motion.div
              className='flex items-center space-x-3'
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <Link href='/' className='flex items-center space-x-3'>
                <div className='relative'>
                  <div className='flex justify-center items-center bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 shadow-lg rounded-xl w-9 h-9'>
                    <Zap className='w-5 h-5 text-white' />
                  </div>
                  <div className='-top-1 -right-1 absolute bg-green-400 rounded-full w-3 h-3 animate-pulse'></div>
                </div>
                <div className='flex flex-col'>
                  <span className='font-bold text-foreground text-lg'>
                    Edu Nexus
                  </span>
                  <span className='-mt-1 text-muted-foreground text-xs'>
                    Build faster
                  </span>
                </div>
              </Link>
            </motion.div>

            <nav className='hidden lg:flex items-center space-x-1'>
              {navItems.map((item, index) => (
                <motion.div
                  key={item.name}
                  variants={itemVariants}
                  className='relative'
                  onMouseEnter={() => setHoveredItem(item.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link
                    href={item.href}
                    className='relative px-4 py-2 rounded-lg font-medium text-foreground/80 hover:text-foreground text-sm transition-colors duration-200'
                  >
                    {hoveredItem === item.name && (
                      <motion.div
                        className='absolute inset-0 bg-muted rounded-lg'
                        layoutId='navbar-hover'
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          type: 'spring',
                          stiffness: 400,
                          damping: 30,
                        }}
                      />
                    )}
                    <span className='z-10 relative'>{item.name}</span>
                  </Link>
                </motion.div>
              ))}
            </nav>

            <motion.div
              className='hidden lg:flex items-center space-x-3'
              variants={itemVariants}
            >
              <motion.button
                className='hover:bg-muted p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors duration-200'
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Search className='w-5 h-5' />
              </motion.button>

              <Link
                href={ROUTES.signIn}
                className='px-4 py-2 font-medium text-foreground/80 hover:text-foreground text-sm transition-colors duration-200'
              >
                Sign In
              </Link>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href={ROUTES.signUp}
                  className='inline-flex items-center space-x-2 bg-foreground hover:bg-foreground/90 shadow-sm px-5 py-2.5 rounded-lg font-medium text-background text-sm transition-all duration-200'
                >
                  <span>Get Started</span>
                  <ArrowRight className='w-4 h-4' />
                </Link>
              </motion.div>
            </motion.div>

            <motion.button
              className='lg:hidden hover:bg-muted p-2 rounded-lg text-foreground transition-colors duration-200'
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              variants={itemVariants}
              whileTap={{ scale: 0.95 }}
            >
              {isMobileMenuOpen ? (
                <X className='w-6 h-6' />
              ) : (
                <Menu className='w-6 h-6' />
              )}
            </motion.button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              className='lg:hidden z-40 fixed inset-0 bg-black/20 backdrop-blur-sm'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              className='lg:hidden top-16 right-4 z-50 fixed bg-background shadow-2xl border border-border rounded-2xl w-80 overflow-hidden'
              variants={mobileMenuVariants}
              initial='closed'
              animate='open'
              exit='closed'
            >
              <div className='space-y-6 p-6'>
                <div className='space-y-1'>
                  {navItems.map((item) => (
                    <motion.div key={item.name} variants={mobileItemVariants}>
                      <Link
                        href={item.href}
                        className='block hover:bg-muted px-4 py-3 rounded-lg font-medium text-foreground transition-colors duration-200'
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.name}
                      </Link>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  className='space-y-3 pt-6 border-t border-border'
                  variants={mobileItemVariants}
                >
                  <Link
                    href='/login'
                    className='block hover:bg-muted py-3 rounded-lg w-full font-medium text-foreground text-center transition-colors duration-200'
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href='/signup'
                    className='block bg-foreground hover:bg-foreground/90 py-3 rounded-lg w-full font-medium text-background text-center transition-all duration-200'
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
