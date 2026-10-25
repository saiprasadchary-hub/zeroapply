/**
 * ZeroApply EasyApply - Dom Scripts
 */

export const EASY_APPLY_MODAL_STATE_SCRIPT = `
(() => {
  const modal = document.querySelector('.jobs-easy-apply-modal, [role="dialog"], #modal-container');
  const form = document.querySelector('form, .jobs-easy-apply-content');
  return {
    isOpen: !!modal,
    hasForm: !!form,
  };
})()
`;

export const FORM_VALIDATION_SCRIPT = `
(() => {
  const errors = document.querySelectorAll('.artdeco-inline-feedback--error, [aria-invalid="true"]');
  const emptyRequired = document.querySelectorAll('input[required]:placeholder-shown');
  return {
    isValid: errors.length === 0,
    emptyCount: emptyRequired.length,
    errorCount: errors.length,
  };
})()
`;

export const CHECK_SUBMISSION_CONFIRMED_SCRIPT = `
(() => {
  const isDone = document.querySelector('.artdeco-modal--success, .jobs-post-apply, [data-test-modal-close-btn]');
  return !!isDone;
})()
`;

export const SUBMISSION_CONFIRMED_SCRIPT = CHECK_SUBMISSION_CONFIRMED_SCRIPT;
