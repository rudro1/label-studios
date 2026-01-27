import FaqSection from '@/components/layout/homepage/FAQSection';
import FeatureSection from '@/components/layout/homepage/FeatureSection';
import FooterSection from '@/components/layout/homepage/FooterSection';
import HeroSection from '@/components/layout/homepage/HeroSection';
import TeamSection from '@/components/layout/homepage/TeamSections';
import TestimonialSection from '@/components/layout/homepage/TestimonialSection';
import NavBar from '@/components/layout/Navbar';
import Image from 'next/image';

export default function Home() {
  return (
    <main className='bg-background'>
      <NavBar />
      <HeroSection />
      <FeatureSection />
      <TeamSection />
      <FaqSection />
      <TestimonialSection />
      <FooterSection />
    </main>
  );
}
