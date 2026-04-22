import { mkdir, cp, rm } from 'node:fs/promises';
import path from 'node:path';

const gameDir = new URL('..', import.meta.url).pathname;
const distDir = path.join(gameDir, 'dist');
const srcDir = path.join(gameDir, 'src');

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await cp(srcDir, distDir, { recursive: true });

console.log('build complete: dist/');
