import { ArrowCta } from '@/components/ui/ArrowCta';
import { CodeBlock } from '@/components/CodeBlock';
import { Reveal } from '@/components/motion/Reveal';
import { GITHUB_ISSUES, GITHUB_REPO } from '@/lib/site';

export function ContributeBand() {
  return (
    <section className="section section--band">
      <div className="section__inner">
        <Reveal>
          <p className="section__eyebrow">Contribute</p>
          <h2>Repo, issues, PRs.</h2>
        </Reveal>
        <div className="contribute-band">
          <Reveal className="contribute-band__main" delay={0.05}>
            <div className="bezel">
              <div className="bezel__inner contribute-band__panel">
                <h3>Local loop</h3>
                <CodeBlock>{`git clone ${GITHUB_REPO}.git
cd retard-texteditor
npm install
npm test
npm run build
npm run dev`}</CodeBlock>
              </div>
            </div>
          </Reveal>
          <div className="contribute-band__side">
            <Reveal delay={0.1}>
              <div className="contribute-link">
                <h3>Source</h3>
                <p>Browse the package and site code.</p>
                <ArrowCta href={GITHUB_REPO} external>
                  GitHub
                </ArrowCta>
              </div>
            </Reveal>
            <Reveal delay={0.14}>
              <div className="contribute-link">
                <h3>Issues</h3>
                <p>Bugs and feature requests.</p>
                <ArrowCta href={GITHUB_ISSUES} variant="ghost" external>
                  Open issues
                </ArrowCta>
              </div>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="contribute-link">
                <h3>Pull requests</h3>
                <p>Fork, branch off main, keep the diff focused.</p>
                <ArrowCta href={`${GITHUB_REPO}/pulls`} variant="ghost" external>
                  Pull requests
                </ArrowCta>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
