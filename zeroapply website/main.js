const content = document.querySelector('#view-content');

const views = {
  dashboard: `
    <div class="stats">
      <div class="stat">
        <span>Active Applications</span>
        <b>12</b>
        <small><em>↗ 3 interviews scheduled</em></small>
      </div>
      <div class="stat">
        <span>Saved Roles</span>
        <b>08</b>
        <small>Ready to submit</small>
      </div>
      <div class="stat">
        <span>Profile Status</span>
        <b>100<span style="font-size:13px">%</span></b>
        <small><em>✓ All sections verified</em></small>
      </div>
    </div>
    <div class="opportunities">
      <div class="table-title">Recent Applications <span>Pipeline Status</span></div>
      ${[
        ['S', 'Senior Product Designer', 'Studio Craft · Remote', 'Interviewing', 'tag-interview'],
        ['F', 'Frontend Engineer', 'Figma · San Francisco (Hybrid)', 'Applied', 'tag-applied'],
        ['L', 'Design Systems Engineer', 'Linear · Remote', 'Saved', 'tag-saved']
      ].map(([icon, title, company, status, tagClass]) => `
        <div class="job-row" role="button" tabindex="0">
          <span class="company-icon">${icon}</span>
          <div>
            ${title}
            <small>${company}</small>
          </div>
          <span class="job-tag ${tagClass}">${status}</span>
        </div>
      `).join('')}
    </div>
  `,
  profile: `
    <div class="profile-intro">
      <span class="avatar">JD</span>
      <div>
        <h4>Jamie Davis</h4>
        <p>Senior Frontend & Interface Systems Engineer · Click any field to copy</p>
      </div>
    </div>
    <div class="profile-preview">
      ${[
        ['Core Specialization', 'Design Systems & Web Interfaces'],
        ['Experience Level', '5+ years professional experience'],
        ['Target Roles', 'Senior Frontend / UI Engineer'],
        ['Technical Stack', 'TypeScript · React · CSS / Tailwind · Next.js'],
        ['Work Preference', 'Remote · US Timezones'],
        ['Notice Period', '2 weeks notice']
      ].map(([label, value]) => `
        <div class="profile-field" role="button" tabindex="0" title="Click to copy">
          <small>${label}</small>
          <b>${value}</b>
        </div>
      `).join('')}
    </div>
  `,
  resume: `
    <div class="resume-view">
      <div class="resume-document">
        <h4>Jamie Davis</h4>
        <p>Senior Frontend & Interface Systems Engineer · jamie@example.com</p>
        <h5>SUMMARY</h5>
        <div class="line"></div>
        <div class="line short"></div>
        <h5>EXPERIENCE</h5>
        <div class="line"></div>
        <div class="line"></div>
        <div class="line short"></div>
        <h5>CORE COMPETENCIES</h5>
        <div class="line"></div>
        <div class="line short"></div>
      </div>
      <div class="resume-info">
        <b>Tailored Resumes</b>
        <p>Maintain your master resume alongside targeted versions. Easily copy tailored bullet points and qualifications for specific company requirements.</p>
        <span class="job-tag">Offline Storage</span>
      </div>
    </div>
  `
};

const titles = {
  dashboard: "Active Applications",
  profile: "Career Profile",
  resume: "Resume Studio"
};

let toastTimeout;
function showToast(message) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('visible');
  }, 2200);
}

function setView(view) {
  if (!content || !views[view]) return;
  content.innerHTML = `<div class="view-pane">${views[view]}</div>`;
  const titleEl = document.querySelector('#dash-title');
  if (titleEl) titleEl.textContent = titles[view];
  
  document.querySelectorAll('[data-view]').forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    if (button.getAttribute('role') === 'tab') {
      button.setAttribute('aria-selected', String(active));
    }
  });
}

if (content) {
  document.querySelectorAll('[data-view]').forEach(button => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });
  setView('dashboard');
}

