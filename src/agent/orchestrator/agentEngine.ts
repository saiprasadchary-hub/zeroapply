import type { PersonaData } from '../../types';
import { DOM_SCANNER_SCRIPT, type ScannedField } from '../detector/fieldScanner';
import { classifyAllFields } from '../detector/fieldClassifier';
import { mapPersonaToFields } from '../autofill/personaMapper';
import { executeDomAutofill, type FillResult } from '../autofill/domFiller';
import { TELEMETRY_INJECTION_SCRIPT } from '../autofill/telemetryTracker';
import { getSavedResumeFileFromStorage, generateSmartResumeHandlerScript } from '../autofill/resumeInjector';
import { ApplicationStateMachine } from '../stateMachine/appStateMachine';
import { STEP_NAVIGATOR_SCRIPT, type ApplicationStepResult } from '../stateMachine/stepNavigator';
import { ApplicationLogger } from '../tracker/applicationLogger';
import { QALogger, type QAPair } from '../tracker/qaLogger';
import { ErrorLogger } from '../tracker/errorLogger';
import { SecurityGuardian } from '../security/securityGuardian';
import { FormRecoveryAgent } from '../stateMachine/formRecoveryAgent';
import { VisionAgent } from '../vision/visionAgent';
import { liveTelemetry } from '../telemetry/liveTelemetry';

export interface AgentRunResult {
  success: boolean;
  detectedCount: number;
  filledCount: number;
  resumeFieldDetected?: boolean;
  resumeAttached?: boolean;
  message: string;
  qaPairs?: { question: string; answer: string }[];
}

export class AgentEngine {
  private stateMachine: ApplicationStateMachine;
  private securityGuardian: SecurityGuardian;

  constructor() {
    this.stateMachine = new ApplicationStateMachine();
    this.securityGuardian = new SecurityGuardian();
  }

  public getStateMachine() {
    return this.stateMachine;
  }

  /**
   * Scans current webview DOM, classifies fields, matches with Persona & Ollama LLM,
   * and executes synthetic React state bypass autofill.
   */
  public async autoFillCurrentPage(
    webview: any,
    persona: PersonaData,
    portalName: string = 'Job Portal',
    logAttempt: boolean = true
  ): Promise<AgentRunResult> {
    this.stateMachine.transition('SCANNING', 'Scanning page for form fields...');
    liveTelemetry.emit({
      type: 'scan',
      title: 'Scanning page for form fields',
      detail: `Target portal: ${portalName}`,
      status: 'running',
    });

    let scannedFields: ScannedField[] = [];
    let pageTitle = '';
    try {
      if (!webview || typeof webview.executeJavaScript !== 'function') {
        throw new Error('The desktop browser is not available.');
      }

      // 1. Perform Security & CAPTCHA inspection
      pageTitle = await webview.executeJavaScript('document.title || ""').catch(() => '');
      const domText = await webview.executeJavaScript('document.body ? document.body.innerText : ""').catch(() => '');
      
      const secStatus = await this.securityGuardian.diagnoseScreenSecurity(pageTitle, domText);
      if (secStatus.blocked) {
        console.warn('[SecurityGuardian] Block triggered:', secStatus);
        this.stateMachine.transition('ERROR', 'Security block: ' + (secStatus.reason || 'Verification required'));
        liveTelemetry.emit({
          type: 'security',
          title: 'Security checkpoint detected',
          detail: secStatus.reason || 'Manual verification requested',
          status: 'warning',
        });
        ErrorLogger.log({
          source: 'Security Guardian',
          portal: portalName,
          message: `Security Checkpoint: ${secStatus.reason || 'Verification required'}`,
          severity: 'SECURITY',
        });
        return { success: false, detectedCount: 0, filledCount: 0, message: 'Security checkpoint: ' + secStatus.reason };
      }

      // 3. Inject the self-healing telemetry script and run DOM scanning
      webview.executeJavaScript(TELEMETRY_INJECTION_SCRIPT).catch(console.warn);
      
      scannedFields = await webview.executeJavaScript(DOM_SCANNER_SCRIPT);
    } catch (err) {
      console.error('DOM scanner error:', err);
      this.stateMachine.transition('ERROR', 'Could not scan webpage DOM');
      liveTelemetry.emit({
        type: 'scan',
        title: 'DOM scan failed',
        detail: String(err),
        status: 'error',
      });
      ErrorLogger.log({
        source: 'DOM Scanner',
        portal: portalName,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        severity: 'CRITICAL',
      });
      return { success: false, detectedCount: 0, filledCount: 0, message: 'DOM scan failed' };
    }

    if (!scannedFields || scannedFields.length === 0) {
      this.stateMachine.transition('IDLE', 'No form fields found on this page');
      liveTelemetry.emit({
        type: 'scan',
        title: 'No input fields detected',
        detail: 'Page has no unfilled form controls',
        status: 'completed',
      });
      return { success: true, detectedCount: 0, filledCount: 0, message: 'No input fields detected on page' };
    }

    this.stateMachine.transition('MATCHING', 'Classifying ' + scannedFields.length + ' fields & solving questions...', {
      detectedFieldsCount: scannedFields.length,
    });
    liveTelemetry.emit({
      type: 'scan',
      title: `Detected ${scannedFields.length} interactive fields`,
      detail: `Classifying inputs & mapping persona credentials`,
      status: 'completed',
    });

    const classified = classifyAllFields(scannedFields);
    const instructions = await mapPersonaToFields(classified, persona);

    this.stateMachine.transition('FILLING', 'Injecting values into ' + instructions.length + ' form fields...');

    const fillResult: FillResult = await executeDomAutofill(webview, instructions);

    const savedResume = getSavedResumeFileFromStorage();

    const resumeFieldDetected = scannedFields.some((field) => field.type === 'file');
    let resumeAttached = false;
    if (savedResume && resumeFieldDetected) {
      liveTelemetry.emit({
        type: 'attach',
        title: `Attaching Resume: ${savedResume.name}`,
        detail: `Size: ${Math.round((savedResume.base64Data?.length || 0) * 0.75 / 1024)} KB | Format: ${savedResume.type || 'application/pdf'}`,
        status: 'running',
      });

      try {
        if (webview && typeof webview.executeJavaScript === 'function') {
          const smartScript = generateSmartResumeHandlerScript(savedResume.name, savedResume.type, savedResume.base64Data);
          const result = await webview.executeJavaScript(smartScript);
          console.log('[AgentEngine] Smart resume handler result:', result);

          if (result?.action === 'skip' || result?.action === 'replaced' || result?.action === 'uploaded') {
            resumeAttached = true;
            if (result.action !== 'skip') fillResult.filledCount += 1;
            liveTelemetry.emit({
              type: 'attach',
              title: `Resume attached: ${savedResume.name}`,
              detail: `Action: ${result.action} successfully injected into file input`,
              status: 'completed',
            });
          } else if (result?.action === 'no_field') {
            resumeAttached = true;
          }
        }
      } catch (e) {
        console.warn('Smart resume handler script error:', e);
      }
    }

    this.stateMachine.transition('REVIEW_READY', 'Successfully auto-filled ' + fillResult.filledCount + ' fields', {
      filledFieldsCount: fillResult.filledCount,
    });

    liveTelemetry.emit({
      type: 'type',
      title: `Filling ${fillResult.filledCount} form fields`,
      detail: `Injected candidate profile data and credentials`,
      status: 'completed',
    });

    if (logAttempt) {
      ApplicationLogger.addLog({
        portal: portalName,
        jobTitle: 'Form auto-fill (not submitted)',
        companyName: 'Manual review required',
        fieldsFilled: fillResult.filledCount,
        status: fillResult.filledCount > 0 ? 'PARTIAL' : 'FAILED',
        url: webview?.src || window.location.href,
      });
    }

    const qaPairs: QAPair[] = instructions.map(instr => ({
      question: instr.field?.label || instr.field?.name || instr.fieldId || 'Unknown Field',
      answer: String(instr.value),
      category: instr.category,
      source: instr.category === 'screeningQuestion' ? 'ollama' : 'persona',
      confidence: instr.confidence,
      timestamp: new Date().toISOString(),
    }));

    if (qaPairs.length > 0) {
      QALogger.addOrUpdateActiveLog(
        portalName,
        pageTitle || 'Job Application Form',
        'Live Portal Session',
        qaPairs,
        'IN_PROGRESS'
      );
    }

    return {
      success: fillResult.filledCount > 0,
      detectedCount: scannedFields.length,
      filledCount: fillResult.filledCount,
      resumeFieldDetected,
      resumeAttached,
      message: 'Auto-filled ' + fillResult.filledCount + ' of ' + scannedFields.length + ' fields',
      qaPairs,
    };
  }

