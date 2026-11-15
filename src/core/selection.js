export function selectionRange(root) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  return root.contains(range.commonAncestorContainer) ? range.cloneRange() : null;
}
export function restoreRange(range) {
  if (!range?.startContainer.isConnected) return;
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}
export function setCaret(element, position = 'end') {
  if (!element) return;
  element.focus({ preventScroll: true });
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(position === 'start');
  restoreRange(range);
}
export function caretAt(element, side) {
  const selection = window.getSelection();
  if (!selection?.isCollapsed || !selection.rangeCount || !element.contains(selection.anchorNode)) return false;
  const range = selection.getRangeAt(0).cloneRange();
  range.selectNodeContents(element);
  if (side === 'start') range.setEnd(selection.anchorNode, selection.anchorOffset);
  else range.setStart(selection.anchorNode, selection.anchorOffset);
  return range.toString().length === 0;
}
export function splitAtCaret(element) {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const before = document.createRange();
  before.selectNodeContents(element);
  before.setEnd(range.startContainer, range.startOffset);
  const after = document.createRange();
  after.selectNodeContents(element);
  after.setStart(range.startContainer, range.startOffset);
  const left = document.createElement('div'), right = document.createElement('div');
  left.append(before.cloneContents()); right.append(after.cloneContents());
  return [left.innerHTML, right.innerHTML];
}
export function bookmark(root) {
  const selection = window.getSelection();
  const field = selection?.anchorNode?.parentElement?.closest('[data-field]');
  if (!field || !root.contains(field)) return null;
  const range = document.createRange();
  range.selectNodeContents(field);
  try { range.setEnd(selection.anchorNode, selection.anchorOffset); } catch { return null; }
  return { id: field.closest('[data-block-id]').dataset.blockId, field: field.dataset.field, offset: range.toString().length };
}
export function restoreBookmark(root, saved) {
  if (!saved) return;
  const field = root.querySelector(`[data-block-id="${CSS.escape(saved.id)}"] [data-field="${CSS.escape(saved.field)}"]`);
  if (!field) return;
  field.focus({ preventScroll: true });
  const walker = document.createTreeWalker(field, NodeFilter.SHOW_TEXT);
  let node, offset = saved.offset;
  while ((node = walker.nextNode())) {
    if (offset <= node.length) {
      const range = document.createRange(); range.setStart(node, offset); range.collapse(true); restoreRange(range); return;
    }
    offset -= node.length;
  }
  setCaret(field);
}
