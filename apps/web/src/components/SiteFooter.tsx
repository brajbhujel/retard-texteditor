import Link from 'next/link';
import { GITHUB_ISSUES, GITHUB_REPO, NPM_PACKAGE } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <span>retard-texteditor · MIT</span>
        <span className="site-footer__links">
          <Link href="/playground">Playground</Link>
          <a href={NPM_PACKAGE} target="_blank" rel="noreferrer">
            npm
          </a>
          <a href={GITHUB_REPO} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href={GITHUB_ISSUES} target="_blank" rel="noreferrer">
            Issues
          </a>
        </span>
      </div>
    </footer>
  );
}
