'use client';

import { useEffect, useRef } from 'react';

const BLOCKS = [
  { type: 'heading', text: 'retard-texteditor' },
  { type: 'paragraph', text: 'Install the package. Mount a holder. Save structured JSON.' },
  {
    type: 'checklist',
    items: [
      { text: 'Slash menu to insert blocks', checked: true },
      { text: 'Drag handles to reorder', checked: true },
      { text: 'Selection toolbar for formatting', checked: false }
    ]
  },
  { type: 'quote', text: 'Same API in React, Vue, vanilla, or CDN.', caption: 'docs' }
] as const;

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('aborted', 'AbortError'));
      return;
    }
    const id = window.setTimeout(() => resolve(), ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        reject(new DOMException('aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}

export function HeroDemo() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ac = new AbortController();
    const { signal } = ac;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    root.innerHTML = `
      <div class="fake-editor" aria-hidden="true">
        <div class="fake-editor__body" data-body></div>
      </div>
    `;
    const body = root.querySelector('[data-body]') as HTMLElement;

    async function typeInto(textNode: HTMLElement, caret: HTMLElement, text: string) {
      for (let i = 0; i < text.length; i++) {
        textNode.textContent = text.slice(0, i + 1);
        await sleep(reduce ? 0 : 28 + Math.random() * 18, signal);
      }
      caret.remove();
      await sleep(reduce ? 0 : 280, signal);
    }

    async function typeBlock(block: (typeof BLOCKS)[number]) {
      if (block.type === 'heading') {
        const el = document.createElement('h2');
        el.className = 'fake-block fake-block--heading';
        const text = document.createElement('span');
        const caret = document.createElement('span');
        caret.className = 'fake-caret';
        el.append(text, caret);
        body.append(el);
        await typeInto(text, caret, block.text);
        return;
      }
      if (block.type === 'paragraph') {
        const el = document.createElement('p');
        el.className = 'fake-block fake-block--paragraph';
        const text = document.createElement('span');
        const caret = document.createElement('span');
        caret.className = 'fake-caret';
        el.append(text, caret);
        body.append(el);
        await typeInto(text, caret, block.text);
        return;
      }
      if (block.type === 'checklist') {
        const list = document.createElement('div');
        list.className = 'fake-block fake-block--checklist';
        body.append(list);
        for (const item of block.items) {
          const row = document.createElement('div');
          row.className = 'fake-check' + (item.checked ? ' is-checked' : '');
          const box = document.createElement('span');
          box.className = 'fake-check__box';
          const text = document.createElement('span');
          const caret = document.createElement('span');
          caret.className = 'fake-caret';
          row.append(box, text, caret);
          list.append(row);
          await typeInto(text, caret, item.text);
        }
        return;
      }
      if (block.type === 'quote') {
        const el = document.createElement('blockquote');
        el.className = 'fake-block fake-block--quote';
        const quote = document.createElement('span');
        const caret = document.createElement('span');
        caret.className = 'fake-caret';
        el.append(quote, caret);
        body.append(el);
        await typeInto(quote, caret, block.text);
        const caption = document.createElement('cite');
        caption.textContent = block.caption;
        el.append(caption);
        await sleep(reduce ? 0 : 280, signal);
      }
    }

    (async () => {
      try {
        while (!signal.aborted) {
          body.innerHTML = '';
          for (const block of BLOCKS) await typeBlock(block);
          await sleep(reduce ? 1200 : 2400, signal);
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) throw err;
      }
    })();

    return () => {
      ac.abort();
      root.innerHTML = '';
    };
  }, []);

  return <div id="hero-editor" ref={rootRef} />;
}
