import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\85c78948-103f-4a07-888c-683802e5a40e';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);

  try {
    console.log('Navigating to login...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });

    console.log('Setting credentials via React input dispatchers...');
    await page.waitForSelector('#school_code');
    await page.evaluate(() => {
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

    await sleep(1000);
    console.log('Submitting login form...');
    await page.click('button[type="submit"]');

    console.log('Waiting for URL to transition to /dashboard...');
    await page.waitForFunction(
      () => window.location.pathname.startsWith('/dashboard'),
      { timeout: 25000 }
    );
    console.log('✓ Successfully logged in! Current URL:', page.url());

    // 2. Navigate to Student Directory
    console.log('Navigating to Student Directory (/dashboard/students)...');
    await page.goto('http://localhost:3000/dashboard/students', { waitUntil: 'networkidle2' });
    await sleep(3000);

    // Screenshot 1: Student Directory Table with Roster
    const tablePath = path.join(ARTIFACT_DIR, 'student_directory_table.png');
    await page.screenshot({ path: tablePath, fullPage: false });
    console.log(`✓ Captured roster table screenshot: ${tablePath}`);

    // 3. Open Enroll Student Modal
    console.log('Opening Enroll Student modal...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const enrollBtn = buttons.find((b) => b.textContent.includes('Enroll Student'));
      if (enrollBtn) enrollBtn.click();
    });

    await page.waitForSelector('div[role="dialog"]', { timeout: 10000 });
    await sleep(800);

    // Fill sample values in modal using React dispatchers
    await page.evaluate(() => {
      const setReactValue = (el, val) => {
        const proto = Object.getPrototypeOf(el);
        const set = Object.getOwnPropertyDescriptor(proto, 'value').set;
        set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };

      setReactValue(document.querySelector('#student-name-input'), 'Kavya Sharma');
      setReactValue(document.querySelector('#student-roll-input'), '5');
      setReactValue(document.querySelector('#student-phone-input'), '919876543210');
    });

    // Screenshot 2: Enroll Student Modal
    const modalPath = path.join(ARTIFACT_DIR, 'student_directory_modal.png');
    await page.screenshot({ path: modalPath, fullPage: false });
    console.log(`✓ Captured modal screenshot: ${modalPath}`);

    // Close modal
    const closeBtn = await page.$('button[aria-label="Close modal"]');
    if (closeBtn) await closeBtn.click();
    await sleep(800);

    // 4. Test Empty State on Class 8
    console.log('Switching to Class 8 for empty state...');
    const select = await page.$('#class-selector');
    if (select) {
      const class8Val = await page.evaluate((sel) => {
        for (const opt of sel.options) {
          if (opt.text.includes('Class 8')) return opt.value;
        }
        return null;
      }, select);

      if (class8Val) {
        await page.select('#class-selector', class8Val);
        await sleep(2000);

        const emptyPath = path.join(ARTIFACT_DIR, 'student_directory_empty_state.png');
        await page.screenshot({ path: emptyPath, fullPage: false });
        console.log(`✓ Captured empty state screenshot: ${emptyPath}`);
      }
    }

    // 5. Test Collapsible Sidebar
    console.log('Testing sidebar collapse...');
    const collapseBtn = await page.$('button[title="Collapse sidebar"]');
    if (collapseBtn) {
      await collapseBtn.click();
      await sleep(800);

      const collapsedPath = path.join(ARTIFACT_DIR, 'student_directory_sidebar_collapsed.png');
      await page.screenshot({ path: collapsedPath, fullPage: false });
      console.log(`✓ Captured collapsed sidebar screenshot: ${collapsedPath}`);
    }

    console.log('🎉 ALL 4 VISUAL SCREENSHOTS SUCCESSFULLY CAPTURED!');
  } catch (err) {
    console.error('Capture error:', err);
    try {
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'capture_error_debug.png') });
    } catch {}
  } finally {
    await browser.close();
  }
}

capture();