// Interactive Click-to-copy & Row Interactions
document.addEventListener('click', e => {
  const field = e.target.closest('.profile-field');
  if (field) {
    const text = field.querySelector('b')?.textContent;
    if (text) {
      if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
      showToast(`✓ Copied: "${text}"`);
    }
    return;
  }

  const row = e.target.closest('.job-row');
  if (row) {
    const title = row.querySelector('div')?.childNodes[0]?.textContent?.trim();
    showToast(`Application selected: ${title || 'Job Opportunity'}`);
    return;
  }

  const traffic = e.target.closest('.traffic i');
  if (traffic) {
    if (traffic.classList.contains('traffic-close')) {
      showToast('ZeroApply Desktop is running locally in your tray');
    } else if (traffic.classList.contains('traffic-min')) {
      showToast('Window minimized to Windows taskbar');
    } else if (traffic.classList.contains('traffic-zoom')) {
      showToast('Toggle workspace full screen (F11)');
    }
    return;
  }

  const search = e.target.closest('.dash-search');
  if (search) {
    showToast('Quick search: Type to filter your applications');
  }
});

// Apple Navigation Scroll Enhancement
const header = document.querySelector('header');
window.addEventListener('scroll', () => {
  if (header) {
    header.classList.toggle('scrolled', window.scrollY > 30);
  }
}, { passive: true });

// Liquid Glass Optical Sheen on Mouse Movement
if (matchMedia('(hover: hover)').matches) {
  const glassCards = document.querySelectorAll('.app-window, .summary-card, .installer-card, .step-art');
  glassCards.forEach(card => {
    card.addEventListener('pointermove', e => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--glass-x', `${x}%`);
      card.style.setProperty('--glass-y', `${y}%`);
    });
  });
}

const tabs = [...document.querySelectorAll('[role="tab"]')];
tabs.forEach((tab, index) => {
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      tabs[next].focus();
      setView(tabs[next].dataset.view);
    }
  });
});

const demo = document.querySelector('#demo-dialog');
const watchDemoBtn = document.querySelector('#watch-demo');
const closeDemoBtn = document.querySelector('#close-demo');
const exploreDemoBtn = document.querySelector('#explore-demo');

if (watchDemoBtn && demo) watchDemoBtn.addEventListener('click', () => demo.showModal());
if (closeDemoBtn && demo) closeDemoBtn.addEventListener('click', () => demo.close());
if (exploreDemoBtn && demo) {
  exploreDemoBtn.addEventListener('click', () => {
    demo.close();
    document.querySelector('#experience')?.scrollIntoView({ behavior: 'smooth' });
  });
}
if (demo) {
  demo.addEventListener('click', e => {
    if (e.target === demo) {
      const r = demo.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
        demo.close();
      }
    }
  });
}

// Download Dialog Modal Handlers
const downloadDialog = document.querySelector('#download-dialog');
const btnHeaderDownload = document.querySelector('#btn-header-download');
const btnHeroDownload = document.querySelector('#btn-hero-download');
const closeDownloadDialog = document.querySelector('#close-download-dialog');

function openDownloadModal() {
  if (downloadDialog) {
    downloadDialog.showModal();
    showToast('Download ZeroApply for Windows');
  } else {
    document.querySelector('#download')?.scrollIntoView({ behavior: 'smooth' });
  }
}

if (btnHeaderDownload) btnHeaderDownload.addEventListener('click', openDownloadModal);
if (btnHeroDownload) btnHeroDownload.addEventListener('click', openDownloadModal);
if (closeDownloadDialog && downloadDialog) closeDownloadDialog.addEventListener('click', () => downloadDialog.close());

if (downloadDialog) {
  downloadDialog.addEventListener('click', e => {
    if (e.target === downloadDialog) {
      const r = downloadDialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
        downloadDialog.close();
      }
    }
  });
}

let platform = 'windows';
const downloadButton = document.querySelector('#download-button');
const notice = document.querySelector('#download-notice');
let releaseUrl = null;

// Modal Platform Switcher Elements
let modalPlatform = 'windows';
const modalDownloadBtn = document.querySelector('#modal-download-btn');
const modalNotice = document.querySelector('#modal-download-notice');

