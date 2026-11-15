import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
const root = process.cwd();
const modules = new Map();
async function bundle(file) {
  const path = resolve(file);
  const key = relative(root, path);
  if (modules.has(key)) return key;
  let code = await readFile(path, 'utf8');
  const imports = [...code.matchAll(/^import\s+(.+?)\s+from\s+['"](.+?)['"];?$/gm)];
  for (const match of imports) {
    const dependency = await bundle(resolve(dirname(path), match[2]));
    let binding = match[1].trim();
    if (binding.startsWith('{')) binding = binding.replace(/\bas\b/g, ':');
    else binding = `{ default: ${binding} }`;
    code = code.replace(match[0], `const ${binding} = __modules[${JSON.stringify(dependency)}];`);
  }
  const exports = [...code.matchAll(/^export\s+(?:async\s+)?(?:function|class|const|let)\s+(\w+)/gm)].map(match => match[1]);
  const defaultExport = code.match(/^export default (\w+);?$/m)?.[1];
  code = code.replace(/^export default \w+;?$/gm, '').replace(/^export\s+(?=(?:async\s+)?(?:function|class|const|let))/gm, '');
  modules.set(key, `__modules[${JSON.stringify(key)}] = await (async () => {\n${code}\nreturn { ${exports.join(', ')}${defaultExport ? `, default: ${defaultExport}` : ''} };\n})();`);
  return key;
}
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const item of ['src', 'public', 'docs']) {
  try { await cp(item, `dist/${item}`, { recursive: true, filter: path => !path.split('/').at(-1).startsWith('._') }); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
await bundle('src/app.js');
const javascript = `const __modules = {};\n${[...modules.values()].join('\n')}`;
let css = await readFile('src/styles/app.css', 'utf8');
css = css.replace("@import url('./editor.css');", await readFile('src/styles/editor.css', 'utf8'));
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
console.log(`Built ${appModuleCount} modules and standalone browser tests. Open dist/index.html directly, or run npm run dev.`);
