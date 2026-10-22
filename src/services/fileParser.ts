import * as FileSystem from 'expo-file-system';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { Platform } from 'react-native';
import { TEXT_FILE_EXTENSIONS, extensionOf } from '../constants/models';

const MAX_CHARS = 40_000;

function truncate(text: string): string {
  const cleaned = text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
  if (cleaned.length <= MAX_CHARS) return cleaned;
  return `${cleaned.slice(0, MAX_CHARS)}\n\n（内容过长，已截断）`;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)));
}

function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
  );
}

async function readBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new (globalThis as any).FileReader();
      reader.onloadend = () => {
        const result = String(reader.result);
        resolve(result.slice(result.indexOf(',') + 1));
      };
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsDataURL(blob);
    });
  }
  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

async function readTextFile(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    return await response.text();
  }
  return await FileSystem.readAsStringAsync(uri);
}

async function extractDocx(uri: string): Promise<string> {
  const zip = await JSZip.loadAsync(await readBase64(uri), { base64: true });
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) return '';
  const paragraphs = [...xml.matchAll(/<w:p[\s\S]*?<\/w:p>/g)].map((paragraph) => {
    const texts = [...paragraph[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(
      (match) => match[1]
    );
    return decodeEntities(texts.join(''));
  });
  return truncate(paragraphs.filter(Boolean).join('\n'));
}

async function extractPptx(uri: string): Promise<string> {
  const zip = await JSZip.loadAsync(await readBase64(uri), { base64: true });
  const slides = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)/)?.[1] ?? 0);
      const nb = Number(b.match(/slide(\d+)/)?.[1] ?? 0);
      return na - nb;
    });

  const pages: string[] = [];
  for (let index = 0; index < slides.length; index += 1) {
    const xml = await zip.file(slides[index])?.async('string');
    if (!xml) continue;
    const texts = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map(
      (match) => decodeEntities(match[1])
    );
    if (texts.join('').trim()) {
      pages.push(`【第 ${index + 1} 页】\n${texts.join('\n')}`);
    }
  }
  return truncate(pages.join('\n\n'));
}

async function extractEpub(uri: string): Promise<string> {
  const zip = await JSZip.loadAsync(await readBase64(uri), { base64: true });
  const entries = Object.keys(zip.files)
    .filter((name) => /\.(xhtml|html|htm)$/i.test(name))
    .sort();

  const chapters: string[] = [];
  for (const entry of entries) {
    const html = await zip.file(entry)?.async('string');
    if (!html) continue;
    const text = stripHtml(html);
    if (text.trim()) chapters.push(text);
  }
  return truncate(chapters.join('\n\n'));
}

async function extractXlsx(uri: string): Promise<string> {
  const workbook = XLSX.read(await readBase64(uri), { type: 'base64' });
  const sheets: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (csv.trim()) {
      sheets.push(`【工作表：${sheetName}】\n${csv}`);
    }
  }
  return truncate(sheets.join('\n\n'));
}

export function isTextFileName(name: string): boolean {
  return TEXT_FILE_EXTENSIONS.includes(extensionOf(name));
}

export async function extractTextFromFile(uri: string, name: string): Promise<string> {
  const extension = extensionOf(name);
  try {
    if (TEXT_FILE_EXTENSIONS.includes(extension)) {
      return truncate(await readTextFile(uri));
    }
    if (extension === 'docx') return await extractDocx(uri);
    if (extension === 'pptx') return await extractPptx(uri);
    if (extension === 'epub') return await extractEpub(uri);
    if (extension === 'xlsx') return await extractXlsx(uri);
    return '';
  } catch {
    return '';
  }
}
