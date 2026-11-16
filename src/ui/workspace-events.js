const views = new Set(['write', 'preview', 'json']);
export function viewFromClick(target, root) {
  const tab = target.closest('.view-tabs button[role="tab"][data-view]');
  return tab && root.contains(tab) && views.has(tab.dataset.view) ? tab.dataset.view : null;
}
