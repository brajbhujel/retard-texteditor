export const VERSION = '1.0.0';
export const uid = () => globalThis.crypto.randomUUID();
export const clone = value => structuredClone(value);
export const textOf = value => String(value ?? '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export function safeURL(value, kind = 'link') {
  const url = String(value ?? '').trim();
  if (/^https?:\/\//i.test(url)) { try { return new URL(url).href; } catch { return ''; } }
  if (kind === 'link' && /^(mailto:|tel:)/i.test(url)) return url;
  if (kind === 'image' && /^data:image\/(png|jpeg|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i.test(url)) return url;
  if (kind === 'file' && /^data:(application\/(pdf|octet-stream)|text\/plain|image\/(png|jpeg|gif|webp)|audio\/[a-z0-9.+-]+|video\/(mp4|webm));base64,[a-z0-9+/=\s]+$/i.test(url)) return url;
  if (/^\/(?!\/)[^\s]*$/.test(url) && !url.includes('\\')) return url;
  return '';
}
export function embedURL(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) return '';
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com') {
      const id = host === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') || url.pathname.split('/').at(-1);
      return /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : '';
    }
    if (['vimeo.com', 'player.vimeo.com'].includes(host)) {
      const id = url.pathname.split('/').at(-1);
      return /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : '';
    }
  } catch { return ''; }
  return '';
}
export function makeBlock(type = 'paragraph', data = {}, tunes = {}) {
  const defaults = {
    paragraph: { text: '' }, header: { text: '', level: 2 },
    list: { style: 'unordered', items: [{ content: '', meta: {}, items: [] }] },
    checklist: { items: [{ text: '', checked: false }] },
    quote: { text: '', caption: '', alignment: 'left' }, warning: { title: '', message: '' },
    code: { code: '', language: 'javascript' }, raw: { html: '' }, delimiter: {},
    table: { withHeadings: true, content: [['', '', ''], ['', '', ''], ['', '', '']] },
    image: { file: { url: '' }, caption: '', withBorder: false, withBackground: false, stretched: false },
    embed: { source: '', embed: '', caption: '' }, linkTool: { link: '', meta: { title: '', description: '' } },
    attaches: { file: { url: '', name: '', size: 0 }, title: '' },
    toggle: { title: '', text: '', open: true }, audio: { url: '', caption: '' }, video: { url: '', caption: '' },
  };
  return { id: uid(), type, data: { ...(defaults[type] || {}), ...clone(data) }, tunes: clone(tunes) };
}
export function flattenList(items, depth = 0) {
  return items.flatMap(item => {
    const value = typeof item === 'string' ? { content: item, meta: {}, items: [] } : item;
    return [{ content: value.content || '', checked: !!value.meta?.checked, depth }, ...flattenList(value.items || [], depth + 1)];
  });
}
export function nestList(items) {
  const root = [], parents = [];
  for (const entry of items) {
    const depth = Math.max(0, Math.min(Number(entry.depth) || 0, parents.length, 8));
    const item = { content: entry.content, meta: { checked: !!entry.checked }, items: [] };
    (depth ? parents[depth - 1].items : root).push(item);
    parents[depth] = item;
    parents.length = depth + 1;
  }
  return root;
}
export function normalizeDocument(input, allowedTypes) {
  if (!input || !Array.isArray(input.blocks)) throw new Error('Choose an Editor.js JSON document with a blocks array.');
  if (input.blocks.length > 5000) throw new Error('Documents can contain up to 5,000 blocks.');
  const ids = new Set();
  let itemCount = 0;
  function list(items, depth = 0) {
    if (!Array.isArray(items) || depth > 8) throw new Error('Invalid or excessively nested list.');
    return items.map(item => {
      if (++itemCount > 10000) throw new Error('Too many list items.');
      if (typeof item === 'string') return { content: item, meta: {}, items: [] };
      if (!item || typeof item.content !== 'string') throw new Error('Invalid list item.');
      return { content: item.content, meta: { checked: !!item.meta?.checked }, items: list(item.items || [], depth + 1) };
    });
  }
  const blocks = input.blocks.map((block, index) => {
    if (!block || typeof block.type !== 'string' || !block.data || typeof block.data !== 'object' || Array.isArray(block.data)) throw new Error(`Block ${index + 1} is invalid.`);
    if (allowedTypes && !allowedTypes.includes(block.type)) throw new Error(`Unsupported block type: ${block.type}. Register its tool before importing.`);
    const b = makeBlock(block.type, block.data, block.tunes && typeof block.tunes === 'object' ? block.tunes : {});
    if (typeof block.id === 'string' && /^[\w-]{1,100}$/.test(block.id) && !ids.has(block.id)) b.id = block.id;
    ids.add(b.id);
    if (b.tunes.footnotes !== undefined && (!Array.isArray(b.tunes.footnotes) || b.tunes.footnotes.length > 1000 || b.tunes.footnotes.some(note => typeof note !== 'string'))) throw new Error('Invalid footnotes.');
    for (const key of ['text', 'caption', 'title', 'message', 'code', 'html', 'url', 'source', 'embed', 'link']) if (key in b.data && typeof b.data[key] !== 'string') throw new Error(`Block ${index + 1}: ${key} must be text.`);
    if (b.type === 'header') b.data.level = Math.max(1, Math.min(6, Math.floor(Number(b.data.level)) || 2));
    if (b.type === 'list') { b.data.items = list(b.data.items); b.data.style = ['ordered', 'unordered', 'checklist'].includes(b.data.style) ? b.data.style : 'unordered'; }
    if (b.type === 'checklist') {
      if (!Array.isArray(b.data.items) || b.data.items.some(item => !item || typeof item.text !== 'string')) throw new Error('Invalid checklist.');
      b.data.items = b.data.items.map(item => ({ text: item.text, checked: !!item.checked }));
    }
    if (b.type === 'table') {
      if (!Array.isArray(b.data.content) || b.data.content.length > 100 || b.data.content.some(row => !Array.isArray(row) || row.length > 30 || row.some(cell => typeof cell !== 'string'))) throw new Error('Invalid table: maximum 100 rows and 30 columns.');
      const width = Math.max(1, ...b.data.content.map(row => row.length));
      b.data.content = b.data.content.length ? b.data.content.map(row => [...row, ...Array(width - row.length).fill('')]) : [['']];
    }
    if (['image', 'attaches'].includes(b.type) && (!b.data.file || typeof b.data.file !== 'object' || typeof b.data.file.url !== 'string')) throw new Error('Invalid file block.');
    if (b.type === 'linkTool') {
      if (!b.data.meta || typeof b.data.meta !== 'object') b.data.meta = { title: '', description: '' };
      for (const key of ['title', 'description']) if (b.data.meta[key] !== undefined && typeof b.data.meta[key] !== 'string') throw new Error('Bookmark titles and descriptions must be text.');
    }
    return b;
  });
  return { time: Number(input.time) || Date.now(), version: input.version || VERSION, blocks: blocks.length ? blocks : [makeBlock()] };
}
export function blockText(block) {
  const d = block.data;
  if (block.type === 'code') return d.code;
  if (block.type === 'raw') return d.html;
  if (block.type === 'list') return flattenList(d.items).map(item => textOf(item.content)).join('\n');
  if (block.type === 'checklist') return d.items.map(item => textOf(item.text)).join('\n');
  if (block.type === 'table') return d.content.map(row => row.map(textOf).join('\t')).join('\n');
  return ['text', 'title', 'message', 'caption', 'code', 'html'].filter(key => d[key]).map(key => textOf(d[key])).join('\n');
}
export function statistics(blocks) {
  const text = blocks.map(blockText).join(' ').trim();
  const words = text ? text.split(/\s+/u).length : 0;
  return { words, characters: text.length, blocks: blocks.length, minutes: Math.max(1, Math.ceil(words / 220)) };
}
export class History {
  constructor(limit = 100) { this.limit = limit; this.entries = []; this.position = -1; }
  reset(value) { this.entries = [clone(value)]; this.position = 0; }
  push(value) {
    if (JSON.stringify(this.entries[this.position]?.blocks) === JSON.stringify(value.blocks)) return false;
    this.entries.splice(this.position + 1);
    this.entries.push(clone(value));
    if (this.entries.length > this.limit) this.entries.shift();
    this.position = this.entries.length - 1;
    return true;
  }
  undo() { return this.canUndo ? clone(this.entries[--this.position]) : null; }
  redo() { return this.canRedo ? clone(this.entries[++this.position]) : null; }
  get canUndo() { return this.position > 0; }
  get canRedo() { return this.position < this.entries.length - 1; }
}
