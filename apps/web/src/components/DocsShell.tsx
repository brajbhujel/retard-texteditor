import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { DocsSidebar } from '@/components/DocsSidebar';

export function DocsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="docs-page">
      <SiteHeader current="docs" />
      <div className="docs-frame">
        <DocsSidebar />
        <article className="docs-article">{children}</article>
      </div>
      <SiteFooter />
    </div>
  );
}
