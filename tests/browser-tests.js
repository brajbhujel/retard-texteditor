import { RetardEditor } from '../src/core/editor.js';
import { makeBlock } from '../src/core/model.js';
import { sanitizeHTML } from '../src/core/sanitize.js';
import { fromHTML, fromMarkdown, toHTML, toMarkdown } from '../src/core/serialization.js';
import { setCaret, restoreBookmark } from '../src/core/selection.js';

const results = [], report = document.getElementById('report'), fixture = document.getElementById('fixture');
let editor;
function assert(value, message = 'Assertion failed') { if (!value) throw new Error(message); }
function equal(a, b) { assert(JSON.stringify(a) === JSON.stringify(b), `Expected ${JSON.stringify(b)}, received ${JSON.stringify(a)}`); }
function reset(blocks = [makeBlock()]) {
  editor?.destroy();
  editor = new RetardEditor({ holder: fixture, data: { blocks } });
  return editor;
}
function field(index = 0, selector = '[data-field]') { return fixture.querySelectorAll('.editor-block')[index].querySelector(selector); }
function input(target, html) { target.innerHTML = html; target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' })); }
function key(target, key, options = {}) { target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options })); }
function select(target, start = 0, end = target.textContent.length) {
  target.focus(); const range = document.createRange(); const node = target.firstChild;
  range.setStart(node, start); range.setEnd(node, end); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
}
async function test(name, fn) {
  try { await fn(); results.push({ name, passed: true }); }
  catch (error) { results.push({ name, passed: false, error: error.stack || error.message }); }
}
await test('editor loads every built-in block', () => {
  reset(); const types = editor.registry.names();
  reset(types.map(type => makeBlock(type)));
  equal(fixture.querySelectorAll('.editor-block').length, types.length);
});
await test('typing updates JSON and preserves inline markup', () => {
  reset(); input(field(), '<b>Hello</b> world');
  equal(editor.getData().blocks[0].data.text, '<b>Hello</b> world');
});
await test('Enter splits text at the caret and Backspace merges it', () => {
  reset([makeBlock('paragraph', { text: 'Hello world' })]);
  restoreBookmark(fixture, { id: editor.blocks[0].id, field: 'text', offset: 6 });
  key(field(), 'Enter');
  equal(editor.blocks.map(b => b.data.text), ['Hello ', 'world']);
  setCaret(field(1), 'start'); key(field(1), 'Backspace');
  equal(editor.blocks.map(b => b.data.text), ['Hello world']);
});
await test('mobile beforeinput splits paragraphs', () => {
  reset([makeBlock('paragraph', { text: 'Mobile' })]); setCaret(field());
  field().dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertParagraph' }));
  equal(editor.blocks.length, 2);
});
await test('Markdown prefix creates a heading', () => {
  reset(); input(field(), '##'); setCaret(field()); key(field(), ' ');
  equal(editor.blocks[0].type, 'header'); equal(editor.blocks[0].data.level, 2); equal(editor.blocks[0].data.text, '');
});
await test('slash menu filters and inserts a table with Enter', () => {
  reset(); input(field(), '/table'); setCaret(field());
  assert(document.querySelector('.toolbox')); key(field(), 'Enter'); equal(editor.blocks[0].type, 'table'); assert(!document.querySelector('.toolbox'));
});
await test('undo and redo restore structural changes', () => {
  reset([makeBlock('paragraph', { text: 'First' })]);
  editor.insert('header', { text: 'Second', level: 2 }); equal(editor.blocks.length, 2);
  editor.undo(); equal(editor.blocks.length, 1); editor.redo(); equal(editor.blocks.length, 2);
});
await test('nested list indentation and outdent persist', () => {
  reset([makeBlock('list', { items: [{ content: 'Parent', items: [] }, { content: 'Child', items: [] }] })]);
  let item = field(0, '[data-field="item:1"]'); setCaret(item); key(item, 'Tab');
  equal(editor.blocks[0].data.items[0].items[0].content, 'Child');
  item = field(0, '[data-field="item:1"]'); key(item, 'Tab', { shiftKey: true }); equal(editor.blocks[0].data.items.length, 2);
});
await test('Enter on an empty list item exits the list', () => {
  reset([makeBlock('list', { items: [{ content: 'First', items: [] }, { content: '', items: [] }] })]);
  const item = field(0, '[data-field="item:1"]'); setCaret(item); key(item, 'Enter');
  equal(editor.blocks.map(b => b.type), ['list', 'paragraph']); equal(editor.blocks[0].data.items.length, 1);
});
await test('Backspace exits the first item of a longer list without dropping later items', () => {
  reset([makeBlock('list', { items: [{ content: 'First', items: [] }, { content: 'Second', items: [] }] })]);
  setCaret(field(), 'start'); key(field(), 'Backspace');
  equal(editor.blocks.map(b => b.type), ['paragraph', 'list']); equal(editor.blocks[1].data.items[0].content, 'Second');
});
await test('checkbox state is serialized and undoable', () => {
  reset([makeBlock('checklist')]); const checkbox = fixture.querySelector('input[type="checkbox"]'); checkbox.click();
  equal(editor.blocks[0].data.items[0].checked, true); editor.undo(); equal(editor.blocks[0].data.items[0].checked, false);
});
await test('table cells retain content and Tab extends the final row', () => {
  reset([makeBlock('table', { content: [['A', 'B']] })]);
  input(field(0, '[data-field="cell:0:1"]'), '<b>Updated</b>');
  key(field(0, '[data-field="cell:0:1"]'), 'Tab');
  equal(editor.blocks[0].data.content, [['A', '<b>Updated</b>'], ['', '']]);
});
await test('table row and column controls update the model', () => {
  reset([makeBlock('table', { content: [['A']] })]); fixture.querySelector('[data-block-action="table-row"]').click();
  fixture.querySelector('[data-block-action="table-column"]').click(); equal(editor.blocks[0].data.content, [['A', ''], ['', '']]);
});
await test('selected text can be bolded and linked', () => {
  reset([makeBlock('paragraph', { text: 'Hello world' })]); select(field(), 0, 5); editor.format('bold');
  assert(/<(b|strong)>Hello<\/(b|strong)>/.test(editor.getData().blocks[0].data.text));
  editor.format('link', 'https://example.com'); assert(editor.getData().blocks[0].data.text.includes('href="https://example.com/"'));
});
await test('footnotes retain their marker and note across save and load', async () => {
  reset([makeBlock('paragraph', { text: 'A thought' })]); select(field(), 0, 9); editor.format('footnote', 'A source');
  const data = editor.getData(); equal(data.blocks[0].tunes.footnotes, ['A source']); assert(data.blocks[0].data.text.includes('data-tune="footnotes"'));
  await editor.load(data); assert(fixture.querySelector('.block-footnotes').textContent.includes('A source'));
});
await test('block duplication generates a distinct identity and move reorders', () => {
  reset([makeBlock('paragraph', { text: 'A' }), makeBlock('paragraph', { text: 'B' })]);
  editor.duplicate(editor.blocks[0].id); equal(editor.blocks.length, 3); assert(editor.blocks[0].id !== editor.blocks[1].id);
  editor.move(editor.blocks[2].id, 0); equal(editor.blocks[0].data.text, 'B');
});
await test('shift-click can select several blocks for deletion', () => {
  reset([makeBlock('paragraph', { text: 'A' }), makeBlock('paragraph', { text: 'B' }), makeBlock('paragraph', { text: 'C' })]);
  const grips = fixture.querySelectorAll('.block-grip');
  grips[0].focus(); grips[0].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
  grips[1].focus(); grips[1].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
  equal(editor.selected.size, 2); key(grips[1], 'Delete'); equal(editor.blocks.map(b => b.data.text), ['C']);
});
await test('deleting every block retains a writable paragraph', () => {
  reset(); editor.delete(editor.blocks[0].id); equal(editor.blocks.length, 1); equal(editor.blocks[0].type, 'paragraph');
});
await test('read-only mode disables edit controls and mutations', () => {
  reset([makeBlock('paragraph', { text: 'Read me' })]); editor.setReadOnly(true);
  assert(!fixture.querySelector('[contenteditable="true"]')); assert(!fixture.querySelector('.block-controls'));
  editor.insert(); equal(editor.blocks.length, 1); editor.undo(); equal(editor.blocks[0].data.text, 'Read me');
});
await test('untrusted HTML strips scripts, event handlers, and javascript URLs', () => {
  const html = sanitizeHTML('<b onclick="alert(1)">safe</b><script>alert(1)</script><a href="javascript:alert(1)">link</a><img onerror="alert(1)" src=x><svg onload="alert(1)"></svg>');
  equal(html, '<b>safe</b><a>link</a>');
});
await test('raw HTML is stored as source and never executed', () => {
  reset([makeBlock('raw', { html: '<script>window.__unsafe = true</script>' })]);
  assert(!fixture.querySelector('script')); assert(!window.__unsafe); equal(editor.getData().blocks[0].data.html, '<script>window.__unsafe = true</script>');
});
await test('Markdown import parses headings, nested lists, checkboxes, code, and tables', () => {
  const blocks = fromMarkdown('# Heading\n\n- Parent\n  - Child\n\n- [x] Done\n\n```js\nconst x = 1;\n```\n\n| A | B |\n| --- | --- |\n| C | D |');
  equal(blocks.map(b => b.type), ['header', 'list', 'list', 'code', 'table']); equal(blocks[1].data.items[0].items[0].content, 'Child'); assert(blocks[2].data.items[0].meta.checked);
});
await test('HTML paste preserves structural paragraphs, lists, and tables', () => {
  const blocks = fromHTML('<h2>Title</h2><p><b>Hello</b></p><ul><li>One<ul><li>Child</li></ul></li></ul><table><tr><td>A</td></tr></table>');
  equal(blocks.map(b => b.type), ['header', 'paragraph', 'list', 'table']); equal(blocks[2].data.items[0].items[0].content, 'Child');
});
await test('safe HTML export escapes code and document titles', () => {
  const html = toHTML([makeBlock('code', { code: '<script>evil()</script>' })], '<img onerror=evil()>');
  assert(!html.includes('<script>')); assert(html.includes('&lt;script&gt;')); assert(html.includes('&lt;img onerror=evil()&gt;'));
});
await test('Markdown export protects code fence contents', () => {
  const md = toMarkdown([makeBlock('code', { code: '```\ninside', language: 'text' })]); assert(md.startsWith('````text')); assert(md.endsWith('````'));
});
await test('JSON round trip retains block IDs, content, and tunes', async () => {
  reset([makeBlock('quote', { text: '<i>Words</i>', caption: 'Author' }, { alignment: 'center' })]);
  const first = editor.getData(); await editor.load(JSON.parse(JSON.stringify(first))); const second = editor.getData(); equal(second.blocks, first.blocks);
});
await test('custom tools render, save, and survive import', async () => {
  reset(); editor.registerTool('rating', { title: 'Rating', icon: 'sparkle', render: data => `<div data-rating="${data.value}">Rating ${data.value}</div>`, save: el => ({ value: Number(el.querySelector('[data-rating]').dataset.rating) }) });
  editor.insert('rating', { value: 5 }); const doc = editor.getData(); await editor.load(doc); equal(editor.getData().blocks.at(-1).data.value, 5);
});
editor?.destroy();
const failures = results.filter(r => !r.passed);
report.textContent = `${results.length - failures.length}/${results.length} browser tests passed\n\n${results.map(r => `${r.passed ? 'PASS' : 'FAIL'} ${r.name}${r.error ? `\n${r.error}` : ''}`).join('\n')}`;
report.dataset.result = failures.length ? 'failed' : 'passed';
document.title = `${failures.length ? 'FAIL' : 'PASS'} — Retard browser tests`;
window.__testResults = results;
