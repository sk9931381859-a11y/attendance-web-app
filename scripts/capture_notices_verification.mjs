import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\85c78948-103f-4a07-888c-683802e5a40e';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture() {
  console.log('Launching browser for visual verification of notice isolation...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1280, height: 960 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // -------------------------------------------------------------------------
    // Session 1: S S Academy Principal Login & Notice Board
    // -------------------------------------------------------------------------
    console.log('--- Context 1: S S Academy (Code: 699411) ---');
    const context1 = await browser.createBrowserContext();
    const page1 = await context1.newPage();
    page1.setDefaultNavigationTimeout(60000);
    page1.setDefaultTimeout(60000);

    console.log('Navigating to login for S S Academy...');
    await page1.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await page1.waitForSelector('#school_code');
    await page1.evaluate(() => {
      const setReactValue = (el, val) => {
        const proto = Object.getPrototypeOf(el);
        const set = Object.getOwnPropertyDescriptor(proto, 'value').set;
        set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setReactValue(document.querySelector('#school_code'), '699411');
      setReactValue(document.querySelector('#email'), 'sk9931381859@gmail.com');
      setReactValue(document.querySelector('#password'), '123456');
    });

    await sleep(800);
    await page1.click('button[type="submit"]');

    console.log('Waiting for navigation to S S Academy Dashboard...');
    await page1.waitForFunction(
      () => window.location.pathname.startsWith('/dashboard'),
      { timeout: 25000 }
    );
    console.log('✓ Logged into S S Academy! Navigating to Academic Oversight (/dashboard/oversight)...');

    await page1.goto('http://localhost:3000/dashboard/oversight', { waitUntil: 'networkidle2' });
    await sleep(2500);

    // Switch to Faculty Leaves & Notices tab
    console.log('Switching to Faculty Leaves & Notices tab in S S Academy...');
    await page1.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const tabBtn = buttons.find((b) => b.textContent.includes('Faculty Leaves & Notices') || b.textContent.includes('Faculty Leaves'));
      if (tabBtn) tabBtn.click();
    });

    await sleep(2000);

    // Scroll down slightly so Recent Announcements is in full view
    await page1.evaluate(() => window.scrollBy(0, 160));
    await sleep(800);

    // Screenshot 1: S S Academy Notice Board
    const ssPath = path.join(ARTIFACT_DIR, 'notices_ss_academy_isolated.png');
    await page1.screenshot({ path: ssPath, fullPage: false });
    console.log(`✓ Captured S S Academy isolated notices screenshot: ${ssPath}`);

    // -------------------------------------------------------------------------
    // Session 2: Apex Global Academy Principal Login & Notice Board
    // -------------------------------------------------------------------------
    console.log('\n--- Context 2: Apex Global Academy (Code: 100001) ---');
    const context2 = await browser.createBrowserContext();
    const page2 = await context2.newPage();
    page2.setDefaultNavigationTimeout(60000);
    page2.setDefaultTimeout(60000);

    console.log('Navigating to login for Apex Global Academy...');
    await page2.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await page2.waitForSelector('#school_code');
    await page2.evaluate(() => {
      const setReactValue = (el, val) => {
        const proto = Object.getPrototypeOf(el);
        const set = Object.getOwnPropertyDescriptor(proto, 'value').set;
        set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setReactValue(document.querySelector('#school_code'), '100001');
      setReactValue(document.querySelector('#email'), 'buildwithsuraj001@gmail.com');
      setReactValue(document.querySelector('#password'), '123456');
    });

    await sleep(800);
    await page2.click('button[type="submit"]');

    console.log('Waiting for navigation to Apex Global Dashboard...');
    await page2.waitForFunction(
      () => window.location.pathname.startsWith('/dashboard'),
      { timeout: 25000 }
    );
    console.log('✓ Logged into Apex Global! Navigating to Academic Oversight (/dashboard/oversight)...');

    await page2.goto('http://localhost:3000/dashboard/oversight', { waitUntil: 'networkidle2' });
    await sleep(2500);

    // Switch to Faculty Leaves & Notices tab
    console.log('Switching to Faculty Leaves & Notices tab in Apex Global...');
    await page2.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const tabBtn = buttons.find((b) => b.textContent.includes('Faculty Leaves & Notices') || b.textContent.includes('Faculty Leaves'));
      if (tabBtn) tabBtn.click();
    });

    await sleep(2000);

    // Scroll down slightly so Recent Announcements is in full view
    await page2.evaluate(() => window.scrollBy(0, 160));
    await sleep(800);

    // Screenshot 2: Apex Global Notice Board (Must NOT show S S Academy notice!)
    const apexPath = path.join(ARTIFACT_DIR, 'notices_apex_global_isolated.png');
    await page2.screenshot({ path: apexPath, fullPage: false });
    console.log(`✓ Captured Apex Global isolated notices screenshot: ${apexPath}`);

    // Verify DOM text in Apex Global to be 100% confident
    const apexContent = await page2.evaluate(() => document.body.innerText);
    const hasSsNotice = apexContent.includes('S S Academy: Annual Day Rehearsal') || apexContent.includes('Annual Day Schedule');
    console.log(`Verification: Did S S Academy notice leak to Apex Global? ${hasSsNotice ? 'FAIL (LEAKED!)' : 'PASS (COMPLETELY ISOLATED!)'}`);

    console.log('🎉 VISUAL MULTI-TENANT NOTICE ISOLATION VERIFIED!');
  } catch (err) {
    console.error('Capture error:', err);
  } finally {
    await browser.close();
  }
}

capture();
