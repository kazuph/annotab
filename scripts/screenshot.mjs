import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'assets');
const CSV_FILE = path.join(ROOT, 'tests/fixtures/sample.csv');
const MD_FILE = path.join(ROOT, 'tests/fixtures/sample.md');

function startServer(file, port) {
  return new Promise((resolve) => {
    const serverProcess = spawn('node', ['cli.cjs', file, '--port', String(port)], {
      cwd: ROOT,
      stdio: 'pipe',
    });
    const checkReady = setInterval(() => {
      http.get(`http://localhost:${port}/healthz`, (res) => {
        if (res.statusCode === 200) {
          clearInterval(checkReady);
          resolve(serverProcess);
        }
      }).on('error', () => {});
    }, 200);
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // CSV screenshot
  console.log('Taking CSV screenshot...');
  const csvServer = await startServer(CSV_FILE, 3010);
  const csvPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await csvPage.goto('http://localhost:3010');
  await csvPage.waitForTimeout(500);
  await csvPage.screenshot({ path: path.join(ASSETS_DIR, 'screenshot-csv.png') });
  await csvPage.close();
  csvServer.kill('SIGTERM');

  // Markdown screenshot
  console.log('Taking Markdown screenshot...');
  const mdServer = await startServer(MD_FILE, 3011);
  const mdPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await mdPage.goto('http://localhost:3011');
  await mdPage.waitForTimeout(500);
  await mdPage.screenshot({ path: path.join(ASSETS_DIR, 'screenshot-md.png') });
  await mdPage.close();
  mdServer.kill('SIGTERM');

  await browser.close();
  console.log('Screenshots saved to assets/');
}

main().catch(console.error);
