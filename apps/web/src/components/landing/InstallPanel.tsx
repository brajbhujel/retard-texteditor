import Link from 'next/link';
import { CodeBlock } from '@/components/CodeBlock';
import { Reveal } from '@/components/motion/Reveal';
import { NPM_PACKAGE } from '@/lib/site';

export function InstallPanel() {
  return (
    <section className="section section--tight">
      <div className="section__inner install-split">
        <Reveal className="install-split__copy">
          <p className="section__eyebrow">Install</p>
          <h2>One package. One mount.</h2>
          <p className="section__copy">
            Add it to React, Vite, Vue, or a plain script tag. Same constructor.
          </p>
          <div className="hero__actions">
            <Link className="button button--ghost" href="/docs/install">
              Install guide
            </Link>
            <a className="button button--ghost" href={NPM_PACKAGE} target="_blank" rel="noreferrer">
              npm package
            </a>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="bezel">
            <div className="bezel__inner">
              <CodeBlock>{`npm install retard-texteditor

import RetardEditor from 'retard-texteditor';

const editor = new RetardEditor({
  holder: 'editor'
});`}</CodeBlock>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
