import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\85c78948-103f-4a07-888c-683802e5a40e';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture() {
  console.log('Launching browser for visual verification...');
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
    // 1. Navigate to login
    console.log('Navigating to login...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    console.log('Clicking Quick Demo Credentials button for Principal (Admin)...');
    const demoButtons = await page.$$('button');
    let clicked = false;
    for (const btn of demoButtons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.includes('Principal (Admin)')) {
        await btn.click();
        clicked = true;
        console.log('✓ Clicked Principal (Admin) button');
        break;
      }
    }

    if (!clicked) {
      await page.type('#schoolCode', '100001');
      await page.type('#email', 'buildwithsuraj001@gmail.com');
      await page.type('#password', '123456');
    }

    await sleep(1000);
    console.log('Submitting login form...');
    await page.click('button[type="submit"]');

    console.log('Waiting for dashboard navigation...');
    await sleep(6000);

    // 2. Navigate to Student Directory
    console.log('Navigating to Student Directory...');
    await page.goto('http://localhost:3000/dashboard/students', { waitUntil: 'domcontentloaded' });
    console.log('Waiting for table or roster elements...');
    await sleep(6000);

    // Screenshot 1: Student Directory Table with Roster
    const tablePath = path.join(ARTIFACT_DIR, 'student_directory_table.png');
    await page.screenshot({ path: tablePath, fullPage: false });
    console.log(`✓ Captured roster table screenshot: ${tablePath}`);

    // 3. Open Enroll Student Modal
    console.log('Opening Enroll Student modal...');
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.includes('Enroll Student')) {
        await btn.click();
        break;
      }
    }

    await sleep(1500);
    await page.waitForSelector('div[role="dialog"]', { timeout: 10000 });
    // Fill sample values in modal
    await page.type('#student-name-input', 'Kavya Sharma');
    await page.type('#student-roll-input', '5');
    await page.type('#student-phone-input', '919876543210');

    // Screenshot 2: Enroll Student Modal
    const modalPath = path.join(ARTIFACT_DIR, 'student_directory_modal.png');
    await page.screenshot({ path: modalPath, fullPage: false });
    console.log(`✓ Captured modal screenshot: ${modalPath}`);

    // Close modal
    const closeBtn = await page.$('button[aria-label="Close modal"]');
    if (closeBtn) await closeBtn.click();
    await sleep(1000);

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
      await sleep(1000);

      const collapsedPath = path.join(ARTIFACT_DIR, 'student_directory_sidebar_collapsed.png');
      await page.screenshot({ path: collapsedPath, fullPage: false });
      console.log(`✓ Captured collapsed sidebar screenshot: ${collapsedPath}`);
    }

    console.log('All visual screenshots successfully captured!');
  } catch (err) {
    console.error('Screenshot capture error:', err);
  } finally {
    await browser.close();
  }
}

capture();
