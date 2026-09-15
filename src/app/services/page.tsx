'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';

// --- Service Card Wrapper with Framer Motion Scale Effect ---
interface ServiceCardWrapperProps {
  id: string;
  onVisible: (id: string) => void;
  children: (props: { isExpanded: boolean; toggle: () => void }) => React.ReactNode;
  initialExpanded?: boolean;
}

function ServiceCardWrapper({
  id,
  onVisible,
  children,
  initialExpanded = false,
}: ServiceCardWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  // 1. Scroll-driven scale: smoothly grow from 95% size (0.95) to 100% size (1.0) as entering screen
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'start 65%'],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [0.95, 1]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0.85, 1]);

  // 2. In-view detection: when card enters reading view, trigger parent callback
  const isInView = useInView(containerRef, {
    margin: '-20% 0px -40% 0px',
    amount: 0.15,
  });

  useEffect(() => {
    if (isInView) {
      onVisible(id);
    }
  }, [isInView, id, onVisible]);

  return (
    <motion.div
      ref={containerRef}
      id={id}
      style={{ scale, opacity }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
      className="transform-gpu origin-center will-change-transform scroll-mt-28"
    >
      {children({
        isExpanded,
        toggle: () => setIsExpanded((prev) => !prev),
      })}
    </motion.div>
  );
}

