import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\fad71936-4bc9-45b4-b772-984519a254f1';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function capture() {
  console.log('Launching browser for visual verification of dynamic class enrollment...');
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
    await sleep(5000);

    // 2. Navigate to Student Directory
    console.log('Navigating to Student Directory...');
    await page.goto('http://localhost:3000/dashboard/students', { waitUntil: 'domcontentloaded' });
    await sleep(4000);

    // Screenshot 1: Directory Page showing Class Filter dropdown with dynamic classes
    const directoryPath = path.join(ARTIFACT_DIR, 'student_directory_dynamic_classes.png');
    await page.screenshot({ path: directoryPath, fullPage: false });
    console.log(`✓ Captured Student Directory overview: ${directoryPath}`);

    // 3. Open Modal
    console.log('Clicking "Enroll Student" button...');
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

    // Verify modal elements
    const inputWithDatalist = await page.$('input[list="classes-datalist"]');
    if (!inputWithDatalist) {
      throw new Error('Could not find input with list="classes-datalist"');
    }
    console.log('✓ Found input[list="classes-datalist"] coupled with datalist!');

    // Type dynamic on-the-fly class
    const dynamicClass = 'Class 12 Science';
    await page.type('#modal-class-input', dynamicClass);
    await page.type('#student-name-input', 'Aaradhya Saxena');
    await page.type('#student-roll-input', '1');
    await page.type('#student-phone-input', '919876543210');

    // Screenshot 2: Modal with dynamic class input and datalist
    const modalPath = path.join(ARTIFACT_DIR, 'student_enrollment_modal_datalist.png');
    await page.screenshot({ path: modalPath, fullPage: false });
    console.log(`✓ Captured Enroll Student Modal with dynamic input and datalist: ${modalPath}`);

    // 4. Submit form
    console.log('Submitting enrollment for dynamic class...');
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    }

    // Wait for submission transition, toast, and roster reload
    await sleep(4000);

    // Screenshot 3: Directory after enrollment showing newly created class active
    const successPath = path.join(ARTIFACT_DIR, 'student_enrolled_dynamic_class.png');
    await page.screenshot({ path: successPath, fullPage: false });
    console.log(`✓ Captured post-enrollment roster for dynamic class: ${successPath}`);

    console.log('🎉 Browser verification completed successfully!');
  } catch (err) {
    console.error('Browser capture error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
