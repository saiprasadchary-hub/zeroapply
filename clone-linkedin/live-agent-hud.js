/**
 * ZeroApply - Live Agent Activity & Thought Inspector HUD (Light Mode)
 * Renders an executive, professional light-mode HUD panel displaying real-time
 * form scanning, question analysis, resume RAG excerpt retrieval, and live Qwen 2.5 generation.
 */

(() => {
  'use strict';
  if (window.__zeroapplyHUD) return;

  const style = document.createElement('style');
  style.id = 'zeroapply-hud-styles';
  style.textContent = `
    @keyframes za-pulse-glow {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.2); }
    }
    @keyframes za-fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    #zeroapply-live-hud-root {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 430px;
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
      font-size: 10.5px;
      font-weight: 600;
      padding: 2.5px 8px;
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
      font-size: 16px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      transition: background 0.15s;
    }
    .za-hud-btn-toggle:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .za-hud-body {
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
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
      padding: 4px 10px;
      border-radius: 20px;
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #e2e8f0;
      white-space: nowrap;
    }
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
      max-height: 52px;
      overflow-y: auto;
      font-style: italic;
    }
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
      max-width: 340px;
    }
    .za-hud-history-val {
      color: #64748b;
      font-size: 11px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 340px;
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
  `;
  document.head.appendChild(style);

  const container = document.createElement('div');
  container.id = 'zeroapply-live-hud-root';
  container.innerHTML = `
    <div class="za-hud-card" id="za-hud-card-element">
      <div class="za-hud-header">
        <div class="za-hud-header-left">
          <div class="za-hud-live-dot"></div>
          <span class="za-hud-title">Live Agent Activity</span>
          <span class="za-hud-model-pill" id="za-hud-model-tag">✦ Qwen 2.5:3B</span>
        </div>
        <div>
          <button class="za-hud-btn-toggle" id="za-hud-toggle-btn" title="Minimize/Expand">−</button>
        </div>
      </div>

      <div class="za-hud-body" id="za-hud-body-element">
        <div class="za-hud-meta-row">
          <div class="za-hud-job-info">
            <div class="za-hud-job-title" id="za-hud-job-name">AI Automation Intern</div>
            <div class="za-hud-company" id="za-hud-company-name">HextGen Ai · Hyderabad</div>
          </div>
          <div class="za-hud-step-pill" id="za-hud-step-badge">Step 1 of 5</div>
        </div>

        <div class="za-hud-question-card">
          <div class="za-hud-question-header">
            <span class="za-hud-label-tag">
              <span>✦</span> CURRENT FOCUS QUESTION
            </span>
            <span class="za-hud-input-type" id="za-hud-field-type">FORM STEP</span>
          </div>
          <div class="za-hud-question-text" id="za-hud-active-question">
            Initializing autonomous agent workflow and scanning elements...
          </div>

          <div class="za-hud-rag-container" id="za-hud-rag-box" style="display:none;">
            <div class="za-hud-rag-header">
              <span>📄</span> RESUME CONTEXT RETRIEVED (RAG TIER 3)
            </div>
            <div class="za-hud-rag-excerpt" id="za-hud-rag-text">
              -
            </div>
          </div>

          <div class="za-hud-answer-box" id="za-hud-answer-box" style="display:none;">
            <div class="za-hud-answer-header">
              <span>💡 SYNTHESIZED ANSWER (LOCAL QWEN 2.5)</span>
              <span style="font-size:9px; color:#15803d; font-weight:600;" id="za-hud-answer-source">ON-DEVICE</span>
            </div>
            <div class="za-hud-answer-text" id="za-hud-answer-text">
              -
            </div>
          </div>
        </div>

        <div>
          <div class="za-hud-history-title">RECENT VERIFIED FIELDS</div>
          <div class="za-hud-history-list" id="za-hud-history-container">
            <div class="za-hud-history-item">
              <span class="za-hud-check">✓</span>
              <div class="za-hud-history-content">
                <span class="za-hud-history-label">Universal ATS Perception</span>
                <span class="za-hud-history-val">Identified LinkedIn Easy Apply [multi_step_modal]</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="za-hud-footer">
        <div class="za-hud-privacy-badge">
          <span>🛡️</span> 100% Local · Zero Cloud Leakage
        </div>
        <div id="za-hud-speed-label">Human-Paced (2.2s)</div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  let isMinimized = false;
  const toggleBtn = document.getElementById('za-hud-toggle-btn');
  const bodyEl = document.getElementById('za-hud-body-element');

  toggleBtn.addEventListener('click', () => {
    isMinimized = !isMinimized;
    bodyEl.style.display = isMinimized ? 'none' : 'flex';
    toggleBtn.textContent = isMinimized ? '+' : '−';
  });

  const questionEl = document.getElementById('za-hud-active-question');
  const fieldTypeEl = document.getElementById('za-hud-field-type');
  const ragBox = document.getElementById('za-hud-rag-box');
  const ragText = document.getElementById('za-hud-rag-text');
  const answerBox = document.getElementById('za-hud-answer-box');
  const answerText = document.getElementById('za-hud-answer-text');
  const stepBadge = document.getElementById('za-hud-step-badge');
  const jobTitleEl = document.getElementById('za-hud-job-name');
  const companyEl = document.getElementById('za-hud-company-name');
  const historyContainer = document.getElementById('za-hud-history-container');
  const answerSourceEl = document.getElementById('za-hud-answer-source');

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
      item.innerHTML = `
        <span class="za-hud-check">✓</span>
        <div class="za-hud-history-content">
          <span class="za-hud-history-label">${(label || 'Field').replace(/[*]/g, '').trim()}</span>
          <span class="za-hud-history-val">${String(val || '').slice(0, 65)} ${source === 'ollama' ? '(Qwen 2.5 RAG)' : ''}</span>
        </div>
      `;
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
