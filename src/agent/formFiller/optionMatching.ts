/** Self-contained factory so injected helpers survive production bundler renaming. */
export function createOptionMatchers(): {
  normalizeOption: (value: string) => string;
  isPlaceholderOption: (value: string) => boolean;
  optionPolarity: (value: string) => 'yes' | 'no' | null;
  optionMatchScore: (target: string, candidate: string) => number;
} {
  function normalizeOption(value: string): string {
    return value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function isPlaceholderOption(value: string): boolean {
    const text = normalizeOption(value).replace(/^[\s–—-]+|[\s–—-]+$/g, '').replace(/[.…:]+$/g, '').trim();
    return !text || /^(select(?: an? option)?|please select|choose(?: an? option)?|pick|option auswählen|auswählen|bitte auswählen|bitte wählen|eine option|seleccionar|seleccione|elige una opción|sélectionner|choisir|choisissez|veuillez sélectionner|selecionar|escolher|selezionare|scegliere|selecteer|kies|कृपया चुनें|चुनें|विकल्प चुनें)$/i.test(text);
  }

  function optionPolarity(value: string): 'yes' | 'no' | null {
    const text = normalizeOption(value);
    if (['yes', 'true', 'ja', 'sí', 'si', 'oui', 'sim', 'да', 'हाँ', 'evet'].includes(text)) return 'yes';
    if (['no', 'false', 'nein', 'non', 'não', 'нет', 'नहीं', 'hayır'].includes(text)) return 'no';
    return null;
  }

  function optionMatchScore(target: string, candidate: string): number {
    const wanted = normalizeOption(target);
    const option = normalizeOption(candidate);
    if (!wanted || isPlaceholderOption(option)) return 0;
    if (wanted === option) return 100;
    const polarity = optionPolarity(wanted);
    const candidatePolarity = optionPolarity(option);
    if (polarity || candidatePolarity) return polarity && polarity === candidatePolarity ? 100 : 0;
    // A bare count may match the same count with an explicit time unit.
    const count = option.match(/^([+-]?\d+(?:[.]\d+)?)\s+(?:years?|months?|days?)$/);
    if (/^[+-]?\d+(?:[.]\d+)?$/.test(wanted) && count) {
      return Number(wanted) === Number(count[1]) ? 90 : 0;
    }
    // Numeric values must not match a different number by substring (1 versus 10).
    if (/^[+-]?\d+(?:[.,]\d+)?$/.test(wanted) || /^[+-]?\d+(?:[.,]\d+)?$/.test(option)) return 0;
    return wanted.length >= 3 && option.length >= 3 && (option.includes(wanted) || wanted.includes(option)) ? 50 : 0;
  }

  return { normalizeOption, isPlaceholderOption, optionPolarity, optionMatchScore };
}

export const { normalizeOption, isPlaceholderOption, optionPolarity, optionMatchScore } = createOptionMatchers();

export function matchSelectOption(target: string, options: readonly string[]): string | null {
  let best: string | null = null;
  let score = 0;
  for (const option of options) {
    const candidate = optionMatchScore(target, option);
    if (candidate > score) { best = option; score = candidate; }
  }
  return best;
}
