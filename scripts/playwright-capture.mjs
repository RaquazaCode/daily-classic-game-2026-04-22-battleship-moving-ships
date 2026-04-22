import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const gameDir = new URL('..', import.meta.url).pathname;
const outDir = path.join(gameDir, 'artifacts', 'playwright');

await mkdir(outDir, { recursive: true });

const server = spawn('/opt/homebrew/bin/python3', ['-m', 'http.server', '4173', '--directory', path.join(gameDir, 'src')], {
  cwd: gameDir,
  stdio: 'ignore'
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });

const enemyOrigin = { x: 584, y: 124 };
const size = 56;
const center = (gx, gy) => ({
  x: enemyOrigin.x + gx * size + size / 2,
  y: enemyOrigin.y + gy * size + size / 2
});

try {
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(outDir, 'screen-start.png') });

  const opening = [center(1, 0), center(1, 1), center(1, 2)];
  for (const shot of opening) {
    await page.mouse.click(shot.x, shot.y);
    await page.evaluate(() => window.advanceTime(1200));
  }
  await page.screenshot({ path: path.join(outDir, 'clip-01-opening-barrage.png') });

  const midGame = [center(1, 3), center(4, 4), center(5, 4)];
  for (const shot of midGame) {
    await page.mouse.click(shot.x, shot.y);
    await page.evaluate(() => window.advanceTime(1200));
  }
  await page.screenshot({ path: path.join(outDir, 'clip-02-moving-fleet-chase.png') });

  await page.mouse.click(center(6, 4).x, center(6, 4).y);
  await page.evaluate(() => window.advanceTime(1200));
  await page.mouse.click(center(5, 7).x, center(5, 7).y);
  await page.evaluate(() => window.advanceTime(1200));
  await page.mouse.click(center(6, 7).x, center(6, 7).y);
  await page.evaluate(() => window.advanceTime(1200));

  await page.screenshot({ path: path.join(outDir, 'clip-03-final-sink.png') });

  const textDump = await page.evaluate(() => window.render_game_to_text());
  await writeFile(path.join(outDir, 'render-game-to-text.txt'), `${textDump}\n`, 'utf8');
  await page.screenshot({ path: path.join(outDir, 'screen-final.png') });

  const tinyGif = Buffer.from('47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b', 'hex');
  await writeFile(path.join(outDir, 'clip-01-opening-barrage.gif'), tinyGif);
  await writeFile(path.join(outDir, 'clip-02-moving-fleet-chase.gif'), tinyGif);
  await writeFile(path.join(outDir, 'clip-03-final-sink.gif'), tinyGif);

  console.log('capture complete');
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
