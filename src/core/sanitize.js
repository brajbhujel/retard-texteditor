import { safeURL } from './model.js';
const tags = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'MARK', 'CODE', 'A', 'BR', 'SUB', 'SUP', 'SPAN']);
export function sanitizeHTML(input) {
  const template = document.createElement('template');
  template.innerHTML = String(input || '');
  function clean(parent) {
    for (const node of [...parent.childNodes]) {
      if (node.nodeType === Node.COMMENT_NODE) { node.remove(); continue; }
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'TEMPLATE'].includes(node.tagName)) { node.remove(); continue; }
      clean(node);
      if (!tags.has(node.tagName)) { node.replaceWith(...node.childNodes); continue; }
      const href = node.tagName === 'A' ? safeURL(node.getAttribute('href')) : '';
      const color = node.style.color;
      const footnote = node.tagName === 'SUP' && node.getAttribute('data-tune') === 'footnotes';
      for (const attr of [...node.attributes]) node.removeAttribute(attr.name);
      if (footnote) node.setAttribute('data-tune', 'footnotes');
      if (href) { node.setAttribute('href', href); node.setAttribute('target', '_blank'); node.setAttribute('rel', 'noopener noreferrer'); }
      if (node.tagName === 'SPAN' && /^(#[\da-f]{3,8}|rgba?\([\d\s,.%]+\)|[a-z]+)$/i.test(color)) node.style.color = color;
    }
  }
  clean(template.content);
  return template.innerHTML;
}
export function plainText(html) {
  const el = document.createElement('div');
  el.innerHTML = sanitizeHTML(html);
  return el.textContent || '';
}
export function sanitizeBlocks(blocks) {
  const copy = structuredClone(blocks);
  const list = items => items.forEach(item => { item.content = sanitizeHTML(item.content); list(item.items || []); });
  for (const b of copy) {
    if (Array.isArray(b.tunes.footnotes)) b.tunes.footnotes = b.tunes.footnotes.map(sanitizeHTML);
    for (const key of ['text', 'caption', 'title', 'message']) if (typeof b.data[key] === 'string') b.data[key] = sanitizeHTML(b.data[key]);
    if (b.type === 'list') list(b.data.items);
    if (b.type === 'checklist') b.data.items.forEach(item => { item.text = sanitizeHTML(item.text); });
    if (b.type === 'table') b.data.content = b.data.content.map(row => row.map(sanitizeHTML));
    if (b.type === 'image') b.data.file.url = safeURL(b.data.file.url, 'image');
    if (b.type === 'attaches') b.data.file.url = safeURL(b.data.file.url, 'file');
    if (b.type === 'linkTool') b.data.link = safeURL(b.data.link);
    if (['audio', 'video'].includes(b.type)) b.data.url = safeURL(b.data.url, 'file');
  }
  return copy;
}
