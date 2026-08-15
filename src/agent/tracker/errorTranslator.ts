export interface PlainEnglishErrorDiagnosis {
  category: 'AI_MODEL' | 'FORM_FILLING' | 'SECURITY' | 'JOB_SEARCH' | 'SYSTEM';
  categoryLabel: string;
  simpleWhatHappened: string;
  whatIsTheMistakeWithAi: string;
  howToFixIt: string;
  severityLabel: string;
}

/**
 * Translates raw technical error logs into clear, plain English diagnoses
 * explaining exactly what happened, what the AI got wrong, and how to resolve it.
 */
export function diagnoseErrorInPlainEnglish(
  message: string,
  source: string = '',
  stack: string = ''
): PlainEnglishErrorDiagnosis {
  const combined = `${source} ${message} ${stack}`.toLowerCase();

  // 1. Ollama / Local AI Model Unreachable or Offline
  if (
    combined.includes('econnrefused') ||
    combined.includes('ollama') ||
    combined.includes('11434') ||
    combined.includes('fetch failed') ||
    combined.includes('model unreachable')
  ) {
    return {
      category: 'AI_MODEL',
      categoryLabel: 'AI Model Connection',
      severityLabel: 'Medium Priority',
      simpleWhatHappened: 'The local AI brain (Ollama with Qwen 2.5) is not responding or is offline.',
      whatIsTheMistakeWithAi:
        'The AI attempted to ask the local Qwen model to write custom screening answers, but could not establish a connection to http://localhost:11434.',
      howToFixIt:
        'Start Ollama by running "ollama serve" or opening the Ollama application on your computer, then retry.',
    };
  }

  // 2. Security Checkpoints, CAPTCHA, or Cloudflare Bot Traps
  if (
    combined.includes('turnstile') ||
    combined.includes('cloudflare') ||
    combined.includes('captcha') ||
    combined.includes('security checkpoint') ||
    combined.includes('blocked')
  ) {
    return {
      category: 'SECURITY',
      categoryLabel: 'Anti-Bot Security Checkpoint',
      severityLabel: 'Safety Block',
      simpleWhatHappened: 'The job website displayed a CAPTCHA or security verification screen.',
      whatIsTheMistakeWithAi:
        'The AI detected an anti-bot trap. Rather than risk triggering account suspensions or bans, the AI safely paused execution to protect your profile.',
      howToFixIt:
        'Switch to the Live Browser tab, solve the CAPTCHA puzzle manually, and click "Resume" or "Fill & Apply".',
    };
  }

  // 3. Easy Apply Button Not Found / External Apply Only
  if (
    combined.includes('no easy apply button') ||
    combined.includes('no apply button') ||
    combined.includes('button found after 6s') ||
    combined.includes('listing is no longer available')
  ) {
    return {
      category: 'JOB_SEARCH',
      categoryLabel: 'Job Application Access',
      severityLabel: 'Normal Skip',
      simpleWhatHappened: 'The job listing has no 1-click "Easy Apply" button available.',
      whatIsTheMistakeWithAi:
        'The AI was expecting a direct LinkedIn Easy Apply dialog, but this employer requires applicants to visit an external third-party company portal.',
      howToFixIt:
        'Use the "Easy Apply" filter toggle on LinkedIn search, or open the job manually in the Live Browser tab.',
    };
  }

  // 4. Resume Attachment / Upload Missing
  if (
    combined.includes('resume') ||
    combined.includes('file input') ||
    combined.includes('upload a resume') ||
    combined.includes('resume memory')
  ) {
    return {
      category: 'FORM_FILLING',
      categoryLabel: 'Resume Attachment',
      severityLabel: 'Profile Setup',
      simpleWhatHappened: 'The application required a PDF resume upload, but no resume was found in storage.',
      whatIsTheMistakeWithAi:
        'The AI tried to attach your resume file, but the active candidate persona has not had a PDF uploaded yet.',
      howToFixIt:
        'Go to the Basic Info tab, click "Upload Resume", select your PDF file, and try applying again.',
    };
  }

  // 5. Incomplete Profile / Required Fields Missing
  if (
    combined.includes('complete your full name') ||
    combined.includes('missingprofilefields') ||
    combined.includes('required field') ||
    combined.includes('empty required')
  ) {
    return {
      category: 'FORM_FILLING',
      categoryLabel: 'Candidate Information',
      severityLabel: 'Profile Setup',
      simpleWhatHappened: 'The employer form has required contact fields that are blank.',
      whatIsTheMistakeWithAi:
        'The AI could not fill required inputs because your profile is missing essential details (like phone number, full name, or location).',
      howToFixIt:
        'Fill in your Full Name, Email, Phone Number, and Location under the Basic Info tab.',
    };
  }

  // 6. DOM Element Not Interactable / Website Layout Changed
  if (
    combined.includes('not interactable') ||
    combined.includes('offsetparent is null') ||
    combined.includes('cannot read properties') ||
    combined.includes('dom scanner error')
  ) {
    return {
      category: 'FORM_FILLING',
      categoryLabel: 'Webpage Layout',
      severityLabel: 'Form Dynamic',
      simpleWhatHappened: 'A button or form field was temporarily covered or hidden by a popup.',
      whatIsTheMistakeWithAi:
        'The AI tried to click an element before the webpage finished animating or while another dialog was in front.',
      howToFixIt:
        'The self-healing engine automatically retries in the background. If it persists, click the button manually in Live Browser.',
    };
  }

  // 6b. Navigation Aborted / In-Flight Redirect (Chromium ERR_ABORTED -3)
  if (
    combined.includes('guest_view_manager_call') ||
    combined.includes('err_aborted') ||
    combined.includes('(-3)') ||
    combined.includes('navigation was aborted')
  ) {
    return {
      category: 'JOB_SEARCH',
      categoryLabel: 'Page Navigation & Search',
      severityLabel: 'Transient Notice',
      simpleWhatHappened: 'A search or link click updated the page while a previous request was still loading.',
      whatIsTheMistakeWithAi:
        'The browser redirected the search URL or superseded an in-flight page request. This is normal during fast LinkedIn search filtering.',
      howToFixIt:
        'No action needed. The browser has already reached the updated search results. Click "Fill & Apply" to proceed.',
    };
  }

  // 7. General Fallback
  return {
    category: 'SYSTEM',
    categoryLabel: 'General Interaction',
    severityLabel: 'Notice',
    simpleWhatHappened: message || 'An unexpected interaction occurred on the webpage.',
    whatIsTheMistakeWithAi:
      'The webpage returned an unexpected structure that did not match standard ATS form patterns.',
    howToFixIt:
      'Verify that the job portal is open and you are logged into your account in the Live Browser tab.',
  };
}
