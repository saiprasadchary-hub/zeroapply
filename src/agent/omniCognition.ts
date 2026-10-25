/**
 * ZeroApply OmniCognition & QuantumPerception Master Engine (Production Grade)
 * 
 * Unified executive orchestrator integrating:
 * 1. Quantum Spatial-Semantic & A11y Tree Scanning (with DOM mutation settling)
 * 2. Holistic Multi-Field Batch Reasoning (Qwen 2.5 3B + Disqualification Armor 2.0)
 * 3. Universal Synthetic Interaction (React 18 / Vue 3 native setter & Radix portal driver)
 * 4. Reactive Dynamic Hydration Tracking (detects conditional fields revealed by answers)
 * 5. Closed-Loop Pre-Flight Audit & Self-Healing Reflection Recovery
 */

import type { PersonaData } from '../types';
import {
  scanPageWithQuantumPerception,
  waitForDomSettled,
  type NormalizedFormQuestion,
} from './domScanner/spatialPerceptionScanner';
import {
  resolveFormStepBatch,
  resolveQuestionCognitively,
  type CognitiveAnswerResult,
  type FormQuestionTarget,
} from './localLlm/ultraQuestionResolver';
import { executeSyntheticInteraction } from './domScanner/syntheticInteraction';
import { auditFormHealth, healFormErrors, type FormAuditStatus } from './workflow/closedLoopAudit';
import { ensureLinkedInSafeSession } from './stealth/linkedinSafetyGuard';

export interface StepExecutionReport {
  totalQuestionsDetected: number;
  questionsAnswered: number;
  answers: Array<{
    question: string;
    answer: string;
    source: string;
    widgetType: string;
  }>;
  audit: FormAuditStatus;
  isReadyToAdvance: boolean;
}

/**
 * Executes a full perception, holistic reasoning, and injection cycle on the current webview step.
 */
export async function executeOmniCognitionFormStep(
  webview: any,
  persona: PersonaData,
  jobContext?: { jobTitle?: string; companyName?: string }
): Promise<StepExecutionReport> {
  // 0. Ensure LinkedIn stealth shield and account safety (disarm tracker iframes, uncheck follow company, bypass top-choice traps)
  const safetyReport = await ensureLinkedInSafeSession(webview).catch(() => ({ isSafe: true, status: 'clean' as const, warning: undefined }));
  if (!safetyReport.isSafe && safetyReport.warning) {
    console.warn(`⚠️ [OmniCognition] LinkedIn safety guard notice: ${safetyReport.warning}`);
  }

  console.log('🔮 [OmniCognition] Waiting for DOM mutations to settle before perception scan...');
  await waitForDomSettled(webview, 800, 150);

  // 1. Initial Perception Pass
  let fields = await scanPageWithQuantumPerception(webview);
  console.log(`✓ [OmniCognition] Detected ${fields.length} normalized form questions on current step.`);

  const answerLogs: StepExecutionReport['answers'] = [];

  // Filter fields that require interaction
  function getEligibleFields(allFields: NormalizedFormQuestion[]): NormalizedFormQuestion[] {
    return allFields.filter((f) => {
      // Radio and multi-select checkbox groups must always be evaluated to ensure correct option is checked
      if (f.widgetType === 'radiogroup' || f.widgetType === 'checkboxgroup') return true;
      // If empty or marked invalid, must fill
      if (!f.currentValue || f.hasError) return true;
      // If required, ensure it's not just whitespace
      if (f.required && !f.currentValue.trim()) return true;
      return false;
    });
  }

  let pendingFields = getEligibleFields(fields);

  // 2. Holistic Batch Reasoning Pass (Cross-Field Consistency)
  if (pendingFields.length > 0) {
    const targets: FormQuestionTarget[] = pendingFields.map((f) => ({
      id: f.id,
      selector: f.selector,
      label: f.label,
      name: f.name,
      placeholder: f.placeholder,
      widgetType: f.widgetType,
      options: f.options,
      required: f.required,
      hasError: f.hasError,
      errorMessage: f.errorMessage,
      helperText: f.helperText,
      min: f.min,
      max: f.max,
      minLength: f.minLength,
      maxLength: f.maxLength,
      pattern: f.pattern,
      compoundRole: f.compoundRole,
      jobContext,
    }));

    const batchResolutions = await resolveFormStepBatch(targets, persona, jobContext);

    // 3. Synthetic Interaction Injection
    for (const field of pendingFields) {
      const key = field.id || field.selector || field.label;
      const resolution = batchResolutions.get(key) || (await resolveQuestionCognitively(field, persona));

      if (resolution && resolution.answer) {
        const interaction = await executeSyntheticInteraction(
          webview,
          field.widgetType,
          field.selector,
          resolution.answer
        );

        if (interaction.success) {
          answerLogs.push({
            question: field.label,
            answer: resolution.answer,
            source: resolution.source,
            widgetType: field.widgetType,
          });
        }

        // Natural micro-pause between field interactions
        await new Promise((r) => setTimeout(r, 120 + Math.random() * 80));
      }
    }

    // 4. Reactive Hydration Check: Did answering reveal new conditional fields?
    await waitForDomSettled(webview, 600, 150);
    const freshFields = await scanPageWithQuantumPerception(webview);
    const newConditionalFields = getEligibleFields(freshFields).filter(
      (ff) => !answerLogs.some((a) => a.question === ff.label)
    );

    if (newConditionalFields.length > 0) {
      console.log(`⚡ [OmniCognition] Detected ${newConditionalFields.length} newly hydrated conditional fields. Resolving...`);
      for (const condField of newConditionalFields) {
        const res = await resolveQuestionCognitively(condField, persona);
        if (res.answer) {
          const interaction = await executeSyntheticInteraction(
            webview,
            condField.widgetType,
            condField.selector,
            res.answer
          );
          if (interaction.success) {
            answerLogs.push({
              question: condField.label,
              answer: res.answer,
              source: res.source,
              widgetType: condField.widgetType,
            });
          }
        }
      }
    }
  }

  // 5. Post-Fill Closed-Loop Pre-Flight Audit
  console.log('🔍 [OmniCognition] Running Pre-Flight Validation Audit...');
  let audit = await auditFormHealth(webview);

  // 6. Self-Healing Error Recovery (if any field returned an ATS error)
  if (!audit.isClean && audit.errors.length > 0) {
    console.log(
      `⚠️ [OmniCognition] Form reported ${audit.errors.length} validation errors. Running self-healing recovery...`
    );
    await healFormErrors(webview, audit.errors, persona);
    // Re-verify after healing
    audit = await auditFormHealth(webview);
  }

  const isReady = audit.isClean;
  console.log(
    `✨ [OmniCognition] Step execution complete. Ready to advance: ${isReady ? 'YES' : 'RETRY'}`
  );

  return {
    totalQuestionsDetected: fields.length,
    questionsAnswered: answerLogs.length,
    answers: answerLogs,
    audit,
    isReadyToAdvance: isReady,
  };
}

export * from './domScanner/spatialPerceptionScanner';
export * from './localLlm/ultraQuestionResolver';
export * from './domScanner/syntheticInteraction';
export * from './workflow/closedLoopAudit';