async function checkRelease() {
  try {
    const response = await fetch('./downloads/release.json');
    if (response.ok) {
      const release = await response.json();
      if (typeof release.windows === 'string' && release.windows) {
        const url = new URL(release.windows, location.href);
        if (url.protocol === 'https:' || url.origin === location.origin) {
          releaseUrl = url.href;
        }
      }
    }
  } catch {
    /* Installer not connected yet */
  }
  if (platform === 'windows' && releaseUrl) {
    if (downloadButton) downloadButton.innerHTML = 'Download for Windows <span>↓</span>';
    if (modalDownloadBtn) modalDownloadBtn.innerHTML = 'Download for Windows <span>↓</span>';
  }
}

document.querySelectorAll('[data-modal-platform]').forEach(button => {
  button.addEventListener('click', () => {
    modalPlatform = button.dataset.modalPlatform;
    document.querySelectorAll('[data-modal-platform]').forEach(b => {
      b.classList.toggle('selected', b === button);
      b.setAttribute('aria-pressed', String(b === button));
    });
    const names = { windows: 'Windows', mac: 'macOS', linux: 'Linux' };
    const name = names[modalPlatform] || 'Desktop';
    if (modalDownloadBtn) {
      modalDownloadBtn.innerHTML = modalPlatform === 'windows'
        ? (releaseUrl ? 'Download for Windows <span>↓</span>' : 'Check Windows download <span>↓</span>')
        : `${name} · In Development`;
    }
    const detailEl = document.querySelector('#modal-platform-detail');
    if (detailEl) {
      detailEl.textContent = modalPlatform === 'windows'
        ? 'Windows 10 & 11 (64-bit) · Installer availability below'
        : `${name} builds are currently in development.`;
    }
    if (modalNotice) modalNotice.hidden = true;
  });
});

if (modalDownloadBtn) {
  modalDownloadBtn.addEventListener('click', () => {
    if (modalPlatform === 'windows' && releaseUrl) {
      const link = document.createElement('a');
      link.href = releaseUrl;
      link.download = 'ZeroApply-Setup.exe';
      link.rel = 'noopener';
      document.body.append(link);
      link.click();
      link.remove();
      return;
    }
    if (modalNotice) {
      modalNotice.hidden = false;
      modalNotice.textContent = modalPlatform === 'windows'
        ? 'The Windows installer build has not been linked yet in downloads/release.json. Once linked, clicking here downloads the executable directly.'
        : 'Builds for macOS and Linux are coming soon. The current package targets 64-bit Windows.';
    }
  });
}

document.querySelectorAll('[data-platform]').forEach(button => {
  button.addEventListener('click', () => {
    platform = button.dataset.platform;
    document.querySelectorAll('[data-platform]').forEach(b => {
      b.classList.toggle('selected', b === button);
      b.setAttribute('aria-pressed', String(b === button));
    });
    const names = { windows: 'Windows', mac: 'macOS', linux: 'Linux' };
    const name = names[platform] || 'Desktop';
    if (downloadButton) {
      downloadButton.innerHTML = platform === 'windows'
        ? (releaseUrl ? 'Download for Windows <span>↓</span>' : 'Check Windows download <span>↓</span>')
        : `${name} · In Development`;
    }
    const detailEl = document.querySelector('#platform-detail');
    if (detailEl) {
      detailEl.textContent = platform === 'windows'
        ? 'Windows 10 & 11 (64-bit) · Installer availability below'
        : `${name} builds are currently in development.`;
    }
    if (notice) notice.hidden = true;
  });
});

if (downloadButton) {
  downloadButton.addEventListener('click', () => {
    if (platform === 'windows' && releaseUrl) {
      const link = document.createElement('a');
      link.href = releaseUrl;
      link.download = 'ZeroApply-Setup.exe';
      link.rel = 'noopener';
      document.body.append(link);
      link.click();
      link.remove();
      return;
    }
    if (notice) {
      notice.hidden = false;
      notice.textContent = platform === 'windows'
        ? 'The Windows installer build has not been linked yet in downloads/release.json. Once linked, clicking here downloads the executable directly.'
        : 'Builds for macOS and Linux are coming soon. The current package targets 64-bit Windows.';
    }
  });
}

checkRelease();

