/** Bound IPC payloads before either local inference backend receives them. */
export function validateInferenceExtras({ images, responseSchema }, supportsVision) {
  if (images !== undefined && (!Array.isArray(images) || images.length > 1 || images.some(image => typeof image !== 'string' || image.length > 8_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)))) throw new Error('Invalid local AI screenshot.');
  if (images?.length && !supportsVision) throw new Error('This local model does not support vision.');
  if (responseSchema !== undefined) {
    if (!responseSchema || typeof responseSchema !== 'object' || Array.isArray(responseSchema) || responseSchema.type !== 'object' || JSON.stringify(responseSchema).length > 16_000) throw new Error('Invalid local AI response schema.');
    if (/"\$ref"|"\$id"|"\$schema"/.test(JSON.stringify(responseSchema))) throw new Error('External schema references are not allowed.');
  }
}
