import Link from 'next/link';

type Props = {
  current?: 'home' | 'docs' | 'api' | 'playground';
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
          <Link href="/docs" aria-current={current === 'docs' || current === 'api' ? 'page' : undefined}>
            Docs
          </Link>
          <Link className="nav-hide-sm" href="/docs/api">
            API
          </Link>
          <Link href="/playground" aria-current={current === 'playground' ? 'page' : undefined}>
            Playground
          </Link>
          <Link className="button button--primary button--small" href="/playground">
            Try it
          </Link>
        </nav>
      </div>
    </header>
  );
}
