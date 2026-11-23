'use client';

import { useEffect, useRef, useState } from 'react';
import RetardEditor from 'retard-texteditor';
import { SAMPLE_DOC } from '../lib/sample-doc';

type EditorInstance = {
  destroy(): void;
  getData(): unknown;
  clear(): Promise<void>;
  isReady: Promise<unknown>;
};

export function EditorPlayground() {
  const holderRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorInstance | null>(null);
  const [json, setJson] = useState('Loading…');
  const [status, setStatus] = useState('ready');

  useEffect(() => {
    let cancelled = false;
    const storageKey = 'retard-playground-doc';
    const holder = holderRef.current;
    if (!holder) return;

    let data: unknown = SAMPLE_DOC;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) data = JSON.parse(raw);
    } catch {
      /* ignore */
    }

    const editor = new RetardEditor({
      holder,
      data: data as never,
      autofocus: true,
      placeholder: 'Type / for blocks…',
      onChange: (_instance: unknown, next: unknown) => {
        const text = JSON.stringify(next, null, 2);
        setJson(text);
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
          setStatus('saved locally');
        } catch {
          setStatus('unsaved · storage blocked');
        }
      }
    }) as unknown as EditorInstance;

    editorRef.current = editor;
    editor.isReady
      .then(() => {
        if (!cancelled) setJson(JSON.stringify(editor.getData(), null, 2));
      })
      .catch(() => {
        if (!cancelled) setJson('Editor failed to start');
      });

    return () => {
      cancelled = true;
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, []);

  return (
    <>
      <div className="playground-bar">
        <div>
          <h1>Playground</h1>
          <p>Same package consumers install. Edits stay in this browser tab.</p>
        </div>
        <div className="playground-actions">
          <span className="status-pill" id="save-status">
            {status}
          </span>
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={() => {
              localStorage.removeItem('retard-playground-doc');
              location.reload();
            }}
          >
            Reset sample
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
            className="button button--primary button--small"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(json);
                setStatus('json copied');
              } catch {
                setStatus('copy failed');
              }
            }}
          >
            Copy JSON
          </button>
        </div>
      </div>
      <div className="playground-layout">
        <div className="editor-stage">
          <div id="editor" ref={holderRef} />
        </div>
        <aside className="side-panel" aria-label="Document JSON">
          <h2>Saved output</h2>
          <pre>{json}</pre>
        </aside>
      </div>
    </>
  );
}
