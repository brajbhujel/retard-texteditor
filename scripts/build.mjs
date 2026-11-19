import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';

const root = process.cwd();
const modules = new Map();

async function flattenCss(file, seen = new Set()) {
  const path = resolve(file);
  if (seen.has(path)) return '';
  seen.add(path);
  let css = await readFile(path, 'utf8');
  const imports = [...css.matchAll(/@import\s+url\(['"](.+?)['"]\);?/g)];
  for (const match of imports) {
    const nested = await flattenCss(resolve(dirname(path), match[1]), seen);
    css = css.replace(match[0], nested);
  }
  return css;
}

async function bundle(file, { sync = false } = {}) {
  const path = resolve(file);
  const key = relative(root, path);
  if (modules.has(key)) return key;
  let code = await readFile(path, 'utf8');
  const imports = [...code.matchAll(/^import\s+(.+?)\s+from\s+['"](.+?)['"];?$/gm)];
  for (const match of imports) {
    const dependency = await bundle(resolve(dirname(path), match[2]), { sync });
    let binding = match[1].trim();
    if (binding.startsWith('{')) binding = binding.replace(/\bas\b/g, ':');
    else binding = `{ default: ${binding} }`;
    code = code.replace(match[0], `const ${binding} = __modules[${JSON.stringify(dependency)}];`);
  }
  const exports = [...code.matchAll(/^export\s+(?:async\s+)?(?:function|class|const|let)\s+(\w+)/gm)].map(match => match[1]);
  const named = [...code.matchAll(/^export\s+\{([^}]+)\}/gm)].flatMap(match => match[1].split(',').map(part => {
    const [local, alias] = part.trim().split(/\s+as\s+/);
    return alias ? `${local.trim()}: ${alias.trim()}` : local.trim();
  }).filter(Boolean));
  const defaultExport = code.match(/^export default (\w+);?$/m)?.[1];
  code = code
    .replace(/^export default \w+;?$/gm, '')
    .replace(/^export\s+\{[^}]+\};?$/gm, '')
    .replace(/^export\s+(?=(?:async\s+)?(?:function|class|const|let))/gm, '');
  const returned = [...new Set([...exports, ...named])];
  const body = `${code}\nreturn { ${returned.join(', ')}${defaultExport ? `${returned.length ? ', ' : ''}default: ${defaultExport}` : ''} };`;
  modules.set(key, sync
    ? `__modules[${JSON.stringify(key)}] = (() => {\n${body}\n})();`
    : `__modules[${JSON.stringify(key)}] = await (async () => {\n${body}\n})();`);
  return key;
}

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const item of ['src', 'public', 'docs']) {
  try { await cp(item, `dist/${item}`, { recursive: true, filter: path => !path.split('/').at(-1).startsWith('._') }); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}

await bundle('src/app.js');
const javascript = `const __modules = {};\n${[...modules.values()].join('\n')}`;
let css = await flattenCss('src/styles/app.css');
const favicon = await readFile('public/favicon.svg', 'utf8');
const faviconURL = `data:image/svg+xml,${encodeURIComponent(favicon)}`;
let html = await readFile('index.html', 'utf8');
html = html.replace('<link rel="stylesheet" href="/src/styles/app.css">', `<style>${css}</style>`).replace('/public/favicon.svg', faviconURL).replace('<script type="module" src="/src/app.js"></script>', `<script type="module">${javascript.replaceAll('/public/favicon.svg', faviconURL).replaceAll('</script', '<\\/script')}</script>`);
await writeFile('dist/index.html', html);
await writeFile('dist/app.bundle.js', javascript);
const appModuleCount = modules.size;

modules.clear();
await bundle('tests/browser-tests.js');
let testHTML = await readFile('tests/browser.html', 'utf8');
testHTML = testHTML.replace('<link rel="stylesheet" href="../src/styles/app.css">', `<style>${css}</style>`).replace('<script type="module" src="./browser-tests.js"></script>', `<script type="module">const __modules = {};\n${[...modules.values()].join('\n').replaceAll('</script', '<\\/script')}</script>`);
await writeFile('dist/browser-tests.html', testHTML);

const sdkCss = await flattenCss('src/styles/sdk.css');
await writeFile('dist/retard-editor.css', sdkCss);

modules.clear();
const libraryEntry = await bundle('src/index.js', { sync: true });
const libraryModules = [...modules.values()].join('\n');
const libraryBody = `const __modules = {};\n${libraryModules}\nconst __entry = __modules[${JSON.stringify(libraryEntry)}];\n__entry.ensureStyles(${JSON.stringify(sdkCss)});\n`;
const namedExports = ['RetardEditor', 'ToolRegistry', 'builtins', 'toolChoices', 'makeBlock', 'normalizeDocument', 'statistics', 'VERSION', 'toHTML', 'toMarkdown', 'fromMarkdown', 'fromHTML', 'sanitizeHTML', 'ensureStyles', 'attachDefaults'];
const esm = `${libraryBody}export const { ${namedExports.join(', ')} } = __entry;\nexport default __entry.default ?? __entry.RetardEditor;\n`;
await writeFile('dist/retard-editor.mjs', esm);

const umd = `(function (root, factory) {
  const api = factory();
  if (typeof define === 'function' && define.amd) define([], function () { return api; });
  else if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.RetardEditor = api.RetardEditor;
    root.RetardTextEditor = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
${libraryBody}return {
  ${namedExports.map(name => `${name}: __entry.${name}`).join(',\n  ')},
  default: __entry.default ?? __entry.RetardEditor
};
});
`;
await writeFile('dist/retard-editor.umd.js', umd);

console.log(`Built ${appModuleCount} app modules, library ESM/UMD, and standalone browser tests. Open dist/index.html, or publish when ready.`);
