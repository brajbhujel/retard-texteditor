import Link from 'next/link';
import Script from 'next/script';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

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
              <h1>A block editor you install like any other package.</h1>
              <p className="hero__lead">
                Plain JavaScript. Notion-like blocks. Mount it in a holder, get structured JSON back.
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
            <aside className="hero__panel" aria-label="Animated writing preview">
              <div className="hero__panel-label">
                <span>Demo reel</span>
                <span className="status-pill">auto-typing</span>
              </div>
              <div id="hero-editor" />
              <p className="hero__panel-note">
                Not interactive on purpose. The real thing is in the{' '}
                <Link href="/playground">playground</Link>.
              </p>
            </aside>
          </div>
        </section>

        <section className="section section--tight">
          <div className="section__inner install">
            <div>
              <p className="section__eyebrow">Install</p>
              <h2>Three lines. That is the whole script.</h2>
              <p className="section__copy">
                Styles and dialogs ship with the package. Selection toolbar only. No sticky chrome.
              </p>
              <Link className="button button--ghost" href="/docs">
                Getting started
              </Link>
            </div>
            <pre>
              <code>
                <span className="c">npm install retard-texteditor</span>
                {'\n\n'}
                <span className="k">import</span> RetardEditor <span className="k">from</span>{' '}
                <span className="c">'retard-texteditor'</span>;
                {'\n\n'}
                <span className="k">const</span> editor = <span className="k">new</span> RetardEditor(
                {'{'} holder: <span className="c">'editor'</span> {'}'});
              </code>
            </pre>
          </div>
        </section>

        <section className="section">
          <div className="section__inner">
            <p className="section__eyebrow">Why this exists</p>
            <h2>Built to drop into your app, not replace it.</h2>
            <p className="section__copy">Use it in a form, a CMS field, or a writing surface. Keep your own chrome.</p>
            <div className="feature-grid">
              <article className="feature">
                <h3>Own engine</h3>
                <p>Independent block model. Slash menu, drag handles, nested lists.</p>
              </article>
              <article className="feature">
                <h3>Selection toolbar</h3>
                <p>Format appears when you select text. No sticky horizontal bar.</p>
              </article>
              <article className="feature">
                <h3>JSON in, JSON out</h3>
                <p>Familiar blocks array. Export helpers for HTML and Markdown.</p>
              </article>
              <article className="feature">
                <h3>Zero npm dependencies</h3>
                <p>ES modules, TypeScript declarations, UMD for CDN.</p>
              </article>
              <article className="feature">
                <h3>18 block types</h3>
                <p>Headings, lists, tables, code, embeds, attachments, toggles, and more.</p>
              </article>
              <article className="feature">
                <h3>Own your UI</h3>
                <p>
                  Set <code>defaults: false</code> when you need custom uploads.
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <Script src="/hero-preview.js" strategy="afterInteractive" />
    </>
  );
}