const yearEl = document.querySelector('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.section-top, .section > h2, .preview-wrap, .feature-tabs, .steps article, .faq-section > div, .statement-grid, .autofill-stage, .answers-grid, .kanban-board, .quickbar-showcase, .ats-scanner-stage, .outreach-showcase, .offer-calc-container, .star-prep-stage, .funnel-container, .velocity-stats-row, .portal-matrix-grid, .comparison-table-wrap').forEach(el => {
  el.classList.add('reveal');
  observer.observe(el);
});

// Career Personas Data & Switcher
const personas = {
  frontend: {
    name: 'Jamie Davis',
    title: 'Senior Frontend Engineer',
    email: 'jamie@example.com',
    phone: '+1 (555) 019-2834',
    link: 'linkedin.com/in/jamiedavis',
    portfolio: 'https://jamiedavis.design',
    github: 'https://github.com/jamiedavis',
    salary: '$165,000 / year base',
    notice: '2 weeks notice',
    auth: 'Authorized to work in US without sponsorship'
  },
  design: {
    name: 'Elena Rostova',
    title: 'Lead Product Designer',
    email: 'elena.rostova@designcraft.io',
    phone: '+1 (555) 842-1920',
    link: 'linkedin.com/in/elenarostova',
    portfolio: 'https://elenarostova.co/case-studies',
    github: 'https://dribbble.com/elenarostova',
    salary: '$180,000 / year base',
    notice: '1 month notice',
    auth: 'Authorized to work in US without sponsorship'
  },
  data: {
    name: 'Marcus Chen',
    title: 'Senior Data Scientist',
    email: 'marcus.chen@analytics-hub.com',
    phone: '+1 (555) 673-4501',
    link: 'linkedin.com/in/marcuschen-data',
    portfolio: 'https://marcuschen.ai/models',
    github: 'https://github.com/marcuschen-ml',
    salary: '$175,000 / year base',
    notice: 'Immediate availability',
    auth: 'Authorized to work in US without sponsorship'
  }
};

let activePersona = personas.frontend;

document.querySelectorAll('[data-persona]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-persona]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const p = personas[btn.dataset.persona];
    if (!p) return;
    activePersona = p;

    const sName = document.querySelector('#source-name');
    const sTitle = document.querySelector('#source-title');
    if (sName) sName.textContent = p.name;
    if (sTitle) sTitle.textContent = p.title;

    const srcMap = {
      'src-name': p.name,
      'src-email': p.email,
      'src-phone': p.phone,
      'src-link': p.link,
      'src-salary': p.salary,
      'src-auth': 'Authorized / No Sponsor',
      'src-notice': p.notice
    };
    Object.entries(srcMap).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });

    showToast(`✓ Switched career profile: ${p.name}`);
  });
});

// Interactive 1-Click Form Autofill Simulation
const btnAutofill = document.querySelector('#btn-autofill-demo');
const btnReset = document.querySelector('#btn-autofill-reset');
const autofillPill = document.querySelector('#autofill-pill');

if (btnAutofill) {
  btnAutofill.addEventListener('click', () => {
    const p = activePersona;
    const formFields = {
      'demo-fullname': p.name,
      'demo-email': p.email,
      'demo-phone': p.phone,
      'demo-linkedin': p.link,
      'demo-portfolio': p.portfolio,
      'demo-github': p.github,
      'demo-salary': p.salary,
      'demo-notice': p.notice,
      'demo-auth': p.auth
    };

    let delay = 0;
    const keys = Object.keys(formFields);
    keys.forEach(key => {
      const input = document.getElementById(key);
      if (input) {
        setTimeout(() => {
          input.value = formFields[key];
          input.classList.add('filled');
        }, delay);
        delay += 35;
      }
    });

    setTimeout(() => {
      if (autofillPill) autofillPill.classList.add('visible');
      showToast(`⚡ 9 fields auto-filled for ${p.name} in 0.32s!`);
    }, delay + 50);
  });
}

