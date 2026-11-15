import { icon } from './icons.js';
export function dialog({ title, description = '', body, submit = 'Save', wide = false, onSubmit }) {
  const previous = document.activeElement;
  const element = document.createElement('dialog');
  element.className = `modal ${wide ? 'modal-wide' : ''}`;
  const titleId = `dialog-${crypto.randomUUID()}`;
  element.setAttribute('aria-labelledby', titleId);
  element.innerHTML = `<form method="dialog"><header><div><h2 id="${titleId}"></h2><p></p></div><button type="button" class="icon-button" data-close aria-label="Close dialog">${icon('close')}</button></header><div class="modal-body">${body}</div>${submit ? `<footer><button type="button" class="secondary-button" data-close>Cancel</button><button type="submit" class="primary-button">${submit}</button></footer>` : ''}<p class="form-error" role="alert" hidden></p></form>`;
  element.querySelector('h2').textContent = title;
  element.querySelector('header p').textContent = description;
  document.body.append(element);
  const close = () => element.close();
  element.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', close));
  element.addEventListener('click', event => { if (event.target === element) { const r = element.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close(); } });
  element.addEventListener('close', () => { element.remove(); if (previous?.isConnected) previous.focus({ preventScroll: true }); });
  element.querySelector('form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = element.querySelector('[type="submit"]');
    if (button) button.disabled = true;
    try { await onSubmit?.(new FormData(event.target), element); close(); }
    catch (error) { const label = element.querySelector('.form-error'); label.hidden = false; label.textContent = error.message || 'Something went wrong.'; }
    finally { if (button) button.disabled = false; }
  });
  element.showModal();
  return element;
}
export function toast(message) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.append(el); }
  el.textContent = message; el.classList.add('visible');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('visible'), 3600);
}
export function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
