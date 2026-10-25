import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5000';
const OUTPUT_DIR = path.resolve('docs/screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function run() {
  console.log('[Capture] Authenticating with backend...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrUsername: 'analyst_jain', password: 'SecOpsPassword2026!' })
  });

  let authData = await loginRes.json();
  if (!loginRes.ok) {
    const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'analyst_jain', email: 'analyst@threatintel.io', password: 'SecOpsPassword2026!' })
    });
    authData = await signupRes.json();
  }

  console.log('[Capture] Authenticated as analyst_jain');

  console.log('[Capture] Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // 1. Capture Login Screen
  console.log('[Capture] Capturing Login page...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01-login-screen.png'), fullPage: false });

  // 2. Set authenticated state in browser
  console.log('[Capture] Injecting authentication session into browser context...');
  await page.evaluate((token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, authData.token, authData.user);

  // Helper function to capture an authenticated page
  async function capturePage(route, filename, delayMs = 2500) {
    console.log(`[Capture] Capturing ${route} -> ${filename}...`);
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle0', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, delayMs));
    await page.screenshot({ path: path.join(OUTPUT_DIR, filename), fullPage: false });
  }

  // 3. Executive Dashboard
  await capturePage('/', '02-executive-dashboard.png', 3000);

  // 4. Threat Feeds Explorer
  await capturePage('/threat-feeds', '03-threat-feeds-explorer.png', 2500);

  // 5. CVE Reports & Vulnerability Intelligence
  await capturePage('/cve-reports', '04-cve-reports-intelligence.png', 2500);

  // 6. Threat Analytics & Distribution
  await capturePage('/analytics', '05-threat-analytics.png', 3000);

  // 7. AI Threat Assistant
  await capturePage('/chat-assistant', '06-ai-threat-assistant.png', 2500);

  // 8. Security Settings & Feed Sources
  await capturePage('/settings', '07-security-settings.png', 2000);

  // 9. Signup Page
  await page.evaluate(() => localStorage.clear());
  await capturePage('/signup', '08-signup-screen.png', 1500);

  await browser.close();
  console.log('[Capture] Complete! All screenshots captured in: ' + OUTPUT_DIR);
}

run().catch(err => {
  console.error('[Capture] Error:', err);
  process.exit(1);
});
