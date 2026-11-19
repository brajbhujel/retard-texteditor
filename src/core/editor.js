import { History, makeBlock, normalizeDocument, flattenList, nestList, clone, escapeHTML, safeURL, embedURL, VERSION } from './model.js';
import { sanitizeHTML, sanitizeBlocks, plainText } from './sanitize.js';
import { selectionRange, restoreRange, setCaret, caretAt, splitAtCaret, bookmark, restoreBookmark } from './selection.js';
import { ToolRegistry, toolChoices } from '../tools/registry.js';
import { fromHTML, fromMarkdown, toHTML, toMarkdown } from './serialization.js';
import { icon } from '../ui/icons.js';
import { ensureStyles } from '../styles/inject.js';
import { attachDefaults } from '../ui/sdk-defaults.js';

export class RetardEditor extends EventTarget {
  constructor({ holder, data = { blocks: [] }, tools = {}, readOnly = false, onChange, onReady, placeholder, direction = 'ltr', defaults = true, autofocus = false } = {}) {
    super();
    ensureStyles();
    this.holder = typeof holder === 'string' ? document.getElementById(holder) : holder;
    if (!this.holder) throw new Error('An editor holder is required.');
    this.registry = new ToolRegistry(tools);
    this.readOnly = readOnly;
    this.onChange = onChange;
    this.placeholder = placeholder;
    this.history = new History();
    this.abort = new AbortController();
    this.selected = new Set();
    this.activeId = null;
    this.composing = false;
    this.holder.classList.add('retard-editor');
    this.holder.dir = direction;
    this.holder.setAttribute('aria-label', 'Document editor');
    this.blocks = sanitizeBlocks(normalizeDocument(data, this.registry.names()).blocks);
    this.history.reset(this.snapshot());
    this.inline = document.createElement('div');
    this.inline.className = 'inline-toolbar';
    this.inline.setAttribute('role', 'toolbar');
    this.inline.setAttribute('aria-label', 'Text formatting');
    this.inline.hidden = true;
    this.inline.innerHTML = this.toolbarMarkup(true);
    this.formatbar = document.createElement('div');
    this.formatbar.className = 'document-formatbar';
    this.formatbar.setAttribute('role', 'toolbar');
    this.formatbar.setAttribute('aria-label', 'Document formatting');
    this.formatbar.dataset.preserveSelection = 'true';
    this.formatbar.hidden = true;
    this.formatbar.innerHTML = this.toolbarMarkup(false);
    this.holder.before(this.formatbar);
    document.body.append(this.inline);
    this.render();
    this.bind();
    if (defaults) attachDefaults(this);
    if (autofocus && this.blocks[0]) this.focus(this.blocks[0].id, undefined, 'end');
    this.isReady = Promise.resolve(this);
    queueMicrotask(() => onReady?.(this));
  }
  listen(target, name, callback, options = {}) { target.addEventListener(name, callback, { ...options, signal: this.abort.signal }); }
  snapshot() { return { time: Date.now(), version: VERSION, blocks: clone(this.blocks), selection: bookmark(this.holder) }; }
  getData() { if (!this.readOnly) this.syncAll(); return { time: Date.now(), version: VERSION, blocks: sanitizeBlocks(this.blocks) }; }
  async save() { return this.getData(); }
  getBlock(id = this.activeId) { return this.blocks.find(block => block.id === id); }
  index(id = this.activeId) { return this.blocks.findIndex(block => block.id === id); }
  row(id) { return this.holder.querySelector(`[data-block-id="${CSS.escape(id)}"]`); }
  toolbarMarkup(compact) {
    const actions = [['bold', 'Bold', 'bold'], ['italic', 'Italic', 'italic'], ['underline', 'Underline', 'underline'], ['strike', 'Strikethrough', 'strikeThrough'], ['code', 'Inline code', 'code']];
    const controls = actions.map(([glyph, label, action]) => `<button type="button" data-format="${action}" aria-label="${label}" title="${label}" aria-pressed="false">${icon(glyph, 17)}</button>`).join('');
    return `<button type="button" data-type-menu class="type-switch" aria-label="Text style" title="Change text style"><span data-type-label>Text</span>${icon('chevron', 12)}</button><span class="toolbar-divider"></span>${controls}<span class="toolbar-divider"></span><button type="button" data-format="link" class="labelled-tool" aria-label="Add or edit link" title="Add or edit link (⌘/Ctrl K)">${icon('link', 17)}<span>Link</span></button><button type="button" data-format="color" aria-label="Text colour" title="Text colour"><span class="text-color-icon">A</span></button><button type="button" data-format="background" aria-label="Text background colour" title="Text background colour">${icon('paint', 18)}</button>${compact ? '' : `<span class="toolbar-divider"></span><button type="button" data-format="footnote" aria-label="Footnote" title="Add a footnote">${icon('book', 16)}</button><button type="button" data-format="sub" aria-label="Subscript" title="Subscript">x₂</button><button type="button" data-format="sup" aria-label="Superscript" title="Superscript">x²</button>`}<button type="button" data-format="removeFormat" aria-label="Clear formatting" title="Clear formatting">${icon('eraser', 17)}</button>`;
  }
  updateFormatbar() {
    const block = this.getBlock();
    const label = block?.type === 'header' ? `Heading ${block.data.level}` : this.registry.get(block?.type)?.title || 'Text';
    for (const toolbar of [this.inline, this.formatbar]) {
      if (!toolbar) continue;
      const type = toolbar.querySelector('[data-type-label]');
      if (type && type.textContent !== label) type.textContent = label;
      for (const button of toolbar.querySelectorAll('[data-format]')) {
        const action = button.dataset.format;
        if (!['bold', 'italic', 'underline', 'strikeThrough', 'code', 'sub', 'sup'].includes(action)) { button.removeAttribute('aria-pressed'); continue; }
        let active = false;
        if (['code', 'sub', 'sup'].includes(action)) {
          const range = selectionRange(this.holder);
          const start = range?.startContainer;
          const mark = (start?.nodeType === Node.ELEMENT_NODE ? start : start?.parentElement)?.closest(action);
          active = !!mark?.contains(range?.endContainer);
        } else try { active = document.queryCommandState(action); } catch {}
        button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
      }
    }
  }
  openTypeMenu(anchor, id = this.activeId || this.blocks[0]?.id) {
    if (this.readOnly || !id) return;
    const range = selectionRange(this.holder);
    if (range) this.savedRange = range;
    this.closeMenu(); this.inline.hidden = true;
    const block = this.getBlock(id);
    this.menu = document.createElement('div'); this.menu.className = 'editor-popover type-menu';
    this.menu.setAttribute('role', 'dialog'); this.menu.setAttribute('aria-label', 'Text style');
    this.menu.innerHTML = `<div class="menu-label">TEXT STYLE</div><button type="button" data-style="paragraph" class="type-text ${block.type === 'paragraph' ? 'selected' : ''}">${icon('text', 18)}<span>Text</span>${block.type === 'paragraph' ? icon('check', 15) : ''}</button><div class="menu-label">HEADING LEVEL</div><div class="heading-level-grid">${[1, 2, 3, 4, 5, 6].map(level => `<button type="button" data-level="${level}" aria-label="Heading ${level}" aria-pressed="${block.type === 'header' && block.data.level === level}" class="${block.type === 'header' && block.data.level === level ? 'selected' : ''}">H<span>${level}</span></button>`).join('')}</div><p class="type-menu-hint">Change the style. Keep your words.</p>`;
    document.body.append(this.menu); this.placeMenu(this.menu, anchor);
    this.menu.addEventListener('pointerdown', event => { if (event.target.closest('button')) event.preventDefault(); });
    this.menu.addEventListener('click', event => {
      const level = event.target.closest('[data-level]')?.dataset.level;
      if (level) this.convert(id, 'header', { level: Number(level) });
      else if (event.target.closest('[data-style]')) this.convert(id, 'paragraph');
      this.updateFormatbar();
    });
    this.menu.addEventListener('keydown', event => { if (event.key === 'Escape') { this.closeMenu(); this.focus(id); } });
  }
  blockMarkup(block) {
    const alignment = ['left', 'center', 'right', 'justify'].includes(block.tunes.alignment) ? block.tunes.alignment : 'left';
    const tool = this.registry.get(block.type);
    return `<div class="editor-block" data-block-id="${block.id}" data-type="${block.type}" style="text-align:${alignment}" role="group" aria-label="${escapeHTML(tool.title || block.type)} block">${this.readOnly ? '' : `<div class="block-controls"><button type="button" class="block-add" data-block-action="add" aria-label="Insert block" title="Insert block">${icon('plus', 18)}</button><button type="button" class="block-grip" draggable="true" data-block-action="menu" aria-label="Block settings" title="Drag to move · click for settings">${icon('grip', 18)}</button></div>`}<div class="block-content">${tool.render(block.data, this.readOnly, block)}${Array.isArray(block.tunes.footnotes) && block.tunes.footnotes.length ? `<ol class="block-footnotes">${block.tunes.footnotes.map(note => `<li>${sanitizeHTML(note)}</li>`).join('')}</ol>` : ''}</div></div>`;
  }
  render() {
    this.holder.classList.toggle('is-readonly', this.readOnly);
    const existing = new Map([...this.holder.querySelectorAll(':scope > [data-block-id]')].map(row => [row.dataset.blockId, row]));
    const ids = new Set(this.blocks.map(block => block.id));
    for (const [id, row] of existing) if (!ids.has(id)) { row.remove(); existing.delete(id); }
    let cursor = this.holder.firstElementChild;
    for (const block of this.blocks) {
      const signature = JSON.stringify(block);
      let row = existing.get(block.id);
      existing.delete(block.id);
      if (!row || row._editorSignature !== signature || row._editorReadOnly !== this.readOnly) {
        const template = document.createElement('template');
        template.innerHTML = this.blockMarkup(block);
        const replacement = template.content.firstElementChild;
        if (row) { if (cursor === row) cursor = replacement; row.replaceWith(replacement); }
        row = replacement;
        row._editorSignature = signature;
        row._editorReadOnly = this.readOnly;
      }
      row.classList.toggle('block-selected', this.selected.has(block.id));
      if (row !== cursor) this.holder.insertBefore(row, cursor);
      cursor = row.nextElementSibling;
    }
    for (const row of existing.values()) row.remove();
    let end = this.holder.querySelector('.end-block');
    if (this.readOnly) end?.remove();
    else if (!end) {
      end = document.createElement('button'); end.type = 'button'; end.className = 'end-block'; end.dataset.endBlock = 'true';
      end.setAttribute('aria-label', 'Add a paragraph'); end.innerHTML = 'Click to keep writing, or press <kbd>/</kbd> for a block'; this.holder.append(end);
    }
    if (this.placeholder) this.holder.querySelector('.paragraph')?.setAttribute('data-placeholder', this.placeholder);
    if (this.formatbar) { this.formatbar.hidden = true; this.updateFormatbar(); }
  }
  syncRow(row) {
    if (!row) return;
    const block = this.getBlock(row.dataset.blockId);
    if (!block) return;
    const custom = this.registry.get(block.type);
    if (custom.save) { block.data = custom.save(row.querySelector('.block-content'), block.data); row._editorSignature = JSON.stringify(block); return; }
    if (block.type === 'list' || block.type === 'checklist') {
      const items = [...row.querySelectorAll('.list-row')].map(el => ({ content: sanitizeHTML(el.querySelector('[data-field]').innerHTML), checked: !!el.querySelector('input')?.checked, depth: Number(el.dataset.depth) || 0 }));
      block.data.items = block.type === 'list' ? nestList(items) : items.map(item => ({ text: item.content, checked: item.checked }));
      row._editorSignature = JSON.stringify(block); return;
    }
    for (const field of row.querySelectorAll('[data-field]')) {
      const path = field.dataset.field.split(':');
      if (path[0] === 'cell') block.data.content[Number(path[1])][Number(path[2])] = sanitizeHTML(field.innerHTML);
      else if (['code', 'html'].includes(path[0])) block.data[path[0]] = field.innerText.replace(/\r\n/g, '\n');
      else if (path[0].includes('.')) { const [key, child] = path[0].split('.'); block.data[key][child] = sanitizeHTML(field.innerHTML); }
      else block.data[path[0]] = sanitizeHTML(field.innerHTML);
    }
    if (block.type === 'toggle') block.data.open = row.querySelector('details').open;
    row._editorSignature = JSON.stringify(block);
  }
  syncAll() { this.holder.querySelectorAll('[data-block-id]').forEach(row => this.syncRow(row)); }
  changed(immediate = false) {
    clearTimeout(this.historyTimer);
    const commit = () => { this.history.push(this.snapshot()); this.notify(); };
    if (immediate) commit(); else { this.historyTimer = setTimeout(commit, 350); this.notify(); }
  }
  notify() {
    const data = { time: Date.now(), version: VERSION, blocks: clone(this.blocks) };
    this.dispatchEvent(new CustomEvent('change', { detail: data }));
    this.onChange?.(this, data);
  }
  flush() { clearTimeout(this.historyTimer); this.syncAll(); this.history.push(this.snapshot()); }
  transaction(fn, focus) {
    if (this.readOnly) return;
    const caret = bookmark(this.holder);
    this.flush();
    fn();
    if (!this.blocks.length) this.blocks.push(makeBlock());
    this.closeMenu();
    this.inline.hidden = true;
    this.render();
    if (focus) this.focus(focus.id, focus.field, focus.side);
    else restoreBookmark(this.holder, caret);
    this.changed(true);
  }
  focus(id, field, side = 'end') {
    this.activeId = id;
    const row = this.row(id);
    const el = field ? row?.querySelector(`[data-field="${CSS.escape(field)}"]`) : row?.querySelector('[contenteditable="true"]');
    setCaret(el, side);
    el?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
  async load(data) {
    const normalized = normalizeDocument(data, this.registry.names());
    const sanitized = sanitizeBlocks(normalized.blocks);
    clearTimeout(this.historyTimer);
    this.closeMenu(); this.inline.hidden = true;
    this.blocks = sanitized; this.selected.clear(); this.activeId = null;
    this.render(); this.history.reset(this.snapshot()); this.notify();
  }
  clear() { return this.load({ blocks: [] }); }
  setReadOnly(value) { if (this.readOnly === !!value) return; if (!this.readOnly) this.flush(); this.readOnly = !!value; this.closeMenu(); this.inline.hidden = true; this.selected.clear(); this.render(); }
  insert(type = 'paragraph', data = {}, index = this.blocks.length) {
    if (!this.registry.get(type)) throw new Error(`Unknown tool: ${type}`);
    const block = sanitizeBlocks(normalizeDocument({ blocks: [makeBlock(type, data)] }, this.registry.names()).blocks)[0];
    this.transaction(() => this.blocks.splice(Math.max(0, index), 0, block), { id: block.id });
    return block;
  }
  update(id, data) {
    const block = this.getBlock(id);
    if (!block) return;
    const replacement = sanitizeBlocks(normalizeDocument({ blocks: [{ ...block, data: { ...block.data, ...clone(data) } }] }, this.registry.names()).blocks)[0];
    this.transaction(() => { this.blocks[this.index(id)] = replacement; });
  }
  delete(id) { this.transaction(() => { this.blocks = this.blocks.filter(b => b.id !== id); }); }
  move(id, to) { const from = this.index(id); if (from < 0 || to < 0 || to >= this.blocks.length || from === to) return; this.transaction(() => this.blocks.splice(to, 0, this.blocks.splice(from, 1)[0]), { id }); }
  duplicate(id) { const block = this.getBlock(id); if (!block) return; const copy = makeBlock(block.type, block.data, block.tunes); this.transaction(() => this.blocks.splice(this.index(id) + 1, 0, copy), { id: copy.id }); }
  convert(id, type, data = {}) {
    const block = this.getBlock(id);
    if (!block) return;
    this.syncRow(this.row(id));
    let text = block.data.text || block.data.title || '';
    if (block.type === 'list') text = flattenList(block.data.items).map(item => item.content).join('<br>');
    if (block.type === 'checklist') text = block.data.items.map(item => item.text).join('<br>');
    const replacement = makeBlock(type, data, block.tunes);
    replacement.id = id;
    if ('text' in replacement.data) replacement.data.text = text;
    if (type === 'list') replacement.data.items = [{ content: text, meta: {}, items: [] }];
    if (type === 'checklist') replacement.data.items = [{ text, checked: false }];
    if (type === 'code') replacement.data.code = plainText(text);
    const validated = sanitizeBlocks(normalizeDocument({ blocks: [replacement] }, this.registry.names()).blocks)[0];
    this.transaction(() => { this.blocks[this.index(id)] = validated; }, { id });
  }
  undo() {
    if (this.readOnly) return;
    const caret = bookmark(this.holder);
    this.flush();
    const state = this.history.undo();
    if (state) { this.blocks = state.blocks; this.closeMenu(); this.render(); restoreBookmark(this.holder, state.selection || caret); this.notify(); }
  }
  redo() {
    if (this.readOnly) return;
    clearTimeout(this.historyTimer);
    const state = this.history.redo();
    if (state) { this.blocks = state.blocks; this.closeMenu(); this.render(); restoreBookmark(this.holder, state.selection); this.notify(); }
  }
  registerTool(name, tool) { this.registry.register(name, tool); return this; }
  destroy() { clearTimeout(this.historyTimer); clearTimeout(this.selectionTimer); this.abort.abort(); this.closeMenu(); this.inline.remove(); this.formatbar.remove(); this.holder.innerHTML = ''; }
  request(name, detail) { this.dispatchEvent(new CustomEvent(name, { detail })); }
  bind() {
    this.listen(this.holder, 'input', event => {
      if (this.readOnly) return;
      const row = event.target.closest('[data-block-id]');
      this.syncRow(row); this.changed();
      if (!this.composing) this.checkSlash(event.target, row);
    });
    this.listen(this.holder, 'compositionstart', () => { this.composing = true; });
    this.listen(this.holder, 'compositionend', event => { this.composing = false; this.syncRow(event.target.closest('[data-block-id]')); this.changed(); });
    this.listen(this.holder, 'focusin', event => {
      const row = event.target.closest('[data-block-id]');
      if (row) {
        this.activeId = row.dataset.blockId;
        const field = event.target.closest('[data-field]');
        if (field?.dataset.field.startsWith('cell:')) this.activeCell = { id: this.activeId, field: field.dataset.field };
        this.updateFormatbar();
      }
      if (!event.target.closest('.block-controls')) this.clearSelection();
    });
    this.listen(this.holder, 'keydown', event => this.keydown(event));
    this.listen(this.holder, 'beforeinput', event => {
      if (this.readOnly) return;
      if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') { event.preventDefault(); event.inputType === 'historyUndo' ? this.undo() : this.redo(); }
      else if (event.inputType === 'insertParagraph' && !this.composing && !['code', 'raw'].includes(this.getBlock(event.target.closest('[data-block-id]')?.dataset.blockId)?.type)) { event.preventDefault(); this.keydown({ key: 'Enter', target: event.target, preventDefault() {}, metaKey: false, ctrlKey: false, shiftKey: false }); }
      else if (/^(delete|insert)/.test(event.inputType) && this.crossBlockRange()) {
        if (['insertFromPaste', 'insertFromDrop'].includes(event.inputType)) return;
        event.preventDefault(); this.replaceCrossSelection(event.data || '');
      }
    });
    this.listen(this.holder, 'click', event => this.click(event));
    this.listen(this.holder, 'change', event => {
      const row = event.target.closest('[data-block-id]');
      if (!row || this.readOnly) return;
      if (event.target.type === 'checkbox') { this.syncRow(row); this.changed(true); }
      if (event.target.dataset.blockAction === 'language') { this.getBlock(row.dataset.blockId).data.language = event.target.value; this.changed(true); }
    });
    this.listen(this.holder, 'toggle', event => { if (event.target.matches('details') && !this.readOnly) { this.syncRow(event.target.closest('[data-block-id]')); this.changed(); } }, { capture: true });
    this.listen(this.holder, 'paste', event => this.paste(event));
    this.listen(this.holder, 'copy', event => this.copy(event));
    this.listen(this.holder, 'cut', event => this.copy(event, true));
    this.listen(this.holder, 'dragstart', event => {
      if (!event.target.closest('.block-grip') || this.readOnly) return;
      this.dragId = event.target.closest('[data-block-id]').dataset.blockId;
      event.dataTransfer.setData('application/x-retard-block', this.dragId);
      event.dataTransfer.effectAllowed = 'move';
      this.row(this.dragId).classList.add('dragging'); this.closeMenu();
    });
    this.listen(this.holder, 'dragover', event => {
      if (this.readOnly) return;
      if (this.dragId || event.dataTransfer.types.includes('Files')) event.preventDefault();
      if (!this.dragId) return;
      this.holder.querySelectorAll('.drop-before,.drop-after').forEach(el => el.classList.remove('drop-before', 'drop-after'));
      const row = event.target.closest('[data-block-id]');
      if (row) row.classList.add(event.clientY > row.getBoundingClientRect().top + row.offsetHeight / 2 ? 'drop-after' : 'drop-before');
    });
    this.listen(this.holder, 'drop', event => {
      if (this.readOnly) return;
      const row = event.target.closest('[data-block-id]');
      if (this.dragId) {
        event.preventDefault();
        if (row) {
          let target = this.index(row.dataset.blockId) + (row.classList.contains('drop-after') ? 1 : 0);
          if (target > this.index(this.dragId)) target--;
          this.move(this.dragId, Math.max(0, Math.min(this.blocks.length - 1, target)));
        }
        this.endDrag();
      } else if (event.dataTransfer.files.length) { event.preventDefault(); this.request('files', { files: [...event.dataTransfer.files], index: row ? this.index(row.dataset.blockId) + 1 : this.blocks.length }); }
    });
    this.listen(this.holder, 'dragend', () => this.endDrag());
    this.listen(document, 'selectionchange', () => { clearTimeout(this.selectionTimer); this.selectionTimer = setTimeout(() => this.showInline(), 80); });
    for (const toolbar of [this.inline, this.formatbar]) {
      this.listen(toolbar, 'pointerdown', event => { if (event.target.closest('button')) event.preventDefault(); });
      this.listen(toolbar, 'click', event => {
        const typeButton = event.target.closest('[data-type-menu]');
        if (typeButton) { this.openTypeMenu(typeButton); return; }
        const action = event.target.closest('[data-format]')?.dataset.format;
        if (action) this.format(action);
      });
    }
    this.listen(document, 'pointerdown', event => {
      if (this.menu && !this.menu.contains(event.target) && !event.target.closest('.block-controls') && !this.formatbar.contains(event.target) && !this.inline.contains(event.target)) this.closeMenu();
      if (!this.holder.contains(event.target) && !this.inline.contains(event.target) && !event.target.closest('[data-preserve-selection]')) this.inline.hidden = true;
    });
    this.listen(window, 'resize', () => { this.closeMenu(); this.inline.hidden = true; });
    this.listen(document, 'scroll', () => { if (!this.menu?.contains(document.activeElement)) this.inline.hidden = true; }, { capture: true });
  }
  endDrag() { this.dragId = null; this.holder.querySelectorAll('.dragging,.drop-before,.drop-after').forEach(el => el.classList.remove('dragging', 'drop-before', 'drop-after')); }
  clearSelection() { this.selected.clear(); this.holder.querySelectorAll('.block-selected').forEach(el => el.classList.remove('block-selected')); }
  click(event) {
    const action = event.target.closest('[data-block-action]')?.dataset.blockAction;
    const row = event.target.closest('[data-block-id]');
    if (event.target.closest('[data-end-block]')) { const last = this.blocks.at(-1); if (last.type === 'paragraph' && !plainText(last.data.text)) this.focus(last.id); else this.insert(); return; }
    if (!row) return;
    const id = row.dataset.blockId, block = this.getBlock(id);
    if (action === 'copy-code') { navigator.clipboard?.writeText(block.data.code).then(() => this.request('notice', 'Code copied')).catch(() => this.request('notice', 'Clipboard unavailable')); return; }
    if (this.readOnly) return;
    if (action === 'add') this.openToolbox(id, row.querySelector('.block-add'), false);
    else if (action === 'menu') {
      if (event.shiftKey) { this.selected.add(id); row.classList.add('block-selected'); row.querySelector('.block-grip').focus(); }
      else { this.clearSelection(); this.openBlockMenu(id, event.target.closest('button')); }
    } else if (action === 'configure') this.request('configure', { block: clone(block) });
    else if (action?.startsWith('table-')) this.tableAction(block, action);
  }
  tableAction(block, action) {
    const d = block.data;
    const active = this.activeCell?.id === block.id ? this.activeCell.field.split(':').slice(1).map(Number) : [d.content.length - 1, d.content[0].length - 1];
    let r = Math.max(0, Math.min(active[0], d.content.length - 1));
    let c = Math.max(0, Math.min(active[1], d.content[0].length - 1));
    if (['table-row', 'table-row-above'].includes(action) && d.content.length >= 100) { this.request('notice', 'Tables support up to 100 rows.'); return; }
    if (['table-column', 'table-column-before'].includes(action) && d.content[0].length >= 30) { this.request('notice', 'Tables support up to 30 columns.'); return; }
    this.transaction(() => {
      if (action === 'table-row') { r++; d.content.splice(r, 0, Array(d.content[0].length).fill('')); }
      if (action === 'table-row-above') d.content.splice(r, 0, Array(d.content[0].length).fill(''));
      if (action === 'table-column') { c++; d.content.forEach(row => row.splice(c, 0, '')); }
      if (action === 'table-column-before') d.content.forEach(row => row.splice(c, 0, ''));
      if (action === 'table-heading') d.withHeadings = !d.withHeadings;
      if (action === 'table-delete-row' && d.content.length > 1) d.content.splice(r, 1);
      if (action === 'table-delete-column' && d.content[0].length > 1) d.content.forEach(row => row.splice(c, 1));
    });
    r = Math.min(r, d.content.length - 1); c = Math.min(c, d.content[0].length - 1);
    this.focus(block.id, `cell:${r}:${c}`, 'start');
  }

  keydown(event) {
    if (this.readOnly || this.composing || event.isComposing) return;
    const mod = event.metaKey || event.ctrlKey;
    const field = event.target.closest('[data-field]');
    const row = event.target.closest('[data-block-id]');
    if (mod && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? this.redo() : this.undo(); return; }
    if (mod && event.key.toLowerCase() === 'y') { event.preventDefault(); this.redo(); return; }
    if (mod && ['b', 'i', 'u', 'k'].includes(event.key.toLowerCase())) { event.preventDefault(); this.format({ b: 'bold', i: 'italic', u: 'underline', k: 'link' }[event.key.toLowerCase()]); return; }
    if (event.key === 'Escape') { this.closeMenu(); this.inline.hidden = true; this.clearSelection(); return; }
    if (this.menu?.dataset.kind === 'toolbox' && ['ArrowUp', 'ArrowDown', 'Enter', 'Tab'].includes(event.key)) { event.preventDefault(); this.menuNavigate(event.key); return; }
    if (mod && event.key.toLowerCase() === 'a' && (this.selected.size || Date.now() - (this.lastSelectAll || 0) < 800)) {
      event.preventDefault(); this.blocks.forEach(b => this.selected.add(b.id)); this.holder.querySelectorAll('.editor-block').forEach(el => el.classList.add('block-selected')); this.lastSelectAll = 0; return;
    }
    if (mod && event.key.toLowerCase() === 'a') this.lastSelectAll = Date.now();
    if (this.selected.size && ['Backspace', 'Delete'].includes(event.key)) { event.preventDefault(); this.transaction(() => { this.blocks = this.blocks.filter(b => !this.selected.has(b.id)); this.selected.clear(); }); return; }
    if (!field || !row) return;
    const block = this.getBlock(row.dataset.blockId);
    this.activeId = block.id;
    if (mod && event.shiftKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); this.move(block.id, this.index(block.id) + (event.key === 'ArrowUp' ? -1 : 1)); return; }
    if (mod && event.shiftKey && event.key.toLowerCase() === 'd') { event.preventDefault(); this.duplicate(block.id); return; }
    if (this.crossBlockRange() && ['Enter', 'Backspace', 'Delete'].includes(event.key)) { event.preventDefault(); this.replaceCrossSelection(''); if (event.key === 'Enter') this.splitParagraph(this.row(this.activeId)?.querySelector('[data-field]')); return; }
    if (event.key === ' ' && block.type === 'paragraph' && field.dataset.field === 'text') {
      const text = field.textContent;
      const choices = { '#': ['header', { level: 1 }], '##': ['header', { level: 2 }], '###': ['header', { level: 3 }], '####': ['header', { level: 4 }], '#####': ['header', { level: 5 }], '######': ['header', { level: 6 }], '-': ['list', { style: 'unordered' }], '*': ['list', { style: 'unordered' }], '1.': ['list', { style: 'ordered' }], '[]': ['checklist', {}], '[ ]': ['checklist', {}], '>': ['quote', {}], '```': ['code', {}], '---': ['delimiter', {}] };
      if (choices[text] && caretAt(field, 'end')) { event.preventDefault(); field.innerHTML = ''; this.syncRow(row); this.convert(block.id, ...choices[text]); return; }
    }
    if (event.key === 'Enter' && mod) { event.preventDefault(); this.insert('paragraph', {}, this.index(block.id) + 1); return; }
    if (block.type === 'code' || block.type === 'raw') {
      if (event.key === 'Tab') { event.preventDefault(); document.execCommand('insertText', false, '  '); this.syncRow(row); this.changed(); }
      return;
    }
    if (['list', 'checklist'].includes(block.type)) { this.listKey(event, block, field); return; }
    if (block.type === 'table') { this.tableKey(event, block, field); return; }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (['paragraph', 'header'].includes(block.type)) this.splitParagraph(field);
      else if (field.dataset.field === 'text' && block.type === 'quote') this.insertLineBreak(field);
      else this.insert('paragraph', {}, this.index(block.id) + 1);
    }
    if (event.key === 'Backspace' && caretAt(field, 'start') && ['paragraph', 'header'].includes(block.type)) {
      if (block.type === 'header') { event.preventDefault(); this.convert(block.id, 'paragraph'); return; }
      const previous = this.blocks[this.index(block.id) - 1];
      if (previous) { event.preventDefault(); this.merge(previous, block); }
    }
    if (event.key === 'Delete' && caretAt(field, 'end') && ['paragraph', 'header'].includes(block.type)) {
      const next = this.blocks[this.index(block.id) + 1];
      if (next && ['paragraph', 'header'].includes(next.type)) { event.preventDefault(); this.merge(block, next); }
    }
    if (['ArrowUp', 'ArrowDown'].includes(event.key) && !event.shiftKey && caretAt(field, event.key === 'ArrowUp' ? 'start' : 'end')) {
      const target = this.blocks[this.index(block.id) + (event.key === 'ArrowUp' ? -1 : 1)];
      if (target) { event.preventDefault(); const fields = this.row(target.id).querySelectorAll('[contenteditable="true"]'); const el = event.key === 'ArrowUp' ? fields[fields.length - 1] : fields[0]; setCaret(el, event.key === 'ArrowUp' ? 'end' : 'start'); }
    }
  }
  splitParagraph(field) {
    if (!field) return;
    const id = field.closest('[data-block-id]').dataset.blockId;
    const block = this.getBlock(id);
    const [left, right] = splitAtCaret(field);
    const next = makeBlock('paragraph', { text: sanitizeHTML(right) });
    this.transaction(() => { block.data.text = sanitizeHTML(left); this.blocks.splice(this.index(id) + 1, 0, next); }, { id: next.id, side: 'start' });
  }
  merge(first, second) {
    this.syncAll();
    if (!['paragraph', 'header'].includes(first.type)) {
      if (!plainText(second.data.text)) this.transaction(() => this.blocks.splice(this.index(second.id), 1), { id: first.id });
      else this.focus(first.id);
      return;
    }
    const offset = plainText(first.data.text).length;
    this.transaction(() => { first.data.text += second.data.text || ''; this.blocks.splice(this.index(second.id), 1); });
    restoreBookmark(this.holder, { id: first.id, field: 'text', offset }); this.activeId = first.id;
  }
  listKey(event, block, field) {
    const rows = block.type === 'list' ? flattenList(block.data.items) : block.data.items.map(item => ({ content: item.text, checked: item.checked, depth: 0 }));
    const index = Number(field.dataset.field.split(':')[1]);
    const update = () => { block.data.items = block.type === 'list' ? nestList(rows) : rows.map(item => ({ text: item.content, checked: item.checked })); };
    if (event.key === 'Tab') {
      event.preventDefault();
      if (block.type === 'list') this.transaction(() => { rows[index].depth = event.shiftKey ? Math.max(0, rows[index].depth - 1) : Math.min(8, rows[index].depth + 1, index ? rows[index - 1].depth + 1 : 0); update(); }, { id: block.id, field: `item:${index}` });
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!plainText(rows[index].content)) {
        if (rows[index].depth > 0) this.transaction(() => { rows[index].depth--; update(); }, { id: block.id, field: `item:${index}` });
        else {
          const paragraph = makeBlock();
          this.transaction(() => {
            const trailing = rows.splice(index + 1); rows.splice(index, 1);
            update();
            const at = this.index(block.id);
            if (!rows.length) this.blocks.splice(at, 1, paragraph); else this.blocks.splice(at + 1, 0, paragraph);
            if (trailing.length) this.blocks.splice(this.index(paragraph.id) + 1, 0, makeBlock(block.type, block.type === 'list' ? { style: block.data.style, items: nestList(trailing) } : { items: trailing.map(item => ({ text: item.content, checked: item.checked })) }));
          }, { id: paragraph.id });
        }
      } else {
        const [left, right] = splitAtCaret(field);
        this.transaction(() => { rows[index].content = sanitizeHTML(left); rows.splice(index + 1, 0, { content: sanitizeHTML(right), checked: false, depth: rows[index].depth }); update(); }, { id: block.id, field: `item:${index + 1}`, side: 'start' });
      }
    } else if (event.key === 'Backspace' && caretAt(field, 'start')) {
      event.preventDefault();
      if (rows[index].depth > 0) this.transaction(() => { rows[index].depth--; update(); }, { id: block.id, field: `item:${index}`, side: 'start' });
      else if (index > 0) {
        const offset = plainText(rows[index - 1].content).length;
        this.transaction(() => { rows[index - 1].content += rows[index].content; rows.splice(index, 1); update(); });
        restoreBookmark(this.holder, { id: block.id, field: `item:${index - 1}`, offset });
      } else if (rows.length === 1) this.convert(block.id, 'paragraph');
      else {
        const paragraph = makeBlock('paragraph', { text: rows[0].content });
        this.transaction(() => { rows.shift(); update(); this.blocks.splice(this.index(block.id), 0, paragraph); }, { id: paragraph.id, side: 'start' });
      }
    }
  }
  tableKey(event, block, field) {
    if (event.key === 'Enter') { event.preventDefault(); this.insertLineBreak(field); return; }
    if (event.key !== 'Tab') return;
    event.preventDefault();
    const [, r, c] = field.dataset.field.split(':').map(Number);
    const width = block.data.content[0].length;
    let next = r * width + c + (event.shiftKey ? -1 : 1);
    if (next < 0) return;
    if (next >= block.data.content.length * width) {
      if (block.data.content.length >= 100) return;
      this.transaction(() => block.data.content.push(Array(width).fill('')));
    }
    this.focus(block.id, `cell:${Math.floor(next / width)}:${next % width}`, 'start');
  }
  insertLineBreak(field) {
    const range = selectionRange(this.holder);
    if (!range || !field.contains(range.commonAncestorContainer)) return;
    range.deleteContents();
    const br = document.createElement('br'); range.insertNode(br);
    if (!br.nextSibling || (br.nextSibling.nodeType === Node.TEXT_NODE && !br.nextSibling.textContent && !br.nextSibling.nextSibling)) br.after(document.createElement('br'));
    range.setStartAfter(br); range.collapse(true); restoreRange(range);
    this.syncRow(field.closest('[data-block-id]')); this.changed();
  }
  crossBlockRange() {
    const range = selectionRange(this.holder);
    if (!range || range.collapsed) return null;
    const first = (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement).closest('[data-block-id]');
    const last = (range.endContainer.nodeType === Node.ELEMENT_NODE ? range.endContainer : range.endContainer.parentElement).closest('[data-block-id]');
    return first && last && first !== last ? { range, first, last } : null;
  }
  replaceCrossSelection(text) {
    const cross = this.crossBlockRange(); if (!cross) return;
    const { range, first, last } = cross;
    const left = document.createRange(), right = document.createRange();
    const firstField = (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement).closest('[data-field]') || first.querySelector('[data-field]');
    const lastField = (range.endContainer.nodeType === Node.ELEMENT_NODE ? range.endContainer : range.endContainer.parentElement).closest('[data-field]') || last.querySelector('[data-field]');
    if (!firstField || !lastField) return;
    left.selectNodeContents(firstField); left.setEnd(range.startContainer, range.startOffset);
    right.selectNodeContents(lastField); right.setStart(range.endContainer, range.endOffset);
    const a = document.createElement('div'), b = document.createElement('div'); a.append(left.cloneContents()); b.append(right.cloneContents());
    const replacement = makeBlock('paragraph', { text: sanitizeHTML(a.innerHTML + escapeHTML(text) + b.innerHTML) });
    const from = this.index(first.dataset.blockId), to = this.index(last.dataset.blockId);
    this.transaction(() => this.blocks.splice(from, to - from + 1, replacement));
    restoreBookmark(this.holder, { id: replacement.id, field: 'text', offset: a.textContent.length + text.length }); this.activeId = replacement.id;
  }
  paste(event) {
    if (this.readOnly) return;
    const clipboard = event.clipboardData;
    if (clipboard.files.length) { event.preventDefault(); this.request('files', { files: [...clipboard.files], index: this.index() + 1 }); return; }
    const field = event.target.closest('[data-field]');
    if (!field) return;
    event.preventDefault();
    const text = clipboard.getData('text/plain');
    if (['code', 'html'].includes(field.dataset.field)) { document.execCommand('insertText', false, text); this.syncAll(); this.changed(); return; }
    const serialized = clipboard.getData('application/x-retard-editor');
    let incoming;
    try {
      if (serialized) incoming = normalizeDocument(JSON.parse(serialized), this.registry.names()).blocks.map(block => ({ ...block, id: makeBlock().id }));
      else {
        const html = clipboard.getData('text/html');
        if (html) incoming = fromHTML(html);
        else if (embedURL(text.trim()) && !field.textContent.trim()) incoming = [makeBlock('embed', { source: text.trim(), embed: embedURL(text.trim()) })];
        else if (/^https?:\/\/[^\s]+\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(text.trim()) && !field.textContent.trim()) incoming = [makeBlock('image', { file: { url: text.trim() } })];
        else incoming = fromMarkdown(text);
      }
      if (!incoming.length) return;
      incoming = sanitizeBlocks(normalizeDocument({ blocks: incoming }, this.registry.names()).blocks);
      if (this.crossBlockRange()) this.replaceCrossSelection('');
      if (incoming.length === 1 && incoming[0].type === 'paragraph' && !serialized) {
        document.execCommand('insertHTML', false, sanitizeHTML(incoming[0].data.text)); this.syncAll(); this.changed();
      } else {
        const currentField = document.activeElement.closest('[data-field]');
        const id = currentField?.closest('[data-block-id]').dataset.blockId || this.activeId;
        const current = this.getBlock(id);
        this.transaction(() => {
          let at = this.index(id) + 1;
          if (current && ['paragraph', 'header'].includes(current.type) && currentField) {
            const [left, right] = splitAtCaret(currentField);
            if (!plainText(left)) { at--; this.blocks.splice(at, 1); }
            else current.data.text = sanitizeHTML(left);
            if (plainText(right)) incoming.push(makeBlock('paragraph', { text: sanitizeHTML(right) }));
          }
          this.blocks.splice(Math.max(0, at), 0, ...sanitizeBlocks(incoming));
        }, { id: incoming.at(-1).id });
      }
    } catch (error) { this.request('notice', error.message); }
  }
  copy(event, cut = false) {
    if (this.selected.size) {
      const blocks = this.getData().blocks.filter(b => this.selected.has(b.id));
      event.preventDefault();
      event.clipboardData.setData('application/x-retard-editor', JSON.stringify({ blocks }));
      event.clipboardData.setData('text/plain', toMarkdown(blocks));
      event.clipboardData.setData('text/html', toHTML(blocks, ''));
      if (cut && !this.readOnly) this.transaction(() => { this.blocks = this.blocks.filter(b => !this.selected.has(b.id)); this.selected.clear(); });
    } else if (this.crossBlockRange()) {
      const cross = this.crossBlockRange();
      const container = document.createElement('div'); container.append(cross.range.cloneContents());
      container.querySelectorAll('.block-controls,.table-actions,.media-edit').forEach(el => el.remove());
      event.preventDefault(); event.clipboardData.setData('text/html', container.innerHTML); event.clipboardData.setData('text/plain', cross.range.toString());
      if (cut && !this.readOnly) this.replaceCrossSelection('');
    }
  }
  showInline() {
    if (this.readOnly || this.composing || this.menu || document.querySelector('dialog[open]')) { this.inline.hidden = true; return; }
    const range = selectionRange(this.holder);
    this.updateFormatbar();
    if (range) this.savedRange = range;
    if (!range || range.collapsed || this.crossBlockRange()) { this.inline.hidden = true; return; }
    const field = (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement)?.closest('[data-field]');
    if (!field || !field.contains(range.endContainer) || ['code', 'html'].includes(field.dataset.field)) { this.inline.hidden = true; return; }
    this.savedRange = range;
    const rect = range.getBoundingClientRect();
    this.inline.hidden = false;
    this.updateFormatbar();
    this.inline.style.left = `${Math.max(8, Math.min(window.innerWidth - this.inline.offsetWidth - 8, rect.left + rect.width / 2 - this.inline.offsetWidth / 2))}px`;
    this.inline.style.top = `${Math.max(8, rect.top - this.inline.offsetHeight - 10)}px`;
  }
  format(action, value, label) {
    if (this.readOnly) return;
    const range = selectionRange(this.holder) || this.savedRange;
    if (!range?.startContainer.isConnected || !this.holder.contains(range.startContainer) || !this.holder.contains(range.endContainer)) { this.request('notice', 'Click in a block and select the text you want to format.'); return; }
    const field = (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement)?.closest('[data-field]');
    if (!field || !field.contains(range.endContainer) || ['code', 'html'].includes(field.dataset.field)) { this.request('notice', 'Select text within one text block, list item, or table cell.'); return; }
    if (action === 'link' && value === undefined) { this.savedRange = range.cloneRange(); this.request('link', { url: range.startContainer.parentElement?.closest('a')?.getAttribute('href') || '', text: range.toString() }); return; }
    if (action === 'footnote' && value === undefined) { this.savedRange = range.cloneRange(); this.request('footnote', {}); return; }
    if (['color', 'background'].includes(action) && value === undefined) {
      if (range.collapsed) { this.request('notice', 'Select the words you want to colour first.'); return; }
      this.savedRange = range.cloneRange(); this.request('color', { kind: action }); return;
    }
    restoreRange(range);
    this.flush();
    if (action === 'footnote') {
      const row = (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement).closest('[data-block-id]');
      const block = this.getBlock(row?.dataset.blockId);
      if (!block || !String(value || '').trim()) return;
      block.tunes.footnotes ||= [];
      block.tunes.footnotes.push(escapeHTML(value));
      const marker = document.createElement('sup');
      marker.dataset.tune = 'footnotes'; marker.textContent = String(block.tunes.footnotes.length);
      range.collapse(false); range.insertNode(marker); range.setStartAfter(marker); range.collapse(true); restoreRange(range);
      this.syncAll(); const caret = bookmark(this.holder); row._editorSignature = null; this.render(); restoreBookmark(this.holder, caret);
    } else if (action === 'link') {
      const existingLink = (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement)?.closest('a');
      if (!value && range.collapsed && existingLink) { const caret = bookmark(this.holder); existingLink.replaceWith(...existingLink.childNodes); restoreBookmark(this.holder, caret); }
      else if (!value) document.execCommand('unlink');
      else {
        const url = safeURL(value);
        if (!url) { this.request('notice', 'Enter a valid http, https, email, or telephone link.'); return; }
        if (range.collapsed && existingLink && this.holder.contains(existingLink)) { existingLink.href = url; existingLink.target = '_blank'; existingLink.rel = 'noopener noreferrer'; if (label) existingLink.textContent = label; }
        else if (range.collapsed) { const link = document.createElement('a'); link.href = url; link.textContent = label || url; link.target = '_blank'; link.rel = 'noopener noreferrer'; range.insertNode(link); range.setStartAfter(link); range.collapse(true); restoreRange(range); }
        else document.execCommand('createLink', false, url);
      }
    } else if (action === 'removeFormat' && !range.collapsed) {
      const before = document.createRange(), after = document.createRange();
      before.selectNodeContents(field); before.setEnd(range.startContainer, range.startOffset);
      after.selectNodeContents(field); after.setStart(range.endContainer, range.endOffset);
      const content = range.cloneContents(), left = before.cloneContents(), right = after.cloneContents();
      content.querySelectorAll('b,strong,i,em,u,s,strike,mark,code,sub,sup:not([data-tune]),span').forEach(node => node.replaceWith(...node.childNodes));
      const start = document.createTextNode(''), end = document.createTextNode('');
      field.replaceChildren(left, start, content, end, right);
      range.setStartAfter(start); range.setEndBefore(end); start.remove(); end.remove(); restoreRange(range);
    } else if (['mark', 'code', 'sub', 'sup', 'color', 'background'].includes(action)) {
      if (range.collapsed) return;
      const tag = action === 'color' ? 'span' : action === 'background' ? 'mark' : action;
      const parent = (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement)?.closest(tag);
      if (parent && parent.contains(range.endContainer) && !['color', 'background'].includes(action)) {
        const content = [...parent.childNodes]; parent.replaceWith(...content);
        const restored = document.createRange(); if (content.length) { restored.setStartBefore(content[0]); restored.setEndAfter(content.at(-1)); restoreRange(restored); }
      } else {
        const element = document.createElement(tag);
        if (action === 'color') element.style.color = value || 'inherit';
        if (action === 'background') { element.style.backgroundColor = value || 'transparent'; element.style.color = 'inherit'; }
        const content = range.extractContents();
        if (['color', 'background'].includes(action)) {
          const property = action === 'color' ? 'color' : 'background-color';
          content.querySelectorAll('[style]').forEach(node => node.style.removeProperty(property));
          if (action === 'background') content.querySelectorAll('mark').forEach(node => { node.style.backgroundColor = 'transparent'; });
        }
        element.append(content); range.insertNode(element); range.selectNodeContents(element); restoreRange(range);
      }
    } else document.execCommand(action, false, value);
    this.syncAll(); this.changed(true); this.savedRange = selectionRange(this.holder); this.updateFormatbar(); this.showInline();
  }
  checkSlash(field, row) {
    if (!row || !field.matches('[data-field="text"]') || this.getBlock(row.dataset.blockId).type !== 'paragraph') return;
    const text = field.textContent;
    if (/^\/[^\n]{0,40}$/.test(text)) {
      if (!this.menu || this.menu.dataset.kind !== 'toolbox') this.openToolbox(row.dataset.blockId, field, true);
      this.filterTools(text.slice(1));
    } else if (this.menu?.dataset.slash === 'true') this.closeMenu();
  }
  placeMenu(menu, anchor) {
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(menu.offsetWidth || 310, window.innerWidth - 16);
    menu.style.left = `${Math.max(8, Math.min(window.innerWidth - width - 8, rect.left))}px`;
    const below = window.innerHeight - rect.bottom;
    menu.style.maxHeight = `${Math.max(160, Math.min(390, Math.max(below, rect.top) - 18))}px`;
    if (below < 240 && rect.top > below) { menu.style.bottom = `${window.innerHeight - rect.top + 6}px`; menu.style.top = 'auto'; }
    else menu.style.top = `${rect.bottom + 6}px`;
  }
  openToolbox(id, anchor, slash = false, convert = false) {
    if (this.readOnly) return;
    this.closeMenu(); this.inline.hidden = true;
    this.menu = document.createElement('div'); this.menu.className = 'editor-popover toolbox';
    this.menu.dataset.kind = 'toolbox'; this.menu.dataset.slash = String(slash);
    this.menu.setAttribute('role', 'dialog'); this.menu.setAttribute('aria-label', 'Insert a block');
    this.menu.innerHTML = `<div class="toolbox-search">${icon('search', 16)}<input placeholder="Search blocks…" aria-label="Search blocks"></div><div class="toolbox-results" role="listbox" aria-label="Block types"></div><div class="menu-footer"><span>↑↓ to navigate</span><span>↵ to insert</span><kbd>esc</kbd></div>`;
    document.body.append(this.menu); this.placeMenu(this.menu, anchor);
    this.menuContext = { id, slash, convert };
    this.menu.querySelector('input').addEventListener('input', event => this.filterTools(event.target.value));
    this.menu.addEventListener('keydown', event => { if (['ArrowUp', 'ArrowDown', 'Enter', 'Tab'].includes(event.key)) { event.preventDefault(); this.menuNavigate(event.key); } if (event.key === 'Escape') { this.closeMenu(); this.focus(id); } });
    this.menu.addEventListener('pointerdown', event => { if (event.target.closest('[data-choice]')) event.preventDefault(); });
    this.menu.addEventListener('click', event => { const btn = event.target.closest('[data-choice]'); if (btn) this.chooseTool(Number(btn.dataset.choice)); });
    this.filterTools('');
    if (!slash) this.menu.querySelector('input').focus();
  }
  filterTools(query) {
    this.filteredTools = toolChoices(this.registry).filter(tool => `${tool.title} ${tool.description} ${tool.type}`.toLowerCase().includes(query.toLowerCase()));
    this.menuIndex = 0;
    this.menu.querySelector('.toolbox-results').innerHTML = this.filteredTools.length ? this.filteredTools.map((tool, i) => `<button role="option" aria-selected="${i === 0}" data-choice="${i}" class="tool-option ${i === 0 ? 'active' : ''}"><span class="tool-icon">${icon(tool.icon, 21)}</span><span><strong>${escapeHTML(tool.title)}</strong><small>${escapeHTML(tool.description || '')}</small></span><kbd>${escapeHTML(tool.shortcut || '')}</kbd></button>`).join('') : '<div class="empty-search">No blocks found</div>';
  }
  menuNavigate(key) {
    if (!this.filteredTools?.length) return;
    if (['Enter', 'Tab'].includes(key)) { this.chooseTool(this.menuIndex); return; }
    this.menuIndex = (this.menuIndex + (key === 'ArrowDown' ? 1 : -1) + this.filteredTools.length) % this.filteredTools.length;
    this.menu.querySelectorAll('[data-choice]').forEach((btn, i) => { btn.classList.toggle('active', i === this.menuIndex); btn.setAttribute('aria-selected', String(i === this.menuIndex)); });
    this.menu.querySelector('.tool-option.active')?.scrollIntoView({ block: 'nearest' });
  }
  chooseTool(index) {
    const tool = this.filteredTools[index];
    const { id, slash, convert } = this.menuContext;
    const block = this.getBlock(id);
    if (slash || convert || (block.type === 'paragraph' && !plainText(block.data.text))) {
      if (slash) { const field = this.row(id)?.querySelector('[data-field="text"]'); if (field) field.innerHTML = ''; this.syncRow(this.row(id)); }
      this.convert(id, tool.type, tool.data);
    } else this.insert(tool.type, tool.data, this.index(id) + 1);
    this.closeMenu();
  }
  openBlockMenu(id, anchor) {
    this.closeMenu(); this.inline.hidden = true;
    const block = this.getBlock(id);
    this.menu = document.createElement('div'); this.menu.className = 'editor-popover block-menu'; this.menu.setAttribute('role', 'menu');
    const actions = [['text', 'Turn into…', 'convert'], ['copy', 'Duplicate', 'duplicate'], ['up', 'Move up', 'up'], ['down', 'Move down', 'down'], ['left', 'Align left', 'left'], ['center', 'Align centre', 'center'], ['alignRight', 'Align right', 'right']];
    if (block.type === 'image') actions.push(['image', 'Toggle border', 'border'], ['expand', 'Toggle full width', 'stretch'], ['image', 'Toggle background', 'background'], ['settings', 'Edit image', 'configure']);
    if (['embed', 'attaches', 'audio', 'video', 'linkTool'].includes(block.type)) actions.push(['settings', 'Edit media', 'configure']);
    if (block.tunes.footnotes?.length) actions.push(['book', 'Edit footnotes', 'footnotes']);
    actions.push(['trash', 'Delete block', 'delete']);
    this.menu.innerHTML = `<div class="menu-label">${escapeHTML(this.registry.get(block.type).title)}</div>${block.type === 'header' ? `<div class="heading-level-grid">${[1, 2, 3, 4, 5, 6].map(level => `<button type="button" data-heading-level="${level}" aria-label="Heading ${level}" aria-pressed="${block.data.level === level}" class="${block.data.level === level ? 'selected' : ''}">H<span>${level}</span></button>`).join('')}</div>` : ''}${actions.map(([glyph, label, action]) => `<button role="menuitem" data-tune="${action}" class="${action === 'delete' ? 'danger' : ''}">${icon(glyph, 16)}<span>${label}</span>${action === 'duplicate' ? '<kbd>⌘⇧D</kbd>' : ''}</button>`).join('')}`;
    document.body.append(this.menu); this.placeMenu(this.menu, anchor);
    this.menu.addEventListener('click', event => {
      const level = event.target.closest('[data-heading-level]')?.dataset.headingLevel;
      if (level) { this.convert(id, 'header', { level: Number(level) }); return; }
      const action = event.target.closest('[data-tune]')?.dataset.tune;
      if (!action) return;
      if (action === 'convert') { this.openToolbox(id, anchor, false, true); return; }
      if (action === 'duplicate') this.duplicate(id);
      if (action === 'delete') this.delete(id);
      if (['up', 'down'].includes(action)) this.move(id, this.index(id) + (action === 'up' ? -1 : 1));
      if (['left', 'center', 'right'].includes(action)) this.transaction(() => { block.tunes.alignment = action; });
      if (['border', 'stretch', 'background'].includes(action)) this.transaction(() => { const key = { border: 'withBorder', stretch: 'stretched', background: 'withBackground' }[action]; block.data[key] = !block.data[key]; });
      if (action === 'configure') this.request('configure', { block: clone(block) });
      if (action === 'footnotes') this.request('footnotes', { block: clone(block) });
      this.closeMenu();
    });
    this.menu.addEventListener('keydown', event => {
      const buttons = [...this.menu.querySelectorAll('button')], index = buttons.indexOf(document.activeElement);
      if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length].focus(); }
      if (event.key === 'Escape') { this.closeMenu(); this.focus(id); }
    });
    this.menu.querySelector('button').focus();
  }
  closeMenu() { this.menu?.remove(); this.menu = null; this.menuContext = null; }
}
export default RetardEditor;
