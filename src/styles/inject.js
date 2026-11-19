const STYLE_ID = 'retard-editor-styles';

function moduleUrl() {
  try {
    // Keep import.meta out of classic-script parse trees (UMD / CDN builds).
    return Function('return import.meta.url')();
  } catch {
    return '';
  }
}

/** Inject SDK styles once. Prefer a stylesheet link; fall back to inlined CSS when bundled. */
export function ensureStyles(cssText = '') {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  if (cssText) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = cssText;
    document.head.append(style);
    return;
  }
  const base = moduleUrl();
  if (!base) return;
  const link = document.createElement('link');
  link.id = STYLE_ID;
  link.rel = 'stylesheet';
  link.href = new URL('./sdk.css', base).href;
  document.head.append(link);
}
