import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
async function check(path) {
  for (const file of await readdir(path, { withFileTypes: true })) {
    if (file.name.startsWith('._')) continue;
    const target = `${path}/${file.name}`;
    if (file.isDirectory()) await check(target);
    else if (/\.m?js$/.test(file.name)) {
      const result = spawnSync(process.execPath, ['--check', target], { stdio: 'inherit' });
      if (result.status) process.exit(result.status);
    }
  }
}
for (const dir of ['src', 'scripts', 'tests']) await check(dir);
console.log('All JavaScript syntax checks passed');
