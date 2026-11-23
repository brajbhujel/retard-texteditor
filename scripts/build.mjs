import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const blokIife = resolve(root, 'node_modules/@bloklabs/core/dist/blok.iife.js');
const sdkCss = await readFile(resolve(root, 'src/styles/sdk.css'), 'utf8');

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

await writeFile('dist/retard-editor.css', sdkCss);

// ESM consumers import the package entry (src/index.js → @bloklabs/core).
// Ship a thin re-export for CDN / import-map experiments.
const esm = `export { default, RetardEditor, VERSION, blokVersion, createDefaultTools, RETARD_THEME_TOKENS, RETARD_ACCENT, Blok, allTools, defaultTools, defaultInlineTools, defaultBlockTools } from '../src/index.js';\n`;
await writeFile('dist/retard-editor.mjs', esm);

// Browser UMD: Blok IIFE (BlokEditor global) + thin RetardEditor wrapper.
await cp(blokIife, 'dist/blok-editor.iife.js');

const umd = `(function (root) {
  var ns = root.BlokEditor;
  if (!ns || !ns.Blok) {
    console.error('[retard-texteditor] Load blok-editor.iife.js (BlokEditor) before retard-editor.umd.js');
    return;
  }
  var Blok = ns.Blok;
  var allTools = ns.allTools || ns.defaultTools || {};
  var VERSION = ${JSON.stringify((await readFile('src/version.js', 'utf8')).match(/VERSION = '([^']+)'/)?.[1] || '1.0.0')};
  var TOKENS = {
    '--blok-selection': 'rgba(31, 122, 92, 0.22)',
    '--blok-font-sans': "Manrope, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    '--blok-block-padding-top': '5px',
    '--blok-block-padding-bottom': '5px',
    '--blok-block-padding-inline': '2px'
  };

  function resolveHolder(holder) {
    if (typeof holder === 'string') {
      var el = document.getElementById(holder) || document.querySelector(holder);
      if (!el) throw new Error('RetardEditor: holder not found: ' + holder);
      return el;
    }
    if (holder && holder.nodeType === 1) return holder;
    throw new Error('RetardEditor: holder must be an element or selector');
  }

  function RetardEditor(options) {
    options = options || {};
    if (!options.holder) throw new Error('RetardEditor: holder is required');
    var self = this;
    EventTarget.call(this);
    this._holder = resolveHolder(options.holder);
    this._holder.classList.add('retard-editor');
    this._cache = options.data && typeof options.data === 'object'
      ? Object.assign({ time: Date.now(), version: VERSION, blocks: [] }, options.data)
      : { time: Date.now(), blocks: [], version: VERSION };
    this._destroyed = false;

    var pending = new Blok(Object.assign({
      holder: this._holder,
      tools: options.tools || allTools,
      data: options.data != null ? options.data : null,
      autofocus: !!options.autofocus,
      placeholder: options.placeholder != null ? options.placeholder : 'Type / for blocks…',
      readOnly: options.readOnly || false,
      theme: options.theme || 'light',
      style: {
        fontFamilySans: TOKENS['--blok-font-sans'],
        tokens: Object.assign({}, TOKENS, options.tokens || {})
      },
      onSave: function (data) {
        self._cache = data;
        if (typeof options.onChange === 'function') options.onChange(self, data);
        self.dispatchEvent(new CustomEvent('change', { detail: data }));
      },
      onReady: function () {
        if (typeof options.onReady === 'function') options.onReady(self);
        self.dispatchEvent(new Event('ready'));
      }
    }, options.blok || {}));

    this._blok = pending;
    this.isReady = pending.isReady.then(function (editor) {
      self._blok = editor;
      return self;
    });
  }

  RetardEditor.prototype = Object.create(EventTarget.prototype);
  RetardEditor.prototype.constructor = RetardEditor;

  Object.defineProperty(RetardEditor.prototype, 'engine', {
    get: function () { return this._blok; }
  });
  Object.defineProperty(RetardEditor.prototype, 'holder', {
    get: function () { return this._holder; }
  });
  Object.defineProperty(RetardEditor.prototype, 'blocks', {
    get: function () { return (this._cache && this._cache.blocks) || []; }
  });
  Object.defineProperty(RetardEditor.prototype, 'readOnly', {
    get: function () { return !!(this._blok && this._blok.readOnly && this._blok.readOnly.isEnabled); },
    set: function (v) { this.setReadOnly(!!v); }
  });

  RetardEditor.prototype.save = async function () {
    await this.isReady;
    if (!this._blok) return this._cache;
    this._cache = await this._blok.save();
    return this._cache;
  };
  RetardEditor.prototype.getData = function () { return this._cache; };
  RetardEditor.prototype.load = async function (data) {
    await this.isReady;
    await this._blok.render(data);
    this._cache = await this._blok.save();
  };
  RetardEditor.prototype.clear = async function () {
    await this.isReady;
    await this._blok.clear();
    this._cache = await this._blok.save();
  };
  RetardEditor.prototype.focus = function (atEnd) {
    return this._blok && this._blok.focus ? this._blok.focus(!!atEnd) : false;
  };
  RetardEditor.prototype.setReadOnly = function (value) {
    if (this._blok && this._blok.readOnly && this._blok.readOnly.set) this._blok.readOnly.set(!!value);
  };
  RetardEditor.prototype.destroy = function () {
    if (this._destroyed) return;
    this._destroyed = true;
    try { if (this._blok && this._blok.destroy) this._blok.destroy(); } catch (e) {}
    this._blok = null;
    if (this._holder) this._holder.classList.remove('retard-editor');
  };

  var api = {
    RetardEditor: RetardEditor,
    VERSION: VERSION,
    Blok: Blok,
    allTools: allTools,
    default: RetardEditor
  };
  root.RetardEditor = RetardEditor;
  root.RetardTextEditor = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
`;
await writeFile('dist/retard-editor.umd.js', umd);

async function mirrorVendor(dir) {
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/retard-editor.css`, sdkCss);
  await writeFile(`${dir}/retard-editor.umd.js`, umd);
  await writeFile(`${dir}/retard-editor.mjs`, esm);
  await cp(blokIife, `${dir}/blok-editor.iife.js`);
}

await mirrorVendor('website/assets/vendor');
await mirrorVendor('apps/web/public/vendor');

console.log('Built hybrid RetardEditor (Blok engine): CSS, UMD wrapper, Blok IIFE vendor copies.');
