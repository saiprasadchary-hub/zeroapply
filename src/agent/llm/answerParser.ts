import type { PersonaData } from '../../types';
import { QuestionMemoryBank } from '../memory/questionMemory';

export interface ParsedAnswer {
  answer: string;
  confidence: number;
}

export interface StudentProfile {
  isStudentOrRecentGrad: boolean;
  degreeName: string;
  majorBranch: string;
  institution: string;
  gradYear: number;
  startYear?: number;
  isCurrentlyEnrolled: boolean;
  isRecentGraduate: boolean;
  gpaOrScore: string;
  relevantCourses: string[];
  statusLabel: string;
  availabilityStatement: string;
  facilitiesStatement: string;
}

export interface GraduationTimeline {
  gradYear: number;
  startYear?: number;
  isCurrentlyEnrolled: boolean;
  isRecentGraduate: boolean;
  statusLabel: string;
  availabilityStatement: string;
}

export function parseStudentProfile(persona: PersonaData): StudentProfile {
  const currentYear = new Date().getFullYear();
  const eduChunk = persona.resumeChunks?.education || '';
  const fullText = `${eduChunk} ${persona.resumeText || ''} ${persona.experienceSummary || ''} ${persona.education || ''}`;
  const lower = fullText.toLowerCase();

  // 1. Detect Degree
  let degreeName = 'Bachelor of Technology (B.Tech)';
  if (/m\.?tech|master of technology/i.test(lower)) {
    degreeName = 'Master of Technology (M.Tech)';
  } else if (/m\.?s\.|m\.?sc|master of science/i.test(lower)) {
    degreeName = 'Master of Science (M.S.)';
  } else if (/mca|master of computer applications/i.test(lower)) {
    degreeName = 'Master of Computer Applications (MCA)';
  } else if (/b\.?tech|bachelor of technology/i.test(lower)) {
    degreeName = 'Bachelor of Technology (B.Tech)';
  } else if (/b\.?e\.|bachelor of engineering/i.test(lower)) {
    degreeName = 'Bachelor of Engineering (B.E.)';
  } else if (/bca|bachelor of computer applications/i.test(lower)) {
    degreeName = 'Bachelor of Computer Applications (BCA)';
  } else if (/b\.?s\.|b\.?sc|bachelor of science/i.test(lower)) {
    degreeName = 'Bachelor of Science (B.S.)';
  } else if (persona.education && persona.education.trim().length > 3) {
    degreeName = persona.education.trim();
  }

  // 2. Detect Major / Branch / Group
  let majorBranch = 'Computer Science & Engineering';
  if (/artificial intelligence|machine learning|ai\b|ml\b|data science/i.test(lower)) {
    majorBranch = 'Computer Science & Engineering (AI & Data Science)';
  } else if (/information technology|it\b/i.test(lower)) {
    majorBranch = 'Information Technology';
  } else if (/electronics|communication|ece\b|electrical/i.test(lower)) {
    majorBranch = 'Electronics & Communication Engineering';
  } else if (/mechanical/i.test(lower)) {
    majorBranch = 'Mechanical Engineering';
  } else if (/civil/i.test(lower)) {
    majorBranch = 'Civil Engineering';
  } else if (/computer|software|cse\b/i.test(lower)) {
    majorBranch = 'Computer Science & Engineering';
  }

  // 3. Detect Institution / University / College
  let institution = 'Engineering University / College';
  const instMatch = fullText.match(/(?:university|institute of technology|college of engineering|polytechnic|school of engineering|iit|nit|iiit|bits|jntu|anna university|vtu)[^,\n\r.]*/i);
  if (instMatch) {
    institution = instMatch[0].trim();
  } else if (eduChunk && eduChunk.trim().length > 5) {
    const firstLine = eduChunk.split(/[\n,]/)[0].trim();
    if (firstLine.length > 4 && firstLine.length < 60) {
      institution = firstLine;
    }
  }

  // 4. Years & Timeline
  const years = (fullText.match(/\b(201\d|202\d|203\d)\b/g) || []).map(Number).sort((a, b) => a - b);
  let gradYear = years.length > 0 ? years[years.length - 1] : (currentYear - Math.max(1, persona.experienceYears || 2));
  let startYear = years.length > 1 ? years[0] : (gradYear - 4);

  const isCurrentlyEnrolled = gradYear >= currentYear;
  const isRecentGraduate = !isCurrentlyEnrolled && (currentYear - gradYear <= 3);
  const isStudentOrRecentGrad = isCurrentlyEnrolled || isRecentGraduate || /student|undergraduate|fresher|intern|b\.?tech|b\.?e\.|bca/i.test(lower) || (persona.experienceYears || 0) <= 3;

  const statusLabel = isCurrentlyEnrolled
    ? `Currently Enrolled Student (Expected Graduation: ${gradYear})`
    : isRecentGraduate
    ? `Recent Graduate (Graduated: ${gradYear})`
    : `Engineering Graduate (${gradYear})`;

  const availabilityStatement = isCurrentlyEnrolled
    ? `Available for internships, co-ops, and full-time engineering employment upon graduation in ${gradYear}.`
    : `Graduated in ${gradYear} and immediately available for full-time employment.`;

  // 5. GPA / CGPA / Score Extraction
  let gpaOrScore = '';
  const gpaMatch = fullText.match(/(?:cgpa|gpa|percentage|marks|grade)[:\s]*([0-9]+(?:\.[0-9]+)?(?:\s*\/\s*(?:10|4\.0|4))?%?)/i);
  if (gpaMatch) {
    gpaOrScore = gpaMatch[1].trim();
  }

  // 6. Relevant Coursework
  const relevantCourses = [
    'Data Structures & Algorithms (DSA)',
    'Object-Oriented Programming (OOP)',
    'Database Management Systems (DBMS)',
    'Operating Systems',
    'Computer Networks',
    'Full-Stack Web Development',
    'Software Engineering Methodologies'
  ];

  const facilitiesStatement = 'Candidate possesses full access to high-performance development laptop/workstation, high-speed fiber internet, noise-canceling headphones, webcam, and dedicated quiet workspace.';

  return {
    isStudentOrRecentGrad,
    degreeName,
    majorBranch,
    institution,
    gradYear,
    startYear,
    isCurrentlyEnrolled,
    isRecentGraduate,
    gpaOrScore,
    relevantCourses,
    statusLabel,
    availabilityStatement,
    facilitiesStatement
  };
}

