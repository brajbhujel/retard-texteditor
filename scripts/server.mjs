import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const websiteMode = process.argv.includes('--website') || !process.argv.includes('--dist');
const root = resolve(process.argv.includes('--dist') ? 'dist' : websiteMode ? 'website' : '.');
const repo = resolve('.');
const port = Number(process.env.PORT || 5173);
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.md': 'text/plain'
};

async function send(res, file) {
  const body = await readFile(file);
  res.writeHead(200, {
    'Content-Type': `${types[extname(file)] || 'application/octet-stream'}; charset=utf-8`,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function safeResolve(base, name) {
  const file = resolve(base, `.${name}`);
  if (!file.startsWith(base + sep) && file !== base) throw new Error('Invalid path');
  if (name.split('/').some(part => part.startsWith('.')) || name.includes('node_modules')) throw new Error('Invalid path');
  return file;
}

const server = http.createServer(async (req, res) => {
  try {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);

    // Allow live package source + browser tests while the site is rooted at website/
    if (websiteMode && (name.startsWith('/src/') || name.startsWith('/tests/'))) {
      let file = safeResolve(repo, name);
      if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
      await send(res, file);
      return;
    }

    let file = safeResolve(root, name === '/' ? '/index.html' : name);
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    await send(res, file);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.on('error', error => {
  console.error(`Could not start the server: ${error.code}`);
  process.exitCode = 1;
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Site running at http://localhost:${port}`);
});
