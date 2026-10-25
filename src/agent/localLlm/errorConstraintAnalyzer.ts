/**
 * ZeroApply Local LLM - Error Constraint Analyzer
 * Analyzes any ATS form validation error (decimal, integer, character count, URL, phone,
 * email, postal, selection required, date) and generates actionable system instructions
 * and constraints for both the Local LLM and deterministic fallback resolvers.
 */

export type ErrorCategory =
  | 'decimal'
  | 'whole_number'
  | 'min_numeric'
  | 'max_numeric'
  | 'min_length'
  | 'max_length'
  | 'url'
  | 'phone'
  | 'email'
  | 'postal'
  | 'required_selection'
  | 'date'
  | 'generic';

export interface ErrorConstraintAnalysis {
  rawError: string;
  category: ErrorCategory;
  targetMinValue?: number;
  targetMaxValue?: number;
  targetMinLength?: number;
  targetMaxLength?: number;
  isNumericConstraint: boolean;
  guidance: string;
}

/**
 * Analyzes any validation error string from any ATS platform.
 */
export function analyzeErrorConstraint(rawError?: string): ErrorConstraintAnalysis {
  const errorText = (rawError || '').trim();
  if (!errorText) {
    return {
      rawError: '',
      category: 'generic',
      isNumericConstraint: false,
      guidance: '',
    };
  }

  const errLower = errorText.toLowerCase();

  // 1. DECIMAL CONSTRAINT (e.g. "Enter a decimal number larger than 0.0", "Must be a decimal number")
  if (/decimal/i.test(errLower)) {
    const minMatch = errLower.match(/(?:larger|greater|more)\s*than\s*(\d+(?:\.\d+)?)|at\s*least\s*(\d+(?:\.\d+)?)|minimum\s*(?:of\s*)?(\d+(?:\.\d+)?)/i);
    const targetMinValue = minMatch ? parseFloat(minMatch[1] || minMatch[2] || minMatch[3]) : undefined;
    const isStrictlyGreaterThan = /(?:larger|greater|more)\s*than/i.test(errLower);

    return {
      rawError: errorText,
      category: 'decimal',
      targetMinValue,
      isNumericConstraint: true,
      guidance: `The field strictly requires a decimal number (e.g. 1.0 or 2.0)${
        targetMinValue !== undefined
          ? ` ${isStrictlyGreaterThan ? 'strictly greater than' : 'at least'} ${targetMinValue}`
          : ''
      }. Output ONLY a decimal number with digits and a decimal point. Do NOT output words, characters, or explanations.`,
    };
  }

  // 2. WHOLE NUMBER / INTEGER CONSTRAINT (e.g. "Please enter a whole number", "Must be an integer", "Enter a valid number")
  if (/whole\s*number|integer|digits\s*only|\bnumber\b/i.test(errLower) && !/phone|postal|zip|pin|card/i.test(errLower)) {
    const minMatch = errLower.match(/(?:larger|greater|more)\s*than\s*(\d+)|at\s*least\s*(\d+)|minimum\s*(?:of\s*)?(\d+)/i);
    const targetMinValue = minMatch ? parseInt(minMatch[1] || minMatch[2] || minMatch[3], 10) : undefined;

    const maxMatch = errLower.match(/(?:less|smaller)\s*than\s*(\d+)|at\s*most\s*(\d+)|maximum\s*(?:of\s*)?(\d+)|cannot\s*exceed\s*(\d+)/i);
    const targetMaxValue = maxMatch ? parseInt(maxMatch[1] || maxMatch[2] || maxMatch[3] || maxMatch[4], 10) : undefined;

    return {
      rawError: errorText,
      category: 'whole_number',
      targetMinValue,
      targetMaxValue,
      isNumericConstraint: true,
      guidance: `The field strictly requires a whole number / integer (e.g. 1, 2, 5)${
        targetMinValue !== undefined ? ` at least ${targetMinValue}` : ''
      }${targetMaxValue !== undefined ? ` up to ${targetMaxValue}` : ''}. Output ONLY positive integer digits. Do NOT output letters or words.`,
    };
  }

  // 3. MINIMUM CHARACTER LENGTH (e.g. "Must be at least 50 characters", "Minimum 100 characters required")
  if (/(?:at\s*least|minimum\s*(?:of)?)\s*(\d+)\s*(?:char|letter|word)/i.test(errLower)) {
    const match = errLower.match(/(?:at\s*least|minimum\s*(?:of)?)\s*(\d+)\s*(?:char|letter|word)/i);
    const targetMinLength = match ? parseInt(match[1], 10) : 50;

    return {
      rawError: errorText,
      category: 'min_length',
      targetMinLength,
      isNumericConstraint: false,
      guidance: `The response was rejected for being too short. It must be at least ${targetMinLength} characters. Provide an expanded, highly professional response describing the candidate's skills and experience that meets or exceeds ${targetMinLength} characters.`,
    };
  }

  // 4. MAXIMUM CHARACTER LENGTH (e.g. "Cannot exceed 250 characters", "Maximum 150 characters")
  if (/(?:cannot\s*exceed|maximum\s*(?:of)?|no\s*more\s*than|at\s*most)\s*(\d+)\s*(?:char|letter|word)/i.test(errLower)) {
    const match = errLower.match(/(?:cannot\s*exceed|maximum\s*(?:of)?|no\s*more\s*than|at\s*most)\s*(\d+)\s*(?:char|letter|word)/i);
    const targetMaxLength = match ? parseInt(match[1], 10) : 200;

    return {
      rawError: errorText,
      category: 'max_length',
      targetMaxLength,
      isNumericConstraint: false,
      guidance: `The response was rejected for being too long. It must be under ${targetMaxLength} characters. Provide a concise, targeted summary strictly within ${targetMaxLength} characters.`,
    };
  }

  // 5. MINIMUM NUMERIC VALUE (e.g. "Must be greater than 0", "Value must be at least 1")
  if (
    !/char|letter|word/i.test(errLower) &&
    (/(?:greater|larger|more)\s*than\s*(\d+(?:\.\d+)?)|at\s*least\s*(\d+(?:\.\d+)?)|minimum\s*value/i.test(errLower))
  ) {
    const match = errLower.match(/(?:greater|larger|more)\s*than\s*(\d+(?:\.\d+)?)|at\s*least\s*(\d+(?:\.\d+)?)/i);
    const targetMinValue = match ? parseFloat(match[1] || match[2]) : 1;

    return {
      rawError: errorText,
      category: 'min_numeric',
      targetMinValue,
      isNumericConstraint: true,
      guidance: `The value must be a number strictly greater than or equal to ${targetMinValue}. Output ONLY a valid numeric value.`,
    };
  }

  // 6. MAXIMUM NUMERIC VALUE (e.g. "Cannot exceed 100", "Maximum value is 50")
  if (
    !/char|letter|word/i.test(errLower) &&
    (/(?:less|smaller)\s*than\s*(\d+(?:\.\d+)?)|cannot\s*exceed\s*(\d+(?:\.\d+)?)|maximum\s*value/i.test(errLower))
  ) {
    const match = errLower.match(/(?:less|smaller)\s*than\s*(\d+(?:\.\d+)?)|cannot\s*exceed\s*(\d+(?:\.\d+)?)|maximum\s*(?:value\s*)?(?:is\s*)?(\d+(?:\.\d+)?)/i);
    const targetMaxValue = match ? parseFloat(match[1] || match[2] || match[3]) : undefined;

    return {
      rawError: errorText,
      category: 'max_numeric',
      targetMaxValue,
      isNumericConstraint: true,
      guidance: `The value cannot exceed ${targetMaxValue}. Output ONLY a valid numeric value within range.`,
    };
  }

  // 7. URL CONSTRAINT (e.g. "Please enter a valid URL", "Must be a valid web link")
  if (/valid\s*(?:url|link|web\s*address|website|http)|invalid\s*url/i.test(errLower)) {
    return {
      rawError: errorText,
      category: 'url',
      isNumericConstraint: false,
      guidance: `The field requires a valid web URL starting with https://. Output ONLY the candidate's LinkedIn URL, GitHub URL, or portfolio URL.`,
    };
  }

  // 8. PHONE NUMBER CONSTRAINT (e.g. "Please enter a valid phone number", "Invalid phone format")
  if (/valid\s*phone|phone\s*number|invalid\s*phone|phone\s*format/i.test(errLower)) {
    return {
      rawError: errorText,
      category: 'phone',
      isNumericConstraint: false,
      guidance: `The field requires a valid phone number. Output the candidate's phone number formatted cleanly with standard digits (e.g. +91 9876543210 or 10 digits).`,
    };
  }

  // 9. EMAIL CONSTRAINT (e.g. "Please enter a valid email address", "Invalid email")
  if (/valid\s*email|email\s*address|invalid\s*email/i.test(errLower)) {
    return {
      rawError: errorText,
      category: 'email',
      isNumericConstraint: false,
      guidance: `The field requires a valid email address. Output ONLY the candidate's email address.`,
    };
  }

  // 10. POSTAL / ZIP CODE CONSTRAINT (e.g. "Enter a valid postal code", "Invalid ZIP")
  if (/postal\s*code|zip\s*code|pin\s*code|invalid\s*(?:zip|postal)/i.test(errLower)) {
    return {
      rawError: errorText,
      category: 'postal',
      isNumericConstraint: false,
      guidance: `The field requires a valid postal code / ZIP code. Output ONLY valid postal digits (5 or 6 digits).`,
    };
  }

  // 11. REQUIRED SELECTION / VALID ANSWER CONSTRAINT (e.g. "Please make a selection", "Please select an option", "Please enter a valid answer")
  if (/please\s*(?:make\s*a\s*selection|select|enter\s*a\s*valid\s*answer)|valid\s*answer|choose\s*an?\s*option|selection\s*is\s*required/i.test(errLower)) {
    return {
      rawError: errorText,
      category: 'required_selection',
      isNumericConstraint: false,
      guidance: `A selection is mandatory. Pick the best affirmative/positive option representing extensive qualification from the available options.`,
    };
  }

  // 12. DATE CONSTRAINT (e.g. "Enter a valid date", "Format MM/DD/YYYY")
  if (/valid\s*date|date\s*format|mm\/dd\/yyyy|yyyy-mm-dd|invalid\s*date/i.test(errLower)) {
    return {
      rawError: errorText,
      category: 'date',
      isNumericConstraint: false,
      guidance: `The field requires a valid date format. Output a valid formatted date (e.g. today's date in YYYY-MM-DD or MM/DD/YYYY).`,
    };
  }

  // 13. GENERIC ERROR FALLBACK
  return {
    rawError: errorText,
    category: 'generic',
    isNumericConstraint: false,
    guidance: `The previous answer was rejected with error: "${errorText}". Formulate your answer to strictly satisfy this requirement and clear the validation error.`,
  };
}