if (btnReset) {
  btnReset.addEventListener('click', () => {
    const fieldIds = [
      'demo-fullname', 'demo-email', 'demo-phone', 'demo-linkedin',
      'demo-portfolio', 'demo-github', 'demo-salary', 'demo-notice', 'demo-auth'
    ];
    fieldIds.forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.value = '';
        input.classList.remove('filled');
      }
    });
    if (autofillPill) autofillPill.classList.remove('visible');
    showToast('Application form reset');
  });
}

// ATS Keyword Scanner Interactivity
const atsRoles = {
  frontend: {
    score: 94,
    status: 'High Callback Probability',
    count: '6 / 8 Keywords Matched',
    desc: `<strong>Key Requirements:</strong><br>• 5+ years experience building complex client applications using <b>TypeScript</b> and modern <b>React</b>.<br>• Deep expertise in <b>Design Systems</b>, accessible component architecture, and <b>Web Vitals</b>.<br>• Experience orchestrating modern <b>CI/CD Workflows</b> and <b>Docker</b> containers.`,
    matched: ['✓ React 19 (Found 6x)', '✓ TypeScript (Found 5x)', '✓ Design Systems (Found 3x)', '✓ Web Vitals (Found 2x)', '✓ GraphQL (Found 2x)', '✓ State Machines (Found 1x)'],
    bullet: `"Architected a unified component framework using <mark>TypeScript</mark> and <mark>React</mark>, cutting bundle load times by 40% and optimizing <mark>Web Vitals</mark> to 99 across desktop and mobile."`
  },
  linear: {
    score: 91,
    status: 'High Callback Probability',
    count: '5 / 7 Keywords Matched',
    desc: `<strong>Key Requirements:</strong><br>• Relentless focus on sub-100ms UI responsiveness, sync engines, and <b>Keyboard Navigation</b>.<br>• Mastery of <b>Web Vitals</b> and micro-interactions with <b>TypeScript</b>.<br>• Familiarity with client caching, offline sync, and <b>CI/CD</b> deployment pipelines.`,
    matched: ['✓ Keyboard Navigation (Found 4x)', '✓ TypeScript (Found 5x)', '✓ Web Vitals (Found 3x)', '✓ Sync Engine (Found 2x)', '✓ Zero Latency (Found 2x)'],
    bullet: `"Engineered optimistic cache invalidation and <mark>Keyboard Navigation</mark> for rapid issue dispatch, achieving zero layout shifts and 99.8th percentile sub-50ms render latency."`
  },
  vercel: {
    score: 96,
    status: 'Top Tier Match (99th percentile)',
    count: '7 / 8 Keywords Matched',
    desc: `<strong>Key Requirements:</strong><br>• Deep technical mastery of <b>React Server Components</b>, Next.js App Router, and <b>CSS Architecture</b>.<br>• Exceptional attention to typography, fluid motion, and specular glass aesthetics.<br>• Experience with Edge functions, Webpack/Turbopack, and automated test runners.`,
    matched: ['✓ React 19 (Found 7x)', '✓ CSS Architecture (Found 5x)', '✓ Next.js (Found 4x)', '✓ Fluid Motion (Found 3x)', '✓ Design Systems (Found 4x)', '✓ Edge Functions (Found 2x)'],
    bullet: `"Crafted high-fidelity fluid interface components in <mark>React 19</mark> and modern <mark>CSS Architecture</mark>, improving developer adoption by 60% and reducing cumulative layout shift to zero."`
  }
};

document.querySelectorAll('[data-role]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-role]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const r = atsRoles[btn.dataset.role];
    if (!r) return;

    const descEl = document.querySelector('#job-desc-text');
    if (descEl) descEl.innerHTML = r.desc;

    const scoreVal = document.querySelector('#ats-score-val');
    if (scoreVal) scoreVal.textContent = r.score;

    const scoreStat = document.querySelector('#ats-score-status');
    if (scoreStat) scoreStat.textContent = r.status;

    const kwCount = document.querySelector('#ats-kw-count');
    if (kwCount) kwCount.textContent = r.count;

    const matchedWrap = document.querySelector('#matched-chips');
    if (matchedWrap) {
      matchedWrap.innerHTML = r.matched.map(m => `<span class="keyword-chip matched">${m}</span>`).join('');
    }

    const bullet = document.querySelector('#tailored-bullet');
    if (bullet) bullet.innerHTML = r.bullet;

    showToast(`ATS profile scanned for ${btn.querySelector('strong')?.textContent?.split('·')[0]?.trim() || 'Role'}`);
  });
});

