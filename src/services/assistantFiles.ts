import { extensionOf } from '../constants/models';

const FILE_BLOCK = /```file:([^\n`]+)\r?\n([\s\S]*?)```/gi;
const MAX_FILES = 5;
const MAX_FILE_CHARS = 200_000;

export interface ParsedFile {
  name: string;
  content: string;
}

function sanitizeName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\r\n]/g, '_').trim();
  if (!cleaned) return 'file.txt';
  return extensionOf(cleaned) ? cleaned : `${cleaned}.txt`;
}

export function extractGeneratedFiles(markdown: string): {
  text: string;
  files: ParsedFile[];
} {
  const files: ParsedFile[] = [];

  const text = markdown
    .replace(FILE_BLOCK, (_, rawName: string, rawContent: string) => {
      if (files.length >= MAX_FILES) return '';
      const name = sanitizeName(rawName.trim().replace(/^["'`]|["'`]$/g, ''));
      const content = rawContent.replace(/\n$/, '').slice(0, MAX_FILE_CHARS);
      files.push({ name, content });
      return '';
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { text, files };
}
