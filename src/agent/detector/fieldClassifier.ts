/**
 * ZeroApply Detector - Field Classifier Bridge
 */

import type { ScannedField } from './fieldScanner';

export interface ClassifiedField extends ScannedField {
  category: 'fullName' | 'firstName' | 'lastName' | 'email' | 'phone' | 'location' | 'experience' | 'salary' | 'workPreference' | 'manualConfirmation' | 'ignore' | 'custom';
  confidence: number;
}

export function classifyAllFields(fields: ScannedField[]): ClassifiedField[] {
  return fields.map((field) => {
    const text = `${field.label} ${field.name} ${field.placeholder} ${field.id}`.toLowerCase();
    let category: ClassifiedField['category'] = 'custom';
    let confidence = 0.5;

    if (field.type === 'checkbox' || /checkbox/i.test(field.type)) {
      if (field.required) {
        category = 'manualConfirmation';
        confidence = 0.9;
      } else {
        category = 'ignore';
        confidence = 0.9;
      }
      return { ...field, category, confidence };
    }

    if (/first\s*name/i.test(text)) {
      category = 'firstName';
      confidence = 0.95;
    } else if (/last\s*name/i.test(text)) {
      category = 'lastName';
      confidence = 0.95;
    } else if (/full\s*name|\bname\b/i.test(text)) {
      category = 'fullName';
      confidence = 0.95;
    } else if (field.type === 'email' || /email/i.test(text)) {
      category = 'email';
      confidence = 0.99;
    } else if (!/experience|years|skill|develop/i.test(text) && (field.type === 'tel' || /\bphone\b|\bcell\b|\bmobile\s*(?:phone|number|no\b)|\bcontact\s*number\b/i.test(text))) {
      category = 'phone';
      confidence = 0.99;
    } else if (/city|state|location|address/i.test(text)) {
      category = 'location';
      confidence = 0.9;
    } else if (/experience|years|what is your experience/i.test(text)) {
      category = 'experience';
      confidence = 0.90;
    } else if (/salary|compensation/i.test(text)) {
      category = 'salary';
      confidence = 0.85;
    } else if (/comfortable.*remote|willing.*remote/i.test(text)) {
      category = 'custom';
      confidence = 0.90;
    } else if (/work.*preference|workplace.*type|remote|hybrid|on-site/i.test(text)) {
      category = 'workPreference';
      confidence = 0.85;
    }

    return {
      ...field,
      category,
      confidence,
    };
  });
}
