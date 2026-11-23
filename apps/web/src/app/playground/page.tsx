import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { EditorPlayground } from '@/components/EditorPlayground';

export const metadata: Metadata = {
  title: 'Playground',
  description: 'Try retard-texteditor in the browser. Slash menu, drag blocks, watch JSON update.'
};

export default function PlaygroundPage() {
  return (
    <div className="playground-page">
      <SiteHeader current="playground" />
      <main className="shell">
        <EditorPlayground />
      </main>
    </div>
  );
}
