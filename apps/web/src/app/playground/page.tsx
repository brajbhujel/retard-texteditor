import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { PlaygroundClient } from '@/components/PlaygroundClient';

export const metadata: Metadata = {
  title: 'Playground',
  description: 'Try retard-texteditor in the browser.'
};

export default function PlaygroundPage() {
  return (
    <div className="playground-page">
      <SiteHeader current="playground" />
      <main className="pg-shell">
        <PlaygroundClient />
      </main>
    </div>
  );
}
