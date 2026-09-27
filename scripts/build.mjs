import { mkdir, cp, rm, writeFile } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
for (const file of ['index.html', 'src', 'vendor', 'LICENSE']) await cp(file, `dist/${file}`, { recursive: true });
await writeFile('dist/.nojekyll', '');
console.log('Built Aetherfall → dist (self-contained; no runtime CDN requests).');
