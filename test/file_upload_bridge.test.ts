import assert from 'node:assert/strict';
import {
  buildNativeAttachFileScript,
  attachResumeFile,
  getFallbackResume,
} from '../src/agent/fileUpload';

console.log('=== TEST 1: Resume Metadata & Fallback Integrity ===');
const fallback = getFallbackResume('Sai Prasad');
assert.equal(fallback.name, 'Sai_Prasad_Resume.pdf');
assert.equal(fallback.type, 'application/pdf');
assert.ok(fallback.base64Data?.length! > 20);
console.log('✓ Fallback resume generated with candidate name: ' + fallback.name);

console.log('=== TEST 2: Native DataTransfer Script Generation ===');
const script = buildNativeAttachFileScript('#resume-upload-input', 'Candidate_Resume.pdf', '', 'application/pdf');
assert.ok(script.includes('DataTransfer'));
assert.ok(script.includes('Candidate_Resume.pdf'));
assert.ok(script.includes('DragEvent'));
assert.ok(script.includes('dropzone.dispatchEvent'));
assert.ok(script.includes('input.files = dt.files'));

// Verify syntax of the generated script
assert.doesNotThrow(() => {
  new Function(script);
});
console.log('✓ Injected DataTransfer & Dropzone script compiled without syntax errors');

console.log('=== TEST 3: High-Level attachResumeFile Bridge Execution ===');
const mockWebview = {
  executeJavaScript: async (code: string) => {
    return {
      success: true,
      fileInputFound: true,
      fileName: 'Sai_Prasad_Resume.pdf',
      message: 'Synthetic resume attached successfully',
    };
  },
};

(async () => {
  const result = await attachResumeFile(mockWebview as any, '#resume-upload-input', 'Sai Prasad');
  assert.equal(result.success, true);
  assert.equal(result.fileInputFound, true);
  assert.equal(result.fileName, 'Sai_Prasad_Resume.pdf');
  console.log('✓ attachResumeFile executed successfully through bridge: ' + result.fileName);

  console.log('\n🎉 ALL NATIVE RESUME FILE UPLOAD BRIDGE TESTS PASSED (100%)!');
})();
