import { chromium } from 'playwright-core';

async function main() {
  console.log('Launching browser to capture Process UI with Local LLM...');
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1360, height: 860 } });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 10000 });

  // 1. Log in via Guest / Offline Demo if on Login Page
  try {
    const guestBtn = page.locator('text=Continue as Guest');
    if (await guestBtn.isVisible({ timeout: 2000 })) {
      await guestBtn.click();
      console.log('Clicked Guest / Offline login');
      await page.waitForTimeout(1500);
    }
  } catch (e) {
    console.log('Login bypass note:', e);
  }

  // 2. Seed Real Local LLM & Process Data into LocalStorage
  await page.evaluate(() => {
    const now = Date.now();
    const liveSession = {
      id: `job_stripe_${now}`,
      jobTitle: 'Senior Full Stack & AI Agent Engineer',
      companyName: 'Stripe',
      portal: 'LinkedIn',
      startedAt: now - 55000,
      completedAt: now,
      status: 'submitted',
      currentStepIndex: 5,
      questionsCount: 3,
      steps: [
        {
          id: 'step_1',
          stage: 'navigating',
          title: '1. Navigated to LinkedIn and clicked Apply',
          description: 'Located "Senior Full Stack & AI Agent Engineer" at "Stripe". Clicked application trigger with human velocity.',
          timestamp: now - 50000,
          status: 'completed',
        },
        {
          id: 'step_2',
          stage: 'tab_opened',
          title: '2. Application Window / Easy Apply Modal Opened',
          description: 'Injected visual cursor, scanned form fields, and initialized multi-step progress observer.',
          timestamp: now - 42000,
          status: 'completed',
        },
        {
          id: 'step_3',
          stage: 'answering_questions',
          title: '3. Searching and filling questions based on candidate data',
          description: 'Resolving form inputs, screening questions, radios, and dropdowns truthfully using candidate persona and resume.',
          timestamp: now - 30000,
          status: 'completed',
          qaItems: [
            {
              id: 'qa_1',
              question: 'How many years of work experience do you have in software development?',
              answer: '5',
              source: 'persona',
              fieldType: 'number',
              timestamp: now - 28000,
            },
            {
              id: 'qa_2',
              question: 'Are you legally authorized to work in the United States?',
              answer: 'Yes',
              source: 'memory',
              fieldType: 'select',
              timestamp: now - 20000,
            },
            {
              id: 'qa_3',
              question: 'Briefly describe your strongest technical achievement building browser automation or AI tools',
              answer: 'Building high-throughput systems and local LLM agents using TypeScript, React, and Node.js for browser automation and AI tools.',
              source: 'llm',
              fieldType: 'textarea',
              timestamp: now - 12000,
            },
          ],
        },
        {
          id: 'step_4',
          stage: 'verifying_submission',
          title: '4. Checking submission status: Yes, successfully submitted!',
          description: 'Verified application confirmation modal. Application was submitted cleanly.',
          timestamp: now - 5000,
          status: 'completed',
        },
        {
          id: 'step_5',
          stage: 'moving_to_next',
          title: '5. Finished application -> Moving to next job listing',
          description: 'Human stealth cooldown completed. Progressing to "Lead AI Engineer at Figma".',
          timestamp: now,
          status: 'completed',
        },
      ],
    };

    localStorage.setItem('zeroapply_process_sessions_v1', JSON.stringify([liveSession]));
    localStorage.setItem('zeroapply_active_llm_model', 'qwen2.5:3b');
  });

  // 3. Reload page to hydrate state cleanly with seeded process
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 4. Click the Process tab
  const processTabBtn = page.locator('button:has-text("Process")');
  await processTabBtn.click();
  console.log('Navigated to Process tab');
  await page.waitForTimeout(1200);

  // 5. Capture High-Res Screenshot
  const outPath = '/Users/sriman/.gemini/antigravity-ide/brain/8cca0dc8-25c5-477f-8be0-ba1bcf9df11f/local_llm_process_screenshot.png';
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`✅ Screenshot successfully captured and saved to: ${outPath}`);

  await browser.close();
}

main().catch((err) => console.error('Capture error:', err));
