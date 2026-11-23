import Link from 'next/link';
import { FaqList } from '@/components/FaqList';
import { Reveal } from '@/components/motion/Reveal';
import { GITHUB_NEW_ISSUE } from '@/lib/site';

export function LandingFaq() {
  return (
    <section className="section">
      <div className="section__inner section__inner--narrow">
        <Reveal>
          <p className="section__eyebrow">FAQ</p>
          <h2>Straight answers.</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <FaqList
            items={[
              {
                q: 'Does it work with Next.js?',
                a: (
                  <p>
                    Yes. Mount on the client with a dynamic import in <code>useEffect</code>, or{' '}
                    <code>next/dynamic</code> with <code>ssr: false</code>. See the{' '}
                    <Link href="/docs/react">React guide</Link>.
                  </p>
                )
              },
              {
                q: 'Where is content saved?',
                a: (
                  <p>
                    Nowhere by default. Use <code>onChange</code> or <code>save()</code> and store the
                    JSON yourself.
                  </p>
                )
              },
              {
                q: 'Can I load it from a CDN?',
                a: (
                  <p>
                    Yes. See the <Link href="/docs/cdn">CDN guide</Link>.
                  </p>
                )
              },
              {
                q: 'How do I report a bug?',
                a: (
                  <p>
                    Open a GitHub issue:{' '}
                    <a href={GITHUB_NEW_ISSUE} target="_blank" rel="noreferrer">
                      new issue
                    </a>
                    .
                  </p>
                )
              }
            ]}
          />
        </Reveal>
      </div>
    </section>
  );
}
