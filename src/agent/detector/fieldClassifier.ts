import type { ScannedField } from './fieldScanner';

export type FieldCategory =
  | 'firstName'
  | 'lastName'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'city'
  | 'state'
  | 'zip'
  | 'country'
  | 'location'
  | 'linkedIn'
  | 'gitHub'
  | 'portfolio'
  | 'experienceYears'
  | 'minSalary'
  | 'workPreference'
  | 'currentTitle'
  | 'currentCompany'
  | 'university'
  | 'degree'
  | 'major'
  | 'graduationYear'
  | 'skills'
  | 'summary'
  | 'resume'
  | 'ignore'
  | 'screeningQuestion';

export interface ClassifiedField {
  field: ScannedField;
  category: FieldCategory;
  confidence: number;
}

/**
 * Classifies scanned form fields into persona attributes or custom screening questions.
 */
export function classifyField(field: ScannedField): ClassifiedField {
  const label = (field.label + ' ' + field.name + ' ' + field.placeholder).toLowerCase();

  if (field.type === 'file' || label.includes('resume') || label.includes('cv') || (label.includes('upload') && !label.includes('cover'))) {
    return { field, category: 'resume', confidence: 0.95 };
  }

  // Name classifications (First, Last, Full)
  if (!label.includes('company') && !label.includes('school') && !label.includes('university') && !label.includes('employer') && !label.includes('institution')) {
    if (label.includes('first name') || label.includes('given name') || label.includes('fname')) {
      return { field, category: 'firstName', confidence: 0.95 };
    }
    if (label.includes('last name') || label.includes('surname') || label.includes('family name') || label.includes('lname')) {
      return { field, category: 'lastName', confidence: 0.95 };
    }
    if (label.includes('full name') || label.includes('candidate name') || label.includes('your name') || /^name$/.test(label.trim())) {
      return { field, category: 'fullName', confidence: 0.9 };
    }
  }

  if (field.type === 'email' || label.includes('email') || label.includes('e-mail')) {
    return { field, category: 'email', confidence: 0.95 };
  }

  if (field.type === 'tel' || label.includes('phone') || label.includes('mobile') || label.includes('contact number')) {
    return { field, category: 'phone', confidence: 0.95 };
  }

  if (label.includes('linkedin') || label.includes('linked in')) {
    return { field, category: 'linkedIn', confidence: 0.95 };
  }

  if (label.includes('github') || label.includes('git hub')) {
    return { field, category: 'gitHub', confidence: 0.95 };
  }

  if (label.includes('portfolio') || label.includes('website') || label.includes('personal site') || label.includes('url')) {
    return { field, category: 'portfolio', confidence: 0.85 };
  }

  // Granular location address breakdowns
  if (label.includes('city') || label.includes('municipality') || label.includes('town')) {
    return { field, category: 'city', confidence: 0.9 };
  }
  if (label.includes('state') || label.includes('province') || label.includes('region')) {
    return { field, category: 'state', confidence: 0.9 };
  }
  if (label.includes('zip') || label.includes('postal') || label.includes('pincode')) {
    return { field, category: 'zip', confidence: 0.95 };
  }
  if (label.includes('country') || label.includes('nation')) {
    return { field, category: 'country', confidence: 0.9 };
  }
  if (label.includes('location') || label.includes('address') || label.includes('street')) {
    return { field, category: 'location', confidence: 0.85 };
  }

  // Professional History & Role
  if (label.includes('current company') || label.includes('current employer') || label.includes('most recent employer') || label.includes('employer name') || label.includes('organization')) {
    return { field, category: 'currentCompany', confidence: 0.9 };
  }
  if (label.includes('current title') || label.includes('job title') || label.includes('current role') || label.includes('present role') || label.includes('headline') || label.includes('position title')) {
    return { field, category: 'currentTitle', confidence: 0.9 };
  }

  // Education History & Background
  if (label.includes('university') || label.includes('college') || label.includes('school') || label.includes('institute') || label.includes('educational institution')) {
    return { field, category: 'university', confidence: 0.9 };
  }
  if (label.includes('degree') || label.includes('qualification') || label.includes('education level') || label.includes('highest level of education') || label.includes('degree type')) {
    return { field, category: 'degree', confidence: 0.9 };
  }
  if (label.includes('major') || label.includes('field of study') || label.includes('specialization') || label.includes('academic discipline')) {
    return { field, category: 'major', confidence: 0.9 };
  }
  if (label.includes('graduation year') || label.includes('passing year') || label.includes('year graduated') || label.includes('completion year') || label.includes('end year')) {
    return { field, category: 'graduationYear', confidence: 0.9 };
  }

  // Skills & Summary/Cover Letter
  if (label.includes('skills') || label.includes('technical skills') || label.includes('technologies') || label.includes('core competencies')) {
    return { field, category: 'skills', confidence: 0.9 };
  }
  if (label.includes('summary') || label.includes('about yourself') || label.includes('cover letter') || label.includes('personal statement') || label.includes('bio')) {
    return { field, category: 'summary', confidence: 0.85 };
  }

  if (label.includes('salary') || label.includes('compensation') || label.includes('pay') || label.includes('rate')) {
    return { field, category: 'minSalary', confidence: 0.9 };
  }

  if (label.includes('years of experience') || label.includes('total experience') || label.includes('how many years') || (label.includes('experience') && (label.includes('with') || label.includes('in') || label.includes('using') || /\d/.test(label)))) {
    return { field, category: 'experienceYears', confidence: 0.9 };
  }

  if (label.includes('remote') || label.includes('hybrid') || label.includes('on-site') || label.includes('work preference') || label.includes('relocat')) {
    return { field, category: 'workPreference', confidence: 0.85 };
  }

  // Explicitly ignore optional features that complicate the form (e.g., Top Choice on LinkedIn)
  if (label.includes('top choice') || (label.includes('optional') && field.type === 'checkbox')) {
    return { field, category: 'ignore', confidence: 1.0 };
  }

  return { field, category: 'screeningQuestion', confidence: 0.7 };
}

/**
 * Classifies an array of scanned fields.
 */
export function classifyAllFields(fields: ScannedField[]): ClassifiedField[] {
  return fields.map(classifyField);
}
