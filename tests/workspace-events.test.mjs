import test from 'node:test';
import assert from 'node:assert/strict';
import { viewFromClick } from '../src/ui/workspace-events.js';
import { RetardEditor } from '../src/core/editor.js';
import { ToolRegistry, toolChoices } from '../src/tools/registry.js';

function element({ parent = null, view, tab = false } = {}) {
  return {
    parent, dataset: { view },
    contains(child) { for (let node = child; node; node = node.parent) if (node === this) return true; return false; },
    closest(selector) {
      for (let node = this; node; node = node.parent) {
        if (selector === '[data-view]' && node.dataset.view) return node;
        if (selector === '.view-tabs button[role="tab"][data-view]' && node.tab && node.dataset.view) return node;
      }
      return null;
    },
    tab,
  };
}

test('editor field, table-cell, and plus clicks cannot become view-tab clicks through body state', () => {
  const body = element({ view: 'write' }); const app = element({ parent: body });
  const editor = element({ parent: app });
  for (const target of [editor, element({ parent: editor }), element({ parent: element({ parent: editor }) })]) assert.equal(viewFromClick(target, app), null);
});
test('clicking the icon inside a real view tab selects the requested view', () => {
  const app = element(); const tab = element({ parent: app, view: 'preview', tab: true });
  assert.equal(viewFromClick(element({ parent: tab }), app), 'preview');
});
test('view routing rejects tabs outside this workspace and unknown view names', () => {
  const app = element();
  assert.equal(viewFromClick(element({ view: 'write', tab: true }), app), null);
  assert.equal(viewFromClick(element({ parent: app, view: 'unknown', tab: true }), app), null);
});
test('reapplying the same read-only state never rebuilds or flushes the editor', () => {
  for (const readOnly of [true, false]) {
    const receiver = { readOnly, flush() { throw new Error('Unexpected flush'); }, render() { throw new Error('Unexpected render'); } };
    RetardEditor.prototype.setReadOnly.call(receiver, readOnly);
  }
});
test('the insert menu exposes one Heading entry with a default level', () => {
  const choices = toolChoices(new ToolRegistry());
  const headings = choices.filter(choice => choice.type === 'header');
  assert.equal(headings.length, 1); assert.equal(headings[0].title, 'Heading'); assert.equal(headings[0].data.level, 2);
  assert.equal(choices.length, 18);
});

function tableController(content, activeField = 'cell:0:0') {
  const block = { id: 'table', data: { content: structuredClone(content), withHeadings: false } };
  const controller = {
    activeCell: { id: block.id, field: activeField },
    transaction(fn) { fn(); },
    focus(id, field) { this.focused = { id, field }; },
    request(name, detail) { this.notice = { name, detail }; },
    run(action) { RetardEditor.prototype.tableAction.call(this, block, action); },
  };
  return { block, controller };
}
for (const [action, expected] of [
  ['table-row-above', [['', ''], ['A', 'B'], ['C', 'D']]],
  ['table-row', [['A', 'B'], ['', ''], ['C', 'D']]],
  ['table-column-before', [['', 'A', 'B'], ['', 'C', 'D']]],
  ['table-column', [['A', '', 'B'], ['C', '', 'D']]],
]) {
  test(`${action} inserts relative to the selected cell without dropping existing content`, () => {
    const { block, controller } = tableController([['A', 'B'], ['C', 'D']]);
    controller.run(action); assert.deepEqual(block.data.content, expected);
    assert.equal(controller.focused.id, block.id);
  });
}
test('table deletion removes the selected row and column and clamps focus', () => {
  const { block, controller } = tableController([['A', 'B'], ['C', 'D']], 'cell:1:1');
  controller.run('table-delete-row'); assert.deepEqual(block.data.content, [['A', 'B']]);
  assert.equal(controller.focused.field, 'cell:0:1');
  controller.run('table-delete-column'); assert.deepEqual(block.data.content, [['A']]);
  assert.equal(controller.focused.field, 'cell:0:0');
});
test('table deletion keeps the final cell editable', () => {
  const { block, controller } = tableController([['Keep']]);
  controller.run('table-delete-row'); controller.run('table-delete-column');
  assert.deepEqual(block.data.content, [['Keep']]); assert.equal(controller.focused.field, 'cell:0:0');
});
test('table insertion enforces row and column limits before changing content', () => {
  const { block, controller } = tableController(Array.from({ length: 100 }, () => Array(30).fill('Keep')));
  for (const action of ['table-row', 'table-row-above', 'table-column', 'table-column-before']) {
    controller.run(action); assert.equal(controller.notice.name, 'notice');
    assert.equal(block.data.content.length, 100); assert.equal(block.data.content[0].length, 30);
    assert.equal(controller.focused, undefined);
  }
});
test('table header toggle retains cell contents', () => {
  const { block, controller } = tableController([['Heading'], ['Body']]);
  controller.run('table-heading'); assert.equal(block.data.withHeadings, true);
  controller.run('table-heading'); assert.equal(block.data.withHeadings, false);
  assert.deepEqual(block.data.content, [['Heading'], ['Body']]);
});
