import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBlock, normalizeDocument, flattenList, nestList, safeURL, embedURL, History, statistics, escapeHTML, blockText } from '../src/core/model.js';
const types = ['paragraph', 'header', 'list', 'checklist', 'quote', 'warning', 'delimiter', 'image', 'table', 'code', 'raw', 'embed', 'linkTool', 'attaches', 'toggle', 'audio', 'video'];

test('all built-in block defaults survive document validation', () => {
  for (const type of types) {
    const block = makeBlock(type);
    assert.equal(normalizeDocument({ blocks: [block] }, types).blocks[0].type, type);
  }
});
test('block defaults never share nested state', () => {
  const a = makeBlock('table'), b = makeBlock('table'); a.data.content[0][0] = 'Changed';
  assert.equal(b.data.content[0][0], ''); assert.notEqual(a.id, b.id);
});
test('empty documents retain a writable paragraph', () => {
  const doc = normalizeDocument({ blocks: [] }, types);
  assert.equal(doc.blocks.length, 1); assert.equal(doc.blocks[0].type, 'paragraph');
});
test('invalid root shapes fail with a useful error', () => {
  for (const data of [null, [], {}, { blocks: {} }]) assert.throws(() => normalizeDocument(data, types), /blocks array/);
});
test('unknown plugins are rejected instead of silently dropping their data', () => {
  assert.throws(() => normalizeDocument({ blocks: [makeBlock('custom')] }, types), /Unsupported block type: custom/);
});
test('registered plugin names can be imported', () => {
  const result = normalizeDocument({ blocks: [makeBlock('custom', { rating: 5 })] }, [...types, 'custom']);
  assert.equal(result.blocks[0].data.rating, 5);
});
test('untrusted block IDs are regenerated and duplicate IDs are unique', () => {
  const a = makeBlock(); a.id = 'safe'; const b = structuredClone(a); const c = makeBlock(); c.id = '" onclick="evil';
  const blocks = normalizeDocument({ blocks: [a, b, c] }, types).blocks;
  assert.equal(blocks[0].id, 'safe'); assert.equal(new Set(blocks.map(b => b.id)).size, 3);
  assert.match(blocks[2].id, /^[\w-]+$/);
});
test('document validation leaves the input unchanged', () => {
  const data = { blocks: [{ type: 'header', data: { text: 'Hello', level: 99 } }] };
  const before = JSON.stringify(data); normalizeDocument(data, types); assert.equal(JSON.stringify(data), before);
});
test('heading levels are bounded integers', () => {
  for (const [input, output] of [[99, 6], [-1, 1], [2.5, 2], ['bad', 2]]) {
    assert.equal(normalizeDocument({ blocks: [makeBlock('header', { level: input })] }, types).blocks[0].data.level, output);
  }
});
test('non-text editable data is rejected before rendering', () => {
  assert.throws(() => normalizeDocument({ blocks: [{ type: 'paragraph', data: { text: { html: 'x' } } }] }, types), /text must be text/);
});
test('legacy string lists upgrade to nested list data', () => {
  const result = normalizeDocument({ blocks: [makeBlock('list', { items: ['one', 'two'] })] }, types).blocks[0];
  assert.deepEqual(result.data.items.map(i => i.content), ['one', 'two']);
  assert.deepEqual(result.data.items[0].items, []);
});
test('nested lists survive flattening and rebuilding', () => {
  const input = [{ content: 'a', depth: 0, checked: false }, { content: 'b', depth: 1, checked: true }, { content: 'c', depth: 2, checked: false }, { content: 'd', depth: 0, checked: false }];
  assert.deepEqual(flattenList(nestList(input)), input);
});
test('list indentation cannot skip parent levels', () => {
  assert.deepEqual(flattenList(nestList([{ content: 'a', depth: 8 }, { content: 'b', depth: 8 }])).map(item => item.depth), [0, 1]);
});
test('malformed and excessively nested lists are rejected', () => {
  assert.throws(() => normalizeDocument({ blocks: [makeBlock('list', { items: [null] })] }, types), /Invalid list item/);
  let list = []; for (let i = 0; i < 12; i++) list = [{ content: 'x', items: list }];
  assert.throws(() => normalizeDocument({ blocks: [makeBlock('list', { items: list })] }, types), /nested list/);
});
test('ragged tables are padded to a consistent width', () => {
  const table = normalizeDocument({ blocks: [makeBlock('table', { content: [['a', 'b'], ['c']] })] }, types).blocks[0];
  assert.deepEqual(table.data.content, [['a', 'b'], ['c', '']]);
});
test('empty tables retain a usable cell', () => {
  assert.deepEqual(normalizeDocument({ blocks: [makeBlock('table', { content: [] })] }, types).blocks[0].data.content, [['']]);
});
test('overlarge tables and non-string cells fail validation', () => {
  for (const content of [Array.from({ length: 101 }, () => ['']), [Array(31).fill('')], [[4]]]) assert.throws(() => normalizeDocument({ blocks: [makeBlock('table', { content })] }, types), /Invalid table/);
});
test('file blocks require an explicit string URL', () => {
  assert.throws(() => normalizeDocument({ blocks: [makeBlock('image', { file: null })] }, types), /Invalid file block/);
  assert.throws(() => normalizeDocument({ blocks: [makeBlock('attaches', { file: { url: 12 } })] }, types), /Invalid file block/);
});
test('footnotes must contain only strings', () => {
  assert.throws(() => normalizeDocument({ blocks: [makeBlock('paragraph', {}, { footnotes: [null] })] }, types), /Invalid footnotes/);
  assert.deepEqual(normalizeDocument({ blocks: [makeBlock('paragraph', {}, { footnotes: ['Note'] })] }, types).blocks[0].tunes.footnotes, ['Note']);
});
test('unsafe URL protocols and protocol-relative links are blocked', () => {
  for (const url of ['javascript:alert(1)', 'java\nscript:alert(1)', 'data:text/html,<script>alert(1)</script>', '//evil.example', 'file:///etc/passwd', '/\\evil.example', 'vbscript:evil']) assert.equal(safeURL(url), '', url);
});
test('http, https, email, and telephone links are allowed', () => {
  assert.equal(safeURL('https://example.com'), 'https://example.com/');
  assert.equal(safeURL('mailto:a@example.com'), 'mailto:a@example.com');
  assert.equal(safeURL('tel:+123'), 'tel:+123');
});
test('image data is limited to raster formats', () => {
  assert.equal(safeURL('data:image/png;base64,AAAA', 'image'), 'data:image/png;base64,AAAA');
  assert.equal(safeURL('data:image/svg+xml;base64,AAAA', 'image'), '');
  assert.equal(safeURL('data:text/html;base64,AAAA', 'image'), '');
});
test('attachment data cannot become executable HTML', () => {
  assert.equal(safeURL('data:application/pdf;base64,AAAA', 'file'), 'data:application/pdf;base64,AAAA');
  assert.equal(safeURL('data:application/octet-stream;base64,AAAA', 'file'), 'data:application/octet-stream;base64,AAAA');
  assert.equal(safeURL('data:text/html;base64,AAAA', 'file'), '');
});
test('video embeds are canonicalized to explicitly supported hosts', () => {
  assert.equal(embedURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  assert.equal(embedURL('https://youtu.be/dQw4w9WgXcQ?t=4'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  assert.equal(embedURL('https://vimeo.com/12345'), 'https://player.vimeo.com/video/12345');
  assert.equal(embedURL('https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ'), '');
  assert.equal(embedURL('javascript:alert(1)'), '');
});
test('history undoes and redoes without mutating previous snapshots', () => {
  const history = new History(); const first = { blocks: [makeBlock('paragraph', { text: 'one' })] };
  history.reset(first); const second = structuredClone(first); second.blocks[0].data.text = 'two'; history.push(second);
  second.blocks[0].data.text = 'mutated'; assert.equal(history.undo().blocks[0].data.text, 'one'); assert.equal(history.redo().blocks[0].data.text, 'two');
});
test('history ignores timestamp-only changes', () => {
  const history = new History(); const data = { time: 1, blocks: [makeBlock()] }; history.reset(data);
  assert.equal(history.push({ ...data, time: 2 }), false); assert.equal(history.canUndo, false);
});
test('new edits discard an abandoned redo branch', () => {
  const history = new History(); history.reset({ blocks: [] }); history.push({ blocks: [makeBlock()] }); history.undo(); history.push({ blocks: [makeBlock('header')] });
  assert.equal(history.canRedo, false); assert.equal(history.redo(), null);
});
test('history enforces its memory bound', () => {
  const history = new History(3); history.reset({ blocks: [] });
  for (let i = 0; i < 8; i++) history.push({ blocks: [makeBlock('paragraph', { text: String(i) })] });
  assert.equal(history.entries.length, 3); assert.equal(history.undo().blocks[0].data.text, '6'); assert.equal(history.undo().blocks[0].data.text, '5'); assert.equal(history.undo(), null);
});
test('stats extract readable text from structured blocks', () => {
  const blocks = [makeBlock('paragraph', { text: '<b>Hello</b> world' }), makeBlock('table', { content: [['three', 'four']] }), makeBlock('checklist', { items: [{ text: 'five', checked: true }] })];
  assert.equal(statistics(blocks).words, 5); assert.equal(statistics(blocks).blocks, 3); assert.equal(statistics([]).words, 0);
});
test('plain text includes nested list content and code without tags', () => {
  const block = makeBlock('list', { items: nestList([{ content: '<b>A</b>', depth: 0 }, { content: 'B', depth: 1 }]) });
  assert.equal(blockText(block), 'A\nB');
});
test('HTML escaping protects attribute and text contexts', () => {
  assert.equal(escapeHTML('<img src="x" onerror=\'bad\'>&'), '&lt;img src=&quot;x&quot; onerror=&#39;bad&#39;&gt;&amp;');
});

test('plain text exports preserve literal code and HTML source', () => {
  assert.equal(blockText(makeBlock('code', { code: '<section>literal</section>' })), '<section>literal</section>');
  assert.equal(blockText(makeBlock('raw', { html: '<div>raw</div>' })), '<div>raw</div>');
});
