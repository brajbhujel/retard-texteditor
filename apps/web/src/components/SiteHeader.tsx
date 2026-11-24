import Link from 'next/link';
import { GITHUB_REPO } from '@/lib/site';

type Props = {
  current?: 'home' | 'playground';
};

export function SiteHeader({ current }: Props) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand" href="/">
          retard<span className="brand__dot">.</span>
          <span className="brand__tag">editor</span>
        </Link>
        <nav className="nav" aria-label="Primary">
          <Link href="/playground" aria-current={current === 'playground' ? 'page' : undefined}>
            Playground
          </Link>
          <a href={GITHUB_REPO} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <Link className="button button--primary button--small" href="/playground">
            Try it
          </Link>
        </nav>
      </div>
    </header>
  );
}
