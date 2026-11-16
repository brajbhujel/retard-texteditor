import { RetardEditor } from './core/editor.js';
import { makeBlock, uid, statistics, blockText, escapeHTML as e, safeURL, embedURL, VERSION, normalizeDocument } from './core/model.js';
import { fromMarkdown, fromHTML, toMarkdown, toHTML } from './core/serialization.js';
import { plainText } from './core/sanitize.js';
import { listDocuments, saveDocument, removeDocument, saveRevision, allRevisions, removeRevision } from './core/storage.js';
import { toolChoices } from './tools/registry.js';
import { icon, button } from './ui/icons.js';
import { dialog, toast, download, formatOnClose } from './ui/dialog.js';
import { welcomeDocument, projectDocument } from './demo.js';
import { linkDialog, colorDialog } from './ui/formatting-dialogs.js';
import { viewFromClick } from './ui/workspace-events.js';

const app = document.getElementById('app');
app.innerHTML = `
<aside class="sidebar" aria-label="Workspace navigation">
  <a href="./index.html" class="brand" aria-label="Retard editor home"><img src="/public/favicon.svg" alt="" width="33" height="33"><span>retard<span class="brand-dot">.</span></span><span class="brand-tag">editor</span></a>
  <button class="workspace-switch" data-action="workspace"><span class="workspace-avatar">P</span><span><strong>Personal workspace</strong><small>A little room to create</small></span>${icon('chevron', 15)}</button>
  <button class="search-launch" data-action="search">${icon('search', 17)}<span>Search anything</span><kbd>⌘ K</kbd></button>
  <nav class="main-navigation"><button class="nav-link active" data-action="documents">${icon('folder')}<span>My documents</span><span class="document-count">2</span></button><button class="nav-link" data-action="tools">${icon('code')}<span>Block library</span><span class="new-label">18</span></button></nav>
  <div class="sidebar-section-label"><span>YOUR DOCUMENTS</span>${button('plus', 'New document', 'new')}</div>
  <div id="document-list" class="document-list"></div>
  <button class="new-document" data-action="new">${icon('plus', 16)}<span>New document</span></button>
  <div class="sidebar-bottom"><div class="sidebar-tip"><span class="tip-icon">${icon('sparkle')}</span><strong>Big ideas. Small beginnings.</strong><p>All you need is a blank page.</p><button data-action="new">Start something new ${icon('arrow', 15)}</button></div>
  <button class="nav-link" data-action="help">${icon('keyboard')}<span>Shortcuts & help</span><kbd>?</kbd></button><div class="profile-row"><span class="profile-avatar">YO</span><span><strong>Your workspace</strong><small>Saved on this device</small></span>${button('moon', 'Switch colour theme', 'theme')}</div></div>
</aside>
<button class="sidebar-backdrop" data-action="close-sidebar" aria-label="Close navigation"></button>
<div class="workspace-main">
  <header class="topbar"><div class="breadcrumbs">${button('panel', 'Toggle sidebar', 'sidebar')}<span class="crumb-folder">My documents</span><span class="crumb-separator">/</span><span id="breadcrumb-title">Welcome</span></div><div class="topbar-actions"><span class="save-status" id="save-status" role="status">${icon('check', 14)}<span>Saved on this device</span></span>${button('undo', 'Undo (⌘Z)', 'undo')}${button('redo', 'Redo (⌘⇧Z)', 'redo')}<span class="action-separator"></span><button class="export-button" data-action="export">${icon('download', 16)}<span>Export</span>${icon('chevron', 13)}</button>${button('more', 'Document options', 'options')}</div></header>
  <div class="editor-topline"><div class="document-badge"><span></span>YOUR SPACE TO CREATE</div><div class="view-tabs" role="tablist" aria-label="Document view"><button class="active" role="tab" aria-selected="true" data-view="write">${icon('text', 14)}Write</button><button role="tab" aria-selected="false" data-view="preview">${icon('eye', 14)}Preview</button><button role="tab" aria-selected="false" data-view="json">${icon('code', 14)}JSON</button></div><button class="focus-button" data-action="focus" title="Focus mode">${icon('expand', 15)}<span>Focus mode</span></button></div>
  <div class="document-layout"><main class="document-canvas">
    <div class="document-cover" id="cover"><div class="cover-grain"></div><div class="cover-orbit orbit-one"></div><div class="cover-orbit orbit-two"></div><div class="cover-orbit orbit-three"></div><div class="cover-sun"></div><div class="cover-caption"><span>A PLACE FOR POSSIBILITY</span><span>Make something<br>that matters.</span></div><span class="cover-asterisk">✳</span></div>
    <div class="document-heading"><div class="document-eyebrow">${icon('book', 16)}<span id="document-type">YOUR WORKSPACE GUIDE</span></div><textarea id="document-title" rows="1" aria-label="Document title" placeholder="Untitled document" spellcheck="true"></textarea><div class="document-meta"><span class="author-mini">Y</span><span>By you</span><span class="meta-dot">·</span><span id="document-date"></span><span class="meta-dot">·</span><span id="reading-time">3 min read</span></div></div>
    <div id="editor"></div><section id="json-view" hidden><div class="json-header"><span>Document data</span><button class="secondary-button" data-action="copy-json">${icon('copy', 14)}Copy JSON</button></div><pre><code id="json-code"></code></pre></section>
  </main><aside class="document-outline" aria-label="Document outline"><div class="outline-heading">ON THIS PAGE</div><nav id="outline-links"></nav><div class="outline-divider"></div><div class="writing-tip">${icon('sparkle', 17)}<strong>A little writing tip</strong><p>Type <kbd>/</kbd> on a new line to add any kind of block.</p><button data-action="tools">Explore the blocks ${icon('arrow', 14)}</button></div><div class="local-note">${icon('check', 14)}<span>Your words, your device.<br>No account needed.</span></div></aside></div>
  <footer class="statusbar"><div><span class="status-dot"></span><span id="word-count">0 words</span><span class="footer-divider">·</span><span id="block-count">0 blocks</span><span class="footer-divider">·</span><span id="character-count">0 characters</span></div><div><span id="mode-label">All changes saved locally</span>${button('keyboard', 'Keyboard shortcuts', 'help')}</div></footer>
</div><input id="import-file" type="file" accept=".json,.md,.markdown,.txt,.html,.htm" hidden>`;

