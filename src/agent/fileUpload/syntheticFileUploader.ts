/**
 * ZeroApply File Upload - Synthetic File Uploader
 * Injects synthetic DataTransfer events into file inputs across webviews.
 */

export interface FileUploadResult {
  success: boolean;
  fileName: string;
  fileInputFound: boolean;
  message: string;
}

/**
 * Builds an in-browser injection script string to attach a file to the active file input.
 */
export function buildAttachFileScript(fileName: string, base64Content = '', mimeType = 'application/pdf'): string {
  const safeName = JSON.stringify(fileName);
  const safeBase64 = JSON.stringify(base64Content);
  const safeMime = JSON.stringify(mimeType);

  return `
(function() {
  const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
  if (fileInputs.length === 0) {
    return { success: false, fileInputFound: false, fileName: ${safeName}, message: 'No input[type="file"] detected' };
  }

  // Find visible or first available file input
  const input = fileInputs.find(el => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }) || fileInputs[0];

  try {
    // Create a mock blob from base64 if provided, or synthetic content
    const binary = ${safeBase64} ? atob((${safeBase64}).split(',')[1] || ${safeBase64}) : 'PDF-1.4 Mock Binary Content';
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: ${safeMime} });
    const file = new File([blob], ${safeName}, { type: ${safeMime}, lastModified: Date.now() });

    // Populate using DataTransfer
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;

    // Dispatch standard React / synthetic DOM change events
    input.dispatchEvent(new Event('focus', { bubbles: true }));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));

    // Trigger parent form or custom dropzone classes if present
    const dropzone = input.closest('.dropzone, [data-dropzone="true"], .file-upload, label');
    if (dropzone) {
      dropzone.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }));
    }

    return {
      success: true,
      fileInputFound: true,
      fileName: ${safeName},
      message: 'Synthetic file attachment dispatched successfully'
    };
  } catch (err) {
    return {
      success: false,
      fileInputFound: true,
      fileName: ${safeName},
      message: 'Error creating DataTransfer: ' + String(err)
    };
  }
})();
`;
}
