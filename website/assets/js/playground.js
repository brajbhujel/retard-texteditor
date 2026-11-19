(() => {
  const holder = document.getElementById('editor');
  const jsonOut = document.getElementById('json-out');
  const status = document.getElementById('save-status');
  if (!window.RetardEditor) {
    holder.innerHTML = '<p>Build the package first: <code>npm run build</code></p>';
    return;
  }

  const storageKey = 'retard-playground-doc';
  let editor;

  function readStored() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function writeJson(data) {
    jsonOut.textContent = JSON.stringify(data, null, 2);
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      status.textContent = 'saved locally';
    } catch {
      status.textContent = 'unsaved · storage blocked';
    }
  }

  function mount(data) {
    editor?.destroy();
    editor = new RetardEditor({
      holder,
      data: data || window.RETARD_SAMPLE_DOC,
      autofocus: true,
      placeholder: 'Type / for blocks…',
      onChange: (_, next) => writeJson(next)
    });
    writeJson(editor.getData());
  }

  document.getElementById('btn-reset').addEventListener('click', () => {
    localStorage.removeItem(storageKey);
    mount(window.RETARD_SAMPLE_DOC);
  });

  document.getElementById('btn-clear').addEventListener('click', async () => {
    await editor.clear();
    writeJson(editor.getData());
  });

  document.getElementById('btn-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(jsonOut.textContent);
      status.textContent = 'json copied';
    } catch {
      status.textContent = 'copy failed';
    }
  });

  mount(readStored() || window.RETARD_SAMPLE_DOC);
})();