let docs = [], current, editor, mode = 'write', loading = true, saveTimer, lastRevision = 0, persistenceAvailable = true;
let writeQueue = Promise.resolve();
let saveGeneration = 0, openGeneration = 0;
const el = id => document.getElementById(id);
let theme = 'light';
try { theme = localStorage.getItem('retard-theme') || 'light'; } catch {}
document.documentElement.dataset.theme = theme;
function savedStatus(state) {
  const labels = { saving: 'Saving…', saved: 'Saved on this device', error: 'Not saved · export a backup' };
  el('save-status').innerHTML = `${icon(state === 'error' ? 'alert' : 'check', 14)}<span>${labels[state]}</span>`;
  el('save-status').classList.toggle('save-error', state === 'error');
  el('mode-label').textContent = state === 'error' ? 'Storage unavailable — export to keep your work' : state === 'saving' ? 'Saving your changes…' : 'All changes saved locally';
}
function persist(doc, withRevision = false) {
  const copy = structuredClone(doc);
  const generation = ++saveGeneration;
  savedStatus('saving');
  writeQueue = writeQueue.catch(() => {}).then(async () => {
    try {
      await saveDocument(copy);
      if (withRevision) {
        await saveRevision({ id: uid(), documentId: copy.id, title: copy.title, time: Date.now(), data: copy.data });
        const revisions = (await allRevisions()).filter(r => r.documentId === copy.id).sort((a, b) => b.time - a.time);
        for (const revision of revisions.slice(30)) await removeRevision(revision.id);
      }
      persistenceAvailable = true; if (generation === saveGeneration) savedStatus('saved');
    } catch (error) { persistenceAvailable = false; savedStatus('error'); toast('Could not save to this browser. Export a backup to keep your work.'); throw error; }
  });
  writeQueue.catch(() => {});
  return writeQueue;
}
function scheduleSave(data) {
  if (loading || !current) return;
  current.data = data; current.updatedAt = Date.now();
  saveGeneration++; savedStatus('saving'); clearTimeout(saveTimer);
  const doc = current;
  saveTimer = setTimeout(() => {
    const revision = Date.now() - lastRevision > 30000;
    if (revision) lastRevision = Date.now();
    persist(doc, revision);
  }, 450);
  updateStats(); renderOutline();
}
async function flushSave() {
  clearTimeout(saveTimer);
  if (current && editor && !loading) { current.data = editor.getData(); current.updatedAt = Date.now(); await persist(current); }
}
function renderDocuments() {
  el('document-list').innerHTML = docs.map(doc => `<button class="document-item ${doc.id === current?.id ? 'active' : ''}" data-document="${doc.id}" title="${e(doc.title)}">${icon(doc.icon || 'file', 16)}<span>${e(doc.title || 'Untitled document')}</span>${doc.id === current?.id ? '<span class="current-dot"></span>' : ''}</button>`).join('');
  document.querySelector('.document-count').textContent = String(docs.length);
}
function renderOutline() {
  const headers = current.data.blocks.filter(b => b.type === 'header');
  el('outline-links').innerHTML = headers.length ? headers.map((b, i) => `<button data-scroll="${b.id}" style="--indent:${Math.max(0, b.data.level - 2)}" class="${i === 0 ? 'active' : ''}">${e(plainText(b.data.text) || 'Untitled heading')}</button>`).join('') : '<p class="outline-empty">Your headings will appear here.</p>';
}
function updateStats() {
  const stats = statistics(current.data.blocks);
  el('word-count').textContent = `${stats.words.toLocaleString()} words`;
  el('block-count').textContent = `${stats.blocks} blocks`;
  el('character-count').textContent = `${stats.characters.toLocaleString()} characters`;
  el('reading-time').textContent = `${stats.minutes} min read`;
  document.querySelector('[data-action="undo"]').disabled = !editor?.history.canUndo || mode !== 'write';
  document.querySelector('[data-action="redo"]').disabled = !editor?.history.canRedo || mode !== 'write';
}
function resizeTitle() { el('document-title').style.height = 'auto'; el('document-title').style.height = `${el('document-title').scrollHeight}px`; }
async function openDocument(doc) {
  const generation = ++openGeneration;
  if (current && current.id !== doc.id) { try { await flushSave(); } catch {} }
  if (generation !== openGeneration) return;
  loading = true; current = doc; mode = 'write';
  editor?.destroy();
  el('document-title').value = doc.title;
  el('breadcrumb-title').textContent = doc.title || 'Untitled document';
  el('document-date').textContent = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(doc.createdAt));
  el('document-type').textContent = doc.cover ? 'YOUR WORKSPACE GUIDE' : 'PERSONAL DOCUMENT';
  el('cover').hidden = !doc.cover;
  editor = new RetardEditor({ holder: 'editor', data: doc.data, direction: doc.direction || 'ltr', onChange: (_, data) => scheduleSave(data) });
  editor.addEventListener('notice', event => toast(event.detail));
  editor.addEventListener('configure', event => configureMedia(event.detail.block));
  editor.addEventListener('files', event => insertFiles(event.detail));
  editor.addEventListener('link', event => linkDialog(editor, event.detail));
  editor.addEventListener('color', event => colorDialog(editor, event.detail.kind || 'color'));
  editor.addEventListener('footnotes', event => { const block = event.detail.block; dialog({ title: 'Edit footnotes', body: block.tunes.footnotes.map((note, i) => `<label class="field-label">Note ${i + 1}<textarea name="note-${i}" rows="2">${e(plainText(note))}</textarea></label>`).join(''), onSubmit: data => editor.transaction(() => { editor.getBlock(block.id).tunes.footnotes = block.tunes.footnotes.map((_, i) => e(String(data.get(`note-${i}`)))); }) }); });
  editor.addEventListener('footnote', () => dialog({ title: 'Add a footnote', description: 'A little extra context, without interrupting the thought.', body: '<label class="field-label">Note<textarea name="note" rows="3" required autofocus></textarea></label>', submit: 'Add footnote', onSubmit: (data, modal) => formatOnClose(modal, editor, 'footnote', String(data.get('note'))) }));
  window.retardEditor = editor;
  loading = false;
  current.data = editor.getData();
  setView('write'); renderDocuments(); renderOutline(); updateStats(); resizeTitle();
  document.title = `${doc.title || 'Untitled'} — Retard`;
  document.querySelector('.workspace-main').scrollTo(0, 0);
  try { localStorage.setItem('retard-active-document', doc.id); } catch {}
  document.body.classList.remove('sidebar-open');
}
function setView(view) {
  mode = view;
  const json = view === 'json';
  editor.setReadOnly(view !== 'write');
  el('editor').hidden = json; el('json-view').hidden = !json;
  el('document-title').readOnly = view !== 'write';
  if (json) el('json-code').textContent = JSON.stringify(editor.getData(), null, 2);
  app.querySelectorAll('.view-tabs button[role="tab"][data-view]').forEach(btn => { btn.classList.toggle('active', btn.dataset.view === view); btn.setAttribute('aria-selected', String(btn.dataset.view === view)); });
  document.body.dataset.editorView = view; updateStats();
}
async function createDocument(template = false) {
  const doc = template ? projectDocument() : { id: uid(), title: '', icon: 'file', cover: false, createdAt: Date.now(), updatedAt: Date.now(), data: { blocks: [makeBlock()] } };
  docs.unshift(doc); await openDocument(doc); persist(doc); el('document-title').focus();
}
function exportDialog() {
  const data = editor.getData();
  const name = (current.title || 'Untitled').replace(/[^\p{L}\p{N}\-_ ]/gu, '').trim().slice(0, 80) || 'document';
  const modal = dialog({ title: 'Take your words with you', description: 'Your document, in the format you need.', submit: null, body: `<div class="export-grid">${[['json', 'code', 'JSON', 'All blocks, formatting, and media. Import it back anytime.'], ['html', 'globe', 'HTML', 'A styled, standalone web document.'], ['md', 'text', 'Markdown', 'Portable text for your favourite writing tools.'], ['txt', 'file', 'Plain text', 'Just the words, without formatting.']].map(([format, glyph, title, description]) => `<button class="export-option" data-format="${format}"><span>${icon(glyph, 23)}</span><strong>${title}</strong><small>${description}</small>${icon('download', 16)}</button>`).join('')}</div><p class="modal-note">JSON keeps the full document. Other formats may simplify interactive blocks.</p>` });
  modal.querySelectorAll('[data-format]').forEach(btn => btn.addEventListener('click', () => {
    const format = btn.dataset.format;
    const outputs = { json: [JSON.stringify({ ...data, title: current.title }, null, 2), 'application/json'], html: [toHTML(data.blocks, current.title), 'text/html'], md: [`# ${current.title || 'Untitled'}\n\n${toMarkdown(data.blocks)}`, 'text/markdown'], txt: [`${current.title || 'Untitled'}\n\n${data.blocks.map(blockText).join('\n\n')}`, 'text/plain'] };
    download(outputs[format][0], `${name}.${format}`, outputs[format][1]); modal.close(); toast(`${format.toUpperCase()} export downloaded`);
  }));
}
function libraryDialog() {
  const choices = toolChoices(editor.registry);
  const modal = dialog({ title: 'A block for every idea', description: `${choices.length} ways to make this page your own. Select a block to add it to your document.`, submit: null, wide: true, body: `<div class="library-search">${icon('search', 17)}<input aria-label="Find a block" placeholder="Find a block…"></div><div class="block-library">${choices.map((choice, i) => `<button data-library-choice="${i}" data-label="${e(`${choice.title} ${choice.description}`.toLowerCase())}"><span class="library-icon">${icon(choice.icon, 23)}</span><strong>${e(choice.title)}</strong><small>${e(choice.description || '')}</small></button>`).join('')}</div>` });
  modal.querySelector('input').addEventListener('input', event => modal.querySelectorAll('[data-library-choice]').forEach(btn => { btn.hidden = !btn.dataset.label.includes(event.target.value.toLowerCase()); }));
  modal.querySelectorAll('[data-library-choice]').forEach(btn => btn.addEventListener('click', () => {
    const choice = choices[Number(btn.dataset.libraryChoice)];
    if (mode !== 'write') setView('write');
    modal.close(); editor.insert(choice.type, choice.data); toast(`${choice.title} added`);
  }));
}
function helpDialog() {
  dialog({ title: 'Find your writing flow', description: 'A few shortcuts to keep your hands on the keyboard.', submit: null, wide: true, body: `<div class="help-grid"><section><h3>While you write</h3>${[['Bold', '⌘ / Ctrl + B'], ['Italic', '⌘ / Ctrl + I'], ['Underline', '⌘ / Ctrl + U'], ['Add a link', '⌘ / Ctrl + K'], ['Undo', '⌘ / Ctrl + Z'], ['Redo', '⌘ / Ctrl + Shift + Z'], ['Insert a paragraph below', '⌘ / Ctrl + Enter'], ['Line break', 'Shift + Enter']].map(([label, keys]) => `<div class="shortcut-row"><span>${label}</span><kbd>${keys}</kbd></div>`).join('')}</section><section><h3>Build with blocks</h3>${[['Block menu', '/ on a new line'], ['Heading', '#, ##, or ### + Space'], ['Bulleted list', '- + Space'], ['Numbered list', '1. + Space'], ['Checklist', '[] + Space'], ['Quote', '> + Space'], ['Indent / outdent list', 'Tab / Shift + Tab'], ['Next table cell', 'Tab'], ['Move a block', '⌘ / Ctrl + Shift + ↑ / ↓'], ['Duplicate a block', '⌘ / Ctrl + Shift + D']].map(([label, keys]) => `<div class="shortcut-row"><span>${label}</span><kbd>${keys}</kbd></div>`).join('')}</section></div><div class="help-note"><strong>Your content belongs to you.</strong><p>Documents and uploaded files stay in this browser’s IndexedDB. Export JSON to make a backup or move your work to another device. Clearing browser storage removes local documents.</p><p>Shift-click block handles to select multiple blocks. Press ⌘ / Ctrl + A twice quickly inside the editor to select every block. Copy, cut, or delete the selection.</p></div><div class="help-footer">Independent editor engine · v${VERSION} · <a href="./docs/ARCHITECTURE.md" target="_blank" rel="noopener">Developer notes ↗</a></div>` });
}
function searchDialog() {
  const modal = dialog({ title: 'Find a thought', description: 'Search across all your documents.', submit: null, body: '<div class="library-search">' + icon('search') + '<input aria-label="Search documents" placeholder="Search titles and content…" autofocus></div><div id="search-results" class="search-results"></div>' });
  const render = query => {
    const matches = docs.filter(doc => `${doc.title} ${doc.data.blocks.map(blockText).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
    modal.querySelector('#search-results').innerHTML = matches.length ? matches.map(doc => `<button data-result="${doc.id}">${icon(doc.icon || 'file')}<span><strong>${e(doc.title || 'Untitled document')}</strong><small>${e(doc.data.blocks.map(blockText).join(' ').slice(0, 110) || 'A fresh blank page')}</small></span>${icon('arrow', 15)}</button>`).join('') : '<p class="empty-search">No matching documents. Try another word.</p>';
  };
  render(''); modal.querySelector('input').addEventListener('input', event => render(event.target.value));
  modal.addEventListener('click', event => { const id = event.target.closest('[data-result]')?.dataset.result; if (id) { modal.close(); openDocument(docs.find(doc => doc.id === id)); } });
}
function documentOptions() {
  const modal = dialog({ title: 'Make this page yours', submit: null, body: `<div class="settings-actions"><button data-option="import">${icon('upload')}<span>Import a document<small>JSON, Markdown, HTML, or plain text</small></span></button><button data-option="duplicate">${icon('copy')}<span>Duplicate this document</span></button><button data-option="cover">${icon('image')}<span>${current.cover ? 'Remove' : 'Add'} the cover</span></button><button data-option="direction">${icon('text')}<span>Switch to ${(current.direction || 'ltr') === 'ltr' ? 'right-to-left' : 'left-to-right'} writing</span></button><button data-option="revisions">${icon('undo')}<span>Version history<small>Restore a locally saved version</small></span></button><button data-option="template">${icon('sparkle')}<span>New project brief<small>Start with a simple planning template</small></span></button><button data-option="delete" class="danger">${icon('trash')}<span>Delete this document</span></button></div>` });
  modal.addEventListener('click', async event => {
    const option = event.target.closest('[data-option]')?.dataset.option; if (!option) return;
    modal.close();
    if (option === 'import') el('import-file').click();
    if (option === 'template') createDocument(true);
    if (option === 'duplicate') { const copy = { ...structuredClone(current), id: uid(), title: `${current.title || 'Untitled'} (copy)`, data: editor.getData(), createdAt: Date.now(), updatedAt: Date.now() }; docs.unshift(copy); await openDocument(copy); persist(copy); }
    if (option === 'cover') { current.cover = !current.cover; el('cover').hidden = !current.cover; persist(current); }
    if (option === 'direction') { current.direction = (current.direction || 'ltr') === 'ltr' ? 'rtl' : 'ltr'; editor.holder.dir = current.direction; persist(current); }
    if (option === 'revisions') revisionsDialog();
    if (option === 'delete') deleteDialog();
  });
}
async function revisionsDialog() {
  try {
    await flushSave();
    const revisions = (await allRevisions()).filter(r => r.documentId === current.id).sort((a, b) => b.time - a.time);
    const modal = dialog({ title: 'Version history', description: 'Up to 30 snapshots, saved locally while you write.', submit: null, body: `<div class="revision-list">${revisions.length ? revisions.map(r => `<button data-revision="${r.id}">${icon('undo')}<span><strong>${e(new Date(r.time).toLocaleString())}</strong><small>${statistics(r.data.blocks).words} words · ${e(r.title || 'Untitled')}</small></span><span>Restore</span></button>`).join('') : '<p class="empty-search">Your first snapshot will appear after you start editing.</p>'}</div>` });
    modal.addEventListener('click', async event => {
      const id = event.target.closest('[data-revision]')?.dataset.revision;
      if (!id) return;
      const revision = revisions.find(r => r.id === id);
      await persist(current, true);
      current.title = revision.title; current.data = revision.data;
      modal.close(); await openDocument(current); persist(current); toast('Version restored');
    });
  } catch { toast('Version history is unavailable in this browser.'); }
}
function deleteDialog() {
  dialog({ title: 'Delete this document?', description: `“${current.title || 'Untitled'}” will be removed from this browser.`, body: '<p>Export a copy first if you want to keep it.</p>', submit: 'Delete document', onSubmit: async () => {
    clearTimeout(saveTimer); await writeQueue.catch(() => {});
    const id = current.id;
    await removeDocument(id);
    for (const revision of (await allRevisions()).filter(r => r.documentId === id)) await removeRevision(revision.id);
    docs = docs.filter(doc => doc.id !== id); current = null;
    if (!docs.length) await createDocument(); else await openDocument(docs[0]);
    toast('Document deleted');
  } });
}
function readFile(file) {
  if (file.size > 10 * 1024 * 1024) return Promise.reject(new Error('Choose a file smaller than 10 MB.'));
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('The file could not be read.')); reader.readAsDataURL(file); });
}
async function fileData(file, type) {
  if (type === 'image' && !/^image\/(png|jpeg|gif|webp|avif)$/.test(file.type)) throw new Error('Use a PNG, JPEG, GIF, WebP, or AVIF image.');
  if (type === 'audio' && !file.type.startsWith('audio/')) throw new Error('Choose an audio file.');
  if (type === 'video' && !['video/mp4', 'video/webm'].includes(file.type)) throw new Error('Choose an MP4 or WebM video.');
  let url = await readFile(file);
  if (type === 'attaches' && !safeURL(url, 'file')) url = url.replace(/^data:[^;]*;/, 'data:application/octet-stream;');
  if (['audio', 'video'].includes(type)) return { url };
  return { file: { url, name: file.name, size: file.size, extension: file.name.split('.').at(-1) }, ...(type === 'attaches' ? { title: file.name } : {}) };
}
async function insertFiles({ files, index }) {
  const docId = current.id;
  try {
    const items = [];
    for (const file of files.slice(0, 10)) {
      const type = /^image\/(png|jpeg|gif|webp|avif)$/.test(file.type) ? 'image' : file.type.startsWith('audio/') ? 'audio' : ['video/mp4', 'video/webm'].includes(file.type) ? 'video' : 'attaches';
      items.push(makeBlock(type, await fileData(file, type)));
    }
    if (docId !== current.id) { toast('Document changed. Add your files again in the intended document.'); return; }
    editor.transaction(() => editor.blocks.splice(Math.max(0, index), 0, ...items), { id: items.at(-1)?.id });
    toast(`${items.length} file${items.length === 1 ? '' : 's'} added`);
  } catch (error) { toast(error.message); }
}
function configureMedia(block) {
  const type = block.type;
  const uploadable = ['image', 'attaches', 'audio', 'video'].includes(type);
  const url = block.data.file?.url || block.data.url || block.data.source || block.data.link || '';
  const label = { image: 'image', attaches: 'attachment', audio: 'audio', video: 'video', embed: 'video embed', linkTool: 'bookmark' }[type];
  const accept = { image: 'image/png,image/jpeg,image/gif,image/webp,image/avif', audio: 'audio/*', video: 'video/mp4,video/webm', attaches: '*' }[type];
  dialog({ title: `Add ${label}`, description: type === 'embed' ? 'Paste a YouTube or Vimeo link.' : 'Bring a little more to your document.', body: `${uploadable ? `<label class="upload-area">${icon('upload', 25)}<strong>Choose a file</strong><span>Up to 10 MB · stored in this browser</span><input type="file" name="file" accept="${accept}" aria-label="Upload ${label}"></label><div class="or-divider"><span>or use a link</span></div>` : ''}<label class="field-label">${type === 'embed' ? 'Video URL' : 'URL'}<input name="url" placeholder="https://…" value="${e(url.startsWith('data:') ? '' : url)}"></label>${type === 'image' ? `<label class="field-label">Alternative text<input name="alt" placeholder="Describe the image" value="${e(block.data.alt || '')}"></label>` : ''}${type === 'linkTool' ? `<label class="field-label">Title<input name="title" value="${e(plainText(block.data.meta.title || ''))}" placeholder="A useful link"></label><label class="field-label">Description<input name="description" value="${e(plainText(block.data.meta.description || ''))}" placeholder="Why is this worth keeping?"></label>` : ''}`, submit: 'Add to document', onSubmit: async data => {
    const file = data.get('file');
    let value = String(data.get('url') || '').trim();
    let patch;
    if (file instanceof File && file.size) patch = await fileData(file, type);
    else {
      if (!value && url.startsWith('data:')) value = url;
      if (type === 'embed') { const embed = embedURL(value); if (!embed) throw new Error('Use a valid YouTube or Vimeo video URL.'); patch = { source: value, embed }; }
      else {
        const safe = safeURL(value, type === 'image' ? 'image' : uploadable ? 'file' : 'link');
        if (!safe) throw new Error('Choose a file or enter a valid URL.');
        if (type === 'linkTool') patch = { link: safe, meta: { title: e(String(data.get('title') || safe)), description: e(String(data.get('description') || '')) } };
        else if (['audio', 'video'].includes(type)) patch = { url: safe };
        else patch = { file: { ...(block.data.file || {}), url: safe, name: block.data.file?.name || value.split('/').at(-1) || 'attachment' } };
      }
    }
    if (type === 'image') patch.alt = String(data.get('alt') || '');
    editor.update(block.id, patch);
  } });
}
el('document-title').addEventListener('input', () => {
  current.title = el('document-title').value.replace(/\n/g, '');
  el('document-title').value = current.title;
  el('breadcrumb-title').textContent = current.title || 'Untitled document';
  document.title = `${current.title || 'Untitled'} — Retard`;
  resizeTitle(); renderDocuments(); scheduleSave(editor.getData());
});
el('document-title').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); editor.focus(editor.blocks[0].id, undefined, 'start'); } });
el('import-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 30 * 1024 * 1024) throw new Error('Choose a document smaller than 30 MB.');
    const text = await file.text(); let data, title = file.name.replace(/\.[^.]+$/, '');
    if (/\.json$/i.test(file.name)) { const parsed = JSON.parse(text); data = parsed.data?.blocks ? parsed.data : parsed; title = typeof parsed.title === 'string' ? parsed.title : title; }
    else if (/\.html?$/i.test(file.name)) data = { blocks: fromHTML(text) };
    else data = { blocks: fromMarkdown(text) };
    data = normalizeDocument(data, editor.registry.names());
    const doc = { id: uid(), title, cover: false, icon: 'file', createdAt: Date.now(), updatedAt: Date.now(), data };
    docs.unshift(doc); await openDocument(doc); persist(doc, true); toast('Document imported');
  } catch (error) { toast(`Import failed: ${error.message}`); }
  event.target.value = '';
});
app.addEventListener('click', async event => {
  const docId = event.target.closest('[data-document]')?.dataset.document;
  if (docId && docId !== current.id) { await openDocument(docs.find(doc => doc.id === docId)); return; }
  const view = viewFromClick(event.target, app);
  if (view && view !== mode) { setView(view); return; }
  const scroll = event.target.closest('[data-scroll]')?.dataset.scroll;
  if (scroll) { if (mode === 'json') setView('write'); editor.row(scroll)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); document.querySelectorAll('[data-scroll]').forEach(btn => btn.classList.toggle('active', btn.dataset.scroll === scroll)); }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action || !editor) return;
  switch (action) {
    case 'new': await createDocument(); break;
    case 'undo': editor.undo(); break;
    case 'redo': editor.redo(); break;
    case 'export': exportDialog(); break;
    case 'tools': libraryDialog(); break;
    case 'help': helpDialog(); break;
    case 'search': searchDialog(); break;
    case 'options': documentOptions(); break;
    case 'workspace': dialog({ title: 'Your personal workspace', description: 'A space for your own ideas, on this device.', submit: null, body: `<div class="workspace-summary">${icon('folder', 32)}<strong>${docs.length} documents</strong><p>Documents and uploads are saved in this browser. Export JSON files for backups or to move to another device.</p><p class="modal-note">No server, account, or cloud sync is connected.</p></div>` }); break;
    case 'documents': document.body.classList.add('sidebar-open'); break;
    case 'close-sidebar': document.body.classList.remove('sidebar-open'); break;
    case 'sidebar': if (window.innerWidth <= 900) document.body.classList.toggle('sidebar-open'); else document.body.classList.toggle('sidebar-hidden'); break;
    case 'focus': document.body.classList.toggle('focus-mode'); document.querySelector('.focus-button span').textContent = document.body.classList.contains('focus-mode') ? 'Exit focus' : 'Focus mode'; break;
    case 'theme': theme = theme === 'light' ? 'dark' : 'light'; document.documentElement.dataset.theme = theme; try { localStorage.setItem('retard-theme', theme); } catch {} break;
    case 'copy-json': try { await navigator.clipboard.writeText(JSON.stringify(editor.getData(), null, 2)); toast('JSON copied'); } catch { toast('Clipboard unavailable. Use Export to download the JSON.'); } break;
  }
});
document.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]')) return;
  const mod = event.metaKey || event.ctrlKey;
  if (mod && event.key.toLowerCase() === 'k' && !event.target.closest('.retard-editor')) { event.preventDefault(); searchDialog(); }
  if (mod && event.key.toLowerCase() === 's') { event.preventDefault(); flushSave().then(() => toast('Document saved')).catch(() => {}); }
  if (event.key === '?' && !event.target.closest('input,textarea,[contenteditable="true"]')) helpDialog();
  if (event.key === 'Escape') { document.body.classList.remove('sidebar-open', 'focus-mode'); document.querySelector('.focus-button span').textContent = 'Focus mode'; }
});
window.addEventListener('beforeunload', event => { if (!persistenceAvailable || el('save-status').textContent.includes('Saving')) { event.preventDefault(); event.returnValue = ''; } });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave().catch(() => {}); });
window.addEventListener('resize', resizeTitle);
try {
  docs = await listDocuments();
  if (!docs.length) { docs = [welcomeDocument(), projectDocument()]; for (const doc of docs) await saveDocument(doc); }
  docs.sort((a, b) => b.updatedAt - a.updatedAt);
} catch {
  docs = [welcomeDocument()]; persistenceAvailable = false; savedStatus('error');
  toast('Browser storage is unavailable. You can write and export your work.');
}
let activeId;
try { activeId = localStorage.getItem('retard-active-document'); } catch {}
await openDocument(docs.find(doc => doc.id === activeId) || docs.find(doc => doc.cover) || docs[0]);
