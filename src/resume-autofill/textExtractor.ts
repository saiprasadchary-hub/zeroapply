/**
 * Resume Text Extractor (Real PDF & DOCX Parser)
 * Uses pdfjs-dist to decompress and extract authentic text from PDF & DOCX resumes.
 */
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Bundle the PDF worker with the app. A CDN worker is unreliable in Electron
// (and breaks when offline or blocked by a corporate network).
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function extractRawTextFromFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  // Defensive copy: ArrayBuffer can become detached after being consumed by pdfjs
  const originalBuffer = await file.arrayBuffer();
  const buffer = originalBuffer.slice(0);

  if (fileName.endsWith('.pdf')) {
    return extractTextFromPdfBuffer(buffer);
  }

  if (fileName.endsWith('.docx')) {
    return extractTextFromDocxBuffer(buffer);
  }

  if (fileName.endsWith('.doc')) {
    throw new Error('Legacy .doc files are not supported. Please save the resume as PDF or DOCX and upload it again.');
  }

  // Fallback for plain text files (.txt)
  const decoder = new TextDecoder('utf-8', { fatal: false });
  return decoder.decode(buffer);
}

export async function extractTextFromPdfBuffer(buffer: ArrayBuffer): Promise<string> {
  // Keep a safe copy for the fallback before pdfjs potentially detaches the buffer
  const fallbackBuffer = buffer.slice(0);

  // Electron's file:// renderer can reject module workers even when the same
  // worker succeeds in a normal browser. Use the proven local stream decoder
  // there and keep PDF.js for regular browser deployments.
  if (isElectronRenderer()) {
    return extractRawPdfTextFallback(fallbackBuffer);
  }

  try {
    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageLines: string[] = [];
      let currentLine = '';
      let lastY: number | null = null;

      for (const item of textContent.items as any[]) {
        if (!item.str) continue;
        const str = item.str.trim();
        if (!str) continue;

        const currentY = item.transform ? item.transform[5] : null;
        if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 4) {
          if (currentLine) pageLines.push(currentLine);
          currentLine = str;
        } else {
          currentLine = currentLine ? `${currentLine} ${str}` : str;
        }
        if (currentY !== null) lastY = currentY;
      }
      if (currentLine) pageLines.push(currentLine);

      // Extract PDF page link annotations (embedded hyperlink URLs)
      try {
        const annotations = await page.getAnnotations();
        for (const annot of annotations) {
          if (annot.url) {
            pageLines.push(annot.url);
          } else if (annot.unsafeUrl) {
            pageLines.push(annot.unsafeUrl);
          }
        }
      } catch {
        // Ignore annotation extraction errors
      }

      fullText += pageLines.join('\n') + '\n';
    }

    if (fullText.trim().length > 10) {
      return fullText.trim();
    }
  } catch (err) {
    console.warn('pdfjs-dist extraction fallback required:', err);
  }

  // Fallback if PDF has unencrypted raw streams — uses pre-copied buffer
  return extractRawPdfTextFallback(fallbackBuffer);
}

function isElectronRenderer(): boolean {
  return typeof window !== 'undefined' && (window as Window & { zeroApply?: { isDesktop?: boolean } }).zeroApply?.isDesktop === true;
}

async function extractTextFromDocxBuffer(buffer: ArrayBuffer): Promise<string> {
  const archive = await JSZip.loadAsync(buffer);
  const documentXml = archive.file('word/document.xml');
  if (!documentXml) throw new Error('The DOCX file does not contain a Word document body.');

  const xml = await documentXml.async('string');
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.querySelector('parsererror')) throw new Error('Could not read the DOCX document XML.');

  const paragraphs = Array.from(document.querySelectorAll('w\\:p, p'))
    .map((paragraph) => Array.from(paragraph.querySelectorAll('w\\:t, t')).map((node) => node.textContent ?? '').join('').trim())
    .filter(Boolean);

  return paragraphs.join('\n');
}