// Inject Missing Keyword Handler
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn-inject-kw');
  if (btn) {
    const kw = btn.dataset.kw;
    const chip = btn.closest('.keyword-chip');
    if (chip) {
      chip.className = 'keyword-chip matched';
      chip.innerHTML = `✓ ${kw} (Injected to Resume)`;
    }

    const bullet = document.querySelector('#tailored-bullet');
    if (bullet && !bullet.textContent.includes(kw)) {
      bullet.innerHTML = bullet.innerHTML.replace('mobile."', `mobile and orchestrating automated <mark>${kw}</mark> pipelines."`);
    }

    const scoreVal = document.querySelector('#ats-score-val');
    if (scoreVal) scoreVal.textContent = '99';

    const scoreStat = document.querySelector('#ats-score-status');
    if (scoreStat) scoreStat.textContent = 'Top Tier Match (99th percentile)';

    const kwCount = document.querySelector('#ats-kw-count');
    if (kwCount) kwCount.textContent = '8 / 8 Keywords Matched';

    showToast(`⚡ Injected "${kw}"! ATS Score boosted to 99%!`);
  }
});

// Recruiter Outreach Studio Interactivity
const outreachTemplates = {
  thankyou: {
    subject: "Subject: Thank you — <span class='var-tag'>{Role Title}</span> Interview Discussion (<span class='var-tag'>{Candidate Name}</span>)",
    content: `Hi <span class="var-tag">{Interviewer Name}</span>,\n\nThank you for taking the time to speak today about the <span class="var-tag">{Role Title}</span> position at <span class="var-tag">{Company}</span>. I really enjoyed learning more about <span class="var-tag">{Key Topic Discussed}</span> and how your team is tackling frontend performance at scale.\n\nOur conversation confirmed that my experience in component architecture and state management aligns closely with your upcoming milestones. Please feel free to reach out if you need any additional work samples or references.\n\nLooking forward to hearing from you regarding the next steps.\n\nBest regards,\n<span class="var-tag">{Candidate Name}</span>`
  },
  checkin: {
    subject: "Subject: Following up on <span class='var-tag'>{Role Title}</span> Application (<span class='var-tag'>{Candidate Name}</span>)",
    content: `Hi <span class="var-tag">{Recruiter Name}</span>,\n\nHope your week is going well!\n\nI wanted to check in on my application for the <span class="var-tag">{Role Title}</span> position submitted on <span class="var-tag">{Date Applied}</span>. I remain extremely interested in the opportunity to contribute to <span class="var-tag">{Company}</span>, especially given your team's recent work on <span class="var-tag">{Initiative}</span>.\n\nCould you share if there are any updates regarding the interview schedule? Happy to provide any additional context in the meantime.\n\nThank you for your time,\n<span class="var-tag">{Candidate Name}</span>`
  },
  cold: {
    subject: "LinkedIn Message: Question regarding frontend architecture at <span class='var-tag'>{Company}</span>",
    content: `Hi <span class="var-tag">{Hiring Manager Name}</span>,\n\nI noticed your post regarding expanding the UI engineering team at <span class="var-tag">{Company}</span>. Over the past 5 years, I've specialized in building high-performance design systems and sub-100ms web applications.\n\nI recently submitted an application for the <span class="var-tag">{Role Title}</span> position, but wanted to reach out directly to express my genuine enthusiasm for what your group is building. Would you be open to a brief 10-minute introductory conversation this week?\n\nBest,\n<span class="var-tag">{Candidate Name}</span>`
  },
  counter: {
    subject: "Subject: Formal Offer Discussion & Proposal — <span class='var-tag'>{Role Title}</span> (<span class='var-tag'>{Candidate Name}</span>)",
    content: `Dear <span class="var-tag">{Hiring Manager Name}</span>,\n\nThank you sincerely for extending the formal offer for the <span class="var-tag">{Role Title}</span> role at <span class="var-tag">{Company}</span>. I am genuinely thrilled about the team culture, product vision, and the opportunity to make an immediate impact.\n\nHaving reviewed the overall package alongside market data for senior leadership in this tier, I would like to propose a base salary of $175,000 (from $165,000) and an additional $15,000 in first-year equity vesting. With these adjustments, I am fully prepared to accept immediately.\n\nThank you again for your advocacy, and I look forward to your thoughts.\n\nWarmly,\n<span class="var-tag">{Candidate Name}</span>`
  }
};