export default function ServicesPage() {
  const [activeService, setActiveService] = useState<string>('service-1');
  const [sidebarSent, setSidebarSent] = useState(false);

  // Google Font & Material Symbols dynamically linked if not present
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&family=Chivo+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const navItems = [
    {
      id: 'service-1',
      number: '01 // WEB ARCHITECTURE',
      title: 'Web Architecture & Exp.',
      subtitle: 'Next.js, 100 Lighthouse & motion',
      icon: 'language',
    },
    {
      id: 'service-2',
      number: '02 // CUSTOM SOFTWARE',
      title: 'SaaS & Cloud Platforms',
      subtitle: 'Scalable microservices & APIs',
      icon: 'dns',
    },
    {
      id: 'service-3',
      number: '03 // MOBILE APPS',
      title: 'Native iOS & Android',
      subtitle: '60 FPS Flutter, Swift & React Native',
      icon: 'devices',
    },
    {
      id: 'service-4',
      number: '04 // AUTOMATIONS',
      title: 'Business Automations',
      subtitle: 'AI workflows, CRM & data pipelines',
      icon: 'schema',
    },
    {
      id: 'service-5',
      number: '05 // SPRINTS & SLAS',
      title: 'Enterprise Product Squads',
      subtitle: 'Dedicated dev squads & SOC2 guarantees',
      icon: 'verified',
    },
  ];

  const scrollToService = (id: string) => {
    setActiveService(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="bg-[#0B0D10] text-[#F4F5F6] min-h-screen flex flex-col antialiased selection:bg-[#6366F1] selection:text-white font-sans">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-[#232830] bg-[#0B0D10]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto h-full px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a className="flex items-center gap-2.5 group" href="#">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#6366F1] to-[#06B6D4] flex items-center justify-center p-0.5 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-white text-[20px] font-bold">
                  terminal
                </span>
              </div>
              <span className="font-semibold text-lg tracking-tight text-white flex items-center gap-1.5">
                KINETIC <span className="text-[#06B6D4] font-mono text-sm">/ STUDIO</span>
                <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#16191E] border border-[#6366F1]/30 text-[#06B6D4] font-medium ml-1">
                  {'AGENCY // PRODUCT LAB'}
                </span>
              </span>
            </a>
            <div className="hidden md:flex items-center gap-1 text-xs font-mono text-[#555A64]">
              <span className="inline-block w-2 h-2 rounded-full bg-[#06B6D4] animate-pulse"></span>
              <span className="text-[#8B909A]">ACCEPTING Q2/Q3 SPRINTS</span>
              <span className="mx-2">•</span>
              <span className="text-[#6366F1]">GLOBAL REMOTE SQUADS</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#232830] bg-[#111419] text-xs text-[#8B909A]">
              <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>
              <span>Featured: 2026 Agency Showreel</span>
              <span className="text-[#555A64]">→</span>
            </div>
            <a
              className="hidden sm:flex text-sm text-[#8B909A] hover:text-white px-3.5 py-1.5 transition-colors font-medium"
              href="#services"
            >
              View Case Studies
            </a>
            <a
              className="h-9 px-4 rounded-lg bg-[#6366F1] hover:bg-[#8B5CF6] text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all"
              href="#contact"
            >
              <span>Book a Project</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Overview Banner */}
      <section className="relative pt-32 pb-16 px-6 lg:px-8 border-b border-[#232830]/60 bg-[#0B0D10] overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-70"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.05) 50%, transparent 75%)',
          }}
        ></div>
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-end justify-between gap-10 relative z-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#111419]/80 border border-[#6366F1]/30 text-xs font-mono text-[#06B6D4] mb-6">
              <span className="material-symbols-outlined text-[14px]">rocket_launch</span>
              <span className="tracking-wider">FULL-CYCLE DIGITAL PRODUCT STUDIO</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white leading-[1.15]">
              We engineer{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#06B6D4] via-[#6366F1] to-[#8B5CF6]">
                high-impact digital products
              </span>{' '}
              &amp; automations.
            </h1>
            <p className="mt-4 text-[#8B909A] text-base lg:text-lg leading-relaxed max-w-xl">
              Full-cycle digital agency building high-converting websites, bespoke enterprise software, native iOS/Android apps, and autonomous business workflows.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#16191E]/70 border border-[#232830]/80 rounded-2xl p-4 sm:p-5 hover:border-[#6366F1]/40 transition-all shadow-sm">
              <div className="text-2xl font-bold font-mono text-[#06B6D4]">
                $140<span className="text-[#06B6D4] text-base font-normal ml-0.5">M+</span>
              </div>
              <div className="text-[10px] text-[#555A64] uppercase tracking-widest font-mono mt-1">
                Client ARR Generated
              </div>
            </div>
            <div className="bg-[#16191E]/70 border border-[#232830]/80 rounded-2xl p-4 sm:p-5 hover:border-[#6366F1]/40 transition-all shadow-sm">
              <div className="text-2xl font-bold font-mono text-white">
                99.8<span className="text-[#8B909A] text-base font-normal ml-0.5">%</span>
              </div>
              <div className="text-[10px] text-[#555A64] uppercase tracking-widest font-mono mt-1">
                On-Time Delivery
              </div>
            </div>
            <div className="bg-[#16191E]/70 border border-[#232830]/80 rounded-2xl p-4 sm:p-5 hover:border-[#6366F1]/40 transition-all shadow-sm">
              <div className="text-2xl font-bold font-mono text-[#6366F1]">
                120<span className="text-[#6366F1] text-base font-normal ml-0.5">+</span>
              </div>
              <div className="text-[10px] text-[#555A64] uppercase tracking-widest font-mono mt-1">
                Products Shipped
              </div>
            </div>
            <div className="bg-[#16191E]/70 border border-[#232830]/80 rounded-2xl p-4 sm:p-5 hover:border-[#6366F1]/40 transition-all shadow-sm">
              <div className="text-2xl font-bold font-mono text-white">
                &lt; 30<span className="text-[#8B909A] text-base font-normal ml-0.5">d</span>
              </div>
              <div className="text-[10px] text-[#555A64] uppercase tracking-widest font-mono mt-1">
                Typical MVP Launch
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main 2-Column Desktop Architecture */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
          {/* ================= LEFT COLUMN: STICKY SIDEBAR (5 Services Navigation) ================= */}
          <aside className="lg:col-span-4 sticky top-24 z-30 flex flex-col gap-5">
            <div className="bg-[#16191E] border border-[#232830] rounded-2xl p-5 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between pb-4 border-b border-[#232830] mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#06B6D4] text-[18px]">
                    category
                  </span>
                  <span className="text-xs font-mono font-semibold tracking-wider uppercase text-white">
                    Agency Offerings
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#06B6D4] px-2 py-0.5 rounded bg-[#06B6D4]/10 border border-[#06B6D4]/20">
                  4 Pillars + Squads
                </span>
              </div>

              <nav className="flex flex-col gap-2" id="service-nav">
                {navItems.map((item) => {
                  const isActive = activeService === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToService(item.id)}
                      className={`w-full text-left group flex items-start gap-3.5 p-3.5 rounded-xl border transition-all duration-300 ${
                        isActive
                          ? 'bg-[#1C2027] border-[#8B5CF6] shadow-[0_0_20px_-4px_rgba(139,92,246,0.35)]'
                          : 'bg-[#111419]/50 border-[#232830]/60 hover:border-[#06B6D4]/40 hover:bg-[#1C2027]'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300 ${
                          isActive
                            ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-[#8B5CF6] scale-105'
                            : 'bg-[#06B6D4]/10 border-[#06B6D4]/20 text-[#06B6D4] group-hover:scale-105'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {item.icon}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className="text-[11px] font-mono font-medium transition-colors duration-300"
                            style={{
                              color: isActive ? '#8B5CF6' : undefined,
                            }}
                          >
                            <span className={!isActive ? 'text-[#06B6D4]' : ''}>
                              {item.number}
                            </span>
                          </span>
                          <span
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                              isActive
                                ? 'bg-[#8B5CF6] shadow-[0_0_8px_#8B5CF6] scale-125'
                                : 'bg-[#06B6D4]'
                            }`}
                          ></span>
                        </div>

                        {/* Title highlighted with #8B5CF6 when in view */}
                        <div
                          className="text-sm font-semibold transition-colors duration-300 truncate"
                          style={{
                            color: isActive ? '#8B5CF6' : '#FFFFFF',
                          }}
                        >
                          {item.title}
                        </div>

                        <div
                          className="text-xs mt-0.5 truncate transition-colors duration-300"
                          style={{
                            color: isActive ? '#A78BFA' : '#8B909A',
                          }}
                        >
                          {item.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-4 pt-4 border-t border-[#232830] flex items-center justify-between text-xs font-mono">
                <span className="text-[#555A64]">SPRINT CYCLE: 14 DAYS</span>
                <span className="text-[#06B6D4] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] animate-ping"></span>
                  ENGINEERING READY
                </span>
              </div>
            </div>

            {/* Contact Discovery Card */}
            <div
              className="bg-gradient-to-br from-[#16191E] to-[#111419] border border-[#232830] rounded-2xl p-5 shadow-xl relative overflow-hidden"
              id="contact"
            >
              <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-[#6366F1]/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex items-center gap-2 mb-2 text-[#06B6D4] text-xs font-mono font-semibold">
                <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                <span>TECHNICAL DISCOVERY CALL</span>
              </div>
              <h4 className="text-base font-semibold text-white mb-1.5">
                Have a project in mind?
              </h4>
              <p className="text-xs text-[#8B909A] mb-4 leading-relaxed">
                Get a guaranteed architectural review and preliminary engineering roadmap delivered within 48 hours.
              </p>
              <form
                className="flex flex-col gap-2.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSidebarSent(true);
                }}
              >
                <input
                  className="w-full h-9 px-3 bg-[#0B0D10] border border-[#232830] rounded-lg text-xs font-mono text-white placeholder-[#555A64] focus:border-[#06B6D4] focus:outline-none transition-colors"
                  placeholder="work.email@company.com"
                  required
                  type="email"
                />
                <button
                  className="w-full h-9 bg-[#6366F1] hover:bg-[#8B5CF6] active:scale-[0.99] text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-500/20"
                  type="submit"
                >
                  <span>Book Scope Call</span>
                  <span className="material-symbols-outlined text-[14px]">east</span>
                </button>
              </form>
              {sidebarSent && (
                <div className="text-[11px] font-mono text-[#06B6D4] mt-2 text-center">
                  ✓ Scope session invitation dispatched.
                </div>
              )}
              <div className="mt-4 pt-3 border-t border-[#232830]/60 flex items-center justify-between text-[11px] text-[#555A64]">
                <span>NDA Standard</span>
                <span>Fixed Sprint Pricing</span>
              </div>
            </div>
          </aside>

          {/* ================= RIGHT COLUMN: SCROLLING IMMERSIVE CARDS ================= */}
          <section className="lg:col-span-8 flex flex-col gap-10" id="services">
            {/* SERVICE CARD 1 */}
            <ServiceCardWrapper
              id="service-1"
              onVisible={setActiveService}
              initialExpanded={true}
            >
              {({ isExpanded, toggle }) => (
                <article className="bg-[#16191E]/85 border border-[#232830] rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden transition-all duration-300">
                  <div className="absolute -top-16 -right-16 w-72 h-72 bg-[#06B6D4]/10 rounded-full blur-3xl pointer-events-none"></div>

                  <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#232830]/60 cursor-pointer select-none group/header"
                    onClick={toggle}
                  >
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30">
                          SERVICE 01
                        </span>
                        <span className="text-xs font-mono text-[#555A64] tracking-wider">
                          WEB ARCHITECTURE &amp; EXP
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/20">
                          {isExpanded ? 'Full View' : 'Half View'}
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white group-hover/header:text-[#06B6D4] transition-colors">
                        Web Architecture &amp; Experiences
                      </h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="hidden sm:flex px-3.5 py-1.5 rounded-full bg-[#111419]/90 border border-[#232830] text-xs font-mono text-[#8B909A] items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>
                        <span>100 Lighthouse Benchmark</span>
                      </span>
                      <button
                        aria-label="Toggle section expansion"
                        className="w-10 h-10 rounded-xl bg-[#111419] border border-[#232830] hover:border-[#06B6D4]/50 text-[#8B909A] hover:text-white flex items-center justify-center transition-all shadow-sm"
                      >
                        <span
                          className={`material-symbols-outlined text-[22px] transition-transform duration-300 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        >
                          keyboard_arrow_down
                        </span>
                      </button>
                    </div>
                  </div>

                  <div
                    className={`transition-all duration-400 overflow-hidden ${
                      isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-[250px] opacity-90'
                    }`}
                  >
                    <p className="mt-6 text-base text-[#8B909A] leading-relaxed max-w-2xl">
                      We engineer high-converting marketing sites and ultra-responsive web applications using Next.js, React Server Components, Tailwind CSS, and WebGL physics engines.
                    </p>
                    <div className="mt-8 rounded-2xl bg-[#111419]/80 border border-[#232830] p-6 flex flex-col gap-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[#232830]/60">
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-[#06B6D4] text-[18px]">
                            speed
                          </span>
                          <span className="text-xs font-mono text-white font-medium">
                            Performance &amp; Core Web Vitals Auditing
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-[#06B6D4]">
                          LCP &lt; 0.6s • CLS 0.00
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div className="p-4 rounded-xl bg-[#16191E] border border-[#232830]/70 hover:border-[#06B6D4]/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-[#06B6D4]/10 border border-[#06B6D4]/20 flex items-center justify-center font-bold text-[#06B6D4] font-mono text-xs">
                              100
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-white">
                                  Next.js 15 App Router + Edge Runtime
                                </span>
                                <span className="px-2 py-0.5 rounded text-[11px] bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30 font-medium">
                                  Score: 100
                                </span>
                              </div>
                              <div className="text-xs text-[#555A64] mt-0.5">
                                Streaming SSR, Dynamic OG Engine &amp; Vercel KV Cache
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-mono text-[#06B6D4] bg-[#0B0D10]/70 px-3 py-1.5 rounded-lg border border-[#232830]/60">
                            <span className="material-symbols-outlined text-[14px]">bolt</span>
                            <span>TTFB: 18ms (Global Edge)</span>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-[#16191E] border border-[#232830]/70 hover:border-[#06B6D4]/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-[#06B6D4]/10 border border-[#06B6D4]/20 flex items-center justify-center font-bold text-[#06B6D4] font-mono text-xs">
                              CMS
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-white">
                                  Headless CMS &amp; Content Architecture
                                </span>
                                <span className="px-2 py-0.5 rounded text-[11px] bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30 font-medium">
                                  Sanity / Payload
                                </span>
                              </div>
                              <div className="text-xs text-[#555A64] mt-0.5">
                                Real-time preview, visual editor &amp; automated staging builds
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-mono text-[#8B909A] bg-[#0B0D10]/70 px-3 py-1.5 rounded-lg border border-[#232830]/60">
                            <span className="material-symbols-outlined text-[#06B6D4] text-[14px]">
                              verified
                            </span>
                            <span>Conversion Lift: +42%</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 pt-4 border-t border-[#232830]/60 flex items-center justify-between text-xs font-mono text-[#8B909A]">
                        <span className="flex items-center gap-2 text-[#06B6D4]">
                          <span className="material-symbols-outlined text-[15px]">check_circle</span>
                          <span>Zero Cumulative Layout Shift Guaranteed</span>
                        </span>
                        <span className="text-[#555A64]">Stack: Tailwind, Radix UI, Framer Motion, Next.js</span>
                      </div>
                    </div>
                  </div>
                </article>
              )}
            </ServiceCardWrapper>

            {/* SERVICE CARD 2 */}
            <ServiceCardWrapper
              id="service-2"
              onVisible={setActiveService}
              initialExpanded={true}
            >
              {({ isExpanded, toggle }) => (
                <article className="bg-[#16191E]/85 border border-[#232830] rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden transition-all duration-300">
                  <div className="absolute -top-16 -right-16 w-72 h-72 bg-[#6366F1]/10 rounded-full blur-3xl pointer-events-none"></div>

                  <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#232830]/60 cursor-pointer select-none group/header"
                    onClick={toggle}
                  >
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="px-3 py-1 rounded-full bg-[#0B0D10] text-[11px] font-mono text-[#06B6D4] border border-[#232830]">
                          Auto-scaling
                        </span>
                        <span className="px-3 py-1 rounded-full bg-[#0B0D10] text-[11px] font-mono text-[#6366F1] border border-[#232830]">
                          SOC 2 Ready
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white group-hover/header:text-[#6366F1] transition-colors">
                        Custom Software &amp; Cloud Platforms
                      </h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-[#6366F1] bg-[#6366F1]/10 px-3.5 py-1.5 rounded-full border border-[#6366F1]/20">
                        <span className="material-symbols-outlined text-[15px]">cloud_done</span>
                        <span>Multi-Tenant Architecture</span>
                      </div>
                      <button
                        aria-label="Toggle section expansion"
                        className="w-10 h-10 rounded-xl bg-[#111419] border border-[#232830] hover:border-[#6366F1]/50 text-[#8B909A] hover:text-white flex items-center justify-center transition-all shadow-sm"
                      >
                        <span
                          className={`material-symbols-outlined text-[22px] transition-transform duration-300 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        >
                          keyboard_arrow_down
                        </span>
                      </button>
                    </div>
                  </div>

                  <div
                    className={`transition-all duration-400 overflow-hidden ${
                      isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-[250px] opacity-90'
                    }`}
                  >
                    <p className="mt-6 text-base text-[#8B909A] leading-relaxed max-w-2xl">
                      We design and engineer bespoke enterprise systems, transactional cloud platforms, multi-tenant databases, and high-concurrency microservices tailored to your exact business domain.
                    </p>
                    <div className="mt-8 rounded-2xl bg-[#111419]/80 border border-[#232830] p-6 flex flex-col gap-5">
                      <div className="bg-[#0B0D10]/90 p-4 rounded-xl border border-[#232830]/80 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#6366F1] animate-ping"></div>
                          <span className="text-xs font-mono text-white font-medium">
                            Cloud Platform Telemetry • Multi-Region Cluster
                          </span>
                        </div>
                        <span className="text-xs font-mono text-[#6366F1] font-semibold">
                          4.2M req/sec • 99.999% SLA
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-[#16191E] border border-[#232830]/70 text-left">
                          <div className="flex items-center justify-between mb-2 text-xs">
                            <span className="text-white font-semibold">Database &amp; Data Pipeline</span>
                            <span className="font-mono text-[#555A64]">PostgreSQL</span>
                          </div>
                          <p className="text-xs text-[#8B909A] leading-relaxed">
                            Row-level security, tenancy isolation, automated point-in-time recovery, and Prisma/Kysely schema migrations.
                          </p>
                          <div className="mt-3 text-[11px] font-mono text-[#06B6D4] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[13px]">check</span>
                            <span>Zero-downtime migration pipeline</span>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-[#16191E] border border-[#6366F1]/30 text-left">
                          <div className="flex items-center justify-between mb-2 text-xs">
                            <span className="text-[#6366F1] font-semibold">API Gateways &amp; Event Bus</span>
                            <span className="font-mono text-[#555A64]">GraphQL / gRPC</span>
                          </div>
                          <p className="text-xs text-[#8B909A] leading-relaxed">
                            Low-latency pub/sub queues via Redis &amp; Kafka, authenticated webhook engines, and Stripe enterprise billing engines.
                          </p>
                          <div className="mt-3 text-[11px] font-mono text-[#6366F1] flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[13px]">security</span>
                            <span>End-to-end OAuth2 / OIDC &amp; RBAC</span>
                          </div>
                        </div>
                      </div>

                      <div className="relative py-5 px-6 rounded-xl bg-gradient-to-b from-[#0B0D10] to-[#16191E] border border-[#232830]/70 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/30 flex items-center justify-center relative shadow-lg shadow-indigo-500/10">
                            <span className="material-symbols-outlined text-[#6366F1] text-[26px]">
                              memory
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">Enterprise Cloud Blueprint</div>
                            <div className="text-xs text-[#8B909A] mt-0.5">
                              AWS, GCP, Supabase, Cloudflare Workers &amp; Docker infrastructure.
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="px-3 py-1 rounded-full bg-[#0B0D10] text-[11px] font-mono text-[#06B6D4] border border-[#232830]">
                            Auto-scaling
                          </span>
                          <span className="px-3 py-1 rounded-full bg-[#0B0D10] text-[11px] font-mono text-[#6366F1] border border-[#232830]">
                            SOC 2 Ready
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              )}
            </ServiceCardWrapper>

            {/* SERVICE CARD 3 */}
            <ServiceCardWrapper
              id="service-3"
              onVisible={setActiveService}
              initialExpanded={true}
            >
              {({ isExpanded, toggle }) => (
                <article className="bg-[#16191E]/85 border border-[#232830] rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden transition-all duration-300">
                  <div className="absolute -top-16 -right-16 w-72 h-72 bg-[#06B6D4]/10 rounded-full blur-3xl pointer-events-none"></div>

                  <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#232830]/60 cursor-pointer select-none group/header"
                    onClick={toggle}
                  >
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30">
                          SERVICE 03
                        </span>
                        <span className="text-xs font-mono text-[#555A64] tracking-wider">
                          NATIVE &amp; CROSS-PLATFORM
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/20">
                          {isExpanded ? 'Full View' : 'Half View'}
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white group-hover/header:text-[#06B6D4] transition-colors">
                        Mobile Application Development
                      </h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex font-mono text-xs text-[#06B6D4] bg-[#06B6D4]/10 px-3.5 py-1.5 rounded-full border border-[#06B6D4]/20">
                        Native 60 FPS Engine
                      </div>
                      <button
                        aria-label="Toggle section expansion"
                        className="w-10 h-10 rounded-xl bg-[#111419] border border-[#232830] hover:border-[#06B6D4]/50 text-[#8B909A] hover:text-white flex items-center justify-center transition-all shadow-sm"
                      >
                        <span
                          className={`material-symbols-outlined text-[22px] transition-transform duration-300 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        >
                          keyboard_arrow_down
                        </span>
                      </button>
                    </div>
                  </div>

                  <div
                    className={`transition-all duration-400 overflow-hidden ${
                      isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-[250px] opacity-90'
                    }`}
                  >
                    <p className="mt-6 text-base text-[#8B909A] leading-relaxed max-w-2xl">
                      We build frictionless, offline-first iOS and Android applications. From Swift and Kotlin to React Native and Flutter, we deliver intuitive user experiences with fluid 60/120 FPS animations.
                    </p>

                    <div className="mt-8 rounded-2xl bg-[#111419]/80 border border-[#232830] p-6 flex flex-col gap-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="bg-[#16191E] border border-[#232830]/70 rounded-2xl p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between pb-2.5 border-b border-[#232830]/60 text-xs">
                            <span className="text-[#8B909A] flex items-center gap-2 font-mono">
                              <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>
                              APPLE ECOSYSTEM (iOS)
                            </span>
                            <span className="text-white font-bold font-mono text-sm">
                              SwiftUI / Metal
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-[#111419]/90 border border-[#232830]/60 flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-white">Live Activities &amp; Widgets</span>
                              <span className="font-mono text-[#06B6D4] font-semibold">120Hz ProMotion</span>
                            </div>
                            <div className="text-[11px] text-[#555A64]">
                              Biometrics, StoreKit 2 &amp; background push
                            </div>
                            <div className="w-full bg-[#0B0D10] h-1.5 rounded-full overflow-hidden mt-1">
                              <div className="bg-[#06B6D4] h-full w-4/5"></div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#16191E] border border-[#232830]/70 rounded-2xl p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between pb-2.5 border-b border-[#232830]/60 text-xs">
                            <span className="text-[#8B909A] flex items-center gap-2 font-mono">
                              <span className="w-2 h-2 rounded-full bg-[#6366F1]"></span>
                              ANDROID ECOSYSTEM
                            </span>
                            <span className="text-white font-bold font-mono text-sm">
                              Jetpack Compose
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-[#111419]/90 border border-[#232830]/60 flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-white">Offline-First Sync Engine</span>
                              <span className="font-mono text-[#6366F1] font-semibold">Zero Stutter</span>
                            </div>
                            <div className="text-[11px] text-[#555A64]">
                              Room DB, Kotlin Coroutines, Background Worker
                            </div>
                            <div className="w-full bg-[#0B0D10] h-1.5 rounded-full overflow-hidden mt-1">
                              <div className="bg-[#6366F1] h-full w-3/4"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-[#16191E] border border-[#232830]/70 flex items-start gap-3.5">
                        <span className="material-symbols-outlined text-[#06B6D4] text-[20px] mt-0.5">
                          verified
                        </span>
                        <div className="flex-1 text-left">
                          <div className="text-xs font-mono text-[#06B6D4] font-semibold">
                            End-to-End App Store Review &amp; Deployment
                          </div>
                          <div className="text-xs text-[#8B909A] mt-1 leading-relaxed">
                            Automated CI/CD via Fastlane delivering instant TestFlight &amp; Google Play Internal Track builds on every merged pull request.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              )}
            </ServiceCardWrapper>

            {/* SERVICE CARD 4 */}
            <ServiceCardWrapper
              id="service-4"
              onVisible={setActiveService}
              initialExpanded={true}
            >
              {({ isExpanded, toggle }) => (
                <article className="bg-[#16191E]/85 border border-[#232830] rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden transition-all duration-300">
                  <div className="absolute -top-16 -right-16 w-72 h-72 bg-[#6366F1]/10 rounded-full blur-3xl pointer-events-none"></div>

                  <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#232830]/60 cursor-pointer select-none group/header"
                    onClick={toggle}
                  >
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#6366F1]/15 text-[#6366F1] border border-[#6366F1]/30">
                          SERVICE 04
                        </span>
                        <span className="text-xs font-mono text-[#555A64] tracking-wider">
                          AUTOMATION &amp; WORKFLOWS
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20">
                          {isExpanded ? 'Full View' : 'Half View'}
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white group-hover/header:text-[#6366F1] transition-colors">
                        Business Automations &amp; AI Pipelines
                      </h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex font-mono text-xs text-[#06B6D4] bg-[#06B6D4]/10 px-3.5 py-1.5 rounded-full border border-[#06B6D4]/20">
                        Autonomous Workflows
                      </div>
                      <button
                        aria-label="Toggle section expansion"
                        className="w-10 h-10 rounded-xl bg-[#111419] border border-[#232830] hover:border-[#6366F1]/50 text-[#8B909A] hover:text-white flex items-center justify-center transition-all shadow-sm"
                      >
                        <span
                          className={`material-symbols-outlined text-[22px] transition-transform duration-300 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        >
                          keyboard_arrow_down
                        </span>
                      </button>
                    </div>
                  </div>

                  <div
                    className={`transition-all duration-400 overflow-hidden ${
                      isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-[250px] opacity-90'
                    }`}
                  >
                    <p className="mt-6 text-base text-[#8B909A] leading-relaxed max-w-2xl">
                      We eliminate repetitive operations by chaining intelligent AI agents, custom webhooks, ERP/CRM syncs, and financial data pipelines into seamless autonomous engines.
                    </p>

                    <div className="mt-8 rounded-2xl bg-[#111419]/80 border border-[#232830] p-6 flex flex-col gap-4">
                      <div className="p-4 rounded-xl bg-[#16191E] border border-[#232830]/70 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          <div className="w-9 h-9 rounded-xl bg-[#6366F1]/20 border border-[#6366F1]/30 flex items-center justify-center text-[#6366F1]">
                            <span className="material-symbols-outlined text-[18px]">webhook</span>
                          </div>
                          <div>
                            <div className="text-xs font-mono text-[#555A64]">
                              EVENT TRIGGER • Billing &amp; Inbound
                            </div>
                            <div className="text-xs font-semibold text-white mt-0.5">
                              Stripe Checkout Completed &amp; CRM Deal Created
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-[#06B6D4] font-semibold flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          0.1s
                        </span>
                      </div>

                      <div className="w-0.5 h-4 bg-[#6366F1]/40 ml-8"></div>

                      <div className="p-4 rounded-xl bg-[#16191E] border border-[#232830]/70 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          <div className="w-9 h-9 rounded-xl bg-[#06B6D4]/20 border border-[#06B6D4]/30 flex items-center justify-center text-[#06B6D4]">
                            <span className="material-symbols-outlined text-[18px]">psychology</span>
                          </div>
                          <div>
                            <div className="text-xs font-mono text-[#555A64]">
                              AGENT STEP • AI Extraction &amp; Routing
                            </div>
                            <div className="text-xs font-semibold text-white mt-0.5">
                              Auto-generate tenant credentials, parse SLA contracts &amp; invite users
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-[#06B6D4] font-semibold flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          0.8s
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/30 flex flex-col gap-1.5 text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-[#06B6D4] font-semibold flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[14px]">sync</span>
                              Slack &amp; Notion Sync
                            </span>
                            <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>
                          </div>
                          <div className="text-xs text-white font-medium mt-1">
                            Dispatch account war-room notification &amp; generate onboarding doc
                          </div>
                          <div className="text-[11px] text-[#555A64]">Zero manual copy-paste required</div>
                        </div>

                        <div className="p-4 rounded-xl bg-[#16191E] border border-[#232830]/80 flex flex-col gap-1.5 text-left opacity-75">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-[#555A64] flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[14px]">database</span>
                              Data Warehouse Load
                            </span>
                            <span className="w-2 h-2 rounded-full bg-[#555A64]"></span>
                          </div>
                          <div className="text-xs text-[#8B909A] font-medium mt-1">
                            Stream raw event telemetry to Snowflake &amp; BigQuery
                          </div>
                          <div className="text-[11px] text-[#555A64]">Real-time retention metric updating</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              )}
            </ServiceCardWrapper>

            {/* SERVICE CARD 5 */}
            <ServiceCardWrapper
              id="service-5"
              onVisible={setActiveService}
              initialExpanded={true}
            >
              {({ isExpanded, toggle }) => (
                <article className="bg-[#16191E]/85 border border-[#232830] rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden transition-all duration-300">
                  <div className="absolute -top-16 -right-16 w-72 h-72 bg-[#8B5CF6]/10 rounded-full blur-3xl pointer-events-none"></div>

                  <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#232830]/60 cursor-pointer select-none group/header"
                    onClick={toggle}
                  >
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30">
                          SERVICE 05
                        </span>
                        <span className="text-xs font-mono text-[#555A64] tracking-wider">
                          AGENCY ENGAGEMENT
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20">
                          {isExpanded ? 'Full View' : 'Half View'}
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white group-hover/header:text-[#8B5CF6] transition-colors">
                        Dedicated Engineering Sprints &amp; SLAs
                      </h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex font-mono text-xs text-[#8B5CF6] bg-[#8B5CF6]/10 px-3.5 py-1.5 rounded-full border border-[#8B5CF6]/20 font-semibold">
                        Bi-Weekly Deployments
                      </div>
                      <button
                        aria-label="Toggle section expansion"
                        className="w-10 h-10 rounded-xl bg-[#111419] border border-[#232830] hover:border-[#8B5CF6]/50 text-[#8B909A] hover:text-white flex items-center justify-center transition-all shadow-sm"
                      >
                        <span
                          className={`material-symbols-outlined text-[22px] transition-transform duration-300 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        >
                          keyboard_arrow_down
                        </span>
                      </button>
                    </div>
                  </div>

                  <div
                    className={`transition-all duration-400 overflow-hidden ${
                      isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-[250px] opacity-90'
                    }`}
                  >
                    <p className="mt-6 text-base text-[#8B909A] leading-relaxed max-w-2xl">
                      Augment or replace internal product teams with battle-tested senior engineers, UI/UX systems designers, and DevOps leads running 14-day agile release cycles under enterprise SLAs.
                    </p>

                    <div className="mt-8 rounded-2xl bg-[#0B0D10] border border-[#232830]/80 p-6 flex flex-col gap-4 font-mono text-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-[#232830]/60">
                        <div className="flex items-center gap-2.5">
                          <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-[#06B6D4]"></div>
                          </div>
                          <span className="text-[#8B909A] ml-2">kinetic-squad-manifest.json</span>
                        </div>
                        <span className="text-[#06B6D4]">Senior Squad Active</span>
                      </div>
                      <div className="space-y-2 text-[#8B909A] pt-1 leading-relaxed">
                        <div className="flex items-center gap-2 text-[#F4F5F6]">
                          <span className="text-[#06B6D4] font-bold">&gt;</span>
                          <span className="text-white">
                            squad.runSprintAudit(&#123; cadence: &quot;bi-weekly&quot;, team: &quot;4x Senior Staff&quot; &#125;)
                          </span>
                        </div>
                        <div className="pl-4 border-l border-[#6366F1]/40 space-y-1.5">
                          <div className="text-[#555A64]">{'// Continuous quality gates on every PR:'}</div>
                          <div className="text-[#06B6D4]">✔ Automated unit, integration &amp; Playwright E2E suites</div>
                          <div className="text-[#06B6D4]">✔ Zero security vulnerabilities (Dependabot + Snyk)</div>
                          <div className="text-[#06B6D4]">✔ Figma tokens synchronized with Tailwind design system</div>
                          <div className="text-[#06B6D4] font-medium pt-1">
                            ✓ Sprint #24 approved: 18 features shipped directly to production.
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-[#232830]/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px]">
                        <div>
                          <div className="text-[#555A64]">RESPONSE SLA</div>
                          <div className="text-white font-semibold font-mono mt-0.5 text-sm">
                            &lt; 1 Hour Critical
                          </div>
                        </div>
                        <div>
                          <div className="text-[#555A64]">SECURITY</div>
                          <div className="text-white font-semibold mt-0.5">SOC 2 + ISO 27001</div>
                        </div>
                        <div>
                          <div className="text-[#555A64]">IP RIGHTS</div>
                          <div className="text-white font-semibold mt-0.5">100% Client Owned</div>
                        </div>
                        <div>
                          <div className="text-[#555A64]">WARRANTY</div>
                          <div className="text-white font-semibold mt-0.5">90-Day Bug Free</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              )}
            </ServiceCardWrapper>

            {/* End of Services Final Conversion Banner */}
            <div className="bg-gradient-to-tr from-[#16191E] via-[#111419] to-[#16191E] border border-[#232830] rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden shadow-2xl">
              <div
                className="absolute inset-0 pointer-events-none opacity-80"
                style={{
                  background:
                    'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.05) 50%, transparent 75%)',
                }}
              ></div>
              <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-[#6366F1]/15 border border-[#6366F1]/30 flex items-center justify-center text-[#6366F1] shadow-lg shadow-indigo-500/20">
                  <span className="material-symbols-outlined text-[30px]">rocket_launch</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Ready to accelerate your product roadmap?
                </h3>
                <p className="text-[#8B909A] text-sm leading-relaxed">
                  Partner with a specialized engineering squad that turns complex web, mobile, and software concepts into scalable market leaders.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md pt-3">
                  <a
                    className="w-full sm:flex-1 h-12 bg-[#6366F1] hover:bg-[#8B5CF6] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                    href="#contact"
                  >
                    <span>Schedule Technical Discovery</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </a>
                  <a
                    className="w-full sm:flex-1 h-12 bg-[#16191E] hover:bg-[#1C2027] border border-[#232830] text-white font-semibold text-xs rounded-xl flex items-center justify-center transition-all"
                    href="#services"
                  >
                    <span>Explore Portfolio</span>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Desktop Enterprise Footer */}
      <footer className="border-t border-[#232830] bg-[#0B0D10] mt-20 pt-12 pb-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col gap-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
            <div className="col-span-2 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#6366F1] flex items-center justify-center p-0.5">
                  <span className="material-symbols-outlined text-white text-[16px] font-bold">
                    terminal
                  </span>
                </div>
                <span className="font-bold text-white tracking-tight">KINETIC / STUDIO</span>
              </div>
              <p className="text-xs text-[#8B909A] max-w-sm leading-relaxed">
                The digital product studio engineering high-performance websites, custom SaaS platforms, mobile applications, and intelligent business automations.
              </p>
              <div className="flex items-center gap-4 text-xs font-mono text-[#555A64]">
                <span>© 2026 Kinetic Studio Inc.</span>
                <span>•</span>
                <span>All rights reserved.</span>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
                Services
              </span>
              <button
                onClick={() => scrollToService('service-1')}
                className="text-left text-xs text-[#8B909A] hover:text-white transition-colors"
              >
                Web Architecture
              </button>
              <button
                onClick={() => scrollToService('service-2')}
                className="text-left text-xs text-[#8B909A] hover:text-white transition-colors"
              >
                Custom Software
              </button>
              <button
                onClick={() => scrollToService('service-3')}
                className="text-left text-xs text-[#8B909A] hover:text-white transition-colors"
              >
                Mobile Applications
              </button>
              <button
                onClick={() => scrollToService('service-4')}
                className="text-left text-xs text-[#8B909A] hover:text-white transition-colors"
              >
                Business Automations
              </button>
              <button
                onClick={() => scrollToService('service-5')}
                className="text-left text-xs text-[#8B909A] hover:text-white transition-colors"
              >
                Dedicated Sprints
              </button>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
                Tech Stack
              </span>
              <a className="text-xs text-[#8B909A] hover:text-white transition-colors" href="#">
                Next.js &amp; React
              </a>
              <a className="text-xs text-[#8B909A] hover:text-white transition-colors" href="#">
                TypeScript &amp; Node.js
              </a>
              <a className="text-xs text-[#8B909A] hover:text-white transition-colors" href="#">
                Swift &amp; Flutter
              </a>
              <a className="text-xs text-[#8B909A] hover:text-white transition-colors" href="#">
                PostgreSQL &amp; Redis
              </a>
              <a className="text-xs text-[#8B909A] hover:text-white transition-colors" href="#">
                Cloudflare &amp; AWS
              </a>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
                Client Engagement
              </span>
              <a className="text-xs text-[#8B909A] hover:text-white transition-colors" href="#contact">
                Schedule Discovery
              </a>
              <a className="text-xs text-[#8B909A] hover:text-white transition-colors" href="#">
                Enterprise SLAs
              </a>
              <a className="text-xs text-[#8B909A] hover:text-white transition-colors" href="#">
                SOC 2 Compliance
              </a>
              <a className="text-xs text-[#8B909A] hover:text-white transition-colors" href="#">
                Client Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