async function extractRawPdfTextFallback(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const rawString = decoder.decode(bytes);

  const directText = extractPdfTextOperators(rawString);
  if (directText.length > 10) return directText;

  const linkAnnotations = Array.from(rawString.matchAll(/\/URI\s*\(([^)]+)\)/g))
    .map((entry) => entry[1])
    .filter(Boolean);

  // ReportLab and many resume generators store text in an ASCII85 + Flate
  // compressed page stream. This local fallback still works if PDF.js cannot
  // start a worker in Electron.
  const streamMatcher = /stream\r?\n([\s\S]*?)\r?\n?endstream/g;
  let match: RegExpExecArray | null;
  const extractedChunks: string[] = [];
  while ((match = streamMatcher.exec(rawString)) !== null) {
    try {
      const streamStart = Math.max(0, match.index - 300);
      const streamHeader = rawString.slice(streamStart, match.index);
      let streamBytes: Uint8Array<ArrayBufferLike> = latin1ToBytes(match[1]);

      if (/ASCII85Decode/.test(streamHeader)) streamBytes = decodeAscii85(decoder.decode(streamBytes));
      if (/FlateDecode/.test(streamHeader)) streamBytes = await inflate(streamBytes);

      const chunk = extractPdfTextOperators(decoder.decode(streamBytes));
      if (chunk) extractedChunks.push(chunk);
    } catch {
      // Continue trying other content streams.
    }
  }

  return [...extractedChunks, ...linkAnnotations].join('\n').trim();
}

function extractPdfTextOperators(content: string): string {
  const fragments: string[] = [];
  const textRegex = /\((?:\\.|[^\\)])*\)\s*Tj\b/g;
  let match: RegExpExecArray | null;
  while ((match = textRegex.exec(content)) !== null) {
    fragments.push(decodePdfString(match[0].replace(/\s*Tj\b$/, '').slice(1, -1)));
  }

  const arrayRegex = /\[([\s\S]*?)\]\s*TJ\b/g;
  while ((match = arrayRegex.exec(content)) !== null) {
    const strings = Array.from(match[1].matchAll(/\((?:\\.|[^\\)])*\)/g))
      .map((entry) => decodePdfString(entry[0].slice(1, -1)));
    if (strings.length) fragments.push(strings.join(''));
  }

  return fragments.map((fragment) => fragment.trim()).filter(Boolean).join('\n');
}

function decodePdfString(value: string): string {
  return value
    .replace(/\\([0-7]{1,3})/g, (_entry, octal) => String.fromCharCode(parseInt(octal, 8)))
    .replace(/\\([nrtbf\\()])/g, (_entry, escaped: string) => {
      const replacements: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' };
      return replacements[escaped] ?? escaped;
    });
}

function decodeAscii85(source: string): Uint8Array<ArrayBufferLike> {
  const input = source.replace(/\s/g, '').replace(/^<~/, '').replace(/~>.*/, '');
  const output: number[] = [];
  let group: number[] = [];

  const flush = () => {
    const originalLength = group.length;
    while (group.length < 5) group.push(84); // ASCII85 'u' padding
    let value = 0;
    for (const item of group) value = value * 85 + item;
    const decoded = [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
    output.push(...decoded.slice(0, originalLength - 1));
    group = [];
  };

  for (const character of input) {
    if (character === 'z' && group.length === 0) {
      output.push(0, 0, 0, 0);
      continue;
    }
    const code = character.charCodeAt(0);
    if (code < 33 || code > 117) continue;
    group.push(code - 33);
    if (group.length === 5) flush();
  }
  if (group.length > 1) flush();
  return new Uint8Array(output);
}

function latin1ToBytes(source: string): Uint8Array<ArrayBufferLike> {
  const bytes = new Uint8Array(source.length);
  for (let index = 0; index < source.length; index++) bytes[index] = source.charCodeAt(index) & 255;
  return bytes;
}

async function inflate(data: Uint8Array<ArrayBufferLike>): Promise<Uint8Array<ArrayBufferLike>> {
  const safeBuffer = data.slice().buffer as ArrayBuffer;
  const decompressed = new Blob([safeBuffer]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(decompressed).arrayBuffer());
}