document.querySelectorAll('[data-template]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-template]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const t = outreachTemplates[btn.dataset.template];
    if (!t) return;

    const sub = document.querySelector('#outreach-subject');
    const body = document.querySelector('#outreach-content');
    if (sub) sub.innerHTML = t.subject;
    if (body) body.innerHTML = t.content;

    showToast(`Template loaded: ${btn.textContent.trim()}`);
  });
});

const btnCopyOutreach = document.querySelector('#btn-copy-outreach');
if (btnCopyOutreach) {
  btnCopyOutreach.addEventListener('click', () => {
    const body = document.querySelector('#outreach-content');
    if (body) {
      const text = body.textContent;
      if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
      showToast('✓ Outreach template copied to clipboard!');
    }
  });
}

// STAR Behavioral Interview Notebook Interactivity
const starQuestions = {
  outage: {
    s: `"During Black Friday peak traffic, our checkout micro-frontend experienced sudden 450ms latency spikes affecting 14% of mobile transactions."`,
    t: `"As on-call frontend lead, I needed to identify the root cause within 15 minutes, prevent payment timeouts, and stabilize checkout flow."`,
    a: `"I profiled network waterfall logs, discovered a blocking third-party analytics script, toggled an emergency feature flag, and pushed a deferred script loader in 8 minutes."`,
    r: `"P99 checkout latency dropped from 450ms back to 48ms. Zero cart abandonments were logged, preserving an estimated $120,000 in revenue."`
  },
  scope: {
    s: `"Product management requested adding an entire rich-text commenting module with real-time sync 4 days before a quarterly release deadline."`,
    t: `"I needed to protect the delivery milestone while addressing the genuine customer need for contextual feedback."`,
    a: `"I scoped the request into an immediate Phase 1 MVP (lightweight markdown comments without websocket sync) and scheduled the real-time layer for sprint 1 of next quarter."`,
    r: `"The core release shipped precisely on schedule with zero high-severity bugs, and users gave the MVP comments a 92% satisfaction rating."`
  },
  disagree: {
    s: `"Our backend team advocated for a strict GraphQL migration while frontend engineers preferred REST with server-sent events for live dashboards."`,
    t: `"I was asked to arbitrate the architectural decision without causing friction between cross-functional teams."`,
    a: `"I organized a 2-day prototype comparing payload serialization latency, schema caching complexity, and developer onboarding velocity."`,
    r: `"The data clearly favored REST with automated OpenAPI generation, saving an estimated 6 weeks of migration overhead with unanimous team consensus."`
  }
};

document.querySelectorAll('[data-q]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-q]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const q = starQuestions[btn.dataset.q];
    if (!q) return;

    const s = document.querySelector('#star-situation');
    const t = document.querySelector('#star-task');
    const a = document.querySelector('#star-action');
    const r = document.querySelector('#star-result');

    if (s) s.textContent = q.s;
    if (t) t.textContent = q.t;
    if (a) a.textContent = q.a;
    if (r) r.textContent = q.r;

    showToast(`Behavioral answer framework loaded: ${btn.textContent.trim()}`);
  });
});

// STAR Live Practice Timer
let timerSeconds = 90;
let timerInterval = null;
let timerRunning = false;

const timerDigits = document.querySelector('#timer-digits');
const timerPulse = document.querySelector('#timer-pulse');
const btnTimerStart = document.querySelector('#btn-timer-start');
const btnTimerReset = document.querySelector('#btn-timer-reset');