  /**
   * Triggers the Next / Review step button in the webview.
   */
  public async advanceNextStep(webview: any): Promise<boolean> {
    const result = await this.advanceApplicationStep(webview);
    return result.success;
  }

  public async advanceApplicationStep(webview: any): Promise<ApplicationStepResult> {
    try {
      if (webview && typeof webview.executeJavaScript !== 'function') {
        return { success: false, action: 'none' };
      }

      let result = await webview.executeJavaScript(STEP_NAVIGATOR_SCRIPT);
      
      if (result && result.success) {
        liveTelemetry.emit({
          type: 'click',
          title: `Clicked "${result.text || result.action.toUpperCase()}"`,
          detail: `Advancing application via primary action button`,
          status: 'completed',
        });
        return result;
      }

      // 1. Self-Healing Form Recovery: If step was blocked by validation errors, heal fields and retry
      const healingResult = await FormRecoveryAgent.executeSelfHealing(webview);
      if (healingResult.healedCount > 0) {
        // Wait 300ms for DOM state update and retry advance
        await new Promise(res => setTimeout(res, 300));
        result = await webview.executeJavaScript(STEP_NAVIGATOR_SCRIPT);
        if (result && result.success) {
          liveTelemetry.emit({
            type: 'click',
            title: `Advancement Recovered: Clicked "${result.text || result.action.toUpperCase()}"`,
            detail: `Self-healing resolved blocked fields and advanced step`,
            status: 'completed',
          });
          return result;
        }
      }

      // 2. Vision Inspector Fallback: Check for visual coordinate targets or obstructing overlays
      const visualInspection = await VisionAgent.inspectScreen(webview);
      if (visualInspection.primaryActionButton && !visualInspection.primaryActionButton.isObstructed) {
        const btn = visualInspection.primaryActionButton;
        const clickCoordScript = `
          (function() {
            const el = document.elementFromPoint(${btn.x}, ${btn.y});
            if (el) {
              el.click();
              return true;
            }
            return false;
          })();
        `;
        const clicked = await webview.executeJavaScript(clickCoordScript);
        if (clicked) {
          liveTelemetry.emit({
            type: 'click',
            title: `Vision Agent Clicked "${btn.text}"`,
            detail: `Triggered at coordinates (${btn.x}, ${btn.y})`,
            status: 'completed',
          });
          return { success: true, action: 'next', text: btn.text };
        }
      }

      return result || { success: false, action: 'none' };
    } catch (e) {
      console.warn('Advance step failed:', e);
      return { success: false, action: 'none' };
    }
  }
}