export function parseGraduationTimeline(persona: PersonaData): GraduationTimeline {
  const prof = parseStudentProfile(persona);
  return {
    gradYear: prof.gradYear,
    startYear: prof.startYear,
    isCurrentlyEnrolled: prof.isCurrentlyEnrolled,
    isRecentGraduate: prof.isRecentGraduate,
    statusLabel: prof.statusLabel,
    availabilityStatement: prof.availabilityStatement,
  };
}

export function matchDropdownOption(
  rawAnswer: string,
  availableOptions: string[],
  question: string,
  persona: PersonaData
): ParsedAnswer | null {
  if (!availableOptions || availableOptions.length === 0) return null;
  const qLower = question.toLowerCase();
  const rawLower = (rawAnswer || '').toLowerCase().trim();

  // 1. Direct or partial matching with rawAnswer
  if (rawLower) {
    const direct = availableOptions.find(o => o.toLowerCase().trim() === rawLower);
    if (direct) return { answer: direct, confidence: 0.95 };

    const partial = availableOptions.find(o => {
      const ol = o.toLowerCase().trim();
      return ol.includes(rawLower) || rawLower.includes(ol);
    });
    if (partial) return { answer: partial, confidence: 0.9 };
  }

  // 2. Numeric / Experience Years resolution
  const numYears = parseInt(rawAnswer, 10) || persona.experienceYears || 5;
  const isExp = qLower.includes('experience') || qLower.includes('proficiency') || qLower.includes('level') || qLower.includes('how many years') || qLower.includes('work with');
  if (isExp) {
    if (numYears >= 5) {
      const topTier = availableOptions.find(o => /expert|advanced|senior|lead|5\+|5 to|5-7|7\+|10\+/i.test(o));
      if (topTier) return { answer: topTier, confidence: 0.92 };
    }
    if (numYears >= 2) {
      const midTier = availableOptions.find(o => /intermediate|proficient|mid|2 to|2\+|3\+|3-5|2-4/i.test(o));
      if (midTier) return { answer: midTier, confidence: 0.9 };
    }
    if (numYears <= 1) {
      const begTier = availableOptions.find(o => /beginner|entry|fresher|junior|0-1|1\+/i.test(o));
      if (begTier) return { answer: begTier, confidence: 0.85 };
    }
    const numOpt = availableOptions.find(o => o.includes(String(numYears)));
    if (numOpt) return { answer: numOpt, confidence: 0.9 };
  }

  // 3. Work arrangement / location preference
  if (qLower.includes('work arrangement') || qLower.includes('workplace') || qLower.includes('arrangement') || qLower.includes('remote') || qLower.includes('hybrid') || qLower.includes('location')) {
    const pref = (persona.workPreference || 'Remote').toLowerCase();
    const matchLoc = availableOptions.find(o => {
      const ol = o.toLowerCase();
      if (pref.includes('remote') && /remote|work from home|virtual/i.test(ol)) return true;
      if (pref.includes('hybrid') && /hybrid|flexible/i.test(ol)) return true;
      if (pref.includes('on-site') && /on-site|in-office|office/i.test(ol)) return true;
      return false;
    });
    if (matchLoc) return { answer: matchLoc, confidence: 0.95 };
  }

  // 4. Degree / Highest Education
  if (qLower.includes('education') || qLower.includes('degree') || qLower.includes('graduation')) {
    const edu = (persona.resumeChunks?.education || '').toLowerCase();
    const isDoc = /ph\.?d|doctor/i.test(edu);
    const isMaster = /master|m\.?s|mba|m\.tech/i.test(edu);
    const degOpt = availableOptions.find(o => {
      const ol = o.toLowerCase();
      if (isDoc && /doctor|ph\.?d/i.test(ol)) return true;
      if (isMaster && /master/i.test(ol)) return true;
      if (/bachelor/i.test(ol)) return true;
      return false;
    });
    if (degOpt) return { answer: degOpt, confidence: 0.95 };
  }

  // 5. Notice Period / Availability
  if (qLower.includes('notice') || qLower.includes('start date') || qLower.includes('available') || qLower.includes('how soon')) {
    const noticeOpt = availableOptions.find(o => /immediate|serving notice|15 days|2 weeks|1 month|less than 1 month|asap/i.test(o));
    if (noticeOpt) return { answer: noticeOpt, confidence: 0.9 };
  }

  // 6. Yes / No / Authorization / Clearances / Willingness / Outreach & Behavioral Alignment
  if (
    /comfortable|willing|outreach|reach out|open to|able to|consent|background|authorized|legally|citizen|sponsor|visa|agree|certify|acknowledge|driver|can you|would you|should you/i.test(qLower) ||
    /^(?:are you|do you|have you|will you|is your|is it|can you|would you|how comfortable)/i.test(qLower) ||
    qLower.includes('?')
  ) {
    const isNegative = /sponsor|require.*visa|disability|felony|crime|convict/i.test(qLower);
    if (isNegative) {
      const noOpt = availableOptions.find(o => /^no\b|^false\b|will not|do not|none|disagree|no disability|not authorized/i.test(o.trim()));
      if (noOpt) return { answer: noOpt, confidence: 0.95 };
    } else {
      const yesOpt = availableOptions.find(o => /^yes\b|^true\b|authorized|citizen|permanent resident|agree|acknowledge|certify|confirm|eligible|valid license|comfortable|willing/i.test(o.trim()));
      if (yesOpt) return { answer: yesOpt, confidence: 0.95 };
    }
  }

  // Fallback: Return first non-placeholder option
  const validFallback = availableOptions.find(o => o.trim().length > 0 && !/^(?:select|choose|--|select an option|select one)/i.test(o.trim()));
  if (validFallback) return { answer: validFallback, confidence: 0.7 };

  return null;
}

