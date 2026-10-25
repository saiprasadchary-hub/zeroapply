/**
 * LinkedIn Clone - Testbed Controller
 * Provides interactive state, multi-step Easy Apply progression,
 * form validation, and event dispatching for the ZeroApply Agent.
 */

(() => {
  'use strict';

  // --- Job Database ---
  const JOBS = {
    '4461474023': {
      id: '4461474023',
      title: 'AI Automation Intern',
      company: 'HextGen Ai',
      logoClass: 'hextgen',
      logoText: 'HX',
      location: 'Hyderabad, Telangana, India',
      workplace: 'On-site',
      type: 'Full-time',
      postedTime: '1 day ago',
      applicants: 'Over 100 applicants',
      applied: false,
      stipend: '₹20,000–₹25,000/month',
      description: `
        <h3>About the job</h3>
        <p>We are seeking an ambitious <strong>AI Automation Intern</strong> with hands-on experience developing autonomous AI agents, tool-calling workflows, and production automation pipelines.</p>
        <p><strong>Key Responsibilities:</strong></p>
        <ul>
          <li>Build multi-step agentic workflows using Python, LangChain, and local LLMs (Qwen/Llama).</li>
          <li>Design deterministic DOM automation, browser scrapers, and resilient retry architectures.</li>
          <li>Integrate structured JSON parsers, vector context extraction, and prompt evaluations.</li>
          <li>Collaborate with our engineering team on-site in Hyderabad, Telangana.</li>
        </ul>
        <p><strong>Requirements:</strong></p>
        <ul>
          <li>Proficiency in Python, TypeScript, and modern AI developer frameworks.</li>
          <li>Experience with tool-calling agents, state machines, and browser control protocols.</li>
          <li>Willingness to work from our Hyderabad office.</li>
          <li>Stipend: ₹20,000 – ₹25,000 / month based on interview evaluation.</li>
        </ul>
      `,
    },
    '4461474024': {
      id: '4461474024',
      title: 'Software Engineer Intern',
      company: 'SentLogic',
      logoClass: 'sentlogic',
      logoText: 'SL',
      location: 'Hyderabad, Telangana, India',
      workplace: 'Remote',
      type: 'Full-time',
      postedTime: '1 week ago',
      applicants: '84 applicants',
      applied: false,
      stipend: '₹25,000–₹30,000/month',
      description: `
        <h3>About the job</h3>
        <p>SentLogic is building developer intelligence tooling. We are looking for an energetic <strong>Software Engineer Intern</strong> to join our distributed engineering team.</p>
        <p><strong>Key Responsibilities:</strong></p>
        <ul>
          <li>Build robust REST and WebSocket backend services using Node.js & TypeScript.</li>
          <li>Implement responsive frontend interfaces in React.</li>
          <li>Optimize database queries and async job execution.</li>
        </ul>
      `,
    },
    '4461474025': {
      id: '4461474025',
      title: 'Cyber Security & Compliance Intern',
      company: 'Qapita',
      logoClass: 'qapita',
      logoText: 'QP',
      location: 'Hyderabad, Telangana, India',
      workplace: 'On-site',
      type: 'Full-time',
      postedTime: '3 hours ago',
      applicants: '12 applicants',
      applied: false,
      stipend: '₹18,000–₹22,000/month',
      description: `
        <h3>About the job</h3>
        <p>Qapita is hiring a <strong>Cyber Security &amp; Compliance Intern</strong> to help audit infrastructure security, run automated vulnerability scans, and ensure compliance standards.</p>
      `,
    },
  };

  // --- State Variables ---
  let activeJobId = '4461474023';
  let currentModalStep = 1;
  const TOTAL_STEPS = 5;

  // --- DOM References ---
  const modalOverlay = document.getElementById('easy-apply-modal-overlay');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalHeaderTitle = document.getElementById('modal-header-title');
  const modalProgressBar = document.getElementById('modal-progress-bar');
  const modalProgressText = document.getElementById('modal-progress-text');
  const modalProgressContainer = document.getElementById('modal-progress-container');
  const modalFooter = document.getElementById('modal-footer');
  const modalBackBtn = document.getElementById('modal-back-btn');
  const modalNextBtn = document.getElementById('modal-next-btn');
  const modalSubmitBtn = document.getElementById('modal-submit-btn');
  const mainEasyApplyBtn = document.getElementById('main-easy-apply-btn');
  const toastEl = document.getElementById('test-toast');
  const toastMsgEl = document.getElementById('test-toast-msg');

  // Job Details DOM
  const detailCompanyLogo = document.getElementById('detail-company-logo');
  const detailCompanyName = document.getElementById('detail-company-name');
  const detailJobTitle = document.getElementById('detail-job-title');
  const detailJobSubtitle = document.getElementById('detail-job-subtitle');
  const detailWorkplace = document.getElementById('detail-workplace');
  const detailType = document.getElementById('detail-type');
  const detailJobDesc = document.getElementById('detail-job-description');
  const followCompanyName = document.getElementById('follow-company-name');
  const successCompanyName = document.getElementById('success-company-name');

  // Form Fields
  const inputEmail = document.getElementById('input-email-address');
  const inputPhoneCountry = document.getElementById('input-phone-country');
  const inputPhoneNumber = document.getElementById('input-phone-number');
  const resumeItems = document.querySelectorAll('.resume-item');
  const btnUploadResumeTrigger = document.getElementById('btn-upload-resume-trigger');
  const resumeFileUploadInput = document.getElementById('resume-file-upload-input');
  const btnSuccessDone = document.getElementById('btn-success-done');

  // Toast Helper
  function showToast(message) {
    if (!toastEl) return;
    toastMsgEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2800);
  }

  // --- Select Job Handler ---
  function selectJob(jobId) {
    const job = JOBS[jobId];
    if (!job) return;

    activeJobId = jobId;

    // Update active class on job cards
    document.querySelectorAll('.job-card').forEach((card) => {
      card.classList.toggle('active', card.getAttribute('data-job-id') === jobId);
    });

    // Update details pane
    detailJobTitle.textContent = job.title;
    detailCompanyName.textContent = job.company;
    detailCompanyLogo.className = `job-company-logo ${job.logoClass}`;
    detailCompanyLogo.textContent = job.logoText;
    detailJobSubtitle.textContent = `${job.location} · ${job.postedTime} · ${job.applicants}`;
    detailWorkplace.textContent = job.workplace;
    detailType.textContent = job.type;
    detailJobDesc.innerHTML = job.description;

    // Update modal references
    modalHeaderTitle.textContent = `Apply to ${job.company}`;
    if (followCompanyName) followCompanyName.textContent = job.company;
    if (successCompanyName) successCompanyName.textContent = job.company;

    // Update Easy Apply button state
    if (job.applied) {
      mainEasyApplyBtn.disabled = true;
      mainEasyApplyBtn.innerHTML = `<span>✓ Applied</span>`;
      mainEasyApplyBtn.style.backgroundColor = 'var(--linkedin-green)';
    } else {
      mainEasyApplyBtn.disabled = false;
      mainEasyApplyBtn.innerHTML = `<span class="in-icon-small">in</span><span>Easy Apply</span>`;
      mainEasyApplyBtn.style.backgroundColor = 'var(--linkedin-blue)';
    }
  }

  // Bind click on job cards
  document.querySelectorAll('.job-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.job-card__dismiss')) {
        e.stopPropagation();
        card.style.display = 'none';
        showToast('Job dismissed');
        return;
      }
      const jobId = card.getAttribute('data-job-id');
      if (jobId) selectJob(jobId);
    });
  });

  // --- Modal Navigation & Steps ---
  function updateModalStep(stepNumber) {
    currentModalStep = stepNumber;

    // Hide all steps
    document.querySelectorAll('.modal-step').forEach((step) => {
      step.style.display = 'none';
      step.classList.remove('active');
    });

    if (stepNumber === 'success') {
      const successStep = document.getElementById('step-success');
      if (successStep) {
        successStep.style.display = 'block';
        successStep.classList.add('active');
      }
      modalProgressContainer.style.display = 'none';
      modalFooter.style.display = 'none';
      return;
    }

    modalProgressContainer.style.display = 'block';
    modalFooter.style.display = 'flex';

    // Show target step
    const targetStepEl = document.getElementById(`step-${stepNumber}`);
    if (targetStepEl) {
      targetStepEl.style.display = 'block';
      targetStepEl.classList.add('active');
    }

    // Update Progress Bar
    const percent = (stepNumber / TOTAL_STEPS) * 100;
    modalProgressBar.style.width = `${percent}%`;
    modalProgressText.textContent = `${stepNumber}/${TOTAL_STEPS} pages`;

    // Footer button visibility
    if (stepNumber === 1) {
      modalBackBtn.style.display = 'none';
      modalNextBtn.style.display = 'inline-flex';
      modalSubmitBtn.style.display = 'none';
    } else if (stepNumber === TOTAL_STEPS) {
      modalBackBtn.style.display = 'inline-flex';
      modalNextBtn.style.display = 'none';
      modalSubmitBtn.style.display = 'inline-flex';

      // Refresh Step 5 Summary
      populateReviewSummary();
    } else {
      modalBackBtn.style.display = 'inline-flex';
      modalNextBtn.style.display = 'inline-flex';
      modalSubmitBtn.style.display = 'none';
    }
  }

  // Populate Review summary from current inputs
  function populateReviewSummary() {
    const summaryContact = document.getElementById('summary-contact-info');
    const summaryResume = document.getElementById('summary-resume-info');
    const summaryOffice = document.getElementById('summary-office-info');
    const summaryStipend = document.getElementById('summary-stipend-info');
    const summaryAgents = document.getElementById('summary-agents-info');

    if (summaryContact) {
      const email = inputEmail && inputEmail.value ? inputEmail.value : 'Not selected';
      const country = inputPhoneCountry && inputPhoneCountry.value ? inputPhoneCountry.value : '';
      const phone = inputPhoneNumber && inputPhoneNumber.value ? inputPhoneNumber.value : 'Not provided';
      summaryContact.textContent = `Sai Prasad Chary Kammari · ${email} · ${country} ${phone}`.trim();
    }

    const selectedResume = document.querySelector('.resume-item.selected');
    if (summaryResume) {
      summaryResume.textContent = selectedResume ? (selectedResume.getAttribute('data-resume-name') || 'Resume selected') : 'No resume selected';
    }

    const officeRadio = document.querySelector('input[name="q_office_hyderabad"]:checked');
    if (summaryOffice) {
      summaryOffice.textContent = officeRadio ? officeRadio.value : 'Not answered';
    }

    const stipendRadio = document.querySelector('input[name="q_stipend_comfort"]:checked');
    if (summaryStipend) {
      summaryStipend.textContent = stipendRadio ? stipendRadio.value : 'Not answered';
    }

    const agentsRadio = document.querySelector('input[name="q_ai_agents"]:checked');
    if (summaryAgents) {
      summaryAgents.textContent = agentsRadio ? agentsRadio.value : 'Not answered';
    }
  }

  // Open Modal
  function openEasyApplyModal() {
    const job = JOBS[activeJobId];
    modalHeaderTitle.textContent = `Apply to ${job ? job.company : 'Company'}`;
    updateModalStep(1);
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    showToast('Easy Apply modal opened');
  }

  // Close Modal
  function closeEasyApplyModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Event Listeners for Opening/Closing
  mainEasyApplyBtn.addEventListener('click', openEasyApplyModal);
  modalCloseBtn.addEventListener('click', closeEasyApplyModal);

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeEasyApplyModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
      closeEasyApplyModal();
    }
  });

  // Next Button
  modalNextBtn.addEventListener('click', () => {
    if (currentModalStep < TOTAL_STEPS) {
      updateModalStep(currentModalStep + 1);
    }
  });

  // Back Button
  modalBackBtn.addEventListener('click', () => {
    if (currentModalStep > 1) {
      updateModalStep(currentModalStep - 1);
    }
  });

  // Resume item radio selection
  resumeItems.forEach((item) => {
    item.addEventListener('click', () => {
      resumeItems.forEach((r) => {
        r.classList.remove('selected');
        r.setAttribute('aria-checked', 'false');
      });
      item.classList.add('selected');
      item.setAttribute('aria-checked', 'true');
    });
  });

  // Resume upload trigger
  if (btnUploadResumeTrigger && resumeFileUploadInput) {
    btnUploadResumeTrigger.addEventListener('click', () => {
      resumeFileUploadInput.click();
    });

    resumeFileUploadInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        showToast(`Uploaded: ${file.name}`);
        const firstResume = document.querySelector('.resume-item');
        if (firstResume) {
          firstResume.querySelector('h5').textContent = file.name;
          firstResume.setAttribute('data-resume-name', file.name);
          firstResume.classList.add('selected');
        }
      }
    });
  }

  // Submit Button
  modalSubmitBtn.addEventListener('click', () => {
    const job = JOBS[activeJobId];
    if (job) job.applied = true;

    // Dispatches standard custom event for agents or test suites to detect
    const eventPayload = {
      jobId: activeJobId,
      company: job ? job.company : '',
      title: job ? job.title : '',
      timestamp: Date.now(),
    };

    window.dispatchEvent(new CustomEvent('easy-apply-submitted', { detail: eventPayload }));

    // Show Success Step
    updateModalStep('success');

    // Update active job card in list to show Applied badge
    const activeCard = document.querySelector(`.job-card[data-job-id="${activeJobId}"]`);
    if (activeCard) {
      const meta = activeCard.querySelector('.job-card__meta');
      if (meta) {
        meta.innerHTML = `
          <span>Applied</span>
          <span>·</span>
          <span>Just now</span>
          <span>·</span>
          <span class="job-card__applied-tag">✓ Applied</span>
        `;
      }
    }

    showToast(`Application successfully sent to ${job ? job.company : 'Company'}!`);
  });

  // Done button after success
  if (btnSuccessDone) {
    btnSuccessDone.addEventListener('click', () => {
      closeEasyApplyModal();
      selectJob(activeJobId);
    });
  }

  // Search input clear button
  const searchClearBtn = document.getElementById('search-clear-btn');
  const globalSearchInput = document.getElementById('global-search-input');
  if (searchClearBtn && globalSearchInput) {
    searchClearBtn.addEventListener('click', () => {
      globalSearchInput.value = '';
      globalSearchInput.focus();
    });
  }

  // Expose test helper API globally so test scripts or Playwright/Camoufox can query state directly
  window.__LINKEDIN_MOCK_API__ = {
    getJobs: () => JOBS,
    getActiveJob: () => JOBS[activeJobId],
    getModalStep: () => currentModalStep,
    openModal: openEasyApplyModal,
    closeModal: closeEasyApplyModal,
    selectJob,
    submitApplication: () => modalSubmitBtn.click(),
  };

  console.log('✅ LinkedIn Clone Testbed initialized successfully.');
})();
