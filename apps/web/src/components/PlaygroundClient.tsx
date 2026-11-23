'use client';

import dynamic from 'next/dynamic';

const EditorPlayground = dynamic(
  () => import('@/components/EditorPlayground').then((m) => m.EditorPlayground),
  {
    ssr: false,
    loading: () => <div className="pg-loading">Loading editor…</div>
  }
);

export function PlaygroundClient() {
  return <EditorPlayground />;
}
