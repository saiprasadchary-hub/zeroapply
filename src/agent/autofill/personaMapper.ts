/**
 * ZeroApply Autofill - Persona Mapper Bridge
 */

import type { ClassifiedField } from '../detector/fieldClassifier';
import type { PersonaData } from '../../types';

export interface FillInstruction {
  selector: string;
  value: string;
  field: ClassifiedField;
}

export async function mapPersonaToFields(
  fields: ClassifiedField[],
  persona: PersonaData
): Promise<FillInstruction[]> {
  const instructions: FillInstruction[] = [];

  for (const field of fields) {
    let val = '';
    switch (field.category) {
      case 'fullName':
        val = persona.fullName || '';
        break;
      case 'firstName':
        val = (persona.fullName || '').split(' ')[0] || '';
        break;
      case 'lastName':
        val = (persona.fullName || '').split(' ').slice(1).join(' ') || '';
        break;
      case 'email':
        val = persona.email || '';
        break;
      case 'phone':
        val = persona.phone || '';
        break;
      case 'location':
        val = persona.location || '';
        break;
      case 'experience':
        val = String(persona.experienceYears ?? 0);
        break;
      case 'salary':
        val = String(persona.minSalary ?? 0);
        break;
      case 'workPreference':
        val = persona.workPreference || 'Remote';
        break;
      default:
        break;
    }

    instructions.push({
      selector: field.elementSelector,
      value: val,
      field,
    });
  }

  return instructions;
}