function formatTimer(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

if (btnTimerStart) {
  btnTimerStart.addEventListener('click', () => {
    if (timerRunning) {
      clearInterval(timerInterval);
      timerRunning = false;
      btnTimerStart.textContent = '▶ Resume Timer';
      if (timerPulse) timerPulse.classList.remove('running');
      showToast('Practice timer paused');
    } else {
      if (timerSeconds <= 0) timerSeconds = 90;
      timerRunning = true;
      btnTimerStart.textContent = '⏸ Pause Timer';
      if (timerPulse) timerPulse.classList.add('running');
      showToast('Pacing timer running — Speak your STAR story!');

      timerInterval = setInterval(() => {
        timerSeconds--;
        if (timerDigits) timerDigits.textContent = formatTimer(timerSeconds);

        if (timerSeconds <= 0) {
          clearInterval(timerInterval);
          timerRunning = false;
          btnTimerStart.textContent = '▶ Practice Again';
          if (timerPulse) timerPulse.classList.remove('running');
          showToast('⏰ Time is up! Great 90-second response.');
        }
      }, 1000);
    }
  });
}

if (btnTimerReset) {
  btnTimerReset.addEventListener('click', () => {
    clearInterval(timerInterval);
    timerRunning = false;
    timerSeconds = 90;
    if (timerDigits) timerDigits.textContent = '01:30';
    if (btnTimerStart) btnTimerStart.textContent = '▶ Start Timer';
    if (timerPulse) timerPulse.classList.remove('running');
    showToast('Practice timer reset to 90 seconds');
  });
}

// QuickBar Live Search Filter
const qbInput = document.querySelector('#quickbar-filter-input');
const qbList = document.querySelector('#quickbar-results-list');

if (qbInput && qbList) {
  qbInput.addEventListener('input', () => {
    const q = qbInput.value.toLowerCase().trim();
    const items = qbList.querySelectorAll('.qb-item');
    let hasMatch = false;

    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      const val = item.dataset.value?.toLowerCase() || '';
      const match = text.includes(q) || val.includes(q);
      item.style.display = match ? 'flex' : 'none';
      if (match) hasMatch = true;
    });

    if (!hasMatch) {
      let noMatchEl = document.querySelector('#qb-no-match');
      if (!noMatchEl) {
        noMatchEl = document.createElement('div');
        noMatchEl.id = 'qb-no-match';
        noMatchEl.style.padding = '12px 16px';
        noMatchEl.style.fontSize = '12px';
        noMatchEl.style.color = 'rgba(255,255,255,0.6)';
        qbList.appendChild(noMatchEl);
      }
      noMatchEl.textContent = `No fields found matching "${qbInput.value}". Type "email", "github", or "salary".`;
      noMatchEl.style.display = 'block';
    } else {
      const noMatchEl = document.querySelector('#qb-no-match');
      if (noMatchEl) noMatchEl.style.display = 'none';
    }
  });

  qbInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const visibleItem = qbList.querySelector('.qb-item[style*="display: flex"], .qb-item:not([style*="display: none"])');
      if (visibleItem) {
        const text = visibleItem.dataset.value || visibleItem.querySelector('span')?.textContent;
        if (text) {
          if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
          showToast(`✓ Copied: ${text}`);
        }
      }
    }
  });
}

// General Clicks for Answer Cards, Kanban, Quickbar Items
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn-copy-answer');
  if (btn) {
    const card = btn.closest('.answer-card');
    const text = card?.querySelector('.answer-snippet')?.textContent?.trim();
    if (text) {
      if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
      showToast('✓ Screening answer copied to clipboard!');
    }
    return;
  }

  const kCard = e.target.closest('.k-card');
  if (kCard) {
    const title = kCard.querySelector('strong')?.textContent;
    showToast(`Pipeline: ${title} details opened`);
    return;
  }

  const qb = e.target.closest('.qb-item');
  if (qb) {
    const val = qb.dataset.value || qb.querySelector('span')?.textContent;
    if (val) {
      if (navigator.clipboard) navigator.clipboard.writeText(val).catch(() => {});
      showToast(`✓ Copied: ${val}`);
    }
  }
});

