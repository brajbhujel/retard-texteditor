import { escapeHTML as e, makeBlock, flattenList, textOf, safeURL, embedURL, nestList } from './model.js';
import { sanitizeHTML as s } from './sanitize.js';
const inlineMarkdown = html => s(html).replace(/<(b|strong)>(.*?)<\/\1>/gis, '**$2**').replace(/<(i|em)>(.*?)<\/\1>/gis, '*$2*').replace(/<code>(.*?)<\/code>/gis, '`$1`').replace(/<(s|strike)>(.*?)<\/\1>/gis, '~~$2~~').replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gis, '[$2]($1)').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '');
export function toMarkdown(blocks) {
  return blocks.map(b => {
    const d = b.data;
    switch (b.type) {
      case 'paragraph': return inlineMarkdown(d.text);
      case 'header': return `${'#'.repeat(d.level)} ${inlineMarkdown(d.text)}`;
      case 'list': return flattenList(d.items).map((item, i) => `${'  '.repeat(item.depth)}${d.style === 'ordered' ? `${i + 1}.` : d.style === 'checklist' ? `- [${item.checked ? 'x' : ' '}]` : '-'} ${inlineMarkdown(item.content)}`).join('\n');
      case 'checklist': return d.items.map(item => `- [${item.checked ? 'x' : ' '}] ${inlineMarkdown(item.text)}`).join('\n');
      case 'quote': return `${inlineMarkdown(d.text).split('\n').map(line => `> ${line}`).join('\n')}${d.caption ? `\n> — ${inlineMarkdown(d.caption)}` : ''}`;
      case 'warning': return `> **${inlineMarkdown(d.title)}**\n> ${inlineMarkdown(d.message)}`;
      case 'code': { const fence = '`'.repeat(Math.max(3, ...(d.code.match(/`+/g) || []).map(run => run.length + 1))); return `${fence}${d.language || ''}\n${d.code}\n${fence}`; }
      case 'raw': return `\`\`\`html\n${d.html}\n\`\`\``;
      case 'delimiter': return '---';
      case 'image': return `![${textOf(d.caption || d.alt || '')}](${safeURL(d.file.url, 'image')})`;
      case 'table': return d.content.map((row, i) => `| ${row.map(cell => inlineMarkdown(cell).replace(/\|/g, '\\|').replace(/\n/g, '<br>')).join(' | ')} |${i === 0 ? `\n| ${row.map(() => '---').join(' | ')} |` : ''}`).join('\n');
      case 'linkTool': return `[${textOf(d.meta.title || d.link)}](${safeURL(d.link)})${d.meta.description ? `\n\n${textOf(d.meta.description)}` : ''}`;
      case 'attaches': return `[${textOf(d.title || d.file.name)}](${safeURL(d.file.url, 'file')})`;
      case 'embed': return `[${textOf(d.caption) || 'Video'}](${safeURL(d.source)})`;
      case 'audio': case 'video': return `[${textOf(d.caption) || b.type}](${safeURL(d.url, 'file')})`;
      case 'toggle': return `### ${inlineMarkdown(d.title)}\n\n${inlineMarkdown(d.text)}`;
      default: return textOf(JSON.stringify(d));
    }
  }).join('\n\n');
}
export function markdownInline(text) {
  const tokens = [];
  let html = e(text).replace(/`([^`]+)`/g, (_, code) => { tokens.push(`<code>${code}</code>`); return `\u0000${tokens.length - 1}\u0000`; });
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/~~(.+?)~~/g, '<s>$1</s>').replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<i>$1</i>');
  return s(html.replace(/\u0000(\d+)\u0000/g, (_, i) => tokens[Number(i)]));
}
export function fromMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    let match;
    if ((match = line.match(/^(`{3,})([\w-]*)\s*$/))) {
      const code = [], fence = match[1], language = match[2] || 'text';
      while (++i < lines.length && !lines[i].startsWith(fence)) code.push(lines[i]);
      blocks.push(makeBlock('code', { code: code.join('\n'), language }));
    } else if ((match = line.match(/^(#{1,6})\s+(.*)$/))) blocks.push(makeBlock('header', { level: match[1].length, text: markdownInline(match[2]) }));
    else if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) blocks.push(makeBlock('delimiter'));
    else if ((match = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/))) blocks.push(makeBlock('image', { file: { url: safeURL(match[2], 'image') }, caption: e(match[1]) }));
    else if (/^\s*(-|\*|\d+\.)\s/.test(line)) {
      const rows = [];
      const ordered = /^\s*\d+\./.test(line);
      const checklist = /^\s*-\s\[[ xX]\]/.test(line);
      do {
        const m = lines[i].match(/^(\s*)(?:[-*]|\d+\.)\s+(?:\[([ xX])\]\s+)?(.*)$/);
        if (!m) break;
        rows.push({ content: markdownInline(m[3]), checked: /x/i.test(m[2] || ''), depth: Math.floor(m[1].length / 2) });
        i++;
      } while (i < lines.length && /^\s*(-|\*|\d+\.)\s/.test(lines[i]));
      i--;
      blocks.push(makeBlock('list', { style: checklist ? 'checklist' : ordered ? 'ordered' : 'unordered', items: nestList(rows) }));
    } else if (/^>\s?/.test(line)) {
      const quote = [];
      do { quote.push(lines[i].replace(/^>\s?/, '')); i++; } while (i < lines.length && /^>/.test(lines[i]));
      i--; blocks.push(makeBlock('quote', { text: quote.map(markdownInline).join('<br>') }));
    } else if (line.startsWith('|') && /^\|[\s:|\-]+\|$/.test(lines[i + 1] || '')) {
      const content = [line.trim().slice(1, -1).split(/(?<!\\)\|/).map(cell => markdownInline(cell.trim()))];
      i += 2;
      while (i < lines.length && lines[i].startsWith('|')) { content.push(lines[i].trim().slice(1, -1).split(/(?<!\\)\|/).map(cell => markdownInline(cell.trim()))); i++; }
      i--; blocks.push(makeBlock('table', { withHeadings: true, content }));
    } else {
      const paragraph = [line];
      while (i + 1 < lines.length && lines[i + 1].trim() && !/^(#{1,6}\s|>|[-*]\s|\d+\.\s|```|---|\|)/.test(lines[i + 1])) paragraph.push(lines[++i]);
      blocks.push(makeBlock('paragraph', { text: paragraph.map(markdownInline).join('<br>') }));
    }
  }
  return blocks.length ? blocks : [makeBlock()];
}
export function fromHTML(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,svg,math').forEach(el => el.remove());
  const blocks = [];
  const readList = el => [...el.children].filter(n => n.tagName === 'LI').map(li => {
    const copy = li.cloneNode(true), nested = [...copy.children].filter(n => ['UL', 'OL'].includes(n.tagName));
    const items = nested.flatMap(readList); nested.forEach(n => n.remove());
    return { content: s(copy.innerHTML), meta: {}, items };
  });
  function visit(node) {
    if (node.nodeType === Node.TEXT_NODE) { if (node.textContent.trim()) blocks.push(makeBlock('paragraph', { text: e(node.textContent) })); return; }
    if (!(node instanceof Element)) return;
    if (/^H[1-6]$/.test(node.tagName)) blocks.push(makeBlock('header', { text: s(node.innerHTML), level: Number(node.tagName[1]) }));
    else if (['UL', 'OL'].includes(node.tagName)) blocks.push(makeBlock('list', { style: node.tagName === 'OL' ? 'ordered' : 'unordered', items: readList(node) }));
    else if (node.tagName === 'TABLE') blocks.push(makeBlock('table', { withHeadings: !!node.querySelector('th'), content: [...node.querySelectorAll('tr')].map(row => [...row.children].map(cell => s(cell.innerHTML))) }));
    else if (node.tagName === 'PRE') blocks.push(makeBlock('code', { code: node.textContent, language: 'text' }));
    else if (node.tagName === 'BLOCKQUOTE') blocks.push(makeBlock('quote', { text: s(node.innerHTML) }));
    else if (node.tagName === 'HR') blocks.push(makeBlock('delimiter'));
    else if (node.tagName === 'IMG') { const url = safeURL(node.getAttribute('src'), 'image'); if (url) blocks.push(makeBlock('image', { file: { url }, alt: node.getAttribute('alt') || '' })); }
    else if (node.querySelector('p,div,h1,h2,h3,h4,h5,h6,ul,ol,table,pre,blockquote,img,hr')) [...node.childNodes].forEach(visit);
    else if (node.textContent.trim() || node.tagName === 'P') blocks.push(makeBlock('paragraph', { text: s(node.innerHTML) }));
  }
  [...doc.body.childNodes].forEach(visit);
  return blocks;
}
export function toHTML(blocks, title = 'Untitled') {
  const listHTML = (items, style) => `<${style === 'ordered' ? 'ol' : 'ul'}>${items.map(item => `<li>${style === 'checklist' ? (item.meta?.checked ? '☑ ' : '☐ ') : ''}${s(item.content)}${item.items?.length ? listHTML(item.items, style) : ''}</li>`).join('')}</${style === 'ordered' ? 'ol' : 'ul'}>`;
  const body = blocks.map(b => {
    const d = b.data;
    let html = '';
    switch (b.type) {
      case 'paragraph': html = `<p>${s(d.text)}</p>`; break;
      case 'header': html = `<h${d.level}>${s(d.text)}</h${d.level}>`; break;
      case 'list': html = listHTML(d.items, d.style); break;
      case 'checklist': html = `<ul>${d.items.map(i => `<li>${i.checked ? '☑' : '☐'} ${s(i.text)}</li>`).join('')}</ul>`; break;
      case 'quote': html = `<blockquote>${s(d.text)}<footer>${s(d.caption)}</footer></blockquote>`; break;
      case 'warning': html = `<aside><strong>${s(d.title)}</strong><p>${s(d.message)}</p></aside>`; break;
      case 'code': html = `<pre><code>${e(d.code)}</code></pre>`; break;
      case 'raw': html = `<pre><code>${e(d.html)}</code></pre>`; break;
      case 'delimiter': html = '<hr>'; break;
      case 'image': html = `<figure><img src="${e(safeURL(d.file.url, 'image'))}" alt="${e(d.alt || textOf(d.caption))}"><figcaption>${s(d.caption)}</figcaption></figure>`; break;
      case 'table': html = `<table>${d.content.map((row, i) => `<tr>${row.map(cell => `<${i === 0 && d.withHeadings ? 'th' : 'td'}>${s(cell)}</${i === 0 && d.withHeadings ? 'th' : 'td'}>`).join('')}</tr>`).join('')}</table>`; break;
      case 'linkTool': html = `<p><a href="${e(safeURL(d.link))}">${e(textOf(d.meta.title || d.link))}</a></p><p>${e(textOf(d.meta.description))}</p>`; break;
      case 'attaches': html = `<p><a download href="${e(safeURL(d.file.url, 'file'))}">${e(textOf(d.title || d.file.name))}</a></p>`; break;
      case 'embed': html = `<p><a href="${e(safeURL(d.source))}">${e(textOf(d.caption) || 'Watch video')}</a></p>`; break;
      case 'audio': case 'video': html = `<${b.type} controls src="${e(safeURL(d.url, 'file'))}"></${b.type}><p>${s(d.caption)}</p>`; break;
      case 'toggle': html = `<details open><summary>${s(d.title)}</summary>${s(d.text)}</details>`; break;
    }
    const alignment = ['left', 'center', 'right', 'justify'].includes(b.tunes.alignment) ? b.tunes.alignment : 'left';
    return `<section style="text-align:${alignment}">${html}${b.tunes.footnotes?.length ? `<ol>${b.tunes.footnotes.map(note => `<li>${s(note)}</li>`).join('')}</ol>` : ''}</section>`;
  }).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)}</title><style>body{max-width:760px;margin:60px auto;padding:0 24px;font:17px/1.8 system-ui;color:#262830}h1,h2,h3{line-height:1.3}h1{font-size:40px}img,video{max-width:100%;border-radius:10px}figure{margin:24px 0}figcaption,footer{font-size:14px;color:#777}pre{background:#f3f4f7;padding:20px;overflow:auto;border-radius:10px}code{font-family:monospace}blockquote{border-left:3px solid #7165df;margin:24px 0;padding:8px 24px}aside{padding:20px;background:#f2efff;border-radius:10px}table{border-collapse:collapse;width:100%}td,th{padding:10px;border:1px solid #ddd}th{background:#f4f4f7}a{color:#635bda}mark{background:#fff0ab}hr{border:0;border-top:1px solid #ddd;margin:32px 0}</style></head><body><h1>${e(title)}</h1>${body}</body></html>`;
}
