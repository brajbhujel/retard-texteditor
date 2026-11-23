import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <span>retard-texteditor · MIT</span>
        <span>
          <Link href="/playground">Playground</Link>
          {' · '}
          <Link href="/docs/api">API</Link>
          {' · '}
          <a href="https://github.com/brajbhujel/retard-texteditor">GitHub</a>
        </span>
      </div>
    </footer>
  );
}
