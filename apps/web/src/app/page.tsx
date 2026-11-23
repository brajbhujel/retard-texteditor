import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { HeroDemo } from '@/components/HeroDemo';
import { Section } from '@/components/Section';
import { CodeBlock } from '@/components/CodeBlock';
import { FaqList } from '@/components/FaqList';
import { GITHUB_ISSUES, GITHUB_NEW_ISSUE, GITHUB_REPO, NPM_PACKAGE } from '@/lib/site';

export default function HomePage() {
  return (
    <>
      <SiteHeader current="home" />
      <main>
        <section className="hero">
          <div className="hero__inner">
            <div>
              <p className="hero__brand">
                retard<span>.</span>
              </p>
              <h1>Block editor. Install and mount.</h1>
              <p className="hero__lead">
                Slash menu, drag handles, selection toolbar, structured JSON. Works in React, Vue,
                Vite, vanilla, and CDN setups.
              </p>
              <div className="hero__actions">
                <Link className="button button--primary" href="/playground">
                  Open playground
                </Link>
                <Link className="button button--ghost" href="/docs">
                  Read the docs
                </Link>
              </div>
            </div>
            <aside className="hero__panel" aria-label="Writing preview">
              <div className="hero__panel-label">
                <span>Demo reel</span>
                <span className="status-pill">auto</span>
              </div>
              <HeroDemo />
              <p className="hero__panel-note">
                Preview only. The real editor is in the <Link href="/playground">playground</Link>.
              </p>
            </aside>
          </div>
        </section>

        <section className="section section--tight">
          <div className="section__inner install">
            <div>
              <p className="section__eyebrow">Install</p>
              <h2>Three lines.</h2>
              <p className="section__copy">
                Same constructor everywhere. Framework recipes live in the docs.
              </p>
              <div className="hero__actions">
                <Link className="button button--ghost" href="/docs/install">
                  Install guide
                </Link>
                <a className="button button--ghost" href={NPM_PACKAGE} target="_blank" rel="noreferrer">
                  npm
                </a>
              </div>
            </div>
            <CodeBlock>{`npm install retard-texteditor

import RetardEditor from 'retard-texteditor';

const editor = new RetardEditor({ holder: 'editor' });`}</CodeBlock>
          </div>
        </section>

        <Section
          eyebrow="Integrate"
          title="React, Vite, Vue, CDN."
          copy="Pick a stack. The API stays the same."
        >
          <div className="stack-grid">
            <article className="stack-card">
              <h3>React + Vite</h3>
              <CodeBlock>{`// App.tsx
import { useEffect, useRef } from 'react';

export function Editor() {
  const ref = useRef(null);
  useEffect(() => {
    let editor;
    let dead = false;
    (async () => {
      const { default: RetardEditor } = await import('retard-texteditor');
      if (dead || !ref.current) return;
      editor = new RetardEditor({ holder: ref.current });
      await editor.isReady;
    })();
    return () => { dead = true; editor?.destroy(); };
  }, []);
  return <div ref={ref} />;
}`}</CodeBlock>
              <Link href="/docs/react">React docs →</Link>
            </article>
            <article className="stack-card">
              <h3>Vue</h3>
              <CodeBlock>{`<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import RetardEditor from 'retard-texteditor';

const holder = ref(null);
let editor;

onMounted(async () => {
  editor = new RetardEditor({ holder: holder.value });
  await editor.isReady;
});
onBeforeUnmount(() => editor?.destroy());
</script>

<template><div ref="holder" /></template>`}</CodeBlock>
              <Link href="/docs/vue">Vue docs →</Link>
            </article>
            <article className="stack-card">
              <h3>CDN</h3>
              <CodeBlock>{`<script src="blok-editor.iife.js"></script>
<script src="retard-editor.umd.js"></script>
<script>
  new RetardEditor({ holder: 'editor' });
</script>`}</CodeBlock>
              <Link href="/docs/cdn">CDN docs →</Link>
            </article>
          </div>
        </Section>

        <Section eyebrow="Surface" title="What ships with the package." copy="Keep your app chrome. The editor fills the holder.">
          <div className="feature-grid">
            <article className="feature">
              <h3>Blocks</h3>
              <p>Headings, lists, tables, code, media, toggles, and more.</p>
            </article>
            <article className="feature">
              <h3>Selection toolbar</h3>
              <p>Formatting appears when text is selected.</p>
            </article>
            <article className="feature">
              <h3>Slash + drag</h3>
              <p>Type / to insert. Drag the handle to reorder.</p>
            </article>
            <article className="feature">
              <h3>JSON out</h3>
              <p>
                <code>save()</code> returns a blocks document.
              </p>
            </article>
            <article className="feature">
              <h3>TypeScript</h3>
              <p>Declarations included. No extra types package.</p>
            </article>
            <article className="feature">
              <h3>Theme tokens</h3>
              <p>Light theme by default. Override CSS variables as needed.</p>
            </article>
          </div>
        </Section>

        <Section eyebrow="FAQ" title="Common questions.">
          <FaqList
            items={[
              {
                q: 'Does it work with Next.js?',
                a: (
                  <p>
                    Yes. Mount it only on the client with a dynamic import inside{' '}
                    <code>useEffect</code>, or use <code>next/dynamic</code> with{' '}
                    <code>ssr: false</code>. See the <Link href="/docs/react">React guide</Link>.
                  </p>
                )
              },
              {
                q: 'Where does the document get saved?',
                a: (
                  <p>
                    Nowhere by default. Use <code>onChange</code> or <code>save()</code> and store the
                    JSON yourself.
                  </p>
                )
              },
              {
                q: 'Can I use it without a bundler?',
                a: (
                  <p>
                    Yes. Load the UMD scripts from CDN. See the <Link href="/docs/cdn">CDN guide</Link>.
                  </p>
                )
              },
              {
                q: 'How do I report a bug?',
                a: (
                  <p>
                    Open an issue on GitHub:{' '}
                    <a href={GITHUB_NEW_ISSUE} target="_blank" rel="noreferrer">
                      new issue
                    </a>
                    .
                  </p>
                )
              }
            ]}
          />
        </Section>

        <Section
          eyebrow="Contribute"
          title="Issues, PRs, and the repo."
          copy="Bug reports and pull requests are welcome."
        >
          <div className="contribute">
            <div className="contribute__card">
              <h3>GitHub</h3>
              <p>Source, releases, and discussions live in the repository.</p>
              <a className="button button--primary button--small" href={GITHUB_REPO} target="_blank" rel="noreferrer">
                Open repo
              </a>
            </div>
            <div className="contribute__card">
              <h3>Issues</h3>
              <p>Search existing tickets before opening a new one.</p>
              <a className="button button--ghost button--small" href={GITHUB_ISSUES} target="_blank" rel="noreferrer">
                View issues
              </a>
            </div>
            <div className="contribute__card">
              <h3>Pull requests</h3>
              <p>
                Fork, branch, open a PR against <code>main</code>. Keep changes focused.
              </p>
              <a className="button button--ghost button--small" href={`${GITHUB_REPO}/pulls`} target="_blank" rel="noreferrer">
                View PRs
              </a>
            </div>
          </div>
          <div className="workflow">
            <p className="section__eyebrow">Suggested workflow</p>
            <CodeBlock>{`git clone https://github.com/brajbhujel/retard-texteditor.git
cd retard-texteditor
npm install
npm test
npm run build
npm run dev`}</CodeBlock>
          </div>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
