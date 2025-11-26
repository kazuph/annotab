import { describe, test, beforeAll, afterAll } from 'vitest';
import { chromium } from 'playwright';
import { expect } from '@playwright/test';
import { spawn } from 'child_process';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = path.join(__dirname, '..', '.artifacts');
const CSV_FILE = path.join(__dirname, 'fixtures', 'sample.csv');
const MD_FILE = path.join(__dirname, 'fixtures', 'sample.md');

function waitForServer(port, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const checkReady = setInterval(() => {
      if (Date.now() - start > timeout) {
        clearInterval(checkReady);
        reject(new Error(`Server on port ${port} did not start within ${timeout}ms`));
        return;
      }
      http.get(`http://localhost:${port}/healthz`, (res) => {
        if (res.statusCode === 200) {
          clearInterval(checkReady);
          resolve();
        }
      }).on('error', () => {});
    }, 200);
  });
}

function startMultiFileServer(basePort) {
  return new Promise(async (resolve, reject) => {
    const serverProcess = spawn('node', ['cli.cjs', CSV_FILE, MD_FILE, '--port', String(basePort), '--no-open'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
      detached: true,
    });

    try {
      // Wait for both servers to be ready
      await Promise.all([
        waitForServer(basePort),
        waitForServer(basePort + 1),
      ]);
      resolve(serverProcess);
    } catch (err) {
      try {
        process.kill(-serverProcess.pid, 'SIGKILL');
      } catch (_) {}
      reject(err);
    }
  });
}

describe('Multi-file E2E Tests', () => {
  let browser;
  let serverProcess;
  const basePort = 3004;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    serverProcess = await startMultiFileServer(basePort);
  });

  afterAll(async () => {
    if (browser) await browser.close();
    if (serverProcess) {
      try {
        process.kill(-serverProcess.pid, 'SIGKILL');
      } catch (e) {
        // ignore if already dead
      }
    }
  });

  test('opens multiple files on separate ports', async () => {
    // Test CSV file on first port
    const csvPage = await browser.newPage();
    await csvPage.goto(`http://localhost:${basePort}`);
    await expect(csvPage.locator('header h1')).toContainText('sample.csv');
    const csvTable = csvPage.locator('#csv-table');
    await expect(csvTable).toBeVisible();

    await csvPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'multi-01-csv.png'), fullPage: true });

    // Test MD file on second port
    const mdPage = await browser.newPage();
    await mdPage.goto(`http://localhost:${basePort + 1}`);
    await expect(mdPage.locator('header h1')).toContainText('sample.md');
    const mdPreview = mdPage.locator('.md-preview');
    await expect(mdPreview).toBeVisible();

    await mdPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'multi-02-md.png'), fullPage: true });

    // Add comment to CSV
    const csvCell = csvPage.locator('td[data-row="1"][data-col="1"]');
    await csvCell.click();
    const csvCommentCard = csvPage.locator('#comment-card');
    await expect(csvCommentCard).toBeVisible();
    await csvPage.locator('#comment-input').fill('CSV comment from multi-file test');
    await csvPage.locator('#save-comment').click();
    await expect(csvCell).toHaveClass(/has-comment/);

    await csvPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'multi-03-csv-comment.png'), fullPage: true });

    // Add comment to MD
    const mdCell = mdPage.locator('td[data-row="1"][data-col="1"]');
    await mdCell.click();
    const mdCommentCard = mdPage.locator('#comment-card');
    await expect(mdCommentCard).toBeVisible();
    await mdPage.locator('#comment-input').fill('MD comment from multi-file test');
    await mdPage.locator('#save-comment').click();
    await expect(mdCell).toHaveClass(/has-comment/);

    await mdPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'multi-04-md-comment.png'), fullPage: true });

    await csvPage.close();
    await mdPage.close();
  });
});
