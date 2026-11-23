import { Blok, version as blokVersion } from '@bloklabs/core/full';
import { createDefaultTools } from './tools.js';
import { RETARD_THEME_TOKENS } from './theme.js';
import { VERSION } from './version.js';

function resolveHolder(holder) {
  if (typeof holder === 'string') {
    const el = document.getElementById(holder) || document.querySelector(holder);
    if (!el) throw new Error(`RetardEditor: holder not found: ${holder}`);
    return el;
  }
  if (holder instanceof HTMLElement) return holder;
  throw new Error('RetardEditor: holder must be an element or selector');
}

/**
 * RetardEditor — branded API over Blok (`@bloklabs/core`).
 * Keeps the familiar mount/save/onChange surface used by the site and docs.
 */
export class RetardEditor extends EventTarget {
  /** @type {import('@bloklabs/core').Blok | null} */
  #blok = null;
  /** @type {import('@bloklabs/core').OutputData} */
  #cache = { time: Date.now(), blocks: [], version: VERSION };
  #holder;
  #destroyed = false;

  /**
   * @param {object} options
   * @param {string | HTMLElement} options.holder
   * @param {import('@bloklabs/core').OutputData | import('@bloklabs/core').LooseOutputData | null} [options.data]
   * @param {Record<string, unknown>} [options.tools]
   * @param {boolean | object} [options.readOnly]
   * @param {string | false} [options.placeholder]
   * @param {boolean} [options.autofocus]
   * @param {Record<string, string>} [options.tokens]
   * @param {(editor: RetardEditor, data: import('@bloklabs/core').OutputData) => void} [options.onChange]
   * @param {(editor: RetardEditor) => void} [options.onReady]
   * @param {Record<string, unknown>} [options.blok] Extra BlokConfig fields (merged last).
   */
  constructor(options = {}) {
    super();
    if (!options.holder) throw new Error('RetardEditor: holder is required');

    this.#holder = resolveHolder(options.holder);
    this.#holder.classList.add('retard-editor');
    this.#cache = options.data && typeof options.data === 'object'
      ? /** @type {import('@bloklabs/core').OutputData} */ ({
          time: Date.now(),
          version: VERSION,
          blocks: [],
          ...options.data
        })
      : { time: Date.now(), blocks: [], version: VERSION };

    const tools = options.tools || createDefaultTools();
    const tokens = { ...RETARD_THEME_TOKENS, ...(options.tokens || {}) };

    const pending = new Blok({
      holder: this.#holder,
      tools,
      data: options.data ?? null,
      autofocus: options.autofocus ?? false,
      placeholder: options.placeholder ?? 'Type / for blocks…',
      readOnly: options.readOnly ?? false,
      theme: options.theme ?? 'light',
      style: {
        fontFamilySans: RETARD_THEME_TOKENS['--blok-font-sans'],
        tokens
      },
      onSave: (data) => {
        this.#cache = data;
        options.onChange?.(this, data);
        this.dispatchEvent(new CustomEvent('change', { detail: data }));
      },
      onReady: () => {
        options.onReady?.(this);
        this.dispatchEvent(new Event('ready'));
      },
      ...(options.blok || {})
    });

    this.#blok = /** @type {import('@bloklabs/core').Blok} */ (/** @type {unknown} */ (pending));

    this.isReady = pending.isReady.then((editor) => {
      this.#blok = editor;
      return this;
    });
  }

  /** Underlying Blok instance (available after construction; APIs after isReady). */
  get engine() {
    return this.#blok;
  }

  get holder() {
    return this.#holder;
  }

  get blocks() {
    return this.#cache.blocks || [];
  }

  get readOnly() {
    return Boolean(this.#blok?.readOnly?.isEnabled);
  }

  set readOnly(value) {
    this.setReadOnly(Boolean(value));
  }

  async save() {
    await this.isReady;
    if (!this.#blok) return this.#cache;
    this.#cache = await this.#blok.save();
    return this.#cache;
  }

  /** Last known document (from mount data or last onSave). Prefer `save()` when freshness matters. */
  getData() {
    return this.#cache;
  }

  async load(data) {
    await this.isReady;
    await this.#blok.render(data);
    this.#cache = await this.#blok.save();
  }

  async clear() {
    await this.isReady;
    await this.#blok.clear();
    this.#cache = await this.#blok.save();
  }

  focus(atEnd = false) {
    return this.#blok?.focus(atEnd) ?? false;
  }

  setReadOnly(value) {
    this.#blok?.readOnly?.set(Boolean(value));
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    try {
      this.#blok?.destroy();
    } catch {
      /* ignore */
    }
    this.#blok = null;
    this.#holder?.classList.remove('retard-editor');
  }
}

export { VERSION, blokVersion };
export default RetardEditor;