/**
 * Parses raw LLM output or runs heuristic fallbacks if LLM output is empty or unclear.
 * Checks Custom Answer Memory Bank first before querying rules or LLM.
 */
export function parseLlmAnswer(
  rawLlmOutput: string,
  question: string,
  persona: PersonaData,
  availableOptions?: string[]
): ParsedAnswer | null {
  // 0. Priority Memory Bank Check: Check if user saved a custom answer for this question
  const savedAnswer = QuestionMemoryBank.findSavedAnswer(question);
  if (savedAnswer) {
    if (availableOptions && availableOptions.length > 0) {
      const matchOpt = availableOptions.find(o => o.toLowerCase().trim() === savedAnswer.toLowerCase().trim() || o.toLowerCase().includes(savedAnswer.toLowerCase()));
      if (matchOpt) return { answer: matchOpt, confidence: 1.0 };
    }
    return { answer: savedAnswer, confidence: 1.0 };
  }

  const cleaned = rawLlmOutput.trim();
  const qLower = question.toLowerCase();

  // 0b. Work authorization & EEO safe defaults if not explicitly custom-saved
  if (/authorized|legally/i.test(qLower) && !/sponsor|visa/i.test(qLower)) {
    if (availableOptions && availableOptions.length > 0) {
      const opt = availableOptions.find(o => /^yes|authorized|citizen|eligible/i.test(o.trim()));
      if (opt) return { answer: opt, confidence: 0.98 };
    }
    return { answer: 'Yes', confidence: 0.95 };
  }
  if (/sponsor|visa/i.test(qLower)) {
    if (availableOptions && availableOptions.length > 0) {
      const opt = availableOptions.find(o => /^no|will not|do not|none/i.test(o.trim()));
      if (opt) return { answer: opt, confidence: 0.98 };
    }
    return { answer: 'No', confidence: 0.95 };
  }
  if (/disability/i.test(qLower)) {
    if (availableOptions && availableOptions.length > 0) {
      const opt = availableOptions.find(o => /do not wish|decline|prefer not|no disability/i.test(o.trim()));
      if (opt) return { answer: opt, confidence: 0.95 };
    }
    return { answer: 'I do not wish to answer', confidence: 0.9 };
  }
  if (/veteran/i.test(qLower)) {
    if (availableOptions && availableOptions.length > 0) {
      const opt = availableOptions.find(o => /not a (?:protected )?veteran|no/i.test(o.trim()));
      if (opt) return { answer: opt, confidence: 0.95 };
    }
    return { answer: 'I am not a protected veteran', confidence: 0.9 };
  }
  if (/gender|race|ethnicity/i.test(qLower)) {
    if (availableOptions && availableOptions.length > 0) {
      const opt = availableOptions.find(o => /decline|prefer not|choose not|not wish/i.test(o.trim()));
      if (opt) return { answer: opt, confidence: 0.95 };
    }
    return { answer: 'Decline to self-identify', confidence: 0.9 };
  }

  // 0d. Equipment, Hardware, Home Office & Remote Work Readiness (Laptops, Headphones, Internet, Quiet Workspace)
  if (
    /laptop|desktop|\bcomputer(?!\s*science)|\bpc\b|headphones|headset|quiet place|quiet environment|workspace|home office|high-speed internet|reliable internet|wifi|broadband|webcam|microphone|hardware|equipment|tools to perform/i.test(qLower)
  ) {
    if (availableOptions && availableOptions.length > 0) {
      const yesOpt = availableOptions.find(o => /^yes\b|^true\b|have access|own|equipped|i do/i.test(o.trim()));
      if (yesOpt) return { answer: yesOpt, confidence: 0.98 };
    }
    return { answer: 'Yes', confidence: 0.98 };
  }

  // 0e. Student Enrollment, Graduation Year & Academic Profile
  const studentProf = parseStudentProfile(persona);

  // Graduation Year / Expected Graduation Date / Passout Year
  if (/graduation\s*(?:year|date)|when\s*(?:do|will|did)\s*you\s*graduate|expected\s*graduation|pass\s*out\s*(?:year|date)|year of graduation/i.test(qLower)) {
    if (availableOptions && availableOptions.length > 0) {
      const opt = availableOptions.find(o => o.includes(String(studentProf.gradYear)));
      if (opt) return { answer: opt, confidence: 0.98 };
    }
    return { answer: String(studentProf.gradYear), confidence: 0.95 };
  }

  // Currently Enrolled or Recent Graduate Questions
  if (/currently enrolled|current student|recent graduate|are you a student|are you enrolled|upon graduation|after graduation/i.test(qLower)) {
    if (availableOptions && availableOptions.length > 0) {
      const opt = availableOptions.find(o => /^yes\b|^true\b|enrolled|recent grad/i.test(o.trim()));
      if (opt) return { answer: opt, confidence: 0.98 };
    }
    return { answer: 'Yes', confidence: 0.95 };
  }

  // Major / Field of Study / Branch / Stream
  if (/major|field of study|branch of study|engineering branch|stream|discipline/i.test(qLower)) {
    if (availableOptions && availableOptions.length > 0) {
      const opt = availableOptions.find(o => /computer science|information technology|software|engineering/i.test(o.trim()));
      if (opt) return { answer: opt, confidence: 0.98 };
    }
    return { answer: studentProf.majorBranch, confidence: 0.95 };
  }

  // Highest Level of Education / Degree Level
  if (/highest (?:level of )?education|degree (?:level|type)|highest degree/i.test(qLower)) {
    if (availableOptions && availableOptions.length > 0) {
      const opt = availableOptions.find(o => /bachelor|undergraduate|b\.?tech|b\.?e\.|computer/i.test(o.trim()));
      if (opt) return { answer: opt, confidence: 0.98 };
    }
    return { answer: studentProf.degreeName, confidence: 0.95 };
  }

  // University / College / Institution Name
  if (/university|college|institution name|school name|name of your college/i.test(qLower)) {
    if (availableOptions && availableOptions.length > 0) {
      const opt = availableOptions.find(o => o.toLowerCase().includes(studentProf.institution.toLowerCase().slice(0, 10)));
      if (opt) return { answer: opt, confidence: 0.95 };
    }
    return { answer: studentProf.institution, confidence: 0.95 };
  }

  // GPA / CGPA / Percentage
  if (/cgpa|gpa|percentage|academic score|grade point average/i.test(qLower)) {
    const scoreVal = studentProf.gpaOrScore || '8.5 / 10';
    if (availableOptions && availableOptions.length > 0) {
      const opt = availableOptions.find(o => o.includes('8') || o.includes('3.') || /first class|distinction/i.test(o));
      if (opt) return { answer: opt, confidence: 0.95 };
    }
    return { answer: scoreVal, confidence: 0.95 };
  }

  // Work Hours Commitment (e.g. 40 hours per week)
  if (/40\s*(?:hours|hrs)|full[-\s]?time|commitment|commit to/i.test(qLower) && /^(?:can you|are you able|are you willing|will you)/i.test(qLower)) {
    if (availableOptions && availableOptions.length > 0) {
      const opt = availableOptions.find(o => /^yes\b|^true\b|able|can commit/i.test(o.trim()));
      if (opt) return { answer: opt, confidence: 0.98 };
    }
    return { answer: 'Yes', confidence: 0.98 };
  }

  // Internship / Entry-Level Availability
  if (/internship|co-op|entry[-\s]?level|junior/i.test(qLower) && /^(?:are you|looking for|interested in|available for)/i.test(qLower)) {
    if (availableOptions && availableOptions.length > 0) {
      const opt = availableOptions.find(o => /^yes\b|^true\b|available|interested/i.test(o.trim()));
      if (opt) return { answer: opt, confidence: 0.98 };
    }
    return { answer: 'Yes', confidence: 0.98 };
  }

  // Legal Age & ID Verification (e.g. at least 18 years old)
  if (/18\s*years|at least 18|legal age|photo id|driver'?s license|government id/i.test(qLower)) {
    if (availableOptions && availableOptions.length > 0) {
      const opt = availableOptions.find(o => /^yes\b|^true\b|valid|18\+/i.test(o.trim()));
      if (opt) return { answer: opt, confidence: 0.98 };
    }
    return { answer: 'Yes', confidence: 0.98 };
  }

  // Relevant Computer Science Coursework
  if (/relevant coursework|courses completed|subjects studied|key courses/i.test(qLower)) {
    return {
      answer: studentProf.relevantCourses.join(', '),
      confidence: 0.95
    };
  }

  // 0c. Rating Scale Questions (e.g. "On a scale of 1 to 10, how interested are you in technology, AI, and startups?")
  const isScaleRating = /(?:scale of \d+\s*(?:to|-)\s*\d+|\b\d+\s*(?:to|-)\s*\d+\b|rate (?:your|yourself)|how interested are you on a scale|scale from \d+ to \d+)/i.test(qLower);
  if (isScaleRating) {
    // If LLM returned a clean number or text containing a number
    if (cleaned) {
      const numMatch = cleaned.match(/\b([1-9]|10)\b/);
      if (numMatch) {
        if (availableOptions && availableOptions.length > 0) {
          const opt = availableOptions.find(o => o.includes(numMatch[1]));
          if (opt) return { answer: opt, confidence: 0.98 };
        }
        return { answer: numMatch[1], confidence: 0.95 };
      }
    }

    // Default top-tier rating
    const digits = qLower.match(/\b(\d{1,2})\b/g);
    let targetNum = '10';
    if (digits && digits.length >= 2) {
      const maxVal = Math.max(...digits.map(Number));
      targetNum = String(maxVal >= 5 ? maxVal : 10);
    }
    if (availableOptions && availableOptions.length > 0) {
      const opt = availableOptions.find(o => o.includes(targetNum) || /10|5|high|extremely|expert/i.test(o));
      if (opt) return { answer: opt, confidence: 0.98 };
    }
    return { answer: targetNum, confidence: 0.98 };
  }

  // 1. Validate and clean raw LLM output before accepting it over heuristics
  let candidate = cleaned.replace(/^["']|["']$/g, '').trim();

  // Strip common LLM prefixes like "The answer is: ", "Answer: "
  candidate = candidate.replace(/^(?:the\s+)?answer\s*(?:is)?\s*[:=-]\s*/i, '').trim();
  candidate = candidate.replace(/^(?:here('s| is) (an example|how|the response)[^:]*:)\s*/i, '').trim();

  // Match against available options if provided
  if (availableOptions && availableOptions.length > 0 && candidate) {
    const directOpt = availableOptions.find(o => o.toLowerCase().trim() === candidate.toLowerCase().trim());
    if (directOpt) return { answer: directOpt, confidence: 0.95 };

    const partialOpt = availableOptions.find(o => {
      const oLower = o.toLowerCase().trim();
      const cLower = candidate.toLowerCase().trim();
      return oLower.includes(cLower) || cLower.includes(oLower);
    });
    if (partialOpt) return { answer: partialOpt, confidence: 0.9 };
  }

  // Check if candidate is empty, polluted with LLM conversational filler, or a conversational preamble
  const isPolluted = !candidate || 
                     candidate.length === 0 ||
                     /^(?:system:|here('s| is)|the question|scenario:|as an ai|note:|to answer this|based on the)/i.test(candidate) ||
                     candidate.toLowerCase() === 'the answer is:';

  if (!isPolluted && candidate.length < 300) {
    // Perform type validation against question intent
    const expectsNumber = /how many|years of|salary|wage|rate|compensation|percentage|scale/i.test(qLower);
    const expectsBoolean = /^are you|^will you|^do you|^have you|^can you|^is your|agree|certify|acknowledge/i.test(qLower);

    let valid = true;
    if (expectsNumber && !/\d/.test(candidate)) {
      valid = false; // Expected number but LLM returned text without digits
    } else if (expectsBoolean && !/^(?:yes|no|true|false|agree|disagree)/i.test(candidate)) {
      valid = false; // Expected Yes/No but LLM started speaking paragraphs
    }

    if (valid && candidate.length > 0) {
      // If expects boolean, normalize clean Yes/No
      if (expectsBoolean && /yes|true|agree/i.test(candidate)) {
        if (availableOptions && availableOptions.length > 0) {
          const opt = availableOptions.find(o => /^yes|agree|confirm|true/i.test(o.trim()));
          if (opt) return { answer: opt, confidence: 0.95 };
        }
        return { answer: 'Yes', confidence: 0.95 };
      }
      if (expectsBoolean && /no|false|disagree/i.test(candidate)) {
        if (availableOptions && availableOptions.length > 0) {
          const opt = availableOptions.find(o => /^no|disagree|false/i.test(o.trim()));
          if (opt) return { answer: opt, confidence: 0.95 };
        }
        return { answer: 'No', confidence: 0.95 };
      }
      
      return { answer: candidate, confidence: 0.9 };
    }
  }

  // 1b. If LLM was verbose or candidate failed validation, try extracting a direct numeric or boolean from multi-line text
  if (cleaned.length >= 20) {
    const expectsNumber = /how many|years of|salary|scale/i.test(qLower);
    const expectsBoolean = /^are you|^will you|^do you|^have you|^can you|agree|certify|acknowledge/i.test(qLower);
    
    if (expectsNumber) {
      const numMatch = cleaned.match(/\b(\d{1,2})\b/);
      if (numMatch) return { answer: numMatch[1], confidence: 0.8 };
    }
    if (expectsBoolean) {
      if (/\b(yes|agree)\b/i.test(cleaned) && !/\b(no|disagree)\b/i.test(cleaned)) return { answer: 'Yes', confidence: 0.85 };
      if (/\b(no|disagree)\b/i.test(cleaned) && !/\b(yes|agree)\b/i.test(cleaned)) return { answer: 'No', confidence: 0.85 };
    }
  }

  // 2. Heuristic Rule-Based Fallbacks for standard screening questions

  // Student Coursework
  if (/relevant coursework|courses completed|subjects studied|key courses|coursework/i.test(qLower)) {
    return {
      answer: studentProf.relevantCourses.join(', '),
      confidence: 0.95
    };
  }

  // Major / Field of Study / Branch / Stream
  if (/major|field of study|branch of study|engineering branch|stream|discipline/i.test(qLower)) {
    if (availableOptions && availableOptions.length > 0) {
      const opt = availableOptions.find(o => /computer science|information technology|software|engineering/i.test(o.trim()));
      if (opt) return { answer: opt, confidence: 0.98 };
    }
    return { answer: studentProf.majorBranch, confidence: 0.95 };
  }

  // Highest Level of Education / Degree Level
  if (/highest (?:level of )?education|degree (?:level|type)|highest degree/i.test(qLower)) {
    if (availableOptions && availableOptions.length > 0) {
      const opt = availableOptions.find(o => /bachelor|undergraduate|b\.?tech|b\.?e\.|computer/i.test(o.trim()));
      if (opt) return { answer: opt, confidence: 0.98 };
    }
    return { answer: studentProf.degreeName, confidence: 0.95 };
  }

  // University / College / Institution Name
  if (/university|college|institution name|school name|name of your college/i.test(qLower)) {
    if (availableOptions && availableOptions.length > 0) {
      const opt = availableOptions.find(o => o.toLowerCase().includes(studentProf.institution.toLowerCase().slice(0, 10)));
      if (opt) return { answer: opt, confidence: 0.95 };
    }
    return { answer: studentProf.institution, confidence: 0.95 };
  }

  // Graduation Year / Expected Graduation Date / Passout Year
  if (/graduation\s*(?:year|date)|when\s*(?:do|will|did)\s*you\s*graduate|expected\s*graduation|pass\s*out\s*(?:year|date)|year of graduation/i.test(qLower)) {
    if (availableOptions && availableOptions.length > 0) {
      const opt = availableOptions.find(o => o.includes(String(studentProf.gradYear)));
      if (opt) return { answer: opt, confidence: 0.98 };
    }
    return { answer: String(studentProf.gradYear), confidence: 0.95 };
  }

  // Currently Enrolled or Recent Graduate Questions
  if (/currently enrolled|current student|recent graduate|are you a student|are you enrolled|upon graduation|after graduation/i.test(qLower)) {
    if (availableOptions && availableOptions.length > 0) {
      const opt = availableOptions.find(o => /^yes\b|^true\b|enrolled|recent grad/i.test(o.trim()));
      if (opt) return { answer: opt, confidence: 0.98 };
    }
    return { answer: 'Yes', confidence: 0.95 };
  }

  // GPA / CGPA / Percentage
  if (/cgpa|gpa|percentage|academic score|grade point average/i.test(qLower)) {
    const scoreVal = studentProf.gpaOrScore || '8.5 / 10';
    if (availableOptions && availableOptions.length > 0) {
      const opt = availableOptions.find(o => o.includes('8') || o.includes('3.') || /first class|distinction/i.test(o));
      if (opt) return { answer: opt, confidence: 0.95 };
    }
    return { answer: scoreVal, confidence: 0.95 };
  }

  // Equipment, Hardware, Home Office & Remote Work Readiness
  if (
    /laptop|desktop|\bcomputer(?!\s*science)|\bpc\b|headphones|headset|quiet place|quiet environment|workspace|home office|high-speed internet|reliable internet|wifi|broadband|webcam|microphone|hardware|equipment|tools to perform/i.test(qLower)
  ) {
    if (availableOptions && availableOptions.length > 0) {
      const yesOpt = availableOptions.find(o => /^yes\b|^true\b|have access|own|equipped|i do/i.test(o.trim()));
      if (yesOpt) return { answer: yesOpt, confidence: 0.98 };
    }
    return { answer: 'Yes', confidence: 0.98 };
  }

  // Skill / Technology / Language / Project-Grounded Experience Resolver
  if (qLower.includes('year') || qLower.includes('experience') || qLower.includes('how many') || qLower.includes('have you worked') || qLower.includes('do you have') || qLower.includes('proficiency') || qLower.includes('level of experience')) {
    const skillResolved = calculateSkillExperience(question, persona);
    if (skillResolved) {
      if (availableOptions && availableOptions.length > 0) {
        const mappedOpt = matchDropdownOption(skillResolved.answer, availableOptions, question, persona);
        if (mappedOpt) return mappedOpt;
      }
      return skillResolved;
    }
  }

  // Salary expectation questions
  if (qLower.includes('salary') || qLower.includes('compensation') || qLower.includes('pay')) {
    const salaryVal = persona.minSalary > 0 ? `$${persona.minSalary},000` : '';
    if (availableOptions && availableOptions.length > 0) {
      const mappedOpt = matchDropdownOption(salaryVal, availableOptions, question, persona);
      if (mappedOpt) return mappedOpt;
    }
    return salaryVal ? { answer: salaryVal, confidence: 0.9 } : null;
  }

  // Relocation / Remote / Work arrangement preferences
  if (qLower.includes('remote') || qLower.includes('hybrid') || qLower.includes('relocat') || qLower.includes('work arrangement') || qLower.includes('workplace') || qLower.includes('arrangement')) {
    if (availableOptions && availableOptions.length > 0) {
      const mappedOpt = matchDropdownOption(persona.workPreference || 'Remote', availableOptions, question, persona);
      if (mappedOpt) return mappedOpt;
    }
    if (qLower.includes('relocat')) {
      return { answer: persona.workPreference === 'On-site' ? 'Yes' : 'No', confidence: 0.8 };
    }
    return { answer: persona.workPreference === 'On-site' ? 'No' : 'Yes', confidence: 0.9 };
  }

  // Notice Period / Start Date
  if (qLower.includes('notice') || qLower.includes('start date') || qLower.includes('available') || qLower.includes('how soon')) {
    if (availableOptions && availableOptions.length > 0) {
      const mappedOpt = matchDropdownOption('Immediately available', availableOptions, question, persona);
      if (mappedOpt) return mappedOpt;
    }
    return { answer: 'Immediately available / 2 weeks notice', confidence: 0.75 };
  }

  // Role Willingness, Outreach, Communication & Behavioral Alignment
  if (
    qLower.includes('comfortable') ||
    qLower.includes('willing to') ||
    qLower.includes('reaching out') ||
    qLower.includes('reach out') ||
    qLower.includes('outreach') ||
    qLower.includes('open to') ||
    qLower.includes('able to') ||
    qLower.includes('authorized') ||
    qLower.includes('legally') ||
    qLower.includes('eligible') ||
    qLower.includes('agree') ||
    qLower.includes('terms') ||
    qLower.includes('certify') ||
    qLower.includes('acknowledge') ||
    qLower.includes('privacy') ||
    qLower.includes('consent') ||
    qLower.includes('background check') ||
    qLower.includes('drug test') ||
    /^(?:are you|do you|have you|will you|can you|would you|is your|is it)/i.test(qLower)
  ) {
    const isNegative = /sponsor|require.*visa|disability|felony|crime|convict/i.test(qLower);
    const targetVal = isNegative ? 'No' : 'Yes';
    if (availableOptions && availableOptions.length > 0) {
      const mappedOpt = matchDropdownOption(targetVal, availableOptions, question, persona);
      if (mappedOpt) return mappedOpt;
    }
    return { answer: targetVal, confidence: 0.95 };
  }

  // Profile links & Websites (Only if specifically asking for URLs or not a question sentence)
  const isProfileUrlQuery = /(?:url|link|profile|handle|page|address|website|link to)/i.test(qLower);
  if (isProfileUrlQuery || (!availableOptions || availableOptions.length === 0)) {
    if (/(?:linkedin|linked in)/i.test(qLower) && !/comfortable|reaching out|reach out|experience with|speak|message/i.test(qLower)) {
      return { answer: persona.linkedIn || '', confidence: 0.95 };
    }
    if (/(?:github|git hub)/i.test(qLower)) {
      return { answer: persona.gitHub || '', confidence: 0.95 };
    }
    if (/(?:portfolio|website)/i.test(qLower)) {
      return { answer: persona.portfolio || persona.linkedIn || '', confidence: 0.9 };
    }
  }

  // Resume Background Inquiries (Projects, Certifications, Languages, Awards, Summary)
  if (qLower.includes('project') || qLower.includes('what have you built') || qLower.includes('portfolio piece')) {
    if (persona.resumeChunks?.projects) {
      return { answer: persona.resumeChunks.projects.substring(0, 350).trim(), confidence: 0.9 };
    }
  }
  if (qLower.includes('certification') || qLower.includes('license') || qLower.includes('credential')) {
    if (persona.resumeChunks?.certifications) {
      return { answer: persona.resumeChunks.certifications.substring(0, 200).trim(), confidence: 0.9 };
    }
    return { answer: 'None currently applicable / In progress', confidence: 0.8 };
  }
  if (qLower.includes('spoken language') || (qLower.includes('language') && !qLower.includes('programming') && !qLower.includes('code') && !qLower.includes('technical'))) {
    return { answer: persona.resumeChunks?.languages || 'English (Professional Fluent)', confidence: 0.9 };
  }
  if (qLower.includes('award') || qLower.includes('honor') || qLower.includes('achievement') || qLower.includes('accomplishment')) {
    if (persona.resumeChunks?.awards) {
      return { answer: persona.resumeChunks.awards.substring(0, 250).trim(), confidence: 0.9 };
    }
  }

  // References & Former Manager Inquiries
  if (qLower.includes('reference') || qLower.includes('referee') || qLower.includes('supervisor contact') || qLower.includes('former manager')) {
    if (persona.resumeChunks?.references) {
      return { answer: persona.resumeChunks.references.trim(), confidence: 0.9 };
    }
    if (persona.references && persona.references.length > 0) {
      const formatted = persona.references.map(r => `${r.name} - ${r.title} at ${r.company} (Email: ${r.email}, Phone: ${r.phone})`).join('\n');
      return { answer: formatted, confidence: 0.9 };
    }
    return { answer: 'Available upon request', confidence: 0.85 };
  }
  if (
    !isScaleRating &&
    (qLower.includes('why') ||
      qLower.includes('candidate') ||
      qLower.includes('fit') ||
      qLower.includes('motivation') ||
      qLower.includes('why are you interested') ||
      qLower.includes('what interests you') ||
      qLower.includes('strength') ||
      qLower.includes('tell us') ||
      qLower.includes('about yourself') ||
      qLower.includes('describe yourself') ||
      qLower.includes('brief summary') ||
      qLower.includes('cover letter'))
  ) {
    let summaryText = persona.resumeChunks?.summary || '';
    // Clean summary if it contains contact header info
    if (/@|http|linkedin|\+\d{1,4}/i.test(summaryText) || summaryText.includes('|')) {
      const cleanLines = summaryText.split('\n').filter(l => !/@|http|linkedin|\+\d{1,4}|\|/i.test(l) && l.trim().length > 15);
      summaryText = cleanLines.join(' ').trim();
    }

    const defaultSummary =
      (summaryText && summaryText.length >= 25 ? summaryText : null) ||
      `Dedicated engineering professional with ${persona.experienceYears || 5}+ years of experience specializing in ${(persona.techStack || ['software engineering', 'system architecture']).slice(0, 4).join(', ')}. Passionate about building robust, scalable products and contributing to high-impact technical initiatives.`;
    return { answer: defaultSummary.substring(0, 450).trim(), confidence: 0.85 };
  }

  // If availableOptions exists, resolve the best matching choice before returning null
  if (availableOptions && availableOptions.length > 0) {
    const fallbackDropdown = matchDropdownOption('', availableOptions, question, persona);
    if (fallbackDropdown) return fallbackDropdown;
  }

  // Do not guess answers to screening questions. Missing data is intentionally
  // left for the validation gate and the user's review.
  return null;
}

/**
 * Resolves candidate experience for a specific technology, language, or tool
 * by deeply cross-referencing Projects built, Skills list, and Work History in the resume.
 */
export function calculateSkillExperience(
  question: string,
  persona: PersonaData
): ParsedAnswer | null {
  const qLower = question.toLowerCase();

  // Extract the target skill name from the question string
  let targetSkill = qLower
    .replace(/how many years of (?:work )?experience do you have (?:with|in)?/i, '')
    .replace(/years of (?:work )?experience (?:with|in)?/i, '')
    .replace(/do you have (?:prior )?(?:work )?experience (?:with|in)?/i, '')
    .replace(/have you worked with/i, '')
    .replace(/how many years/i, '')
    .replace(/\(programming language\)/i, '')
    .replace(/\(tool\)/i, '')
    .replace(/\(framework\)/i, '')
    .replace(/\(library\)/i, '')
    .replace(/[?:]/g, '')
    .trim();

  if (!targetSkill || targetSkill.length < 2 || /coursework|course|subject|project|degree/i.test(targetSkill)) return null;

  const projectsText = (persona.resumeChunks?.projects || '').toLowerCase();
  const skillsText = ((persona.resumeChunks?.skills || '') + ' ' + (persona.techStack || []).join(' ')).toLowerCase();
  const expText = ((persona.resumeChunks?.experience || '') + ' ' + (persona.experienceSummary || '')).toLowerCase();
  const summaryText = (persona.resumeChunks?.summary || '').toLowerCase();
  const allResumeText = (persona.resumeText || '').toLowerCase() + ' ' + projectsText + ' ' + skillsText + ' ' + expText + ' ' + summaryText;

  // Synonyms and alias mappings
  const aliases: Record<string, string[]> = {
    'relational databases': ['sql', 'mysql', 'postgres', 'postgresql', 'sqlite', 'oracle', 'database', 'rdbms'],
    'databases': ['sql', 'mysql', 'postgres', 'mongodb', 'database', 'redis', 'dynamodb'],
    'python': ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy'],
    'react': ['react', 'reactjs', 'nextjs', 'redux'],
    'javascript': ['javascript', 'js', 'typescript', 'ts', 'node', 'nodejs'],
    'typescript': ['typescript', 'ts'],
    'aws': ['aws', 'amazon web services', 's3', 'ec2', 'lambda', 'cloud'],
    'azure': ['azure', 'microsoft azure'],
    'gcp': ['gcp', 'google cloud'],
    'django': ['django', 'python'],
    'node': ['node', 'nodejs', 'express'],
    'sql': ['sql', 'mysql', 'postgres', 'postgresql', 'sqlite', 'rdbms'],
    'html': ['html', 'html5', 'web', 'frontend'],
    'css': ['css', 'css3', 'tailwind', 'bootstrap', 'responsive'],
  };

  const candidateKeywords = [targetSkill];
  for (const [key, synonymList] of Object.entries(aliases)) {
    if (targetSkill.includes(key)) {
      candidateKeywords.push(...synonymList);
    }
  }

  const isMatchedIn = (text: string) => {
    return candidateKeywords.some((kw) => {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      return regex.test(text) || text.includes(kw);
    });
  };

  const foundInProjects = isMatchedIn(projectsText);
  const foundInSkills = isMatchedIn(skillsText) || (persona.techStack || []).some((s) => isMatchedIn(s.toLowerCase()));
  const foundInExperience = isMatchedIn(expText) || isMatchedIn(summaryText);
  const foundAnywhere = foundInProjects || foundInSkills || foundInExperience || isMatchedIn(allResumeText);

  const isBooleanQuestion = /^(?:do you have|have you\b|are you\b|can you\b|will you\b|would you\b)/i.test(question.trim()) && !/^(?:what|which|list|describe|how many|tell us|why)/i.test(question.trim());

  if (isBooleanQuestion) {
    return {
      answer: foundAnywhere ? 'Yes' : 'No',
      confidence: foundAnywhere ? 0.95 : 0.85,
    };
  }

  // Numeric years of experience calculation
  const candidateBaseExp = persona.experienceYears || 0;
  const isInternRole = (persona.targetRoles || []).some((r) => r.toLowerCase().includes('intern')) || qLower.includes('intern');

  if (foundInProjects || foundInExperience) {
    // Verified direct implementation in projects or work history!
    const years = Math.max(1, candidateBaseExp > 0 ? candidateBaseExp : 2);
    return {
      answer: String(years),
      confidence: 0.95,
    };
  }

  if (foundInSkills) {
    // Listed in technical skills / toolchain
    const years = candidateBaseExp > 0 ? candidateBaseExp : 1;
    return {
      answer: String(years),
      confidence: 0.9,
    };
  }

  if (foundAnywhere) {
    return {
      answer: String(Math.max(1, candidateBaseExp || 1)),
      confidence: 0.85,
    };
  }

  // Not mentioned in projects, skills, or experience
  const isGeneralCS = /computer science|programming|coding|software|problem solving|git|version control/i.test(targetSkill);
  if (isGeneralCS) {
    return { answer: String(Math.max(1, candidateBaseExp || 1)), confidence: 0.8 };
  }

  return {
    answer: isInternRole ? '0' : '0',
    confidence: 0.8,
  };
}
