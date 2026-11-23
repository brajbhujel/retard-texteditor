'use client';

import { useEffect, useRef, useState } from 'react';
import { SAMPLE_DOC } from '@/lib/sample-doc';

type EditorInstance = {
  destroy(): void;
  getData(): unknown;
  clear(): Promise<void>;
  load(data: unknown): Promise<void>;
  isReady: Promise<unknown>;
};

const STORAGE_KEY = 'retard-playground-doc';

export function EditorPlayground() {
  const holderRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorInstance | null>(null);
  const [json, setJson] = useState('Mounting…');
  const [status, setStatus] = useState('booting');
  const [panelOpen, setPanelOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const holder = holderRef.current;
    if (!holder) return;

    (async () => {
      try {
        const mod = await import('retard-texteditor');
        if (cancelled || !holderRef.current) return;

        let data: unknown = SAMPLE_DOC;
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) data = JSON.parse(raw);
        } catch {
          /* keep sample */
        }

        const RetardEditor = mod.default;
        const editor = new RetardEditor({
          holder: holderRef.current,
          data: data as never,
          autofocus: true,
          theme: 'light',
          placeholder: 'Type / for blocks…',
          onChange: (_instance: unknown, next: unknown) => {
            const text = JSON.stringify(next, null, 2);
            setJson(text);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
              setStatus('saved');
            } catch {
              setStatus('blocked');
            }
          }
        }) as unknown as EditorInstance;

        editorRef.current = editor;
        await editor.isReady;
        if (cancelled) {
          editor.destroy();
          return;
        }
        setJson(JSON.stringify(editor.getData(), null, 2));
        setStatus('ready');
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to mount editor');
          setStatus('error');
          setJson('Editor failed to start');
        }
      }
    })();

    return () => {
      cancelled = true;
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, []);

  return (
    <div className="pg">
      <header className="pg__bar">
        <div className="pg__titles">
          <h1>Playground</h1>
          <p>Live package mount. Edits stay in this tab.</p>
        </div>
        <div className="pg__actions">
          <span className={`pg__status pg__status--${status}`}>{status}</span>
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={async () => {
              localStorage.removeItem(STORAGE_KEY);
              const ed = editorRef.current;
              if (!ed) {
                location.reload();
                return;
              }
              await ed.load(SAMPLE_DOC);
              setJson(JSON.stringify(ed.getData(), null, 2));
              setStatus('reset');
            }}
          >
            Reset
          </button>
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={async () => {
              await editorRef.current?.clear();
              if (editorRef.current) setJson(JSON.stringify(editorRef.current.getData(), null, 2));
            }}
          >
            Clear
          </button>
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={() => setPanelOpen((v) => !v)}
          >
            {panelOpen ? 'Hide JSON' : 'Show JSON'}
          </button>
          <button
            type="button"
            className="button button--primary button--small"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(json);
                setStatus('copied');
              } catch {
                setStatus('copy failed');
              }
            }}
          >
            Copy JSON
          </button>
        </div>
      </header>

      {error ? <p className="pg__error">{error}</p> : null}

      <div className={`pg__stage ${panelOpen ? 'pg__stage--split' : ''}`}>
        <div className="pg__canvas">
          <div className="pg__page">
            <div id="editor" className="pg__holder" ref={holderRef} />
          </div>
        </div>
        {panelOpen ? (
          <aside className="pg__json" aria-label="Document JSON">
            <div className="pg__json-head">Output</div>
            <pre>{json}</pre>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
