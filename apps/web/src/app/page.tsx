import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { HeroDemo } from '@/components/HeroDemo';
import { ArrowCta } from '@/components/ui/ArrowCta';
import { Reveal } from '@/components/motion/Reveal';
import { InstallPanel } from '@/components/landing/InstallPanel';
import { StackStrip } from '@/components/landing/StackStrip';
import { CapabilityBoard } from '@/components/landing/CapabilityBoard';
import { LandingFaq } from '@/components/landing/LandingFaq';
import { ContributeBand } from '@/components/landing/ContributeBand';

export default function HomePage() {
  return (
    <>
      <div className="grain" aria-hidden />
      <SiteHeader current="home" />
      <main>
        <section className="hero hero--split">
          <div className="hero__inner">
            <Reveal className="hero__copy">
              <p className="hero__eyebrow">npm · block editor</p>
              <p className="hero__brand">
                retard<span>.</span>
              </p>
              <h1>Install once. Mount a holder. Ship JSON.</h1>
              <p className="hero__lead">
                Slash menu, drag handles, selection toolbar. Works in React, Vite, Vue, TypeScript,
                and CDN setups.
              </p>
              <div className="hero__actions">
                <ArrowCta href="/playground">Open playground</ArrowCta>
                <Link className="button button--ghost" href="/docs">
                  Documentation
                </Link>
              </div>
            </Reveal>
            <Reveal className="hero__visual" delay={0.1}>
              <div className="bezel bezel--hero">
                <div className="bezel__inner">
                  <div className="hero__panel-label">
                    <span>Live preview</span>
                    <span className="status-pill">typing</span>
                  </div>
                  <HeroDemo />
                  <p className="hero__panel-note">
                    Preview only — full editor in the{' '}
                    <Link href="/playground">playground</Link>.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <InstallPanel />
        <StackStrip />
        <CapabilityBoard />
        <LandingFaq />
        <ContributeBand />
      </main>
      <SiteFooter />
    </>
  );
}
