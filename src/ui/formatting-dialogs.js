import { escapeHTML as e, safeURL } from '../core/model.js';
import { icon } from './icons.js';
import { dialog, formatOnClose } from './dialog.js';

export function linkDialog(editor, { url, text }) {
  return dialog({ title: 'Add or edit a link', description: 'Connect your text to a web page, email address, or phone number.', body: `<label class="field-label">URL / href<input name="url" value="${e(url)}" placeholder="https://example.com" autofocus></label>${text ? '' : '<label class="field-label">Link text<input name="label" placeholder="Text to display (optional)"></label>'}<p class="modal-note">Leave the URL empty to remove an existing link.</p>`, submit: 'Apply link', onSubmit: (data, modal) => {
    const value = String(data.get('url')).trim();
    if (value && !safeURL(value)) throw new Error('Enter a valid http, https, email, or telephone URL.');
    formatOnClose(modal, editor, 'link', value, String(data.get('label') || ''));
  } });
}
export function colorDialog(editor, kind = 'color') {
  const textColors = [['Ink', '#292934'], ['Grey', '#797985'], ['Red', '#d14545'], ['Orange', '#c56824'], ['Green', '#23886a'], ['Blue', '#3378ce'], ['Purple', '#7563dc'], ['Pink', '#c25299']];
  const backgroundColors = [['Yellow', '#fff0ab'], ['Peach', '#ffe1cc'], ['Mint', '#d5f2e4'], ['Sky', '#d8ebff'], ['Lavender', '#e9dfff'], ['Rose', '#fbdde9'], ['Stone', '#e8e7e4'], ['Sand', '#f0e3ce']];
  let selectedKind = kind;
  const modal = dialog({ title: 'Text & highlight colour', description: 'Apply colour to the selected words. Your selection stays in place.', submit: 'Apply custom colour', body: `<div class="colour-tabs" role="tablist" aria-label="Colour target"><button type="button" role="tab" data-colour-tab="color">${icon('text', 16)}Text colour</button><button type="button" role="tab" data-colour-tab="background">${icon('paint', 17)}Background</button></div><div class="colour-palette"></div><label class="field-label">Custom colour<div class="custom-colour-row"><input type="color" name="custom" value="${kind === 'background' ? '#fff0ab' : '#7563dc'}" aria-label="Custom colour"><span class="custom-colour-value"></span><span>Choose any colour</span></div></label>`, onSubmit: (data, element) => formatOnClose(element, editor, selectedKind, String(data.get('custom'))) });
  const render = () => {
    modal.querySelectorAll('[data-colour-tab]').forEach(tab => { const active = tab.dataset.colourTab === selectedKind; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); });
    const colors = selectedKind === 'background' ? backgroundColors : textColors;
    modal.querySelector('.colour-palette').innerHTML = colors.map(([name, color]) => `<button type="button" data-color="${color}" aria-label="${name} ${selectedKind === 'background' ? 'background' : 'text'}"><span style="background:${color}">${selectedKind === 'color' ? 'A' : ''}</span><small>${name}</small></button>`).join('');
  };
  render();
  const picker = modal.querySelector('[type="color"]');
  const value = modal.querySelector('.custom-colour-value'); value.textContent = picker.value;
  picker.addEventListener('input', () => { value.textContent = picker.value; });
  modal.addEventListener('click', event => {
    const target = event.target.closest('[data-colour-tab]')?.dataset.colourTab;
    if (target) { selectedKind = target; render(); }
    const color = event.target.closest('[data-color]')?.dataset.color;
    if (color) { formatOnClose(modal, editor, selectedKind, color); modal.close(); }
  });
  return modal;
}
