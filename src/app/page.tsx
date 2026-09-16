'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, Variants } from 'framer-motion';

// --- Reusable Apple-Style Inline ZenithFlowHQ Neon SVG Logo ---
function ZenithFlowLogo({ idSuffix = '' }: { idSuffix?: string }) {
  const glowId = idSuffix ? `z-glow-${idSuffix}` : 'z-glow';
  const blurId = idSuffix ? `neon-blur-${idSuffix}` : 'neon-blur';

  return (
    <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <defs>
        <linearGradient id={glowId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#B200FF" />
        </linearGradient>
        <filter id={blurId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* The Z Structure */}
      <path d="M25 25 H75 L25 75 H75" stroke={`url(#${glowId})`} strokeWidth="6" strokeLinejoin="round" filter={`url(#${blurId})`} />
      {/* Internal Network Lines */}
      <path d="M25 25 L50 50 L75 25 M25 75 L50 50 L75 75 M40 25 L25 50 L60 75" stroke={`url(#${glowId})`} strokeWidth="2" opacity="0.6" />
      {/* Nodes (Dots) */}
      <circle cx="25" cy="25" r="4" fill="#00E5FF" />
      <circle cx="75" cy="25" r="4" fill="#00E5FF" />
      <circle cx="25" cy="75" r="B200FF" />
      <circle cx="75" cy="75" r="4" fill="#B200FF" />
      <circle cx="50" cy="50" r="3" fill="#6677FF" />
      <circle cx="40" cy="25" r="2.5" fill="#00E5FF" />
      <circle cx="60" cy="75" r="2.5" fill="#B200FF" />
      <circle cx="25" cy="50" r="2.5" fill="#33AAFF" />
    </svg>
  );
}

// --- Light Mode Automations Pipeline Micro-Visualizer (Stripe -> Database -> ZenithFlowHQ) ---
function LightModePipelineVisualizer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });

  return (
    <div ref={containerRef} className="w-full bg-[#F5F5F7] rounded-2xl p-4 border border-[#E5E5EA] overflow-hidden">
      <div className="flex items-center justify-between text-xs mb-3 pb-2 border-b border-[#E5E5EA]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#0066CC] animate-pulse"></span>
          <span className="font-semibold text-[#1D1D1F]">Pipeline Live Telemetry</span>
        </div>
        <span className="font-mono text-[#86868B] text-[11px]">99.99% Uptime</span>
      </div>

      <div className="relative flex items-center justify-between py-2">
        {/* Connecting Animated Gradient Line */}
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[2px]">
          <svg className="w-full h-5 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 20">
            <defs>
              <linearGradient id="applePipeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0066CC" />
                <stop offset="50%" stopColor="#00A2FF" />
                <stop offset="100%" stopColor="#8A2BE2" />
              </linearGradient>
            </defs>
            <line x1="0" y1="10" x2="100" y2="10" stroke="#E5E5EA" strokeWidth="2" strokeDasharray="3 3" />
            <motion.path
              d="M 0 10 L 100 10"
              stroke="url(#applePipeGrad)"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: isInView ? 1 : 0 }}
              transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            />
            {isInView && (
              <motion.circle
                r="3.5"
                fill="#0066CC"
                initial={{ cx: 0, opacity: 0 }}
                animate={{ cx: [0, 50, 100], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                cy="10"
              />
            )}
          </svg>
        </div>

        {/* 3 Floating Circles in Apple Light Mode */}
        <div className="relative w-full flex items-start justify-between px-2 sm:px-4">
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white border border-[#E5E5EA] shadow-sm flex items-center justify-center text-[#0066CC]">
              <span className="material-symbols-outlined text-[20px]">credit_card</span>
            </div>
            <span className="mt-1.5 text-[11px] font-semibold text-[#1D1D1F]">Stripe</span>
            <span className="text-[9px] font-mono text-[#86868B]">Inbound</span>
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white border border-[#E5E5EA] shadow-sm flex items-center justify-center text-[#00A2FF]">
              <span className="material-symbols-outlined text-[20px]">database</span>
            </div>
            <span className="mt-1.5 text-[11px] font-semibold text-[#1D1D1F]">Postgres</span>
            <span className="text-[9px] font-mono text-[#86868B]">Sync</span>
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white border border-[#E5E5EA] shadow-sm flex items-center justify-center text-[#8A2BE2]">
              <span className="material-symbols-outlined text-[20px]">hub</span>
            </div>
            <span className="mt-1.5 text-[11px] font-semibold text-[#1D1D1F]">Zenith</span>
            <span className="text-[9px] font-mono text-[#86868B]">Engine</span>
          </div>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-[#E5E5EA] flex items-center justify-between text-[11px] text-[#86868B]">
        <span>Webhook Latency: <strong className="text-[#1D1D1F] font-mono font-medium">18ms</strong></span>
        <span>Auto-retry: <strong className="text-[#0066CC] font-medium">Exponential</strong></span>
      </div>
    </div>
  );
}

// --- 5 Bento Service Cards Data ---
const services = [
  {
    id: 'service-01',
    num: '01',
    title: 'Websites & Apps',
    subtitle: 'Next.js 15, 100 Lighthouse & Motion',
    desc: 'We engineer high-performance, bespoke digital platforms designed to capture global audiences and accelerate your revenue growth.',
    icon: 'language',
    badge: 'Score: 100 Benchmark',
    metric: 'LCP < 0.6s • CLS 0.00',
    pill: 'Headless CMS Ready',
    hasVisualizer: false,
  },
  {
    id: 'service-02',
    num: '02',
    title: 'Custom Software',
    subtitle: 'Scalable Microservices & APIs',
    desc: 'Our developers build enterprise-grade, tailor-made systems that seamlessly adapt to your exact operational workflows without compromise.',
    icon: 'dns',
    badge: 'SOC 2 Ready',
    metric: '4.2M req/sec SLA',
    pill: 'PostgreSQL Isolation',
    hasVisualizer: false,
  },
  {
    id: 'service-03',
    num: '03',
    title: 'Backend Automations',
    subtitle: 'SwiftUI, Jetpack Compose & Background Sync',
    desc: 'We construct resilient, invisible infrastructure that completely eliminates manual data handling and ensures flawless execution across multiple time zones.',
    icon: 'devices',
    badge: 'Native 60 FPS',
    metric: 'Offline-First DB',
    pill: 'Automated CI/CD',
    hasVisualizer: false,
  },
  {
    id: 'service-04',
    num: '04',
    title: 'SaaS Automations',
    subtitle: 'Custom CRM, ERP & Billing Engines',
    desc: 'We supercharge your software stack with intelligent bots, unified APIs, and automated billing that eliminate busywork along every step.',
    icon: 'swap_horiz',
    badge: 'Zero Human Touch',
    metric: '99.99% Execution',
    pill: 'Unified Webhooks',
    hasVisualizer: true,
  },
  {
    id: 'service-05',
    num: '05',
    title: 'AI Agents & Workflows',
    subtitle: 'Autonomous Reasoning & Task Orchestration',
    desc: 'Deploy custom autonomous agents designed to handle customer engagement, complex code generation, and mission-critical automated pipelines 24/7.',
    icon: 'spark',
    badge: 'Autonomous AI',
    metric: 'Sub-second Inference',
    pill: 'Zero-Leak Guardrails',
    hasVisualizer: false,
  },
];

// --- Hardware-Accelerated Framer Motion Variants ---
const heroContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const heroItemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

const showcaseGridVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const showcaseCardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1.0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export default function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: 'next' | 'prev') => {
    if (!carouselRef.current) return;
    const cardWidth = 420;
    const scrollAmount = direction === 'next' ? cardWidth : -cardWidth;
    carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const handleCarouselScroll = () => {
    if (!carouselRef.current) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const cardWidth = 420;
    const index = Math.round(scrollLeft / cardWidth);
    setActiveSlide(Math.min(Math.max(index, 0), services.length - 1));
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans antialiased selection:bg-[#0066CC]/20 selection:text-[#0066CC]">
      {/* 1. Minimal Header with Apple Translucency */}
      <header className="sticky top-0 z-50 w-full border-b border-[#E5E5EA]/80 bg-[#F5F5F7]/80 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="/" className="flex items-center gap-3 text-[#1D1D1F] group">
              <ZenithFlowLogo idSuffix="nav" />
              <span
                style={{ letterSpacing: '0.05em' }}
                className="font-bold text-sm tracking-wider uppercase text-[#1D1D1F]"
              >
                ZENITHFLOWHQ
              </span>
            </a>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#86868B]">
              <a href="#services" className="hover:text-[#1D1D1F] transition-colors">
                Services
              </a>
              <a href="#showcase" className="hover:text-[#1D1D1F] transition-colors">
                Portfolio
              </a>
              <a href="#cta" className="hover:text-[#1D1D1F] transition-colors">
                Solutions
              </a>
            </nav>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex text-xs font-medium text-[#86868B] hover:text-[#1D1D1F] px-3.5 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <motion.a
              whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(0, 102, 204, 0.25)' }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="h-9 px-4 sm:px-5 rounded-full bg-[#0066CC] hover:bg-[#0077ED] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shrink-0"
              href="#cta"
            >
              <span>Book a Strategy Call</span>
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </motion.a>
          </div>
        </div>
      </header>

      {/* 2. Hero Section: Stagger-fade upward (y: 20 to y: 0, opacity: 0 to 1) over 0.6s with [0.16, 1, 0.3, 1] */}
      <section className="relative pt-36 pb-20 px-5 sm:px-6 lg:px-8 bg-[#F5F5F7]">
        <motion.div
          className="max-w-4xl mx-auto flex flex-col items-center text-center"
          variants={heroContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Subtle Label Pill */}
          <motion.div
            variants={heroItemVariants}
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#E5E5EA] text-xs font-medium text-[#86868B] shadow-sm mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-[#0066CC]"></span>
            <span>Scale Without The Overhead</span>
          </motion.div>

          {/* Massive Heavy H1 with Subtle Gradient Text-Clip */}
          <motion.h1
            variants={heroItemVariants}
            className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-[-0.03em] leading-[1.1] text-transparent bg-clip-text bg-gradient-to-b from-[#1D1D1F] via-[#2A2A2C] to-[#434344]"
          >
            Scale Without The Overhead.
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={heroItemVariants}
            className="mt-5 text-[#86868B] text-base sm:text-xl font-normal leading-relaxed max-w-2xl"
          >
            We build bespoke software and autonomous systems that drive international revenue, eliminate operational bottlenecks, and adapt exactly to how you do business.
          </motion.p>

          {/* Pill-Shaped Action Buttons with Hover State */}
          <motion.div
            variants={heroItemVariants}
            className="mt-8 flex flex-col sm:flex-row items-center gap-3.5 w-full max-w-md justify-center"
          >
            <motion.a
              href="#cta"
              whileHover={{ scale: 1.02, boxShadow: '0 10px 28px rgba(0, 102, 204, 0.3)' }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#0066CC] hover:bg-[#0077ED] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Schedule a Conversation</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </motion.a>
            <motion.a
              href="#services"
              whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)' }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white hover:bg-[#EBEBF0] text-[#1D1D1F] border border-[#E5E5EA] text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Explore Services</span>
            </motion.a>
          </motion.div>

          {/* 4 Bento Stat Badges */}
          <motion.div
            variants={heroItemVariants}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full mt-16 max-w-4xl"
          >
            <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)] text-left">
              <div className="text-2xl sm:text-3xl font-bold text-[#1D1D1F] tracking-tight">
                $140<span className="text-[#0066CC] text-lg font-semibold ml-0.5">M+</span>
              </div>
              <div className="text-xs text-[#86868B] font-medium mt-1">Client ARR Generated</div>
            </div>
            <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)] text-left">
              <div className="text-2xl sm:text-3xl font-bold text-[#1D1D1F] tracking-tight">
                99.8<span className="text-[#0066CC] text-lg font-semibold ml-0.5">%</span>
              </div>
              <div className="text-xs text-[#86868B] font-medium mt-1">On-Time Delivery</div>
            </div>
            <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)] text-left">
              <div className="text-2xl sm:text-3xl font-bold text-[#1D1D1F] tracking-tight">
                120<span className="text-[#0066CC] text-lg font-semibold ml-0.5">+</span>
              </div>
              <div className="text-xs text-[#86868B] font-medium mt-1">Products Shipped</div>
            </div>
            <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)] text-left">
              <div className="text-2xl sm:text-3xl font-bold text-[#1D1D1F] tracking-tight">
                &lt; 30<span className="text-[#0066CC] text-lg font-semibold ml-0.5">d</span>
              </div>
              <div className="text-xs text-[#86868B] font-medium mt-1">Typical MVP Launch</div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* 3. Services Carousel Section: Scroll-triggered fade-in to the entire container */}
      <section className="py-16 bg-[#F5F5F7]" id="services">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 mb-8 flex items-end justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#0066CC] mb-2">
                Capabilities &amp; Engineering
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1D1D1F] tracking-tight">
                Bespoke Services. Built to Scale.
              </h2>
            </div>

            {/* Carousel Navigation Buttons with Hover States */}
            <div className="hidden sm:flex items-center gap-2">
              <motion.button
                onClick={() => scrollCarousel('prev')}
                whileHover={{ scale: 1.02, boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                aria-label="Previous service"
                className="w-10 h-10 rounded-full bg-white border border-[#E5E5EA] shadow-sm flex items-center justify-center text-[#1D1D1F] hover:bg-[#EBEBF0]"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </motion.button>
              <motion.button
                onClick={() => scrollCarousel('next')}
                whileHover={{ scale: 1.02, boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                aria-label="Next service"
                className="w-10 h-10 rounded-full bg-white border border-[#E5E5EA] shadow-sm flex items-center justify-center text-[#1D1D1F] hover:bg-[#EBEBF0]"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </motion.button>
            </div>
          </div>

          {/* Full-width Horizontal Scrolling Container with Native Scroll-Snap (NO card animation) */}
          <div
            ref={carouselRef}
            onScroll={handleCarouselScroll}
            className="flex gap-6 overflow-x-auto px-5 sm:px-8 lg:px-12 pb-6 [scroll-snap-type:x_mandatory] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {services.map((item) => (
              <div
                key={item.id}
                className="min-w-[340px] sm:min-w-[400px] max-w-[420px] h-[440px] bg-white rounded-[24px] p-8 border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)] flex flex-col justify-between shrink-0 scroll-snap-align-center transition-transform duration-300 hover:-translate-y-1"
                style={{ scrollSnapAlign: 'center' }}
              >
                {/* Card Header */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-semibold text-[#0066CC] px-2.5 py-1 rounded-full bg-[#0066CC]/10">
                      SERVICE {item.num}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-[#F5F5F7] border border-[#E5E5EA] flex items-center justify-center text-[#1D1D1F]">
                      {item.icon === 'spark' ? (
                        <svg className="w-5 h-5 fill-current text-[#0066CC]" viewBox="0 0 24 24">
                          <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
                        </svg>
                      ) : (
                        <span className="material-symbols-outlined text-[22px] text-[#0066CC]">
                          {item.icon}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-[#1D1D1F] tracking-tight">
                    {item.title}
                  </h3>
                  <div className="text-xs font-medium text-[#86868B] mt-1">{item.subtitle}</div>

                  <p className="text-xs sm:text-sm text-[#86868B] leading-relaxed mt-4">
                    {item.desc}
                  </p>
                </div>

                {/* Card Interactive Feature or Micro-Visualizer */}
                <div className="mt-4 pt-4 border-t border-[#F5F5F7]">
                  {item.hasVisualizer ? (
                    <LightModePipelineVisualizer />
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium bg-[#F5F5F7] p-2.5 rounded-xl border border-[#E5E5EA]">
                        <span className="text-[#1D1D1F] font-semibold">{item.badge}</span>
                        <span className="text-[#0066CC] font-mono text-[11px]">{item.metric}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#86868B] px-1">
                        <span>Standard: Enterprise Grade</span>
                        <span className="text-[#0066CC] font-medium">{item.pill}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Carousel Slide Indicators */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {[0, 1, 2, 3, 4].map((dot) => (
              <span
                key={dot}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeSlide === dot ? 'w-6 bg-[#0066CC]' : 'w-1.5 bg-[#D2D2D7]'
                }`}
              />
            ))}
          </div>
        </motion.div>
      </section>

      {/* 4. Centered CTA Band (Pure White Background) */}
      <section className="w-full bg-white py-24 px-5 sm:px-6 lg:px-8 border-y border-[#E5E5EA]" id="cta">
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] flex items-center justify-center text-[#0066CC] shadow-sm mb-6">
            <span className="material-symbols-outlined text-[28px]">rocket_launch</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#1D1D1F] leading-tight">
            Ready to automate and scale your operations?
          </h2>

          <p className="mt-4 text-base sm:text-lg text-[#86868B] max-w-xl leading-relaxed">
            Partner with an elite engineering team that builds scalable software and autonomous systems tailored to your unique business logic.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3.5 w-full max-w-md justify-center">
            <motion.a
              href="mailto:contact@zenithflowhq.com"
              whileHover={{ scale: 1.02, boxShadow: '0 12px 32px rgba(0, 102, 204, 0.35)' }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#0066CC] hover:bg-[#0077ED] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Schedule a Conversation</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </motion.a>
            <motion.a
              href="#showcase"
              whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)' }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#F5F5F7] hover:bg-[#EBEBF0] text-[#1D1D1F] border border-[#E5E5EA] text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>View Product Showcase</span>
            </motion.a>
          </div>
        </div>
      </section>

      {/* 5. Product Showcase: Scale 0.95 to 1.0 (opacity 0 to 1) with 0.1s stagger & hover scale 1.02 */}
      <section className="py-24 px-5 sm:px-6 lg:px-8 bg-[#F5F5F7]" id="showcase">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0066CC]">
              Product Showcase
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1D1D1F] tracking-tight mt-2">
              Engineered with Precision
            </h2>
            <p className="text-[#86868B] text-sm sm:text-base mt-3">
              Explore live systems, autonomous pipelines, and mobile-first products built for global enterprise scale.
            </p>
          </div>

          {/* 2x2 Bento CSS Grid with 0.1s stagger */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            variants={showcaseGridVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {/* Item 1: Attendance Web App & Kiosk Wireframe */}
            <motion.div
              variants={showcaseCardVariants}
              whileHover={{
                scale: 1.02,
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.08)',
                transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
              }}
              className="bg-white rounded-[24px] p-8 border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-semibold text-[#0066CC] bg-[#0066CC]/10 px-2.5 py-1 rounded-full">
                    FLAGSHIP SYSTEM
                  </span>
                  <span className="text-xs font-mono text-[#86868B]">PWA // Edge</span>
                </div>
                <h3 className="text-2xl font-bold text-[#1D1D1F]">Attendance Web App &amp; Kiosk</h3>
                <p className="text-xs sm:text-sm text-[#86868B] mt-2 leading-relaxed">
                  Anti-cheat QR code kiosk with dynamic 30-second TOTP rotation, GPS geofencing verification, and pg_cron automated reconciliation.
                </p>
              </div>

              {/* Abstract Light-Mode Micro-UI Wireframe */}
              <div className="mt-6 p-5 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA]">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E5E5EA] text-xs">
                  <span className="font-semibold text-[#1D1D1F] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-ping"></span>
                    Live Kiosk Display
                  </span>
                  <span className="font-mono text-[#0066CC] text-[11px]">TOTP 30s Window</span>
                </div>
                <div className="grid grid-cols-3 gap-3 items-center">
                  <div className="w-full aspect-square rounded-xl bg-white border border-[#E5E5EA] flex flex-col items-center justify-center p-2 shadow-sm">
                    <span className="material-symbols-outlined text-[#1D1D1F] text-[32px]">qr_code_2</span>
                    <span className="text-[9px] font-mono text-[#86868B] mt-0.5">Scan Code</span>
                  </div>
                  <div className="col-span-2 space-y-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-[#E5E5EA] flex items-center justify-between">
                      <span className="text-[#86868B]">GPS Perimeter:</span>
                      <span className="font-semibold text-[#16a34a]">Within 14m ✓</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-[#E5E5EA] flex items-center justify-between">
                      <span className="text-[#86868B]">Daily Automation:</span>
                      <span className="font-mono text-[#0066CC]">09:00 AM Cron</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Item 2: Autonomous Revenue & Billing Engine */}
            <motion.div
              variants={showcaseCardVariants}
              whileHover={{
                scale: 1.02,
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.08)',
                transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
              }}
              className="bg-white rounded-[24px] p-8 border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-semibold text-[#0066CC] bg-[#0066CC]/10 px-2.5 py-1 rounded-full">
                    FINANCIAL PIPELINE
                  </span>
                  <span className="text-xs font-mono text-[#86868B]">Stripe // Global</span>
                </div>
                <h3 className="text-2xl font-bold text-[#1D1D1F]">Autonomous Revenue Stream</h3>
                <p className="text-xs sm:text-sm text-[#86868B] mt-2 leading-relaxed">
                  Multi-currency checkout pipelines, automated subscription tier provisioning, and sub-second webhook billing sync.
                </p>
              </div>

              {/* Abstract Light-Mode Graph & Telemetry Bars */}
              <div className="mt-6 p-5 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA]">
                <div className="flex items-center justify-between mb-4 text-xs">
                  <span className="font-semibold text-[#1D1D1F]">Real-time Transaction Volume</span>
                  <span className="font-mono text-[#0066CC] font-bold">+184.2% YoY</span>
                </div>
                {/* Visual Bar Chart */}
                <div className="flex items-end gap-2 h-20 pt-2 pb-1 px-2 bg-white rounded-xl border border-[#E5E5EA]">
                  {[35, 48, 60, 42, 75, 90, 84, 100].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <div
                        className="w-full rounded-t bg-[#0066CC] transition-all duration-500"
                        style={{ height: `${h}%`, opacity: 0.25 + (i / 8) * 0.75 }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#86868B] mt-2">
                  <span>Settlement: Instant</span>
                  <span className="text-[#0066CC] font-medium">USD • EUR • GBP • JPY</span>
                </div>
              </div>
            </motion.div>

            {/* Item 3: Global Edge Telemetry */}
            <motion.div
              variants={showcaseCardVariants}
              whileHover={{
                scale: 1.02,
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.08)',
                transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
              }}
              className="bg-white rounded-[24px] p-8 border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-semibold text-[#0066CC] bg-[#0066CC]/10 px-2.5 py-1 rounded-full">
                    INFRASTRUCTURE
                  </span>
                  <span className="text-xs font-mono text-[#86868B]">Global Edge</span>
                </div>
                <h3 className="text-2xl font-bold text-[#1D1D1F]">Edge Telemetry &amp; Uptime</h3>
                <p className="text-xs sm:text-sm text-[#86868B] mt-2 leading-relaxed">
                  Distributed Cloudflare &amp; AWS micro-clusters with automated regional failover and verified sub-20ms TTFB worldwide.
                </p>
              </div>

              {/* Abstract Light-Mode Telemetry Dial & Node Map */}
              <div className="mt-6 p-5 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA]">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="font-semibold text-[#1D1D1F]">Global Edge Health</span>
                  <span className="text-[#16a34a] font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#16a34a]"></span>
                    All Nodes Operational
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-[#E5E5EA]">
                    <div className="text-[11px] text-[#86868B]">Global TTFB</div>
                    <div className="text-xl font-bold text-[#0066CC] font-mono mt-0.5">18ms</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#E5E5EA]">
                    <div className="text-[11px] text-[#86868B]">Uptime SLA</div>
                    <div className="text-xl font-bold text-[#1D1D1F] font-mono mt-0.5">99.999%</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Item 4: Autonomous AI Reasoning Canvas */}
            <motion.div
              variants={showcaseCardVariants}
              whileHover={{
                scale: 1.02,
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.08)',
                transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
              }}
              className="bg-white rounded-[24px] p-8 border border-black/[0.04] shadow-[0_4px_24px_rgba(0,0,0,0.04)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-semibold text-[#0066CC] bg-[#0066CC]/10 px-2.5 py-1 rounded-full">
                    INTELLIGENCE
                  </span>
                  <span className="text-xs font-mono text-[#86868B]">AI Workforce</span>
                </div>
                <h3 className="text-2xl font-bold text-[#1D1D1F]">Autonomous AI Reasoning</h3>
                <p className="text-xs sm:text-sm text-[#86868B] mt-2 leading-relaxed">
                  Multi-agent workflows that inspect codebases, execute Playwright browser tests, parse contracts, and deploy zero-defect PRs.
                </p>
              </div>

              {/* Abstract Light-Mode Node Workflow Wireframe */}
              <div className="mt-6 p-5 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA]">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="font-semibold text-[#1D1D1F]">Active Autonomous Squad</span>
                  <span className="text-[#0066CC] font-mono text-[11px]">Sprint 24 Passed</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-[#E5E5EA] flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[#1D1D1F]">
                      <span className="material-symbols-outlined text-[16px] text-[#0066CC]">smart_toy</span>
                      Playwright E2E Test Suite
                    </span>
                    <span className="font-semibold text-[#16a34a]">100% Passing</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-[#E5E5EA] flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[#1D1D1F]">
                      <span className="material-symbols-outlined text-[16px] text-[#0066CC]">verified_user</span>
                      Security &amp; Vulnerability Gate
                    </span>
                    <span className="font-semibold text-[#16a34a]">0 Alerts</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 6. Minimalist Centered Footer */}
      <footer className="w-full bg-[#F5F5F7] py-16 px-5 sm:px-6 lg:px-8 border-t border-[#E5E5EA]">
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
          {/* Centered Logo & Branding */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <ZenithFlowLogo idSuffix="footer" />
            <span
              style={{ letterSpacing: '0.05em' }}
              className="font-bold text-base tracking-wider uppercase text-[#1D1D1F]"
            >
              ZENITHFLOWHQ
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#86868B] max-w-md mb-8 leading-relaxed">
            The modern software studio engineering bespoke platforms, autonomous workflows, and cloud architecture for international businesses.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#86868B] mb-10">
            <a href="#services" className="hover:text-[#1D1D1F] transition-colors">
              Websites &amp; Apps
            </a>
            <a href="#services" className="hover:text-[#1D1D1F] transition-colors">
              Custom Software
            </a>
            <a href="#services" className="hover:text-[#1D1D1F] transition-colors">
              Backend Automations
            </a>
            <a href="#services" className="hover:text-[#1D1D1F] transition-colors">
              SaaS Automations
            </a>
            <a href="#services" className="hover:text-[#1D1D1F] transition-colors">
              AI Agents
            </a>
            <Link href="/kiosk" className="hover:text-[#1D1D1F] transition-colors">
              Staff Portal
            </Link>
          </div>

          <div className="text-[11px] text-[#86868B]">
            &copy; {new Date().getFullYear()} ZenithFlowHQ. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
