/**
 * ZeroApply UI - Professional Light-Mode Live Agent HUD
 * Zero-dependency injected script that renders an executive, high-contrast,
 * light-mode floating panel showing real-time form scanning, question analysis,
 * resume RAG excerpt retrieval, live Qwen 2.5 generation, and field fill events.
 */

export function getLiveAgentLightHudScript(): string {
  return `
(() => {
  if (window.__zeroapplyHUD) return;

  const style = document.createElement('style');
  style.id = 'zeroapply-hud-styles';
  style.textContent = \`
    @keyframes za-pulse-glow {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.15); }
    }
    @keyframes za-fade-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes za-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    #zeroapply-live-hud-root {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 420px;
      max-width: calc(100vw - 48px);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      pointer-events: auto;
      user-select: none;
      animation: za-fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .za-hud-card {
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(226, 232, 240, 0.8);
      overflow: hidden;
      transition: all 0.25s ease;
    }
    .za-hud-header {
      padding: 12px 16px;
      background: #ffffff;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .za-hud-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .za-hud-live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
      animation: za-pulse-glow 2s infinite ease-in-out;
    }
    .za-hud-title {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #1e293b;
    }
    .za-hud-model-pill {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 6px;
      background: #eef2ff;
      color: #4f46e5;
      border: 1px solid #e0e7ff;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .za-hud-btn-toggle {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 14px;
      padding: 2px 6px;
      border-radius: 4px;
      transition: background 0.15s;
    }
    .za-hud-btn-toggle:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .za-hud-copy-btn {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      color: #334155;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 7px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      transition: all 0.15s;
    }
    .za-hud-copy-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .za-hud-body {
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    /* Meta Row: Job & Step */
    .za-hud-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 10px;
    }
    .za-hud-job-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .za-hud-job-title {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 230px;
    }
    .za-hud-company {
      font-size: 11px;
      color: #64748b;
    }
    .za-hud-step-pill {
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 20px;
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #e2e8f0;
      white-space: nowrap;
    }
    /* Active Question Card */
    .za-hud-question-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .za-hud-question-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .za-hud-label-tag {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6366f1;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .za-hud-input-type {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      background: #f1f5f9;
      color: #475569;
      text-transform: uppercase;
    }
    .za-hud-question-text {
      font-size: 12.5px;
      font-weight: 600;
      color: #1e293b;
      line-height: 1.45;
    }
    /* Generation & RAG Context */
    .za-hud-rag-container {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .za-hud-rag-header {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #0284c7;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .za-hud-rag-excerpt {
      font-size: 11px;
      color: #475569;
      line-height: 1.4;
      max-height: 48px;
      overflow-y: auto;
      font-style: italic;
    }
    /* Generating Answer Box */
    .za-hud-answer-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .za-hud-answer-header {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #16a34a;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .za-hud-answer-text {
      font-size: 12px;
      font-weight: 500;
      color: #14532d;
      line-height: 1.45;
      word-break: break-word;
    }
    /* Feed / History */
    .za-hud-history-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
      margin-top: 2px;
    }
    .za-hud-history-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 110px;
      overflow-y: auto;
    }
    .za-hud-history-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 11.5px;
      padding: 5px 8px;
      border-radius: 6px;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      color: #334155;
    }
    .za-hud-check {
      color: #10b981;
      font-weight: 700;
      font-size: 12px;
      line-height: 1;
      margin-top: 2px;
    }
    .za-hud-history-content {
      display: flex;
      flex-direction: column;
      gap: 1px;
      overflow: hidden;
    }
    .za-hud-history-label {
      font-weight: 600;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 330px;
    }
    .za-hud-history-val {
      color: #64748b;
      font-size: 11px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 330px;
    }
    .za-hud-footer {
      padding: 8px 16px;
      background: #f8fafc;
      border-top: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 10.5px;
      color: #64748b;
    }
    .za-hud-privacy-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #059669;
      font-weight: 600;
    }
  \`;

  function h(tag, attrs, children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k === 'class' || k === 'className') el.className = v;
        else if (k === 'id') el.id = v;
        else if (k === 'style') el.style.cssText = v;
        else if (k === 'text') el.textContent = v;
        else el.setAttribute(k, v);
      }
    }
    if (children) {
      for (const child of children) {
        if (!child) continue;
        if (typeof child === 'string') el.appendChild(document.createTextNode(child));
        else el.appendChild(child);
      }
    }
    return el;
  }

  function safeMountHud() {
    const mount = document.body || document.documentElement;
    if (!mount) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', safeMountHud, { once: true });
      }
      return;
    }
    if (!document.getElementById('zeroapply-hud-styles')) {
      style.id = 'zeroapply-hud-styles';
      (document.head || mount).appendChild(style);
    }
    if (!document.getElementById('zeroapply-live-hud-root')) {
      mount.appendChild(container);
    }
  }

  const container = document.createElement('div');
  container.id = 'zeroapply-live-hud-root';

  const toggleBtn = h('button', { class: 'za-hud-btn-toggle', id: 'za-hud-toggle-btn', title: 'Minimize/Expand', text: '−' });
  const copyBtn = h('button', { class: 'za-hud-copy-btn', id: 'za-hud-copy-btn', title: 'Copy Process Log to Clipboard', text: '📋 Copy Process' });
  const bodyEl = h('div', { class: 'za-hud-body', id: 'za-hud-body-element' });
  const questionEl = h('div', { class: 'za-hud-question-text', id: 'za-hud-active-question', text: 'Initializing autonomous workflow and scanning page elements...' });
  const fieldTypeEl = h('span', { class: 'za-hud-input-type', id: 'za-hud-field-type', text: 'FORM STEP' });
  const ragBox = h('div', { class: 'za-hud-rag-container', id: 'za-hud-rag-box', style: 'display:none;' });
  const ragText = h('div', { class: 'za-hud-rag-excerpt', id: 'za-hud-rag-text', text: '-' });
  ragBox.append(
    h('div', { class: 'za-hud-rag-header' }, [h('span', { text: '📄' }), ' RESUME CONTEXT RETRIEVED (RAG TIER 3)']),
    ragText
  );

  const answerSourceEl = h('span', { style: 'font-size:9px; color:#15803d; font-weight:600;', id: 'za-hud-answer-source', text: 'ON-DEVICE' });
  const answerText = h('div', { class: 'za-hud-answer-text', id: 'za-hud-answer-text', text: '-' });
  const answerBox = h('div', { class: 'za-hud-answer-box', id: 'za-hud-answer-box', style: 'display:none;' });
  answerBox.append(
    h('div', { class: 'za-hud-answer-header' }, [h('span', { text: '💡 SYNTHESIZED ANSWER (LOCAL QWEN 2.5)' }), answerSourceEl]),
    answerText
  );

  const stepBadge = h('div', { class: 'za-hud-step-pill', id: 'za-hud-step-badge', text: 'Step 1 of 5' });
  const jobTitleEl = h('div', { class: 'za-hud-job-title', id: 'za-hud-job-name', text: 'AI Automation Intern' });
  const companyEl = h('div', { class: 'za-hud-company', id: 'za-hud-company-name', text: 'HextGen Ai · Hyderabad' });

  const historyContainer = h('div', { class: 'za-hud-history-list', id: 'za-hud-history-container' }, [
    h('div', { class: 'za-hud-history-item' }, [
      h('span', { class: 'za-hud-check', text: '✓' }),
      h('div', { class: 'za-hud-history-content' }, [
        h('span', { class: 'za-hud-history-label', text: 'Universal ATS Perception' }),
        h('span', { class: 'za-hud-history-val', text: 'Identified LinkedIn Easy Apply [multi_step_modal]' }),
      ]),
    ]),
  ]);

  bodyEl.append(
    h('div', { class: 'za-hud-meta-row' }, [
      h('div', { class: 'za-hud-job-info' }, [jobTitleEl, companyEl]),
      stepBadge,
    ]),
    h('div', { class: 'za-hud-question-card' }, [
      h('div', { class: 'za-hud-question-header' }, [
        h('span', { class: 'za-hud-label-tag' }, [h('span', { text: '✦' }), ' CURRENT FOCUS QUESTION']),
        fieldTypeEl,
      ]),
      questionEl,
      ragBox,
      answerBox,
    ]),
    h('div', null, [
      h('div', { class: 'za-hud-history-title', text: 'RECENT VERIFIED FIELDS' }),
      historyContainer,
    ])
  );

  const card = h('div', { class: 'za-hud-card', id: 'za-hud-card-element' }, [
    h('div', { class: 'za-hud-header' }, [
      h('div', { class: 'za-hud-header-left' }, [
        h('div', { class: 'za-hud-live-dot' }),
        h('span', { class: 'za-hud-title', text: 'Live Agent Activity' }),
        h('span', { class: 'za-hud-model-pill', id: 'za-hud-model-tag', text: '✦ Qwen 2.5:3B' }),
      ]),
      h('div', { style: 'display:flex; align-items:center; gap:6px;' }, [copyBtn, toggleBtn]),
    ]),
    bodyEl,
    h('div', { class: 'za-hud-footer' }, [
      h('div', { class: 'za-hud-privacy-badge' }, [h('span', { text: '🛡️' }), ' 100% Local · Zero Cloud Leakage']),
      h('div', { id: 'za-hud-speed-label', text: 'Human-Paced (2.2s)' }),
    ]),
  ]);

  container.appendChild(card);
  safeMountHud();

  let isMinimized = false;
  toggleBtn.addEventListener('click', () => {
    isMinimized = !isMinimized;
    bodyEl.style.display = isMinimized ? 'none' : 'flex';
    toggleBtn.textContent = isMinimized ? '+' : '−';
  });

  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const historyItems = Array.from(historyContainer.querySelectorAll('.za-hud-history-item')).map(item => {
      const label = item.querySelector('.za-hud-history-label')?.textContent || '';
      const val = item.querySelector('.za-hud-history-val')?.textContent || '';
      return '• ' + label + ': ' + val;
    }).join('\\n');
    const job = (jobTitleEl?.textContent || 'Application') + ' at ' + (companyEl?.textContent || 'Company');
    const text = '==================================================\\nZEROAPPLY - PROCESS REPORT\\nRole: ' + job + '\\n==================================================\\n\\n' + (historyItems || 'No actions recorded yet.');
    try {
      navigator.clipboard.writeText(text);
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => { copyBtn.textContent = '📋 Copy Process'; }, 2000);
    } catch(err) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => { copyBtn.textContent = '📋 Copy Process'; }, 2000);
    }
  });

  window.__zeroapplyHUD = {
    setJob: (title, company) => {
      if (jobTitleEl && title) jobTitleEl.textContent = title;
      if (companyEl && company) companyEl.textContent = company;
    },
    setStep: (stepNumber, totalSteps, title) => {
      if (stepBadge) {
        stepBadge.textContent = 'Step ' + stepNumber + (totalSteps ? ' of ' + totalSteps : '') + (title ? ' · ' + title : '');
      }
    },
    setQuestion: (question, inputType) => {
      if (questionEl && question) questionEl.textContent = question;
      if (fieldTypeEl && inputType) fieldTypeEl.textContent = inputType.toUpperCase();
      if (ragBox) ragBox.style.display = 'none';
      if (answerBox) answerBox.style.display = 'none';
    },
    setLLMGeneration: (question, resumeContext, answer, source = 'ollama', model = 'Qwen 2.5 3B') => {
      if (questionEl && question) questionEl.textContent = question;
      if (ragBox && resumeContext) {
        ragBox.style.display = 'flex';
        ragText.textContent = resumeContext;
      }
      if (answerBox && answer) {
        answerBox.style.display = 'flex';
        answerText.textContent = answer;
        if (answerSourceEl) answerSourceEl.textContent = source === 'ollama' ? 'LOCAL ' + model : 'PERSONA PROFILE';
      }
    },
    recordFilled: (label, val, source = 'persona') => {
      if (!historyContainer) return;
      const item = document.createElement('div');
      item.className = 'za-hud-history-item';
      item.style.animation = 'za-fade-in 0.25s ease';

      const check = document.createElement('span');
      check.className = 'za-hud-check';
      check.textContent = '✓';
      item.appendChild(check);

      const content = document.createElement('div');
      content.className = 'za-hud-history-content';

      const labelSpan = document.createElement('span');
      labelSpan.className = 'za-hud-history-label';
      labelSpan.textContent = (label || 'Field').replace(/[*]/g, '').trim();
      content.appendChild(labelSpan);

      const valSpan = document.createElement('span');
      valSpan.className = 'za-hud-history-val';
      valSpan.textContent = String(val || '').slice(0, 65) + (source === 'ollama' ? ' (Qwen 2.5 RAG)' : '');
      content.appendChild(valSpan);

      item.appendChild(content);
      historyContainer.prepend(item);
      while (historyContainer.children.length > 5) {
        historyContainer.removeChild(historyContainer.lastChild);
      }
    },
    onTelemetry: (record) => {
      if (!record) return;
      if (record.type === 'think' && record.target) {
        window.__zeroapplyHUD.setQuestion(record.target, record.source === 'ollama' ? 'LOCAL LLM' : 'INPUT');
        if (record.value) {
          window.__zeroapplyHUD.setLLMGeneration(record.target, undefined, record.value, record.source, record.model || 'Qwen 2.5:3b');
        }
      } else if (record.type === 'type' && record.target && record.value) {
        window.__zeroapplyHUD.recordFilled(record.target, record.value, record.source);
      } else if (record.type === 'click' && record.title) {
        window.__zeroapplyHUD.setQuestion(record.title, 'CLICK');
      } else if (record.type === 'submit') {
        window.__zeroapplyHUD.setQuestion('Application Submitted Successfully!', 'COMPLETE');
        if (stepBadge) stepBadge.textContent = 'Completed';
      }
    }
  };
})();
  `;
}
