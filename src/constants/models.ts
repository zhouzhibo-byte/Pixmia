export interface PromptModelOption {
  id: string;
  name: string;
  description: string;
}

export const PROMPT_MODELS: PromptModelOption[] = [
  {
    id: 'MiniMax-M3.1-Flash',
    name: 'M3.1 Flash',
    description: '响应更快，适合日常创作',
  },
  {
    id: 'MiniMax-M3',
    name: 'M3',
    description: '理解更稳，适合复杂参考图',
  },
];

export const DEFAULT_PROMPT_MODEL = 'MiniMax-M3.1-Flash';

export interface ImageModelOption {
  id: string;
  name: string;
  description: string;
}

export const IMAGE_MODELS: ImageModelOption[] = [
  {
    id: 'image-01',
    name: 'Image 01',
    description: '文生图 / 单图主体参考',
  },
  {
    id: 'image-01-live',
    name: 'Image 01 Live',
    description: '更强的画风表现',
  },
];

export const IMAGE_MODEL = 'image-01';

export const DEFAULT_PROMPT_ENDPOINT = 'https://api.minimax.cn/anthropic/v1/messages';
export const DEFAULT_IMAGE_ENDPOINT = 'https://api.minimax.cn/v1/image_generation';

export const MAX_REFERENCE_IMAGES = 4;

export const DEFAULT_ALBUM_ID = 'ai-created';
export const DEFAULT_ALBUM_NAME = 'AI创作';

export const ALLOWED_FILE_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xlsx',
  'ppt',
  'pptx',
  'csv',
  'epub',
  'txt',
  'py',
  'java',
  'js',
  'jsx',
  'html',
  'css',
  'sql',
  'md',
  'json',
  'ts',
  'tsx',
];

export const TEXT_FILE_EXTENSIONS = [
  'txt',
  'py',
  'java',
  'js',
  'jsx',
  'html',
  'css',
  'sql',
  'csv',
  'md',
  'json',
  'ts',
  'tsx',
];

export const MAX_FILE_SIZE = 15 * 1024 * 1024;
export const MAX_FILES_PER_MESSAGE = 5;

export function extensionOf(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export function mimeForExtension(extension: string): string {
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    csv: 'text/csv',
    epub: 'application/epub+zip',
    txt: 'text/plain',
    py: 'text/x-python',
    java: 'text/x-java',
    js: 'text/javascript',
    jsx: 'text/jsx',
    html: 'text/html',
    css: 'text/css',
    sql: 'text/sql',
    md: 'text/markdown',
    json: 'application/json',
    ts: 'text/typescript',
    tsx: 'text/tsx',
  };
  return map[extension] ?? 'application/octet-stream';
}

export const INSPIRATIONS = [
  '画一只在月球上的橘猫，电影感光线',
  '解释一下量子纠缠，用简单的话',
  '写一个 Python 贪吃蛇小游戏',
  '设计一张极简咖啡海报',
  '把这段需求整理成项目计划',
  '做一个个人作品集网页',
];

export function getPromptModelName(modelId: string): string {
  return PROMPT_MODELS.find((model) => model.id === modelId)?.name ?? modelId;
}
